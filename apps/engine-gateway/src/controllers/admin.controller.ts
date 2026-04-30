// apps/engine-gateway/src/controllers/admin.controller.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// ARCHITECTURAL OVERVIEW — Admin Controller
// ──────────────────────────────────────────────────────────────────────────────
//
// This controller handles platform-operator actions (your dashboard calling the
// API, not end-users calling the API).
//
// AUTHENTICATION TODO:
//   This endpoint MUST be protected before going to production.
//   Options (pick one):
//     A) Bearer token in Authorization header (a long-lived operator secret)
//        signed with a separate JWT_ADMIN_SECRET env var.
//     B) API Gateway (Kong, AWS API GW) that strips requests without a valid
//        internal service token before they reach Express.
//     C) mTLS between the dashboard server and engine-gateway.
//
//   For local dev, a simple middleware that checks
//     req.headers['x-admin-secret'] === process.env.ADMIN_SECRET
//   is sufficient.
// ──────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import { generateKeyPair }    from 'crypto';
import { promisify }          from 'util';
import crypto                 from 'crypto';
import prisma from '../lib/prisma';
import redis                  from '../services/redis.service';
import { warmEventCache, evictEventCache } from '../services/event-cache.service';
import { startDrain, stopDrain }           from '../services/drain.service';


const generateKeyPairAsync = promisify(generateKeyPair);


// TODO: Replace with a shared singleton from src/lib/prisma.ts
// const prisma = new PrismaClient();

// ── POST /api/admin/events ────────────────────────────────────────────────────
//
// Creates a new flash sale event. Returns the key-pair ONCE. The secret key
// is hashed before storage (like a GitHub PAT) — you cannot retrieve it again.

