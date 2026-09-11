// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/authMiddleware'); // Importe ton middleware d'authentification

// 1. Routes spécifiques (OBLIGATOIREMENT AVANT /:id)
router.put('/profile', verifyToken, upload.single('avatar'), userController.updateUserProfile);

// 2. Routes d'administration / CRUD utilisateurs
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;