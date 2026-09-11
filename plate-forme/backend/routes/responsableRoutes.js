// backend/routes/responsableRoutes.js
const express = require('express');
const router = express.Router();
const candidatureController = require('../controllers/candidatureController');
const verifyToken = require('../middleware/authMiddleware');
const seanceController = require('../controllers/seanceController');
const formationController = require('../controllers/formationController');
const db = require('../config/db');

// --- CANDIDATURES ---
router.get('/candidatures', candidatureController.getCandidatures);

// --- LISTE DES FORMATIONS (POUR LE SELECT DU PLANNING) ---
router.get('/formations', formationController.getAllFormations);

// --- SÉANCES / PLANNING ---
router.get('/seances', seanceController.getSeances);
router.post('/seances', seanceController.createSeance);
router.delete('/seances/:id_seance', seanceController.deleteSeance);


// Middleware d'authentification (si tu l'utilises)
router.use(verifyToken);

// 2. Valider une candidature et créer le compte Apprenant
router.post('/formations/:id_formation/valider-promotion', candidatureController.validerPromotion);
router.patch('/candidatures/:id_inscription/preselection', candidatureController.togglePreselection);

module.exports = router;