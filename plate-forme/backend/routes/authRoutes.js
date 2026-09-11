// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);

// Route publique pour finaliser la configuration
router.post('/setup-account', upload.single('avatar'), authController.setupAccount);

module.exports = router;