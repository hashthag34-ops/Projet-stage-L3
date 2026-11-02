// backend/controllers/inscriptionController.js
const db = require('../config/db');
const inscription = require('../Models/inscriptionModel');

const bcrypt = require('bcrypt');

// Obtenir toutes les candidatures pour le responsable
exports.getAllInscriptions = async (req, res) => {
  try {
    const query = inscription.SQL_1;
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
    await db.query(inscription.SQL_11);

    // 1. Mettre à jour l'inscription
    const updateRes = await db.query(
      inscription.SQL_10,
      [statut, motif_decision || null, id]
    );

    const inscription = updateRes.rows[0];

    // 2. Si ACCEPTEE, créer le compte utilisateur et la ligne apprenant (si pas encore créé)
    if (statut === 'ACCEPTEE') {
      const candRes = await db.query(inscription.SQL_9, [inscription.id_candidat]);
      const candidat = candRes.rows[0];

      let userRes = await db.query(
        inscription.SQL_8,
        [candidat.application_email]
      );

      let id_utilisateur;
      if (userRes.rows.length > 0) {
        id_utilisateur = userRes.rows[0].id_utilisateur;
      } else {
        // Créer utilisateur avec mot de passe par défaut : "123456"
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const createdUser = await db.query(
          inscription.SQL_7,
          [candidat.application_email, candidat.nom, candidat.prenom, hashedPassword, candidat.telephone, candidat.age]
        );
        id_utilisateur = createdUser.rows[0].id_utilisateur;
      }

      await db.query(
        inscription.SQL_6,
        [id_utilisateur, candidat.id_candidat]
      );

      const learner = await db.query(
        inscription.SQL_5,
        [id_utilisateur]
      );
      if (learner.rows.length === 0) {
        await db.query(
          inscription.SQL_4,
          [id_utilisateur]
        );
      }
    }

    await db.query(inscription.SQL_3);
    res.status(200).json({ message: `Candidature ${statut.toLowerCase()} avec succès !` });
  } catch (error) {
    await db.query(inscription.SQL_2);
    console.error("Erreur traiterCandidature :", error);
    res.status(500).json({ message: "Erreur lors du traitement de la candidature" });
  }
};