// backend/routes/candidatRoutes.js
const express = require('express');
const router = express.Router();
const candidatController = require('../controllers/candidatController');

router.post('/postuler', candidatController.postuler);
router.get('/profil', candidatController.getCandidateByEmail);
router.get('/candidature/modifier', candidatController.getCandidatureForEdit);
router.put('/candidature/modifier', candidatController.updateCandidature);

module.exports = router;