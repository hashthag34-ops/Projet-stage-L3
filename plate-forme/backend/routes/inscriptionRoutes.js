// backend/routes/inscriptionRoutes.js
const express = require('express');
const router = express.Router();
const inscriptionController = require('../controllers/inscriptionController');

router.get('/', inscriptionController.getAllInscriptions);
router.put('/:id/decision', inscriptionController.traiterCandidature);

module.exports = router;