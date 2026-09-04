// backend/controllers/userController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

// 1. Récupérer les utilisateurs avec leur rôle déduit
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id_utilisateur, u.nom, u.prenom, u.email, u.statut_compte, u.date_creation,
        CASE 
          WHEN a.id_administrateur IS NOT NULL THEN 'ADMINISTRATEUR'
          WHEN r.id_responsable IS NOT NULL THEN 'RESPONSABLE'
          WHEN f.id_formateur IS NOT NULL THEN 'FORMATEUR'
          WHEN ap.id_apprenant IS NOT NULL THEN 'APPRENANT'
          ELSE 'UTILISATEUR'
        END AS role,
        f.specialite,
        r.fonction
      FROM utilisateur u
      LEFT JOIN administrateur a ON u.id_utilisateur = a.id_utilisateur
      LEFT JOIN responsable r ON u.id_utilisateur = r.id_utilisateur
      LEFT JOIN formateur f ON u.id_utilisateur = f.id_utilisateur
      LEFT JOIN apprenant ap ON u.id_utilisateur = ap.id_utilisateur
      ORDER BY u.date_creation DESC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getAllUsers :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 2. Créer un utilisateur et l'assigner à sa table rôle
exports.createUser = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, role, specialite, fonction } = req.body;

  try {
    const userCheck = await db.query('SELECT * FROM utilisateur WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

    await db.query('BEGIN');

    // Insertion dans utilisateur
    const insertUserQuery = `
      INSERT INTO utilisateur (nom, prenom, email, mot_de_passe)
      VALUES ($1, $2, $3, $4)
      RETURNING id_utilisateur, nom, prenom, email;
    `;
    const userRes = await db.query(insertUserQuery, [nom, prenom, email, hashedPassword]);
    const newUser = userRes.rows[0];

    // Insertion selon le rôle
    if (role === 'FORMATEUR') {
      await db.query(
        'INSERT INTO formateur (id_utilisateur, specialite) VALUES ($1, $2)', 
        [newUser.id_utilisateur, specialite || 'Général']
      );
    } else if (role === 'RESPONSABLE') {
      await db.query(
        'INSERT INTO responsable (id_utilisateur, fonction) VALUES ($1, $2)', 
        [newUser.id_utilisateur, fonction || 'Responsable Formation']
      );
    } else if (role === 'ADMINISTRATEUR') {
      await db.query(
        'INSERT INTO administrateur (id_utilisateur) VALUES ($1)', 
        [newUser.id_utilisateur]
      );
    }

    await db.query('COMMIT');
    res.status(201).json({ message: "Utilisateur créé avec succès !", user: { ...newUser, role } });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Erreur createUser :", error);
    res.status(500).json({ message: "Erreur lors de la création de l'utilisateur" });
  }
};

// 3. Supprimer un utilisateur (Cascade automatique si ON DELETE CASCADE sur la table rôle)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Si la clé étrangère est en ON DELETE RESTRICT, on nettoie d'abord les rôles
    await db.query('BEGIN');
    await db.query('DELETE FROM formateur WHERE id_utilisateur = $1', [id]);
    await db.query('DELETE FROM responsable WHERE id_utilisateur = $1', [id]);
    await db.query('DELETE FROM administrateur WHERE id_utilisateur = $1', [id]);
    await db.query('DELETE FROM apprenant WHERE id_utilisateur = $1', [id]);
    
    const { rowCount } = await db.query('DELETE FROM utilisateur WHERE id_utilisateur = $1', [id]);
    await db.query('COMMIT');

    if (rowCount === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.status(200).json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Erreur deleteUser :", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

//4. MODIFICATION D'UN UTILISATEUR
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, mot_de_passe, specialite, fonction } = req.body;
    try {
        await db.query('BEGIN');
        await db.query(`
            UPDATE utilisateur set nom = $1, prenom = $2, email = $3, mot_de_passe = $4 WHERE id_utilisateur = $5
        `, [nom, prenom, email, mot_de_passe, id]);
    }
    catch (error) {
        await db.query('ROLLBACK');
        console.error("Erreur updateUser :", error);
        res.status(500).json({ message: "Erreur lors de la modification de l'utilisateur" });
    }
};