// backend/controllers/candidatureController.js
const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const getFrontendBaseUrl = require('../utils/frontendUrl');
const { emitToRoles } = require('../services/realtime');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const verifyEmailTransport = async () => {
  try {
    await transporter.verify();
  } catch (error) {
    console.error('Connexion au service e-mail impossible :', error);
    const deliveryError = new Error('Validation annulée : le service e-mail est indisponible. Aucune candidature n’a été validée.');
    deliveryError.code = 'EMAIL_SERVICE_UNAVAILABLE';
    throw deliveryError;
  }
};

const sendAcceptanceEmail = async (candidate, frontendBaseUrl) => {
  const needsSetup = candidate.needsSetup === true;
  const configLink = needsSetup
    ? `${frontendBaseUrl}/setup-account?token=${encodeURIComponent(candidate.setupToken)}`
    : `${frontendBaseUrl}/setup-account?email=${encodeURIComponent(candidate.email)}`;
  const subject = needsSetup
    ? '🎉 Candidature acceptée - Finalisez la configuration de votre compte'
    : `🎉 Candidature acceptée pour ${candidate.formation_titre} !`;
  const bodyHtml = needsSetup
    ? `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Bonjour ${candidate.prenom} ${candidate.nom},</h2>
        <p>Félicitations ! Votre candidature pour <strong>${candidate.formation_titre}</strong> a été acceptée.</p>
        <p>Votre compte existe déjà sur la plateforme, mais sa configuration n'est pas terminée. Utilisez le lien ci-dessous pour créer votre nom d’utilisateur et votre mot de passe :</p>
        <p style="margin: 20px 0;">
          <a href="${configLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Configurer mon compte
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">Ce lien est personnel, valable pendant 24 heures et ne pourra être utilisé qu’une seule fois.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <h3>Votre Badge d'accès :</h3>
        <p>Voici votre QR Code personnel à conserver. Il sera scanné pour valider votre présence en cours.</p>
        <img src="cid:qrcode_badge" alt="QR Code Badge" style="width: 180px; height: 180px;" />
      </div>
    `
    : candidate.isExistingUser
    ? `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Bonjour ${candidate.prenom} ${candidate.nom},</h2>
        <p>Félicitations ! Votre candidature pour la formation <strong>${candidate.formation_titre}</strong> a été acceptée.</p>
        <p>Vous pouvez dès à présent vous connecter avec vos identifiants habituels pour accéder à vos nouvelles sessions.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <h3>Votre Badge d'accès :</h3>
        <p>Voici votre QR Code personnel à jour à conserver pour vos cours :</p>
        <img src="cid:qrcode_badge" alt="QR Code Badge" style="width: 180px; height: 180px;" />
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Bonjour ${candidate.prenom} ${candidate.nom},</h2>
        <p>Félicitations ! Votre candidature pour <strong>${candidate.formation_titre}</strong> a été acceptée.</p>
        <p>Pour configurer votre mot de passe et finaliser votre compte :</p>
        <p style="margin: 20px 0;">
          <a href="${configLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Configurer mon compte
          </a>
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <h3>Votre Badge d'accès :</h3>
        <p>Voici votre QR Code personnel à conserver. Il sera scanné pour valider votre présence en cours.</p>
        <img src="cid:qrcode_badge" alt="QR Code Badge" style="width: 180px; height: 180px;" />
      </div>
    `;

  try {
    await transporter.sendMail({
      from: '"Plateforme Formations" <no-reply@formation.com>',
      to: candidate.email,
      subject,
      html: bodyHtml,
      attachments: [{
        filename: 'badge-qrcode.png',
        path: candidate.qrCodeDataURL,
        cid: 'qrcode_badge'
      }]
    });
  } catch (error) {
    console.error(`Erreur d'envoi du mail à ${candidate.email} :`, error);
    const deliveryError = new Error(`Validation annulée : l’e-mail destiné à ${candidate.email} n’a pas pu être envoyé. Aucune candidature n’a été validée.`);
    deliveryError.code = 'EMAIL_DELIVERY_FAILED';
    throw deliveryError;
  }
};

