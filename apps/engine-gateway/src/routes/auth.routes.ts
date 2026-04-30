// apps/engine-gateway/src/routes/auth.routes.ts

import { Router } from 'express';
import { signup, login, me } from '../controllers/auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/login',  login);
router.get('/me',      me);

export default router;
