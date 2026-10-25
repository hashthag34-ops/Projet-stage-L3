// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/login', authController.login);
router.post('/password/forgot', passwordController.requestForgotPasswordCode);
router.post('/password/reset', passwordController.resetForgottenPassword);
router.get('/me', verifyToken, authController.getMe);
router.post('/password/change/request-code', verifyToken, passwordController.requestAuthenticatedPasswordCode);
router.post('/password/change', verifyToken, passwordController.changePassword);

// Route publique pour finaliser la configuration
router.post('/setup-account', upload.single('avatar'), authController.setupAccount);

module.exports = router;