// backend/routes/apprenantRoutes.js
const express = require('express');
const router = express.Router();
const apprenantController = require('../controllers/apprenantController');
const forumController = require('../controllers/forumController');
// Enlève les accolades { } si verifyToken est l'export par défaut
const verifyToken = require('../middleware/authMiddleware'); // Ton middleware JWT

// Middleware de sécurité appliqué sur toutes les routes apprenant
router.use(verifyToken);

// Endpoints Dashboard, Planning & Forums
router.get('/mes-formations', apprenantController.getMesFormations);
router.get('/seances', apprenantController.getMesSeances);
router.get('/evaluations', apprenantController.getMesEvaluations);
router.get('/evaluations/:id', apprenantController.getEvaluationApprenant);
router.post('/evaluations/:id/tentatives', apprenantController.startEvaluationAttempt);
router.post('/evaluations/tentatives/:id_tentative/terminer', apprenantController.submitEvaluationAttempt);
router.get('/forums', apprenantController.getMesForums);

// Endpoints Messages Forum
router.get('/forums/:id_forum/messages', forumController.getMessagesByForum);
router.post('/forums/:id_forum/messages', forumController.createMessage);
router.get('/forums/:id_forum/messages/:id_message/download', forumController.downloadMessageFile);

module.exports = router;