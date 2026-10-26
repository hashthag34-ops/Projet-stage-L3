// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const certificationController = require('../controllers/certificationController');
const verifyToken = require('../middleware/authMiddleware');

// Middleware d'autorisation Administrateur
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMINISTRATEUR') {
    next();
  } else {
    res.status(403).json({ message: "Accès réservé aux administrateurs." });
  }
};

router.use(verifyToken, requireAdmin);

router.get('/statistics', adminController.getStatistics);
router.get('/certifications/formations', certificationController.getAdminCertificationFormations);
router.get('/certifications/formations/:id_formation/apprenants', certificationController.getAdminCertificationLearners);
router.get('/user-activity', adminController.getUserActivityByMonth);
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.delete('/users/:id', (req, res, next) => {
  if (Number(req.params.id) === Number(req.user.id_utilisateur)) {
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }
  return userController.deleteUser(req, res, next);
});
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/synthetic-data/formations', adminController.getSyntheticDataFormations);
router.post('/synthetic-data/candidates', adminController.createSyntheticCandidates);

module.exports = router;