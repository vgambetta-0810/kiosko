const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { auth, optionalAuth } = require('../middlewares/auth');
const { registerSchema, loginSchema, googleSchema, changePasswordSchema } = require('../validators/schemas');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesion. Intenta nuevamente en unos minutos.' }
});

router.post('/register', optionalAuth, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/google', loginLimiter, validate(googleSchema), authController.google);
router.get('/me', auth, authController.me);
router.patch('/password', auth, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
