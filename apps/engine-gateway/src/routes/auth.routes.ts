import { Router } from 'express';
import { signup, login, getMe } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/signup', authLimiter, signup);
router.post('/login',  authLimiter, login);
router.get('/me',      getMe);

export default router;
