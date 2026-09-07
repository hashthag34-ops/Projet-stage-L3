// backend/controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Pour la creation auto du profil apprenant apres validation de la candidature
exports.setupAccount = async (req, res) => {
  const { email, username, mot_de_passe, photo_profil } = req.body;

  if (!email || !mot_de_passe || !username) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const result = await db.query(
      `UPDATE utilisateur 
       SET username = $1, mot_de_passe = $2, photo_profil = $3
       WHERE email = $4
       RETURNING id_utilisateur, email, nom, prenom, username`,
      [username, hashedPassword, photo_profil || null, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    res.json({ message: "Compte configuré avec succès ! Vous pouvez maintenant vous connecter.", user: result.rows[0] });
  } catch (err) {
    console.error("Erreur configuration compte :", err);
    res.status(500).json({ message: "Erreur lors de la configuration du compte." });
  }
};

// 1. Connexion (Login)
exports.login = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  try {
    // Vérifier l'existence de l'utilisateur
    const userQuery = await db.query('SELECT * FROM utilisateur WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: "Identifiants incorrects." });
    }

    const user = userQuery.rows[0];

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
    const roleQuery = `
      SELECT 
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
      WHERE u.id_utilisateur = $1;
    `;
    const roleRes = await db.query(roleQuery, [user.id_utilisateur]);
    const role = roleRes.rows[0]?.role || 'UTILISATEUR';
    
    console.log(role);
    // Mettre à jour la date de dernière connexion
    await db.query('UPDATE utilisateur SET date_derniere_connexion = CURRENT_TIMESTAMP WHERE id_utilisateur = $1', [user.id_utilisateur]);

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

    const query = `
      SELECT 
        u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.age, u.photo_profil, u.statut_compte,
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
      WHERE u.id_utilisateur = $1;
    `;

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
    const updateQuery = `
      UPDATE utilisateur 
      SET nom = $1, prenom = $2, telephone = $3, age = $4, photo_profil = $5
      WHERE id_utilisateur = $6
      RETURNING id_utilisateur, nom, prenom, email, telephone, age, photo_profil;
    `;

    const { rows } = await db.query(updateQuery, [
      nom, prenom, telephone || null, age || null, photo_profil || null, userId
    ]);

    res.status(200).json({ message: "Profil mis à jour avec succès !", user: rows[0] });
  } catch (error) {
    console.error("Erreur updateProfile :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};