export async function createEvent(req: Request, res: Response): Promise<void> {
  // ── Step 1: Validate & parse request body ─────────────────────────────────
  //
  // TODO: Use zod (or class-validator) to validate and parse the body.
  // Suggested schema:
  //
  //   const CreateEventSchema = z.object({
  //     name:       z.string().min(3).max(120),
  //     stockCount: z.number().int().positive().max(10_000_000),
  //     rateLimit:  z.number().int().positive().max(10_000).default(50),
  //   });
  //
  //   const parsed = CreateEventSchema.safeParse(req.body);
  //   if (!parsed.success) {
  //     res.status(400).json({ error: parsed.error.flatten() });
  //     return;
  //   }
  //   const { name, stockCount, rateLimit } = parsed.data;

  const { clientId, name, stockCount, rateLimit = 50, oversubscriptionMultiplier = 1.5 } = req.body as {
    clientId?:                   string;
    name?:                       string;
    stockCount?:                 number;
    rateLimit?:                  number;
    oversubscriptionMultiplier?: number;
  };


  if (!clientId || !name || !stockCount) {
    res.status(400).json({ error: '`clientId`, `name` and `stockCount` are required' });
    return;
  }

  if (!Number.isInteger(stockCount) || stockCount <= 0) {
    res.status(400).json({ error: '`stockCount` must be a positive integer' });
    return;
  }

  if (!Number.isInteger(rateLimit) || rateLimit <= 0 || rateLimit > 10_000) {
    res.status(400).json({ error: '`rateLimit` must be between 1 and 10,000' });
    return;
  }

  if (typeof oversubscriptionMultiplier !== 'number' ||
      oversubscriptionMultiplier < 1.0 || oversubscriptionMultiplier > 3.0) {
    res.status(400).json({ error: '`oversubscriptionMultiplier` must be between 1.0 and 3.0' });
    return;
  }

  const queueCap = Math.ceil(stockCount * oversubscriptionMultiplier);

  const client = await prisma.client.findUnique({
    where:  { id: clientId },
    select: { id: true },
  });

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

 // ── Step 3: Generate keys ───────────────────────────────────────────────────
  //
  // Three separate keys, three separate purposes:
  //
  //   rsaPrivateKey  → signs JWTs in queue.controller.ts (stays in engine)
  //   rsaPublicKey   → verifies JWTs (served via JWKS, safe to expose)
  //   signingSecret  → HMAC for release route request authentication
  //
  // generateKeyPairAsync is non-blocking — uses libuv thread pool.
  // generateKeyPairSync would block the event loop for ~100ms.
  //
  // Both key generations run in parallel with Promise.all — saves ~100ms
  // since they're independent operations.

  const eventPublicKey = `pk_live_${crypto.randomBytes(32).toString('hex')}`;
  const signingSecret  = `ss_live_${crypto.randomBytes(32).toString('hex')}`;

  let rsaPrivateKey: string;
  let rsaPublicKey:  string;

  try {
    const keypair = await generateKeyPairAsync('rsa', {
      modulusLength:      2048,
      publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    rsaPrivateKey = keypair.privateKey as unknown as string;
    rsaPublicKey  = keypair.publicKey  as unknown as string;
  } catch (err) {
    console.error('[admin/createEvent] Key generation failed:', err);
    res.status(500).json({ error: 'Failed to generate cryptographic keys' });
    return;
  }
   // ── Step 4: Persist + seed Redis in transaction ─────────────────────────────

  let event: Awaited<ReturnType<typeof prisma.saleEvent.create>>;

  try {
    event = await prisma.$transaction(async (tx) => {
      const created = await tx.saleEvent.create({
        data: {
          clientId,
          name,
          stockCount,
          rateLimit,
          oversubscriptionMultiplier,
          status:        'PENDING',
          publicKey:     eventPublicKey,
          rsaPrivateKey,
          rsaPublicKey,
          signingSecret,
        },
      });

      await seedRedis({
        publicKey:  eventPublicKey,
        eventId:    created.id,
        stockCount,
        rateLimit,
        queueCap,
      });

      return created;
    });
  } catch (err) {
    console.error('[admin/createEvent] Transaction failed:', err);
    res.status(500).json({ error: 'Failed to create event' });
    return;
  }

  // ── Step 5: Seed Redis atomically ─────────────────────────────────────────
  //
  // Store event state as a Redis Hash so the Lua script can read all fields
  // in one round trip (HMGET flash:event:{publicKey} status stock rateLimit …).
  //
  // NX FLAG — idempotency guard:
  //   HSETNX or a conditional SET with NX ensures that if this function is
  //   called twice (e.g., a dashboard double-click, a retry), the second call
  //   does NOT overwrite the stock counter after users have already joined.
  //
  // TODO: Uncomment when Lua script and Redis are ready:
  //
  // await seedRedis(rawPublicKey, stockCount, rateLimit);

  // ── Step 6: Respond — return plaintext secret key EXACTLY ONCE ───────────
  //
  // The client MUST copy the secretKey now.  We will never return it again.
  // The response should also include a human-readable warning to that effect.

  // MOCK RESPONSE (replace with `event` from the Prisma insert above):
  // ── Step 5: Respond ─────────────────────────────────────────────────────────
  //
  // We return:
  //   publicKey     → client puts this in their frontend (identifies the event)
  //   signingSecret → client uses this to sign release requests (keep server-side)
  //   rsaPublicKey  → client uses this to verify JWTs locally (safe to expose)
  //
  // rsaPrivateKey is NEVER returned — it stays in your Postgres only.
  // Unlike HS256, the client never needs the private key for anything.

  res.status(201).json({
    message:       'Event created. Store signingSecret securely — it will not be shown again.',
    id:            event.id,
    name:          event.name,
    status:        event.status,
    publicKey:     eventPublicKey,
    signingSecret,                  // for release route HMAC — shown once
    rsaPublicKey,                   // for JWT verification — safe to store anywhere
    jwksUrl:       `${process.env.ENGINE_URL}/api/.well-known/jwks/${eventPublicKey}`,
  });
}

// ── Helper: Seed Redis with event state ──────────────────────────────────────
//

async function seedRedis(params: {
  publicKey:  string;
  eventId:    string;
  stockCount: number;
  rateLimit:  number;
  queueCap:   number;
}): Promise<void> {
  const { publicKey, eventId, stockCount, rateLimit, queueCap } = params;
  const key = `flash:event:${publicKey}`;

  // Check if already seeded — prevents overwrite on duplicate calls
  const exists = await redis.hexists(key, 'stock');
  if (exists) {
    throw new Error(`Redis key ${key} already exists — possible duplicate event creation`);
  }

  // Pipeline batches all HSET calls into one TCP round-trip
  // NOTE: secretKey is NOT stored in Redis anymore — we use RSA.
  // The private key stays in Postgres only and is loaded into the
  // Node process cache on activation via warmEventCache().
  const pipeline = redis.pipeline();
  pipeline.hset(key, 'status',           'PENDING');
  pipeline.hset(key, 'stock',            String(stockCount));
  pipeline.hset(key, 'rateLimit',        String(rateLimit));
  pipeline.hset(key, 'bucketTokens',     String(rateLimit));  // start full
  pipeline.hset(key, 'bucketLastRefill', String(Date.now()));
  pipeline.hset(key, 'eventId',          eventId);            // for audit log
  pipeline.hset(key, 'admitted',         '0');
  pipeline.hset(key, 'queueCap',         String(queueCap));
  pipeline.expire(key, 48 * 60 * 60);                         // 48hr TTL safety net
  await pipeline.exec();
}

// ── GET /api/admin/events ─────────────────────────────────────────────────────
//
// Returns all events ordered newest-first. Active events get live stock from
// Redis; all others use the Postgres stockCount.

export async function listEvents(req: Request, res: Response): Promise<void> {
  const events = await prisma.saleEvent.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:                         true,
      name:                       true,
      status:                     true,
      stockCount:                 true,
      rateLimit:                  true,
      oversubscriptionMultiplier: true,
      publicKey:                  true,
      rsaPublicKey:               true,
      createdAt:                  true,
      _count: { select: { attempts: true, releases: true, usedJtis: true } },
    },
  });

  const activeEvents = events.filter(e => e.status === 'ACTIVE');

  const liveStocks = await Promise.all(
    activeEvents.map(e => redis.hget(`flash:event:${e.publicKey}`, 'stock'))
  );

  const liveStockMap = new Map<string, number>(
    activeEvents.map((e, i) => {
      const raw = liveStocks[i];
      return [e.publicKey, raw !== null ? parseInt(raw, 10) : e.stockCount];
    })
  );

  res.status(200).json(
    events.map(e => ({
      id:                         e.id,
      name:                       e.name,
      status:                     e.status,
      stockCount:                 e.status === 'ACTIVE'
                                    ? (liveStockMap.get(e.publicKey) ?? e.stockCount)
                                    : e.stockCount,
      rateLimit:                  e.rateLimit,
      oversubscriptionMultiplier: e.oversubscriptionMultiplier,
      publicKey:                  e.publicKey,
      rsaPublicKey:               e.rsaPublicKey,
      createdAt:                  e.createdAt,
      _count:                     e._count,
    }))
  );
}

