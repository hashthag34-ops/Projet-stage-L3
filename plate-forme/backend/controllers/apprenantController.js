// backend/controllers/apprenantController.js
const db = require('../config/db'); // Ton module de connexion MySQL / Postgres

// 1. Récupérer les formations auxquelles l'apprenant est inscrit (avec progression)
exports.getMesFormations = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur; // Issu du middleware d'authentification JWT

  try {
    const query = `
      SELECT f.id_formation, f.titre, f.description, f.statut, c.statut as statut_candidature
      FROM candidatures c
      JOIN formations f ON c.id_formation = f.id_formation
      WHERE c.id_utilisateur = ? AND c.statut = 'ACCEPTEE'
    `;
    const [formations] = await db.query(query, [id_utilisateur]);
    res.json(formations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des formations" });
  }
};

// 2. Récupérer les séances de cours de l'apprenant (Planning)
exports.getMesSeances = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur;

  try {
    const query = `
      SELECT s.id_seance, s.titre, s.description, s.type_seance, s.date_seance, s.heure_debut, s.heure_fin, s.salle, f.titre as formation_titre
      FROM seances s
      JOIN formations f ON s.id_formation = f.id_formation
      JOIN candidatures c ON f.id_formation = c.id_formation
      WHERE c.id_utilisateur = ? AND c.statut = 'ACCEPTEE'
      ORDER BY s.date_seance ASC, s.heure_debut ASC
    `;
    const [seances] = await db.query(query, [id_utilisateur]);
    res.json(seances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération du planning" });
  }
};

// 3. Récupérer les forums des formations autorisées
exports.getMesForums = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur;

  try {
    const query = `
      SELECT forum.id_forum, forum.nom, forum.description, f.titre as titre_formation
      FROM forums forum
      JOIN formations f ON forum.id_formation = f.id_formation
      JOIN candidatures c ON f.id_formation = c.id_formation
      WHERE c.id_utilisateur = ? AND c.statut = 'ACCEPTEE'
    `;
    const [forums] = await db.query(query, [id_utilisateur]);
    res.json(forums);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des forums" });
  }
};