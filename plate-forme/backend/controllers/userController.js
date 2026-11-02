// backend/controllers/userController.js
const db = require('../config/db');
const user = require('../Models/userModel');

const bcrypt = require('bcrypt');
const { emitToRoles, disconnectUser } = require('../services/realtime');

// 1. Récupérer les utilisateurs avec leur rôle déduit
exports.getAllUsers = async (req, res) => {
  try {
    const query = user.SQL_1;
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
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    const userCheck = await db.query(user.SQL_16, [normalizedEmail]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

    await db.query(user.SQL_6);

    // Insertion dans utilisateur
    const insertUserQuery = user.SQL_2;
    const userRes = await db.query(insertUserQuery, [nom, prenom, normalizedEmail, hashedPassword]);
    const newUser = userRes.rows[0];

    // Insertion selon le rôle
    if (role === 'FORMATEUR') {
      await db.query(
        user.SQL_15,
        [newUser.id_utilisateur, specialite || 'Général']
      );
    } else if (role === 'RESPONSABLE') {
      await db.query(
        user.SQL_14,
        [newUser.id_utilisateur, fonction || 'Responsable Formation']
      );
    } else if (role === 'ADMINISTRATEUR') {
      await db.query(
        user.SQL_13,
        [newUser.id_utilisateur]
      );
    }

    await db.query(user.SQL_4);
    res.status(201).json({ message: "Utilisateur créé avec succès !", user: { ...newUser, role } });
  } catch (error) {
    await db.query(user.SQL_3);
    console.error("Erreur createUser :", error);
    if (error.code === '23505') {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }
    res.status(500).json({ message: "Erreur lors de la création de l'utilisateur" });
  }
};

// 3. Supprimer un compte en conservant les historiques du profil apprenant
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  let client;
  let transactionStarted = false;

  try {
    client = await db.connect();
    await client.query(user.SQL_6);
    transactionStarted = true;
    await client.query(user.SQL_12, [id]);
    await client.query(user.SQL_11, [id]);
    await client.query(user.SQL_10, [id]);
    
    // Keep the learner profile so its attendance, evaluations and certifications remain linked.
    const { rowCount } = await client.query(user.SQL_9, [id]);
    await client.query(user.SQL_4);
    transactionStarted = false;

    if (rowCount === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    disconnectUser(id);
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.status(200).json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query(user.SQL_3);
      } catch (rollbackError) {
        console.error('Erreur lors de l’annulation de la suppression :', rollbackError);
      }
    }
    console.error("Erreur deleteUser :", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  } finally {
    client?.release();
  }
};

//4. MODIFICATION D'UN UTILISATEUR
exports.updateUserProfile = async (req, res) => {
  try {
    const { nom, prenom, telephone, age } = req.body || {};
    const userId = req.user.id_utilisateur || req.user.id; // Déduit du token via verifyToken
    const photo_profil = req.file ? req.file.filename : null;

    await db.query(user.SQL_6);

    if (photo_profil) {
      await db.query(
        user.SQL_8,
        [nom, prenom, telephone, age, photo_profil, userId]
      );
    } else {
      await db.query(
        user.SQL_7,
        [nom, prenom, telephone, age, userId]
      );
    }

    await db.query(user.SQL_4); // <-- ESSENTIEL pour valider la transaction SQL !

    res.status(200).json({
      message: "Profil mis à jour avec succès !",
      photo_profil: photo_profil,
      user: { nom, prenom, telephone, age }
    });

  } catch (error) {
    await db.query(user.SQL_3);
    console.error("Erreur updateUserProfile :", error);
    res.status(500).json({ message: "Erreur lors de la modification du profil" });
  }
};

// 2. Modification d'un utilisateur par un Admin (via :id)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, email } = req.body || {};

  try {
    await db.query(user.SQL_6);
    await db.query(
      user.SQL_5,
      [nom, prenom, email, id]
    );
    await db.query(user.SQL_4);

    res.status(200).json({ message: "Utilisateur mis à jour avec succès !" });
  } catch (error) {
    await db.query(user.SQL_3);
    console.error("Erreur updateUser :", error);
    res.status(500).json({ message: "Erreur lors de la modification de l'utilisateur" });
  }
};