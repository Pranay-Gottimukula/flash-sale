// apps/engine-gateway/src/routes/queue.routes.ts

import { Router } from 'express';
import { joinQueue, verifyToken }        from '../controllers/queue.controller';
import { releaseTicket }                 from '../controllers/release.controller';

const router = Router();

// POST /api/queue/join
// Body: { publicKey: string }
router.post('/join', joinQueue);
router.post('/verify',  verifyToken);
router.post('/release', releaseTicket);

export default router;
