// backend/controllers/candidatController.js
const db = require('../config/db');

exports.postuler = async (req, res) => {
  const {
    // Infos Candidat
    email, nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere,
    // Infos Inscription
    id_formation, motivation, objectif, projet_apres_formation, source_information, a_deja_suivi_formation, formation_precedente, retour_suggestion, conditions_acceptees
  } = req.body;

  if (!conditions_acceptees) {
    return res.status(400).json({ message: "Vous devez accepter les conditions." });
  }

  try {
    await db.query('BEGIN');

    // 1. Créer ou récupérer le candidat
    let candidatRes = await db.query('SELECT id_candidat FROM candidat WHERE email = $1', [email]);
    let id_candidat;

    if (candidatRes.rows.length > 0) {
      id_candidat = candidatRes.rows[0].id_candidat;
    } else {
      const newCandidat = await db.query(
        `INSERT INTO candidat (email, nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id_candidat`,
        [email, nom, prenom, age || null, genre || null, telephone || null, niveau_etude || null, situation_professionnelle || null, etablissement || null, filiere || null]
      );
      id_candidat = newCandidat.rows[0].id_candidat;
    }

    // 2. Vérifier si une inscription existe déjà pour cette formation
    const checkInscription = await db.query(
      'SELECT id_inscription FROM inscription WHERE id_candidat = $1 AND id_formation = $2',
      [id_candidat, id_formation]
    );

    if (checkInscription.rows.length > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: "Vous avez déjà postulé à cette formation." });
    }

    // 3. Créer l'inscription
    const newInscription = await db.query(
      `INSERT INTO inscription (
        id_candidat, id_formation, motivation, objectif, projet_apres_formation, 
        source_information, a_deja_suivi_formation, formation_precedente, retour_suggestion, conditions_acceptees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        id_candidat, id_formation, motivation, objectif, projet_apres_formation, 
        source_information, a_deja_suivi_formation || false, formation_precedente, retour_suggestion, conditions_acceptees
      ]
    );

    await db.query('COMMIT');
    res.status(201).json({ message: "Candidature envoyée avec succès !", inscription: newInscription.rows[0] });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Erreur postuler :", error);
    res.status(500).json({ message: "Erreur lors de la soumission de votre candidature" });
  }
};