// apps/engine-gateway/src/controllers/auth.controller.ts
//
// Simple email + password auth for the SaaS dashboard.
// Passwords are hashed with bcryptjs (cost 12).
// Sessions are stateless JWTs signed with JWT_SECRET.

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';

const JWT_SECRET  = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRES = '7d';

interface JwtPayload {
  sub:   string; // client id
  email: string;
}

function signToken(clientId: string, email: string): string {
  return jwt.sign({ sub: clientId, email } satisfies JwtPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const publicKey    = `pk_client_${crypto.randomBytes(20).toString('hex')}`;

  const client = await prisma.client.create({
    data: { email, passwordHash, publicKey },
  });

  const token = signToken(client.id, client.email);

  res.status(201).json({
    token,
    client: { id: client.id, email: client.email },
  });
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const client = await prisma.client.findUnique({ where: { email } });

  // Use a constant-time compare even for the "not found" path to prevent
  // timing-based email enumeration.
  const dummyHash    = '$2a$12$invalidhashfortimingnormalization000000000000000000000000';
  const hashToVerify = client?.passwordHash ?? dummyHash;
  const valid        = await bcrypt.compare(password, hashToVerify);

  if (!client || !valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(client.id, client.email);

  res.status(200).json({
    token,
    client: { id: client.id, email: client.email },
  });
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

export async function me(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
    return;
  }

  const client = await prisma.client.findUnique({
    where:  { id: payload.sub },
    select: { id: true, email: true },
  });

  if (!client) {
    res.status(401).json({ error: 'Account not found' });
    return;
  }

  res.status(200).json({ id: client.id, email: client.email });
}
