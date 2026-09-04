// backend/controllers/inscriptionController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

// Obtenir toutes les candidatures pour le responsable
exports.getAllInscriptions = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.*, 
        c.nom, c.prenom, c.email, c.telephone, c.niveau_etude,
        f.titre AS formation_titre
      FROM inscription i
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      ORDER BY i.date_inscription DESC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Valider ou Refuser une candidature
exports.traiterCandidature = async (req, res) => {
  const { id } = req.params; // id_inscription
  const { statut, motif_decision } = req.body; // ACCEPTEE ou REFUSEE

  try {
    await db.query('BEGIN');

    // 1. Mettre à jour l'inscription
    const updateRes = await db.query(
      `UPDATE inscription 
       SET statut = $1, motif_decision = $2, date_decision = CURRENT_TIMESTAMP 
       WHERE id_inscription = $3 RETURNING *`,
      [statut, motif_decision || null, id]
    );

    const inscription = updateRes.rows[0];

    // 2. Si ACCEPTEE, créer le compte utilisateur et la ligne apprenant (si pas encore créé)
    if (statut === 'ACCEPTEE') {
      const candRes = await db.query('SELECT * FROM candidat WHERE id_candidat = $1', [inscription.id_candidat]);
      const candidat = candRes.rows[0];

      // Vérifier si l'apprenant existe déjà
      const checkApprenant = await db.query('SELECT * FROM apprenant WHERE id_candidat = $1', [candidat.id_candidat]);
      
      if (checkApprenant.rows.length === 0) {
        // Créer utilisateur avec mot de passe par défaut : "123456"
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const userRes = await db.query(
          `INSERT INTO utilisateur (email, nom, prenom, mot_de_passe, telephone, age)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
           RETURNING id_utilisateur`,
          [candidat.email, candidat.nom, candidat.prenom, hashedPassword, candidat.telephone, candidat.age]
        );

        const id_utilisateur = userRes.rows[0].id_utilisateur;

        // Insérer dans apprenant
        await db.query(
          'INSERT INTO apprenant (id_utilisateur, id_candidat) VALUES ($1, $2)',
          [id_utilisateur, candidat.id_candidat]
        );
      }
    }

    await db.query('COMMIT');
    res.status(200).json({ message: `Candidature ${statut.toLowerCase()} avec succès !` });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Erreur traiterCandidature :", error);
    res.status(500).json({ message: "Erreur lors du traitement de la candidature" });
  }
};