exports.validerCandidature = async (req, res) => {
  const { id_inscription } = req.params;
  let client;
  let transactionStarted = false;

  try {
    const frontendBaseUrl = getFrontendBaseUrl(req);
    await verifyEmailTransport();
    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;

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

    // 3. Récupérer ou créer l'utilisateur + Détecter s'il existait déjà
    let id_utilisateur;
    let isExistingUser = false;
    let needsSetup = false;
    let setupToken = null;
    const resUser = await client.query(
      `SELECT id_utilisateur, mot_de_passe FROM utilisateur WHERE LOWER(email) = LOWER($1)`,
      [cand.email]
    );

    if (resUser.rows.length > 0) {
      id_utilisateur = resUser.rows[0].id_utilisateur;
      isExistingUser = true;
      needsSetup = !resUser.rows[0].mot_de_passe;
    } else {
      const resNewUser = await client.query(
        `INSERT INTO utilisateur (email, nom, prenom, telephone, age, statut_compte)
         VALUES ($1, $2, $3, $4, $5, 'ACTIF')
         RETURNING id_utilisateur`,
        [cand.email, cand.nom, cand.prenom, cand.telephone, cand.age]
      );
      id_utilisateur = resNewUser.rows[0].id_utilisateur;
      isExistingUser = false;
      needsSetup = true;
    }

    if (needsSetup) {
      setupToken = crypto.randomBytes(32).toString('hex');
      const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
      await client.query(
        `UPDATE utilisateur
         SET jeton_activation_hash = $1,
             jeton_activation_expiration = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE id_utilisateur = $2`,
        [setupTokenHash, id_utilisateur]
      );
    }

    // 4. Créer l'entrée apprenant liée à l'utilisateur
    const resApprenant = await client.query(
      `INSERT INTO apprenant (id_utilisateur, id_candidat, statut)
       VALUES ($1, $2, 'ACTIF')
       ON CONFLICT (id_candidat) DO UPDATE SET statut = 'ACTIF'
       RETURNING id_apprenant`,
      [id_utilisateur, cand.id_candidat]
    );

    const id_apprenant = resApprenant.rows[0].id_apprenant;

    // 5. Génération du QR Code
    const qrData = JSON.stringify({
      id_utilisateur: id_utilisateur,
      id_apprenant: id_apprenant,
      email: cand.email,
      type: 'BADGE_PRESENCE'
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200
    });

    // 6. Enregistrer le QR Code dans la table UTILISATEUR
    await client.query(
      `UPDATE utilisateur SET qr_code = $1 WHERE id_utilisateur = $2`,
      [qrCodeDataURL, id_utilisateur]
    );

    await sendAcceptanceEmail({
      email: cand.email,
      nom: cand.nom,
      prenom: cand.prenom,
      formation_titre: cand.formation_titre,
      isExistingUser,
      needsSetup,
      setupToken,
      qrCodeDataURL
    }, frontendBaseUrl);

    await client.query('COMMIT');
    transactionStarted = false;
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {});
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});

    res.json({
      message: 'Candidature acceptée et e-mail envoyé avec succès.'
    });
  } catch (err) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erreur lors de l’annulation de la validation :', rollbackError);
      }
    }
    console.error("Erreur lors de la validation :", err);
    const status = ['EMAIL_SERVICE_UNAVAILABLE', 'EMAIL_DELIVERY_FAILED'].includes(err.code)
      ? 503
      : err.code === 'INVALID_FRONTEND_URL' ? 400 : 500;
    res.status(status).json({
      message: err.code === 'EMAIL_SERVICE_UNAVAILABLE' || err.code === 'EMAIL_DELIVERY_FAILED'
        ? err.message
        : err.code === 'INVALID_FRONTEND_URL'
          ? err.message
          : 'Erreur serveur lors de la validation.'
    });
  } finally {
    client?.release();
  }
};

