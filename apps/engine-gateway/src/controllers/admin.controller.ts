// apps/engine-gateway/src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';

/**
 * POST /api/admin/events
 *
 * Creates a new Flash Sale event and returns a key-pair.
 * TODO: persist the event to the database via prisma.flashSaleEvent.create({...})
 */
export async function createEvent(_req: Request, res: Response): Promise<void> {
  // --- Mock key generation ---
  const publicKey = `flash_pub_${crypto.randomBytes(8).toString('hex')}`;
  const secretKey = `flash_sec_${crypto.randomBytes(16).toString('hex')}`;

  // TODO: save to DB
  // await prisma.flashSaleEvent.create({ data: { publicKey, secretKey } });

  res.status(201).json({
    message: 'Flash Sale event created.',
    publicKey,
    secretKey,
  });
}