// ── GET /api/admin/events/:id ─────────────────────────────────────────────────
//
// Full event detail including sensitive keys. Used by the dashboard's
// "display keys once" page. rsaPrivateKey is never returned.

export async function getEvent(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const event = await prisma.saleEvent.findUnique({ where: { id } });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const apiUrl = process.env.API_URL || 'https://api.flashsale.dev';

  const integrationSnippet = `
// Install: npm install @flash-sale/sdk

// Browser-side (your storefront)
import { FlashSale } from '@flash-sale/sdk';

const sale = new FlashSale({
  publicKey: '${event.publicKey}',
  apiUrl: '${apiUrl}'
});

sale.join(userId, {
  onQueued: (position) => showQueuePosition(position),
  onWon: (token) => redirectToCheckout(token),
  onSoldOut: () => showSoldOutMessage()
});

// Server-side (your payment backend) — verify the token
const response = await fetch('${apiUrl}/api/queue/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-public-key': '${event.publicKey}'
  },
  body: JSON.stringify({ token: tokenFromClient })
});
`;

  res.status(200).json({
    id:                         event.id,
    name:                       event.name,
    status:                     event.status,
    stockCount:                 event.stockCount,
    rateLimit:                  event.rateLimit,
    oversubscriptionMultiplier: event.oversubscriptionMultiplier,
    publicKey:                  event.publicKey,
    rsaPublicKey:               event.rsaPublicKey,
    signingSecret:              event.signingSecret,
    createdAt:                  event.createdAt,
    integrationSnippet,
  });
}

