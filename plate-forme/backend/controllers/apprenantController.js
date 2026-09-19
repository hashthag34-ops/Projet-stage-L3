// backend/controllers/apprenantController.js
const db = require('../config/db'); // Ton module de connexion MySQL / Postgres

// 1. Récupérer les formations auxquelles l'apprenant est inscrit (avec progression)
exports.getMesFormations = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur; // Issu du middleware d'authentification JWT

  try {
    const query = `
      SELECT f.id_formation, f.titre, f.description, f.statut, i.statut AS statut_candidature
      FROM apprenant a
      JOIN inscription i ON a.id_candidat = i.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      WHERE a.id_utilisateur = $1 AND i.statut = 'ACCEPTEE'
    `;
    const { rows } = await db.query(query, [id_utilisateur]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des formations" });
  }
};

// 2. Récupérer les séances de cours de l'apprenant (Planning)
exports.getMesSeances = async (req, res) => {
  try {
    const id_utilisateur = req.user.id_utilisateur; // Récupéré depuis le token JWT ou la session

    // Requête SQL complète :
    // 1. Trouve l'apprenant correspondant à l'utilisateur connecté
    // 2. Récupère le candidat associé à cet apprenant
    // 3. Récupère les inscriptions ACCEPTEES de ce candidat
    // 4. Joint les formations et leurs séances
    // 5. Joint la table presence pour récupérer le statut du scan s'il existe (PRESENT / ABSENT / RETARD)
    const query = `
      SELECT 
        s.id_seance,
        s.titre,
        s.description,
        s.date_seance,
        s.heure_debut,
        s.heure_fin,
        s.type_seance,
        s.salle,
        f.id_formation,
        f.titre AS titre_formation,
        p.statut AS statut_presence,
        p.date_scan
      FROM utilisateur u
      JOIN apprenant a ON u.id_utilisateur = a.id_utilisateur
      JOIN inscription i ON a.id_candidat = i.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      JOIN seance s ON f.id_formation = s.id_formation
      LEFT JOIN presence p ON p.id_seance = s.id_seance AND p.id_apprenant = a.id_apprenant
      WHERE u.id_utilisateur = $1
        AND i.statut = 'ACCEPTEE'
      ORDER BY s.date_seance ASC, s.heure_debut ASC;
    `;

    const { rows } = await db.query(query, [id_utilisateur]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur récupération planning apprenant :", error);
    return res.status(500).json({ error: "Erreur lors du chargement du planning" });
  }
};

// 3. Récupérer les forums des formations autorisées
exports.getMesForums = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur;

  try {
    const query = `
      SELECT fo.id_forum, fo.nom, fo.description, f.titre AS titre_formation
      FROM apprenant a
      JOIN inscription i ON a.id_candidat = i.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      JOIN forum fo ON fo.id_formation = f.id_formation
      WHERE a.id_utilisateur = $1 AND i.statut = 'ACCEPTEE'
    `;
    const { rows } = await db.query(query, [id_utilisateur]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des forums" });
  }
};