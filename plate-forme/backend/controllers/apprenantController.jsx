// backend/controllers/apprenantController.js
const db = require('../config/db');

// Récupérer les séances de l'apprenant connecté
exports.getMesSeances = async (req, res) => {
  const userId = req.user.id_utilisateur;

  try {
    const query = `
      SELECT s.*, f.titre AS formation_titre
      FROM seance s
      JOIN formation f ON s.id_formation = f.id_formation
      JOIN inscription i ON f.id_formation = i.id_formation
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN apprenant ap ON c.id_candidat = ap.id_candidat
      WHERE ap.id_utilisateur = $1 AND i.statut = 'ACCEPTEE'
      ORDER BY s.date_seance ASC, s.heure_debut ASC;
    `;
    const { rows } = await db.query(query, [userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getMesSeances :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les forums des formations suivies
exports.getMesForums = async (req, res) => {
  const userId = req.user.id_utilisateur;

  try {
    const query = `
      SELECT fo.* 
      FROM forum fo
      JOIN formation f ON fo.id_formation = f.id_formation
      JOIN inscription i ON f.id_formation = i.id_formation
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN apprenant ap ON c.id_candidat = ap.id_candidat
      WHERE ap.id_utilisateur = $1 AND i.statut = 'ACCEPTEE';
    `;
    const { rows } = await db.query(query, [userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getMesForums :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};