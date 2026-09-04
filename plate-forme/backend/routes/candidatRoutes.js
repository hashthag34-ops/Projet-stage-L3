// backend/routes/candidatRoutes.js
const express = require('express');
const router = express.Router();
const candidatController = require('../controllers/candidatController');

router.post('/postuler', candidatController.postuler);

module.exports = router;