exports.getCandidatures = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id_inscription,
        i.statut,
        i.date_inscription,
        i.motivation,
        i.conditions_acceptees,
        c.id_candidat,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        c.age,
        c.genre,
        c.niveau_etude,
        c.situation_professionnelle,
        c.etablissement,
        c.filiere,
        COALESCE(a.id_apprenant IS NOT NULL AND u.mot_de_passe IS NOT NULL, FALSE) AS est_apprenant,
        f.id_formation,
        f.titre AS formation_titre,
        f.capacite_max,
        i.objectif,
        i.projet_apres_formation,
        i.source_information,
        i.formation_precedente,
        i.retour_suggestion,
        i.a_deja_suivi_formation,
        (
          SELECT COUNT(*)::INTEGER 
          FROM inscription i2 
          WHERE i2.id_formation = f.id_formation AND i2.statut = 'ACCEPTEE'
        ) AS total_acceptes
      FROM inscription i
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      LEFT JOIN utilisateur u ON LOWER(u.email) = LOWER(c.email)
      LEFT JOIN apprenant a ON a.id_candidat = c.id_candidat AND a.id_utilisateur = u.id_utilisateur
      ORDER BY i.date_inscription DESC;
    `;

    const { rows } = await db.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des candidatures :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.validerPromotion = async (req, res) => {
  const { id_formation } = req.params;
  let selectedIds = null;
  if (Object.prototype.hasOwnProperty.call(req.body, 'id_inscriptions')) {
    const { id_inscriptions } = req.body;
    if (!Array.isArray(id_inscriptions) || id_inscriptions.length === 0
      || id_inscriptions.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ message: "La sélection de candidatures est invalide." });
    }
    selectedIds = [...new Set(id_inscriptions)];
  }
  let client;
  let transactionStarted = false;

  try {
    const frontendBaseUrl = getFrontendBaseUrl(req);
    await verifyEmailTransport();
    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const resFormation = await client.query(
      `SELECT capacite_max FROM formation WHERE id_formation = $1 FOR UPDATE`,
      [id_formation]
    );

    if (resFormation.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Formation introuvable." });
    }

    const capaciteMax = resFormation.rows[0].capacite_max;

    const resPreselection = await client.query(
      `SELECT i.id_inscription, c.id_candidat, c.email, c.nom, c.prenom, c.telephone, c.age, f.titre as formation_titre
       FROM inscription i
       JOIN candidat c ON i.id_candidat = c.id_candidat
       JOIN formation f ON i.id_formation = f.id_formation
       WHERE i.id_formation = $1
         AND (
           ($2::INTEGER[] IS NULL AND i.statut = 'PRESELECTIONNEE')
           OR ($2::INTEGER[] IS NOT NULL AND i.id_inscription = ANY($2::INTEGER[])
             AND i.statut IN ('EN_ATTENTE', 'PRESELECTIONNEE'))
         )
       FOR UPDATE`,
      [id_formation, selectedIds]
    );

    const candidats = resPreselection.rows;
    if (selectedIds && candidats.length !== selectedIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: "Un ou plusieurs candidats sélectionnés ne sont plus disponibles pour cette promotion."
      });
    }

    const resAcceptes = await client.query(
      `SELECT COUNT(*)::INTEGER AS total FROM inscription WHERE id_formation = $1 AND statut = 'ACCEPTEE'`,
      [id_formation]
    );
    const totalAcceptes = resAcceptes.rows[0].total;

    if (totalAcceptes + candidats.length > capaciteMax) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `La limite est dépassée : ${totalAcceptes} place(s) sont déjà attribuées et ${candidats.length} candidat(s) sont sélectionnés pour une capacité maximale de ${capaciteMax}.`
      });
    }

    if (candidats.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Aucun candidat en attente de validation pour cette formation." });
    }

    const candidatsTraites = [];

    for (const cand of candidats) {
      await client.query(
        `UPDATE inscription 
         SET statut = 'ACCEPTEE', date_decision = CURRENT_TIMESTAMP 
         WHERE id_inscription = $1`,
        [cand.id_inscription]
      );

      let id_utilisateur;
      let isExistingUser = false;
      let needsSetup = false;
      let setupToken = null;
      const resUser = await client.query(
        `SELECT id_utilisateur, mot_de_passe FROM utilisateur WHERE LOWER(email) = LOWER($1)`,
        [cand.email]
      );

      if (resUser.rows.length > 0) {
        id_utilisateur = resUser.rows[0].id_utilisateur;
        isExistingUser = true;
        needsSetup = !resUser.rows[0].mot_de_passe;
        await client.query(
          `UPDATE utilisateur SET statut_compte = 'ACTIF', nom = $1, prenom = $2, telephone = $3, age = $4
           WHERE id_utilisateur = $5`,
          [cand.nom, cand.prenom, cand.telephone, cand.age, id_utilisateur]
        );
      } else {
        const resNewUser = await client.query(
          `INSERT INTO utilisateur (email, nom, prenom, telephone, age, statut_compte)
           VALUES ($1, $2, $3, $4, $5, 'ACTIF')
           RETURNING id_utilisateur`,
          [cand.email, cand.nom, cand.prenom, cand.telephone, cand.age]
        );
        id_utilisateur = resNewUser.rows[0].id_utilisateur;
        isExistingUser = false;
        needsSetup = true;
      }

      if (needsSetup) {
        setupToken = crypto.randomBytes(32).toString('hex');
        const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
        await client.query(
          `UPDATE utilisateur
           SET jeton_activation_hash = $1,
               jeton_activation_expiration = CURRENT_TIMESTAMP + INTERVAL '24 hours'
           WHERE id_utilisateur = $2`,
          [setupTokenHash, id_utilisateur]
        );
      }

      const resApprenant = await client.query(
        `INSERT INTO apprenant (id_utilisateur, id_candidat, statut)
         VALUES ($1, $2, 'ACTIF')
         ON CONFLICT (id_candidat) DO UPDATE SET statut = 'ACTIF'
         RETURNING id_apprenant`,
        [id_utilisateur, cand.id_candidat]
      );
      const id_apprenant = resApprenant.rows[0].id_apprenant;

      const qrData = JSON.stringify({
        id_utilisateur: id_utilisateur,
        id_apprenant: id_apprenant,
        email: cand.email,
        type: 'BADGE_PRESENCE'
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 200
      });

      await client.query(
        `UPDATE utilisateur SET qr_code = $1 WHERE id_utilisateur = $2`,
        [qrCodeDataURL, id_utilisateur]
      );

      candidatsTraites.push({
        email: cand.email,
        nom: cand.nom,
        prenom: cand.prenom,
        formation_titre: cand.formation_titre,
        isExistingUser,
        needsSetup,
        setupToken,
        qrCodeDataURL
      });
    }

    for (const item of candidatsTraites) {
      await sendAcceptanceEmail(item, frontendBaseUrl);
    }

    await client.query('COMMIT');
    transactionStarted = false;
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {});
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});

    res.json({
      message: `Validation réussie ! ${candidatsTraites.length} candidatures traitées et e-mails envoyés.`,
      totalTraites: candidatsTraites.length 
    });

  } catch (err) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erreur lors de l’annulation de la validation globale :', rollbackError);
      }
    }
    console.error("Erreur lors de la validation globale :", err);
    const status = ['EMAIL_SERVICE_UNAVAILABLE', 'EMAIL_DELIVERY_FAILED'].includes(err.code)
      ? 503
      : err.code === 'INVALID_FRONTEND_URL' ? 400 : 500;
    res.status(status).json({
      message: ['EMAIL_SERVICE_UNAVAILABLE', 'EMAIL_DELIVERY_FAILED', 'INVALID_FRONTEND_URL'].includes(err.code)
        ? err.message
        : 'Erreur serveur lors de la validation globale.'
    });
  } finally {
    client?.release();
  }
};

exports.togglePreselection = async (req, res) => {
  const { id_inscription } = req.params;
  const { statut } = req.body;
  const statutsAutorises = ['PRESELECTIONNEE', 'REFUSEE'];

  if (!statutsAutorises.includes(statut)) {
    return res.status(400).json({ message: "Statut de candidature invalide." });
  }

  try {
    const result = await db.query(
      `UPDATE inscription SET statut = $1 WHERE id_inscription = $2`,
      [statut, id_inscription]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }

    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {});
    res.json({ message: "Statut de pré-sélection mis à jour." });
  } catch (err) {
    console.error("Erreur lors du changement de statut de la candidature :", err);
    res.status(500).json({ message: "Erreur lors du changement de statut." });
  }
};