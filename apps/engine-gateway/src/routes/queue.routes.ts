// apps/engine-gateway/src/routes/queue.routes.ts
import { Router } from 'express';
import { joinQueue } from '../controllers/queue.controller';

const router = Router();

// POST /api/queue/join
// Body: { publicKey: string }
router.post('/join', joinQueue);

export default router;
