// backend/controllers/candidatController.js
const db = require('../config/db');
const candidat = require('../Models/candidatModel');

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const getFrontendBaseUrl = require('../utils/frontendUrl');
const { emitToRoles } = require('../services/realtime');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const getEditToken = (id_inscription, email) => jwt.sign(
  { id_inscription, email, purpose: 'edit-candidature' },
  process.env.JWT_SECRET || 'votre_secret_key',
  { expiresIn: '30d' }
);

const getEditableCandidature = async (id_inscription, email) => {
  const result = await db.query(
    candidat.SQL_14,
    [id_inscription, email]
  );
  return result.rows[0];
};

const isApplicationEditable = (candidature) => (
  candidature && candidature.statut === 'EN_ATTENTE' &&
  new Date(candidature.date_limite_inscription) >= new Date()
);

const sendReceiptEmail = async (candidature, editToken, frontendBaseUrl) => {
  const editLink = `${frontendBaseUrl}/postuler/${candidature.id_formation}?edit_token=${encodeURIComponent(editToken)}`;
  const cancelLink = `${editLink}&action=cancel`;
  await transporter.sendMail({
    from: '"Plateforme Formations" <no-reply@formation.com>',
    to: candidature.email,
    subject: 'Candidature reçue - Plateforme Formations',
    html: `<div style="font-family:Arial,sans-serif;color:#111;padding:24px;max-width:620px">
      <h2 style="margin-bottom:8px">Bonjour ${candidature.prenom} ${candidature.nom},</h2>
      <p>Nous avons bien reçu votre candidature pour <strong>${candidature.formation_titre}</strong>.</p>
      <p>Vous pouvez modifier vos informations jusqu'au <strong>${new Date(candidature.date_limite_inscription).toLocaleDateString('fr-FR')}</strong>.</p>
      <p style="margin:24px 0"><a href="${editLink}" style="background:#f97316;color:#000;padding:12px 18px;text-decoration:none;border-radius:8px;font-weight:bold">Modifier ma candidature</a></p>
      <p style="margin:24px 0"><a href="${cancelLink}" style="color:#dc2626;font-weight:bold">Annuler ma candidature</a></p>
      <p style="font-size:12px;color:#666">Ces liens sont personnels. Annuler ou modifier une candidature reste possible jusqu’à la date limite de la formation.</p>
    </div>`
  });
};

