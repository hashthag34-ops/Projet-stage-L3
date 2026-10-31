const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const CODE_EXPIRATION_MINUTES = 10;
const REQUEST_COOLDOWN_MINUTES = 1;
const MAX_CODE_ATTEMPTS = 5;
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const isValidPassword = (password) => (
  typeof password === 'string' && password.length >= 8 && password.length <= 72
);

const createAndSendCode = async (user, requestCodeQuery) => {
  const code = String(crypto.randomInt(10_000_000, 100_000_000));
  const codeHash = await bcrypt.hash(code, 10);
  const result = await db.query(requestCodeQuery, [
    codeHash,
    user.id_utilisateur
  ]);

  if (result.rowCount === 0) return false;

  try {
    await transporter.sendMail({
      from: `"Plateforme Formations" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Code de changement de mot de passe',
      text: `Votre code de vérification est : ${code}. Il expire dans ${CODE_EXPIRATION_MINUTES} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
          <h2>Changement de mot de passe</h2>
          <p>Utilisez le code ci-dessous pour continuer. Il expire dans ${CODE_EXPIRATION_MINUTES} minutes.</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${code}</p>
          <p>Si vous n’avez pas demandé ce changement, ignorez cet e-mail.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    await db.query(
      `UPDATE utilisateur
       SET password_reset_code_hash = NULL,
           password_reset_code_expiration = NULL,
           password_reset_code_requested_at = NULL,
           password_reset_code_attempts = 0
       WHERE id_utilisateur = $1 AND password_reset_code_hash = $2`,
      [user.id_utilisateur, codeHash]
    );
    throw error;
  }
};

const codeRequestQuery = `
  UPDATE utilisateur
  SET password_reset_code_hash = $1,
      password_reset_code_expiration = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
      password_reset_code_requested_at = CURRENT_TIMESTAMP,
      password_reset_code_attempts = 0
  WHERE id_utilisateur = $2
    AND (password_reset_code_requested_at IS NULL
         OR password_reset_code_requested_at < CURRENT_TIMESTAMP - INTERVAL '1 minute')
  RETURNING id_utilisateur
`;

const verifyCodeAndUpdatePassword = async (user, code, newPassword) => {
  if (!user.password_reset_code_hash
      || user.password_reset_code_attempts >= MAX_CODE_ATTEMPTS) {
    return false;
  }

  const isCodeValid = await bcrypt.compare(code, user.password_reset_code_hash);
  if (!isCodeValid) {
    await db.query(
      `UPDATE utilisateur
       SET password_reset_code_attempts = LEAST(password_reset_code_attempts + 1, $2)
       WHERE id_utilisateur = $1
         AND password_reset_code_hash = $3
         AND password_reset_code_expiration > CURRENT_TIMESTAMP
         AND password_reset_code_attempts < $2`,
      [user.id_utilisateur, MAX_CODE_ATTEMPTS, user.password_reset_code_hash]
    );
    return false;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await db.query(
    `UPDATE utilisateur
     SET mot_de_passe = $1,
         password_reset_code_hash = NULL,
         password_reset_code_expiration = NULL,
         password_reset_code_requested_at = NULL,
         password_reset_code_attempts = 0
     WHERE id_utilisateur = $2
       AND password_reset_code_hash = $3
       AND password_reset_code_expiration > CURRENT_TIMESTAMP
       AND password_reset_code_attempts < $4`,
    [passwordHash, user.id_utilisateur, user.password_reset_code_hash, MAX_CODE_ATTEMPTS]
  );
  return result.rowCount > 0;
};

exports.requestForgotPasswordCode = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || email.length > 255) {
    return res.status(400).json({ message: 'Veuillez saisir une adresse e-mail valide.' });
  }

  try {
    const { rows } = await db.query(
      `SELECT id_utilisateur, email
       FROM utilisateur
       WHERE LOWER(email) = LOWER($1)
         AND statut_compte = 'ACTIF'
         AND COALESCE(email_verifie, TRUE) = TRUE`,
      [email]
    );

    if (rows.length > 0) {
      await createAndSendCode(rows[0], codeRequestQuery);
    }

    return res.json({
      message: 'Si un compte actif correspond à cette adresse, un code de vérification vient d’être envoyé.'
    });
  } catch (error) {
    console.error('Erreur demande de réinitialisation du mot de passe :', error);
    return res.status(500).json({ message: 'Impossible d’envoyer le code pour le moment. Réessayez plus tard.' });
  }
};

exports.resetForgottenPassword = async (req, res) => {
  const { email, code, new_password: newPassword } = req.body || {};
  if (typeof email !== 'string' || !email.trim()
      || typeof code !== 'string' || !/^\d{8}$/.test(code)
      || !isValidPassword(newPassword)) {
    return res.status(400).json({
      message: 'Saisissez un e-mail, un code valide et un mot de passe de 8 à 72 caractères.'
    });
  }

  try {
    const { rows } = await db.query(
      `SELECT id_utilisateur, password_reset_code_hash, password_reset_code_expiration,
              password_reset_code_attempts
       FROM utilisateur
       WHERE LOWER(email) = LOWER($1)
         AND statut_compte = 'ACTIF'
         AND COALESCE(email_verifie, TRUE) = TRUE`,
      [email.trim()]
    );
    const updated = rows.length > 0
      && await verifyCodeAndUpdatePassword(rows[0], code, newPassword);

    if (!updated) {
      return res.status(400).json({ message: 'Code invalide ou expiré. Demandez un nouveau code et réessayez.' });
    }

    return res.json({ message: 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.' });
  } catch (error) {
    console.error('Erreur réinitialisation du mot de passe :', error);
    return res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
};

exports.requestAuthenticatedPasswordCode = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id_utilisateur, email
       FROM utilisateur
       WHERE id_utilisateur = $1
         AND mot_de_passe IS NOT NULL
         AND statut_compte = 'ACTIF'`,
      [req.user.id_utilisateur]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Compte utilisateur introuvable.' });
    }

    const sent = await createAndSendCode(rows[0], codeRequestQuery);
    if (!sent) {
      return res.status(429).json({ message: 'Un code vient déjà d’être envoyé. Attendez une minute avant de réessayer.' });
    }

    return res.json({ message: 'Un code de vérification a été envoyé à votre adresse e-mail.' });
  } catch (error) {
    console.error('Erreur envoi du code de changement de mot de passe :', error);
    return res.status(500).json({ message: 'Impossible d’envoyer le code pour le moment. Réessayez plus tard.' });
  }
};

exports.changePassword = async (req, res) => {
  const { current_password: currentPassword, code, new_password: newPassword } = req.body || {};
  const usesCurrentPassword = typeof currentPassword === 'string' && currentPassword.length > 0;
  const usesEmailCode = typeof code === 'string' && code.length > 0;

  if (!isValidPassword(newPassword) || usesCurrentPassword === usesEmailCode) {
    return res.status(400).json({
      message: 'Choisissez une méthode de vérification et saisissez un nouveau mot de passe de 8 à 72 caractères.'
    });
  }

  try {
    if (usesEmailCode) {
      if (!/^\d{8}$/.test(code)) {
        return res.status(400).json({ message: 'Le code de vérification doit contenir 8 chiffres.' });
      }
      const { rows } = await db.query(
        `SELECT id_utilisateur, password_reset_code_hash, password_reset_code_expiration,
                password_reset_code_attempts
         FROM utilisateur
         WHERE id_utilisateur = $1 AND statut_compte = 'ACTIF'`,
        [req.user.id_utilisateur]
      );
      const updated = rows.length > 0
        && await verifyCodeAndUpdatePassword(rows[0], code, newPassword);

      if (!updated) {
        return res.status(400).json({ message: 'Code invalide ou expiré. Demandez un nouveau code et réessayez.' });
      }
    } else {
      const { rows } = await db.query(
        `SELECT mot_de_passe FROM utilisateur
         WHERE id_utilisateur = $1 AND statut_compte = 'ACTIF'`,
        [req.user.id_utilisateur]
      );
      if (rows.length === 0 || !rows[0].mot_de_passe
          || !await bcrypt.compare(currentPassword, rows[0].mot_de_passe)) {
        return res.status(400).json({ message: 'Votre ancien mot de passe est incorrect.' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.query(
        `UPDATE utilisateur
         SET mot_de_passe = $1,
             password_reset_code_hash = NULL,
             password_reset_code_expiration = NULL,
             password_reset_code_requested_at = NULL,
             password_reset_code_attempts = 0
         WHERE id_utilisateur = $2`,
        [passwordHash, req.user.id_utilisateur]
      );
    }

    return res.json({ message: 'Votre mot de passe a été modifié avec succès.' });
  } catch (error) {
    console.error('Erreur changement du mot de passe :', error);
    return res.status(500).json({ message: 'Erreur lors du changement de mot de passe.' });
  }
};
