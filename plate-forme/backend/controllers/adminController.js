// backend/controllers/adminController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

// Lister tous les utilisateurs avec leur rôle
exports.getUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id_utilisateur, u.email, u.nom, u.prenom, u.telephone, u.age, u.photo_profil, u.statut_compte, u.date_creation,
        f.specialite,
        r.fonction,
        ap.id_apprenant,
        latest_candidature.formation_titre,
        latest_candidature.motivation,
        latest_candidature.objectif,
        latest_candidature.projet_apres_formation,
        latest_candidature.niveau_etude,
        latest_candidature.situation_professionnelle,
        latest_candidature.etablissement,
        latest_candidature.filiere,
        latest_candidature.statut AS candidature_statut,
        CASE 
          WHEN a.id_administrateur IS NOT NULL THEN 'ADMINISTRATEUR'
          WHEN r.id_responsable IS NOT NULL THEN 'RESPONSABLE'
          WHEN f.id_formateur IS NOT NULL THEN 'FORMATEUR'
          WHEN ap.id_apprenant IS NOT NULL THEN 'APPRENANT'
          ELSE 'UTILISATEUR'
        END AS role
      FROM utilisateur u
      LEFT JOIN administrateur a ON u.id_utilisateur = a.id_utilisateur
      LEFT JOIN responsable r ON u.id_utilisateur = r.id_utilisateur
      LEFT JOIN formateur f ON u.id_utilisateur = f.id_utilisateur
      LEFT JOIN apprenant ap ON u.id_utilisateur = ap.id_utilisateur
      LEFT JOIN LATERAL (
        SELECT f.titre AS formation_titre, i.motivation, i.objectif, i.projet_apres_formation,
               c.niveau_etude, c.situation_professionnelle, c.etablissement, c.filiere,
               i.statut
        FROM inscription i
        JOIN candidat c ON c.id_candidat = i.id_candidat
        JOIN formation f ON f.id_formation = i.id_formation
        WHERE c.email = u.email
        ORDER BY i.date_inscription DESC
        LIMIT 1
      ) latest_candidature ON TRUE
      ORDER BY u.id_utilisateur DESC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getUsers :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Créer un utilisateur et l'assigner à son rôle
exports.createUser = async (req, res) => {
  const { email, mot_de_passe, nom, prenom, telephone, age, role, specialite, fonction } = req.body;

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // 2. Insertion dans 'utilisateur'
    const userQuery = `
      INSERT INTO utilisateur (email, mot_de_passe, nom, prenom, telephone, age)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_utilisateur;
    `;
    const userRes = await client.query(userQuery, [email, hashedPassword, nom, prenom, telephone || null, age || null]);
    const userId = userRes.rows[0].id_utilisateur;
    console.log("Utilisateur creer", userId);


    // 3. Liaison avec la table correspondant au rôle
    if (role === 'ADMINISTRATEUR') {
      await client.query('INSERT INTO administrateur (id_utilisateur) VALUES ($1)', [userId]);
    } else if (role === 'RESPONSABLE') {
      await client.query('INSERT INTO responsable (id_utilisateur, fonction) VALUES ($1, $2)', [userId, fonction || null]);
    } else if (role === 'FORMATEUR') {
      await client.query('INSERT INTO formateur (id_utilisateur, specialite) VALUES ($1, $2)', [userId, specialite || null]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: "Utilisateur et rôle créés avec succès." });
    console.log("Utilisateur et rôle créés avec succès.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur createUser :", error);
    res.status(500).json({ message: error.detail || "Erreur lors de la création de l'utilisateur." });
  } finally {
    client.release();
  }
};

// Changer le statut d'un compte (ACTIF, DESACTIVE, SUSPENDU)
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { statut_compte } = req.body;

  try {
    await db.query('UPDATE utilisateur SET statut_compte = $1 WHERE id_utilisateur = $2', [statut_compte, id]);
    res.status(200).json({ message: "Statut mis à jour." });
  } catch (error) {
    console.error("Erreur updateUserStatus :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};