exports.postuler = async (req, res) => {
  const {
    // Infos Candidat
    email, nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere,
    // Infos Inscription
    id_formation, motivation, objectif, projet_apres_formation,     source_information, a_deja_suivi_formation, formation_precedente, retour_suggestion, conditions_acceptees, normalizedEmail
  } = req.body;

  if (!conditions_acceptees) {
    return res.status(400).json({ message: "Vous devez accepter les conditions." });
  }

  try {
    const frontendBaseUrl = getFrontendBaseUrl(req);
    await db.query(candidat.SQL_5);

    const formationRes = await db.query(
      candidat.SQL_13,
      [id_formation]
    );
    if (formationRes.rows.length === 0 || new Date(formationRes.rows[0].date_limite_inscription) < new Date()) {
      await db.query(candidat.SQL_1);
      return res.status(400).json({ message: "Les inscriptions pour cette formation sont fermées." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Vérifier le doublon avant de créer un nouveau dossier candidat.
    const checkInscription = await db.query(
      candidat.SQL_10,
      [id_formation, normalizedEmail]
    );
    if (checkInscription.rows.length > 0) {
      await db.query(candidat.SQL_1);
      return res.status(400).json({ message: "Vous avez déjà postulé à cette formation." });
    }

    // Chaque candidature possède son propre dossier candidat, même avec un email déjà utilisé.
    let ownerUserId = req.user?.id_utilisateur || req.user?.id || null;
    if (ownerUserId) {
      const ownerRes = await db.query(
        candidat.SQL_12,
        [ownerUserId, normalizedEmail]
      );
      if (ownerRes.rows.length === 0) ownerUserId = null;
    }

    const newCandidat = await db.query(
      candidat.SQL_11,
      [ownerUserId, normalizedEmail, nom, prenom, age || null, genre || null, telephone || null,
        niveau_etude || null, situation_professionnelle || null, etablissement || null, filiere || null]
    );
    const id_candidat = newCandidat.rows[0].id_candidat;

    // 2. Créer l'inscription
    const historyRes = await db.query(
      candidat.SQL_9,
      [id_candidat]
    );
    const hasAlreadyFollowedFormation = historyRes.rows[0]?.deja_suivi === true;
    const newInscription = await db.query(
      candidat.SQL_8,
      [
        id_candidat, id_formation, motivation, objectif, projet_apres_formation, 
        source_information, a_deja_suivi_formation || hasAlreadyFollowedFormation, formation_precedente, retour_suggestion, conditions_acceptees, normalizedEmail
      ]
    );

    const candidature = await getEditableCandidature(newInscription.rows[0].id_inscription, normalizedEmail);
    const editToken = getEditToken(candidature.id_inscription, normalizedEmail);
    try {
      await sendReceiptEmail(candidature, editToken, frontendBaseUrl);
    } catch (emailError) {
      emailError.code = 'EMAIL_RECEIPT_FAILED';
      throw emailError;
    }

    await db.query(candidat.SQL_2);
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {
      id_formation: Number(id_formation)
    });

    res.status(201).json({
      message: "Candidature envoyée avec succès ! Un email de confirmation vous a été envoyé.",
      inscription: newInscription.rows[0],
      editToken
    });
  } catch (error) {
    await db.query(candidat.SQL_1);
    console.error("Erreur postuler :", error);
    if (error.code === '23505') {
      return res.status(400).json({ message: "Vous avez déjà postulé à cette formation avec cette adresse e-mail." });
    }
    if (error.code === 'EMAIL_RECEIPT_FAILED') {
      return res.status(503).json({ message: "La candidature n'a pas été enregistrée : l'envoi de l'e-mail de confirmation a échoué." });
    }
    res.status(500).json({ message: "Erreur lors de la soumission de votre candidature" });
  }
};

exports.getCandidateByEmail = async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ message: 'Email invalide.' });

  try {
    const result = await db.query(
      candidat.SQL_7,
      [email]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Aucun profil existant.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur recherche candidat :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.getCandidatureForEdit = async (req, res) => {
  try {
    const payload = jwt.verify(req.query.token, process.env.JWT_SECRET || 'votre_secret_key');
    if (payload.purpose !== 'edit-candidature') return res.status(401).json({ message: 'Lien invalide.' });
    const candidature = await getEditableCandidature(payload.id_inscription, payload.email);
    if (!isApplicationEditable(candidature)) return res.status(403).json({ message: 'Cette candidature ne peut plus être modifiée.' });
    res.json(candidature);
  } catch (err) {
    res.status(401).json({ message: 'Le lien de modification est invalide ou expiré.' });
  }
};

exports.cancelCandidature = async (req, res) => {
  try {
    const payload = jwt.verify(req.query.token, process.env.JWT_SECRET || 'votre_secret_key');
    if (payload.purpose !== 'edit-candidature') {
      return res.status(401).json({ message: 'Lien invalide.' });
    }

    const result = await db.query(
      candidat.SQL_6,
      [payload.id_inscription, payload.email]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'La candidature est déjà traitée, annulée, ou la date limite est dépassée.' });
    }

    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {
      id_formation: result.rows[0].id_formation
    });
    return res.json({ message: 'Votre candidature a été annulée.' });
  } catch (err) {
    console.error('Erreur annulation candidature :', err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Le lien d’annulation est invalide ou expiré.' });
    }
    return res.status(500).json({ message: 'Erreur lors de l’annulation de la candidature.' });
  }
};

exports.updateCandidature = async (req, res) => {
  try {
    const payload = jwt.verify(req.query.token, process.env.JWT_SECRET || 'votre_secret_key');
    if (payload.purpose !== 'edit-candidature') return res.status(401).json({ message: 'Lien invalide.' });
    const candidature = await getEditableCandidature(payload.id_inscription, payload.email);
    if (!isApplicationEditable(candidature)) return res.status(403).json({ message: 'La date limite est dépassée ou la candidature est déjà traitée.' });

    const { nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere,
      motivation, objectif, projet_apres_formation, source_information, a_deja_suivi_formation, formation_precedente,
      retour_suggestion } = req.body;
    await db.query(candidat.SQL_5);
    await db.query(
      candidat.SQL_4,
      [nom, prenom, age || null, genre || null, telephone || null, niveau_etude || null, situation_professionnelle || null, etablissement || null, filiere || null, payload.id_inscription]
    );
    await db.query(
      candidat.SQL_3,
      [motivation, objectif || null, projet_apres_formation || null, source_information || null, a_deja_suivi_formation || false, formation_precedente || null, retour_suggestion || null, payload.id_inscription]
    );
    await db.query(candidat.SQL_2);
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {
      id_formation: Number(candidature.id_formation)
    });
    res.json({ message: 'Votre candidature a été mise à jour.' });
  } catch (err) {
    await db.query(candidat.SQL_1);
    console.error('Erreur modification candidature :', err);
    res.status(500).json({ message: 'Erreur lors de la modification de la candidature.' });
  }
};