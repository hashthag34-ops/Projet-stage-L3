// backend/controllers/candidatureController.js
const db = require('../config/db'); // Instance PostgreSQL (pg.Pool)
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Config du service d'envoi de mail (ex: Nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.validerCandidature = async (req, res) => {
  const { id_inscription } = req.params;
  const client = await db.connect(); // Client pool PostgreSQL pour la transaction

  try {
    await client.query('BEGIN');

    // 1. Récupérer les détails de l'inscription et du candidat
    const resInscription = await client.query(
      `SELECT i.id_inscription, i.statut, c.id_candidat, c.email, c.nom, c.prenom, c.telephone, c.age, f.titre as formation_titre
       FROM inscription i
       JOIN candidat c ON i.id_candidat = c.id_candidat
       JOIN formation f ON i.id_formation = f.id_formation
       WHERE i.id_inscription = $1`,
      [id_inscription]
    );

    if (resInscription.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Inscription introuvable" });
    }

    const cand = resInscription.rows[0];

    // 2. Mettre à jour le statut de l'inscription
    await client.query(
      `UPDATE inscription 
       SET statut = 'ACCEPTEE', date_decision = CURRENT_TIMESTAMP 
       WHERE id_inscription = $1`,
      [id_inscription]
    );

    // 3. Vérifier si un compte utilisateur existe déjà pour cet email
    let id_utilisateur;
    const resUser = await client.query(`SELECT id_utilisateur FROM utilisateur WHERE email = $1`, [cand.email]);

    if (resUser.rows.length > 0) {
      id_utilisateur = resUser.rows[0].id_utilisateur;
    } else {
      // Générer un mot de passe temporaire / jeton de configuration
      const tempToken = crypto.randomBytes(32).toString('hex');

      const resNewUser = await client.query(
        `INSERT INTO utilisateur (email, nom, prenom, telephone, age, statut_compte)
         VALUES ($1, $2, $3, $4, $5, 'ACTIF')
         RETURNING id_utilisateur`,
        [cand.email, cand.nom, cand.prenom, cand.telephone, cand.age]
      );
      id_utilisateur = resNewUser.rows[0].id_utilisateur;
    }

    // 4. Créer l'entrée dans la table Apprenant
    const resApprenant = await client.query(
      `INSERT INTO apprenant (id_utilisateur, id_candidat, statut)
       VALUES ($1, $2, 'ACTIF')
       ON CONFLICT (id_candidat) DO NOTHING
       RETURNING id_apprenant`,
      [id_utilisateur, cand.id_candidat]
    );

    await client.query('COMMIT');

    // 5. Envoyer l'email de félicitations avec le lien de configuration
    const configLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/setup-account?email=${encodeURIComponent(cand.email)}`;

    const mailOptions = {
      from: '"Plateforme Formations" <no-reply@formation.com>',
      to: cand.email,
      subject: '🎉 Félicitations ! Votre candidature a été acceptée',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Bonjour ${cand.prenom} ${cand.nom},</h2>
          <p>Nous avons le plaisir de vous informer que votre candidature pour la formation <strong>${cand.formation_titre}</strong> a été retenue !</p>
          <p>Pour finaliser votre inscription et accéder à votre espace apprenant, veuillez configurer votre mot de passe et votre profil en cliquant sur le lien ci-dessous :</p>
          <p style="margin: 25px 0;">
            <a href="${configLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Configurer mon compte Apprenant
            </a>
          </p>
          <p>À très bientôt dans nos sessions de formation !</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.error("Erreur d'envoi du mail :", err);
    });

    res.json({ message: "Candidature acceptée et compte Apprenant créé avec succès." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la validation :", err);
    res.status(500).json({ message: "Erreur serveur lors de la validation de la candidature." });
  } finally {
    client.release();
  }
};