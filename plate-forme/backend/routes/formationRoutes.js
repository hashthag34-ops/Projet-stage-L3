// backend/routes/formationRoutes.js
const express = require('express');
const router = express.Router();
const authOptional = require('../middleware/authOptional');
const formationController = require('../controllers/formationController');


// Routes publiques
router.get('/publiques', formationController.getFormationsPubliques);
router.get('/catalogue', authOptional.authOptional, formationController.getCatalogue);

// Liste globale des formateurs (pour les déroulants de sélection)
router.get('/formateurs/all', formationController.getAllFormateursList);

// CRUD Formation
router.get('/', formationController.getAllFormations);
router.get('/:id', formationController.getFormationById);
router.post('/', formationController.createFormation);
router.put('/:id', formationController.updateFormation);
router.delete('/:id', formationController.deleteFormation);

// Affectations Formateurs
router.get('/:id/formateurs', formationController.getFormateursByFormation);
router.post('/:id/formateurs', formationController.assignFormateur);
router.delete('/:id/formateurs/:idFormateur', formationController.removeFormateur);

module.exports = router;