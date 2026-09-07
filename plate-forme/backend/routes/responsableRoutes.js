// backend/routes/responsableRoutes.js
const express = require('express');
const router = express.Router();
const candidatureController = require('../controllers/candidatureController');
const verifyToken = require('../middlewares/authMiddleware');

// Middleware d'authentification (si tu l'utilises)
router.use(verifyToken);

// 1. Récupérer la liste de toutes les candidatures / inscriptions
router.get('/candidatures', async (req, res) => {
  const db = require('../config/db');
  try {
    const result = await db.query(`
      SELECT 
        i.id_inscription,
        i.statut,
        i.date_inscription,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        f.titre AS formation_titre
      FROM inscription i
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      ORDER BY i.date_inscription DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récupération candidatures :", err);
    res.status(500).json({ message: "Erreur lors de la récupération des candidatures." });
  }
});

// 2. Valider une candidature et créer le compte Apprenant
router.post('/candidatures/:id_inscription/valider', candidatureController.validerCandidature);

module.exports = router;