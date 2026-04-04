# engine-gateway — Architecture Plan

## Stack
| Layer | Technology |
|---|---|
| HTTP Server | Express 5 |
| Language | TypeScript (tsx dev runner) |
| ORM | Prisma 7 (driver-adapter mode) |
| DB | PostgreSQL via `@prisma/adapter-pg` |
| Cache / Queue | ioredis |
| Auth tokens | jsonwebtoken |

## Folder Structure

```
src/
├── server.ts                  # Entry point — Express init, route mounting
├── lib/
│   └── prisma.ts              # Prisma client singleton (PrismaPg adapter)
├── routes/
│   ├── queue.routes.ts        # POST /api/queue/join
│   └── admin.routes.ts        # POST /api/admin/events
├── controllers/
│   ├── queue.controller.ts    # joinQueue — returns signed JWT
│   └── admin.controller.ts    # createEvent — returns publicKey + secretKey
└── services/
    └── redis.service.ts       # ioredis singleton
```

## API Surface

### `POST /api/queue/join`
```json
// Request body
{ "publicKey": "flash_pub_abc123" }

// Response 200
{ "message": "You have joined the queue.", "token": "<jwt>" }
```

### `POST /api/admin/events`
```json
// Response 201
{
  "message": "Flash Sale event created.",
  "publicKey": "flash_pub_<hex>",
  "secretKey": "flash_sec_<hex>"
}
```

### `GET /health`
```json
{ "status": "Engine Gateway is ALIVE and DB is connected!" }
```

## TODO (next iterations)
- [ ] Add Prisma model `FlashSaleEvent` with `publicKey`, `secretKey`, `startsAt`, `endsAt`
- [ ] `createEvent` → persist to DB instead of returning mock keys  
- [ ] `joinQueue` → push to Redis sorted-set and return real rank
- [ ] Add `authMiddleware` to verify JWT on protected routes
- [ ] Rate-limit `/api/queue/join` with `express-rate-limit`
