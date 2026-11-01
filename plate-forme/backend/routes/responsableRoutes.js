// backend/routes/responsableRoutes.js
const express = require('express');
const router = express.Router();
const candidatureController = require('../controllers/candidatureController');
const verifyToken = require('../middleware/authMiddleware');
const seanceController = require('../controllers/seanceController');
const formationController = require('../controllers/formationController');
const certificationController = require('../controllers/certificationController');
const db = require('../config/db');
const forumController = require('../controllers/forumController');
const forumUpload = require('../middleware/forumUpload');

// --- CANDIDATURES ---
router.get('/candidatures', candidatureController.getCandidatures);

// --- LISTE DES FORMATIONS (POUR LE SELECT DU PLANNING) ---
router.get('/formations', formationController.getAllFormations);

// --- SÉANCES / PLANNING ---
router.get('/seances', seanceController.getSeances);
router.post('/seances', seanceController.createSeance);
router.patch('/seances/:id_seance', seanceController.updateSeance);
router.delete('/seances/:id_seance', seanceController.deleteSeance);


// Middleware d'authentification (si tu l'utilises)
router.use(verifyToken);

const verifyResponsable = (req, res, next) => {
  if (req.user?.role !== 'RESPONSABLE') {
    return res.status(403).json({ message: 'Accès réservé au responsable.' });
  }
  next();
};

router.get('/forums', verifyResponsable, forumController.getAllForums);
router.get('/forums/:id_forum/messages', verifyResponsable, forumController.getMessagesByForum);
router.post('/forums/:id_forum/messages', verifyResponsable, forumUpload.single('fichier'), forumController.createMessage);
router.patch('/forums/:id_forum/messages/:id_message', verifyResponsable, forumController.updateMessage);
router.delete('/forums/:id_forum/messages/:id_message', verifyResponsable, forumController.deleteMessage);
router.get('/forums/:id_forum/messages/:id_message/download', verifyResponsable, forumController.downloadMessageFile);

router.get('/certifications/formations', verifyResponsable, certificationController.getClosedFormations);
router.get('/certifications/formations/:id_formation/apprenants', verifyResponsable, certificationController.getFormationLearners);
router.put('/certifications/formations/:id_formation', verifyResponsable, certificationController.saveCertificationSelection);

// 2. Valider une candidature et créer le compte Apprenant
router.post('/formations/:id_formation/valider-promotion', candidatureController.validerPromotion);
router.patch('/candidatures/:id_inscription/preselection', candidatureController.togglePreselection);

module.exports = router;