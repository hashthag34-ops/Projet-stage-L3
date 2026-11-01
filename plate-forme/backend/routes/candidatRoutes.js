// backend/routes/candidatRoutes.js
const express = require('express');
const router = express.Router();
const candidatController = require('../controllers/candidatController');
const { authOptional } = require('../middleware/authOptional');

router.post('/postuler', authOptional, candidatController.postuler);
router.get('/profil', candidatController.getCandidateByEmail);
router.get('/candidature/modifier', candidatController.getCandidatureForEdit);
router.put('/candidature/modifier', candidatController.updateCandidature);
router.delete('/candidature', candidatController.cancelCandidature);

module.exports = router;