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
import { requireAdminAuth } from '../middleware/admin-auth.middleware';

const router = Router();

router.use(requireAdminAuth);

router.get   ('/events',              listEvents);
router.post  ('/events',              createEvent);
router.put   ('/events/:id/activate', activateEvent);
router.put   ('/events/:id/end',      endEvent);
router.get   ('/events/:id',           getEvent);
router.get   ('/events/:id/stats',    getEventStats);

export default router;