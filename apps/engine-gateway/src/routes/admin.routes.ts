// apps/engine-gateway/src/routes/admin.routes.ts

import { Router }             from 'express';
import {
  createEvent,
  listEvents,
  getEvent,
  activateEvent,
  endEvent,
  getEventStats,
} from '../controllers/admin.controller';
import { requireAdminSecret } from '../middleware/admin-auth.middleware';

const router = Router();

// Protect every route registered on this router.
// router.use() here applies to POST /events, PUT /events/:id/activate, and
// PUT /events/:id/end — no individual route needs to be annotated.
router.use(requireAdminSecret);

router.get   ('/events',              listEvents);
router.post  ('/events',              createEvent);
router.put   ('/events/:id/activate', activateEvent);
router.put   ('/events/:id/end',      endEvent);
router.get   ('/events/:id',           getEvent);
router.get   ('/events/:id/stats',    getEventStats);

export default router;