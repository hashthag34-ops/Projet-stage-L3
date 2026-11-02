// backend/controllers/authController.js
const db = require('../config/db');
const auth = require('../Models/authModel');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { emitToRoles } = require('../services/realtime');

exports.setupAccount = async (req, res) => {
  const { email, token, username, mot_de_passe } = req.body;
  const photo_profil = req.file ? req.file.filename : null;
  const hasToken = typeof token === 'string' && token.length > 0;
  const hasEmail = typeof email === 'string' && email.trim().length > 0;

  if (
    (!hasEmail && !hasToken)
    || (token && !hasToken)
    || (email && !hasEmail)
    || typeof mot_de_passe !== 'string'
    || !mot_de_passe
    || typeof username !== 'string'
    || !username.trim()
  ) {
    return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires." });
  }

  try {
    // 1. Hacher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

    // 2. Mettre à jour l'utilisateur dans la base de données
    const result = hasToken
      ? await db.query(
        auth.SQL_7,
        [
          username,
          hashedPassword,
          photo_profil || null,
          crypto.createHash('sha256').update(token).digest('hex')
        ]
      )
      : await db.query(
        auth.SQL_6,
        [username, hashedPassword, photo_profil || null, email]
      );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: token
          ? "Ce lien de configuration est invalide, expiré ou déjà utilisé. Demandez un nouvel e-mail d’invitation."
          : "Aucun compte apprenant non configuré n’est associé à cet email."
      });
    }

    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.json({
      message: "Compte configuré avec succès ! Vous pouvez maintenant vous connecter.",
      user: result.rows[0]
    });
  } catch (err) {
    console.error("Erreur lors de la configuration du compte :", err);
    
    // Gérer l'erreur d'unicité (ex: username déjà pris)
    if (err.code === '23505') {
      return res.status(400).json({ message: "Ce nom d'utilisateur est déjà utilisé." });
    }

    res.status(500).json({ message: "Erreur serveur lors de la configuration du compte." });
  }
};

// 1. Connexion (Login)
exports.login = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  try {
    // Vérifier l'existence de l'utilisateur
    const userQuery = await db.query(auth.SQL_5, [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: "Identifiants incorrects." });
    }

    const user = userQuery.rows[0];

    if (user.email_verifie === false) {
      return res.status(403).json({ message: "Veuillez vérifier votre adresse e-mail en configurant votre compte depuis le lien reçu." });
    }
    if (!user.mot_de_passe) {
      return res.status(403).json({ message: "Votre compte n’est pas encore configuré. Utilisez l’onglet « Mot de passe oublié » pour terminer sa configuration." });
    }

    // Vérifier le statut du compte
    if (user.statut_compte !== 'ACTIF') {
      return res.status(403).json({ message: "Votre compte est désactivé ou suspendu." });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(400).json({ message: "Identifiants incorrects." });
    }

    // Déterminer le rôle
    const roleQuery = auth.SQL_1;
    const roleRes = await db.query(roleQuery, [user.id_utilisateur]);
    const role = roleRes.rows[0]?.role || 'UTILISATEUR';
    
    console.log(role);
    // Mettre à jour la date de dernière connexion
    await db.query(auth.SQL_4, [user.id_utilisateur]);

    // Générer le token JWT
    const token = jwt.sign(
      { id_utilisateur: user.id_utilisateur, email: user.email, role },
      process.env.JWT_SECRET || 'votre_secret_key',
      { expiresIn: '24h' }
    );

    // Ne pas renvoyer le mot de passe
    delete user.mot_de_passe;

    res.status(200).json({
      token,
      user: { ...user, role }
    });
  } catch (error) {
    console.error("Erreur Login :", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
};

// 2. Obtenir le profil de l'utilisateur connecté (/auth/me)
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id_utilisateur;

    const query = auth.SQL_2;

    const { rows } = await db.query(query, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Erreur getMe :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// 3. Mettre à jour le profil (/users/profile)
exports.updateProfile = async (req, res) => {
  const userId = req.user.id_utilisateur;
  const { nom, prenom, telephone, age, photo_profil } = req.body;

  try {
    const updateQuery = auth.SQL_3;

    const { rows } = await db.query(updateQuery, [
      nom, prenom, telephone || null, age || null, photo_profil || null, userId
    ]);

    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.status(200).json({ message: "Profil mis à jour avec succès !", user: rows[0] });
  } catch (error) {
    console.error("Erreur updateProfile :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};