// ── PUT /api/admin/events/:id/activate ───────────────────────────────────────
//
// TODO: Implement this endpoint to transition an event from PENDING → ACTIVE.
//
// Steps:
//   1. Find the event in Postgres by id.
//   2. Validate current status is PENDING (reject if already ACTIVE/ENDED).
//   3. Update Postgres: prisma.clientEvent.update({ where: { id }, data: { status: 'ACTIVE' } })
//   4. Update Redis:    redis.hset(`flash:event:${publicKey}`, 'status', 'ACTIVE')
//   5. Return 200.
//
// ORDERING NOTE: Update Postgres FIRST, then Redis.  If Redis update fails,
// you can retry it (the DB is the source of truth).  If you update Redis first
// and the DB write fails, users can join a queue that doesn't officially exist.

export async function activateEvent(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const event = await prisma.saleEvent.findUnique({ where: { id } });

  if(!event){
    res.status(400).json({ error: 'Event not found' });
    return;
  }

  if(event.status !== 'PENDING'){
    res.status(409).json({ error: `Cannot activate — current status: ${event.status}` });
    return;
  }

  // Update status to active in database first
  try {
    await prisma.saleEvent.update({
      where: { id },
      data:  { status: 'ACTIVE' },
    });
  } catch (err) {
    console.error('[activateEvent] Postgres update failed:', err);
    res.status(500).json({ error: 'Failed to activate event' });
    return;
  }

  // Change status in redis
  try {
    await redis.hset(`flash:event:${event.publicKey}`, 'status', 'ACTIVE');
  } catch (err) {
    console.error(
      `[activateEvent] CRITICAL: Postgres updated but Redis failed for ${id}. ` +
      `Manual fix: redis-cli HSET flash:event:${event.publicKey} status ACTIVE`
    , err);
    res.status(500).json({ error: 'Activated in DB but Redis sync failed. Contact support.' });
    return;
  }

  // ── 3. Warm the Node cache AFTER Redis is confirmed ACTIVE ────────────────
  //
  // Order matters: warm cache only after both DB and Redis are consistent.
  // If Redis failed above we already returned — so reaching here means
  // everything is in sync and it's safe to start serving traffic.

  warmEventCache(event.publicKey, {
    rsaPrivateKey:  event.rsaPrivateKey,
    rsaPublicKey:   event.rsaPublicKey,
    signingSecret:  event.signingSecret,
    eventId:        event.id,
    name:           event.name,
  });

  startDrain(event.publicKey, event.rateLimit);

  res.status(200).json({
    message: 'Event is now ACTIVE. Queue is open.',
    id:      event.id,
    status:  'ACTIVE',
  });
}

// ── GET /api/admin/events/:id/stats ──────────────────────────────────────────
//
// Live analytics dashboard for a single event. Runs Redis and Postgres queries
// in parallel to minimise latency; Postgres aggregates may be slightly stale.

