const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const formateurController = require('../controllers/formateurController');
const forumController = require('../controllers/forumController');

router.use(verifyToken);

router.get('/formations', formateurController.getFormations);
router.get('/planning', formateurController.getPlanning);
router.post('/planning', formateurController.createSeance);
router.patch('/planning/:id_seance', formateurController.updateSeance);
router.delete('/planning/:id_seance', formateurController.deleteSeance);
router.get('/apprenants', formateurController.getStudents);
router.get('/forums', formateurController.getForums);
router.get('/forums/:id_forum/messages', forumController.getMessagesByForum);
router.post('/forums/:id_forum/messages', forumController.createMessage);

router.get('/evaluations', formateurController.getEvaluations);
router.post('/evaluations', formateurController.createEvaluation);
router.get('/evaluations/resultats', formateurController.getResults);
router.get('/evaluations/:id', formateurController.getEvaluation);
router.post('/evaluations/:id/questions', formateurController.addQuestion);
router.patch('/evaluations/:id/statut', formateurController.updateEvaluationStatus);
router.delete('/evaluations/:id/questions/:questionId', formateurController.deleteQuestion);

module.exports = router;
