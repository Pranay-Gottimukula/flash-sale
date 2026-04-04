// apps/engine-gateway/src/routes/admin.routes.ts
import { Router } from 'express';
import { createEvent } from '../controllers/admin.controller';

const router = Router();

// POST /api/admin/events  — create a new Flash Sale event
router.post('/events', createEvent);

export default router;
