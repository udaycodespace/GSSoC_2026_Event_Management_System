import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, me, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const authRateLimiter = rateLimit({
  windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX || 10,
  message: {
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);

export default router;