export async function getEventStats(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const event = await prisma.saleEvent.findUnique({ where: { id } });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const eventKey = `flash:event:${event.publicKey}`;
  const queueKey = `flash:queue:${event.publicKey}`;

  const [
    redisFields,
    queueDepth,
    attemptCounts,
    releaseCounts,
    usedJtiCount,
  ] = await Promise.all([
    redis.hmget(eventKey, 'stock', 'admitted', 'queueCap', 'status'),
    redis.zcard(queueKey),
    prisma.queueAttempt.groupBy({
      by:    ['result'],
      where: { saleEventId: id },
      _count: { _all: true },
    }),
    prisma.ticketRelease.groupBy({
      by:    ['reason'],
      where: { saleEventId: id },
      _count: { _all: true },
    }),
    prisma.usedJti.count({ where: { saleEventId: id } }),
  ]);

  const [stockStr, admittedStr, queueCapStr] = redisFields;

  const attemptMap: Record<string, number> = {};
  for (const row of attemptCounts) attemptMap[row.result] = row._count._all;

  const releaseMap: Record<string, number> = {};
  for (const row of releaseCounts) releaseMap[row.reason] = row._count._all;

  const won         = attemptMap['WON']          ?? 0;
  const queued      = attemptMap['QUEUED']        ?? 0;
  const instantWins = attemptMap['INSTANT_WIN']   ?? 0;
  const soldOut     = attemptMap['SOLD_OUT']       ?? 0;
  const rateLimited = attemptMap['RATE_LIMITED']   ?? 0;
  const totalRequests = Object.values(attemptMap).reduce((s, n) => s + n, 0);

  const released = Object.values(releaseMap).reduce((s, n) => s + n, 0);
  const verified = usedJtiCount;

  res.status(200).json({
    event: {
      id:                         event.id,
      name:                       event.name,
      status:                     event.status,
      stockCount:                 event.stockCount,
      rateLimit:                  event.rateLimit,
      oversubscriptionMultiplier: event.oversubscriptionMultiplier,
      createdAt:                  event.createdAt,
    },
    live: {
      stockRemaining: stockStr    !== null ? parseInt(stockStr,    10) : null,
      queueDepth,
      admitted:       admittedStr !== null ? parseInt(admittedStr, 10) : null,
      queueCap:       queueCapStr !== null ? parseInt(queueCapStr, 10) : null,
    },
    funnel: { totalRequests, queued, instantWins, soldOut, rateLimited, won, released, verified },
    rates: {
      conversionRate: won > 0 ? verified / won : 0,
      releaseRate:    won > 0 ? released / won : 0,
    },
  });
}

export async function endEvent(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const event = await prisma.saleEvent.findUnique({ where: { id } });

  if(!event){
    res.status(400).json({ error: 'Event Not Found' });
    return;
  }

  if (event.status === 'ENDED') {
    res.status(409).json({ error: 'Event already ended' });
    return;
  }

  await prisma.saleEvent.update({
    where: { id },
    data:  { status: 'ENDED' },
  });

  // ── 2. Redis — mark ENDED + set TTL ──────────────────────────────────────
  //
  // Setting status to ENDED means the Lua script immediately starts
  // returning EVENT_NOT_ACTIVE for any in-flight requests.
  // TTL cleans up the hash from Redis memory after 48 hours.

  const pipeline = redis.pipeline();
  pipeline.hset(`flash:event:${event.publicKey}`, 'status', 'ENDED');
  pipeline.expire(`flash:event:${event.publicKey}`, 48 * 60 * 60);
  pipeline.del(`flash:queue:${event.publicKey}`);
  pipeline.del(`flash:result:${event.publicKey}`);
  await pipeline.exec();

  stopDrain(event.publicKey);

  // ── 3. Evict Node cache ───────────────────────────────────────────────────
  //
  // Remove secretKey from memory now that the event is over.
  // Any requests that sneak through after this point get a cache miss,
  // hit Postgres, find status=ENDED, and get null back → 404.

  evictEventCache(event.publicKey);

  res.status(200).json({
    message: 'Event ended. Queue is closed.',
    id:      event.id,
    status:  'ENDED',
  });
}