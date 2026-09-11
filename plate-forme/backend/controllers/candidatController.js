// backend/controllers/candidatController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

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
    `SELECT i.id_inscription, i.id_formation, i.statut, i.motivation, i.objectif,
            i.projet_apres_formation, i.source_information, i.a_deja_suivi_formation,
            i.formation_precedente, i.retour_suggestion, i.conditions_acceptees,
            c.email, c.nom, c.prenom, c.age, c.genre, c.telephone,
            c.niveau_etude, c.situation_professionnelle, c.etablissement, c.filiere,
            f.titre AS formation_titre, f.date_limite_inscription
     FROM inscription i
     JOIN candidat c ON c.id_candidat = i.id_candidat
     JOIN formation f ON f.id_formation = i.id_formation
     WHERE i.id_inscription = $1 AND LOWER(c.email) = LOWER($2)`,
    [id_inscription, email]
  );
  return result.rows[0];
};

const isApplicationEditable = (candidature) => (
  candidature && candidature.statut === 'EN_ATTENTE' &&
  new Date(candidature.date_limite_inscription) >= new Date()
);

const sendReceiptEmail = async (candidature, editToken) => {
  const editLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/postuler/${candidature.id_formation}?edit_token=${encodeURIComponent(editToken)}`;
  await transporter.sendMail({
    from: '"Plateforme Formations" <no-reply@formation.com>',
    to: candidature.email,
    subject: 'Candidature reçue - Plateforme Formations',
    html: `<div style="font-family:Arial,sans-serif;color:#111;padding:24px;max-width:620px">
      <h2 style="margin-bottom:8px">Bonjour ${candidature.prenom} ${candidature.nom},</h2>
      <p>Nous avons bien reçu votre candidature pour <strong>${candidature.formation_titre}</strong>.</p>
      <p>Vous pouvez modifier vos informations jusqu'au <strong>${new Date(candidature.date_limite_inscription).toLocaleDateString('fr-FR')}</strong>.</p>
      <p style="margin:24px 0"><a href="${editLink}" style="background:#f97316;color:#000;padding:12px 18px;text-decoration:none;border-radius:8px;font-weight:bold">Modifier ma candidature</a></p>
      <p style="font-size:12px;color:#666">Ce lien est personnel. Si vous n'êtes pas à l'origine de cette candidature, ignorez ce message.</p>
    </div>`
  });
};

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

    const formationRes = await db.query(
      `SELECT titre, date_limite_inscription FROM formation
       WHERE id_formation = $1 AND statut = 'OUVERTE'`,
      [id_formation]
    );
    if (formationRes.rows.length === 0 || new Date(formationRes.rows[0].date_limite_inscription) < new Date()) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: "Les inscriptions pour cette formation sont fermées." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Créer ou récupérer le candidat et actualiser ses informations personnelles
    let candidatRes = await db.query('SELECT id_candidat FROM candidat WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    let id_candidat;

    if (candidatRes.rows.length > 0) {
      id_candidat = candidatRes.rows[0].id_candidat;
      await db.query(
        `UPDATE candidat SET nom = $1, prenom = $2, age = $3, genre = $4, telephone = $5,
         niveau_etude = $6, situation_professionnelle = $7, etablissement = $8, filiere = $9
         WHERE id_candidat = $10`,
        [nom, prenom, age || null, genre || null, telephone || null, niveau_etude || null,
          situation_professionnelle || null, etablissement || null, filiere || null, id_candidat]
      );
    } else {
      const newCandidat = await db.query(
        `INSERT INTO candidat (email, nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id_candidat`,
        [normalizedEmail, nom, prenom, age || null, genre || null, telephone || null, niveau_etude || null, situation_professionnelle || null, etablissement || null, filiere || null]
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

    const candidature = await getEditableCandidature(newInscription.rows[0].id_inscription, normalizedEmail);
    const editToken = getEditToken(candidature.id_inscription, normalizedEmail);
    try {
      await sendReceiptEmail(candidature, editToken);
    } catch (emailError) {
      console.error("Erreur d'envoi de l'email de réception :", emailError);
    }

    res.status(201).json({
      message: "Candidature envoyée avec succès ! Un email de confirmation vous a été envoyé.",
      inscription: newInscription.rows[0],
      editToken
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Erreur postuler :", error);
    res.status(500).json({ message: "Erreur lors de la soumission de votre candidature" });
  }
};

exports.getCandidateByEmail = async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ message: 'Email invalide.' });

  try {
    const result = await db.query(
      `SELECT nom, prenom, age, genre, telephone, niveau_etude,
              situation_professionnelle, etablissement, filiere
       FROM candidat WHERE LOWER(email) = LOWER($1)`,
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

exports.updateCandidature = async (req, res) => {
  try {
    const payload = jwt.verify(req.query.token, process.env.JWT_SECRET || 'votre_secret_key');
    if (payload.purpose !== 'edit-candidature') return res.status(401).json({ message: 'Lien invalide.' });
    const candidature = await getEditableCandidature(payload.id_inscription, payload.email);
    if (!isApplicationEditable(candidature)) return res.status(403).json({ message: 'La date limite est dépassée ou la candidature est déjà traitée.' });

    const { nom, prenom, age, genre, telephone, niveau_etude, situation_professionnelle, etablissement, filiere,
      motivation, objectif, projet_apres_formation, source_information, a_deja_suivi_formation, formation_precedente,
      retour_suggestion } = req.body;
    await db.query('BEGIN');
    await db.query(
      `UPDATE candidat SET nom=$1, prenom=$2, age=$3, genre=$4, telephone=$5, niveau_etude=$6,
       situation_professionnelle=$7, etablissement=$8, filiere=$9 WHERE id_candidat = (SELECT id_candidat FROM inscription WHERE id_inscription = $10)`,
      [nom, prenom, age || null, genre || null, telephone || null, niveau_etude || null, situation_professionnelle || null, etablissement || null, filiere || null, payload.id_inscription]
    );
    await db.query(
      `UPDATE inscription SET motivation=$1, objectif=$2, projet_apres_formation=$3, source_information=$4,
       a_deja_suivi_formation=$5, formation_precedente=$6, retour_suggestion=$7 WHERE id_inscription=$8`,
      [motivation, objectif || null, projet_apres_formation || null, source_information || null, a_deja_suivi_formation || false, formation_precedente || null, retour_suggestion || null, payload.id_inscription]
    );
    await db.query('COMMIT');
    res.json({ message: 'Votre candidature a été mise à jour.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Erreur modification candidature :', err);
    res.status(500).json({ message: 'Erreur lors de la modification de la candidature.' });
  }
};