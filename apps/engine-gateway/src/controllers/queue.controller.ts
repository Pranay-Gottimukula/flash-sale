// apps/engine-gateway/src/controllers/queue.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key';

/**
 * POST /api/queue/join
 * Body: { publicKey: string }
 *
 * For now returns a dummy signed JWT that represents a queue position.
 * The real implementation will push to a Redis sorted-set and return rank.
 */
export async function joinQueue(req: Request, res: Response): Promise<void> {
  const { publicKey } = req.body as { publicKey?: string };

  if (!publicKey) {
    res.status(400).json({ error: 'publicKey is required' });
    return;
  }

  // --- TODO: Replace with real Redis queue logic ---
  const payload = {
    publicKey,
    queuePosition: 1,  // mock position
    issuedAt: Date.now(),
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  res.status(200).json({
    message: 'You have joined the queue.',
    token,
  });
}
