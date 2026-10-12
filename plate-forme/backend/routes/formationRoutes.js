// backend/routes/formationRoutes.js
const express = require('express');
const router = express.Router();
const authOptional = require('../middleware/authOptional');
const verifyToken = require('../middleware/authMiddleware');
const formationController = require('../controllers/formationController');
const uploadFormationImage = require('../middleware/formationUpload');


// Routes publiques
router.post('/upload', (req, res, next) => {
  uploadFormationImage.single('image')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    next();
  });
}, formationController.uploadFormationImage);
router.get('/publiques', formationController.getFormationsPubliques);
router.get('/catalogue', authOptional.authOptional, formationController.getCatalogue);
router.get('/:id/avis', formationController.getFormationAvis);
router.post('/:id/avis', verifyToken, formationController.createFormationAvis);

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