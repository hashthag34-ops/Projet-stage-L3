// backend/controllers/candidatureController.js
const db = require('../config/db');
const candidature = require('../Models/candidatureModel');

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
        <p style="font-size: 12px; color: #666;">Si le lien expire, vous pourrez toujours terminer la configuration dans l’onglet « Mot de passe oublié » en saisissant votre adresse e-mail.</p>
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
        <p style="font-size: 12px; color: #666;">Ce lien est valable pendant 24 heures. S’il expire, finalisez votre configuration depuis l’onglet « Mot de passe oublié » avec votre adresse e-mail.</p>
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
    await client.query(candidature.SQL_8);
    transactionStarted = true;

    // 1. Récupérer les détails de l'inscription et du candidat
    const resInscription = await client.query(
      candidature.SQL_26,
      [id_inscription]
    );

    if (resInscription.rows.length === 0) {
      await client.query(candidature.SQL_2);
      return res.status(404).json({ message: "Inscription introuvable" });
    }

    const cand = resInscription.rows[0];
    const capacityRes = await client.query(
      candidature.SQL_25,
      [id_inscription]
    );
    const capacity = capacityRes.rows[0]?.capacite_max;
    const accepted = capacityRes.rows[0]?.acceptes || 0;
    if (capacity != null && accepted >= Number(capacity)) {
      await client.query(candidature.SQL_2);
      return res.status(400).json({ message: 'La capacité maximale de cette formation est déjà atteinte.' });
    }

    // 2. Mettre à jour le statut de l'inscription
    await client.query(
      candidature.SQL_24,
      [id_inscription]
    );

    await client.query(
      candidature.SQL_23,
      [id_inscription]
    );

    // 3. Récupérer ou créer l'utilisateur + Détecter s'il existait déjà
    let id_utilisateur;
    let isExistingUser = false;
    let needsSetup = false;
    let setupToken = null;
    const resUser = await client.query(
      candidature.SQL_15,
      [cand.email]
    );

    if (resUser.rows.length > 0) {
      id_utilisateur = resUser.rows[0].id_utilisateur;
      isExistingUser = true;
      needsSetup = !resUser.rows[0].mot_de_passe;
    } else {
      const resNewUser = await client.query(
        candidature.SQL_22,
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
        candidature.SQL_21,
        [setupTokenHash, id_utilisateur]
      );
    }

    // 4. Créer l'entrée apprenant liée à l'utilisateur
    const resApprenant = await client.query(
      candidature.SQL_20,
      [id_utilisateur]
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
      candidature.SQL_9,
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

    await client.query(candidature.SQL_3);
    transactionStarted = false;
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {});
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});

    res.json({
      message: 'Candidature acceptée et e-mail envoyé avec succès.'
    });
  } catch (err) {
    if (transactionStarted && client) {
      try {
        await client.query(candidature.SQL_2);
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
    const query = candidature.SQL_1;

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
    await client.query(candidature.SQL_8);
    transactionStarted = true;

    const resFormation = await client.query(
      candidature.SQL_19,
      [id_formation]
    );

    if (resFormation.rows.length === 0) {
      await client.query(candidature.SQL_2);
      return res.status(404).json({ message: "Formation introuvable." });
    }

    const capaciteMax = resFormation.rows[0].capacite_max;

    const resPreselection = await client.query(
      candidature.SQL_18,
      [id_formation, selectedIds]
    );

    const candidats = resPreselection.rows;
    if (selectedIds && candidats.length !== selectedIds.length) {
      await client.query(candidature.SQL_2);
      return res.status(400).json({
        message: "Un ou plusieurs candidats sélectionnés ne sont plus disponibles pour cette promotion."
      });
    }

    const resAcceptes = await client.query(
      candidature.SQL_17,
      [id_formation]
    );
    const totalAcceptes = resAcceptes.rows[0].total;

    if (totalAcceptes + candidats.length > capaciteMax) {
      await client.query(candidature.SQL_2);
      return res.status(400).json({
        message: `La limite est dépassée : ${totalAcceptes} place(s) sont déjà attribuées et ${candidats.length} candidat(s) sont sélectionnés pour une capacité maximale de ${capaciteMax}.`
      });
    }

    if (candidats.length === 0) {
      await client.query(candidature.SQL_2);
      return res.status(400).json({ message: "Aucun candidat en attente de validation pour cette formation." });
    }

    const candidatsTraites = [];

    for (const cand of candidats) {
      await client.query(
        candidature.SQL_16,
        [cand.id_inscription]
      );

      let id_utilisateur;
      let isExistingUser = false;
      let needsSetup = false;
      let setupToken = null;
      const resUser = await client.query(
        candidature.SQL_15,
        [cand.email]
      );

      if (resUser.rows.length > 0) {
        id_utilisateur = resUser.rows[0].id_utilisateur;
        isExistingUser = true;
        needsSetup = !resUser.rows[0].mot_de_passe;
        await client.query(
          candidature.SQL_14,
          [cand.nom, cand.prenom, cand.telephone, cand.age, id_utilisateur]
        );
      } else {
        const resNewUser = await client.query(
          candidature.SQL_13,
          [cand.email, cand.nom, cand.prenom, cand.telephone, cand.age]
        );
        id_utilisateur = resNewUser.rows[0].id_utilisateur;
        isExistingUser = false;
        needsSetup = true;
      }

      await client.query(
        candidature.SQL_12,
        [id_formation]
      );

      if (needsSetup) {
        setupToken = crypto.randomBytes(32).toString('hex');
        const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
        await client.query(
          candidature.SQL_11,
          [setupTokenHash, id_utilisateur]
        );
      }

      const resApprenant = await client.query(
        candidature.SQL_10,
        [id_utilisateur]
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
        candidature.SQL_9,
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

    await client.query(candidature.SQL_3);
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
        await client.query(candidature.SQL_2);
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

  let client;
  let transactionStarted = false;
  try {
    client = await db.connect();
    await client.query(candidature.SQL_8);
    transactionStarted = true;

    const candidature = await client.query(
      candidature.SQL_7,
      [id_inscription]
    );
    if (candidature.rowCount === 0) {
      await client.query(candidature.SQL_2);
      return res.status(404).json({ message: "Candidature introuvable." });
    }
    const { id_formation, capacite_max, statut_actuel } = candidature.rows[0];

    if (statut === 'PRESELECTIONNEE') {
      const occupied = await client.query(
        candidature.SQL_6,
        [id_formation]
      );
      if (capacite_max != null && occupied.rows[0].total >= Number(capacite_max)
        && statut_actuel !== 'PRESELECTIONNEE') {
        await client.query(candidature.SQL_2);
        return res.status(400).json({
          message: 'La capacité maximale est atteinte avec les candidatures acceptées et préselectionnées.',
        });
      }
    }

    await client.query(
      candidature.SQL_5,
      [statut, id_inscription]
    );

    await client.query(
      candidature.SQL_4,
      [id_formation, capacite_max]
    );

    await client.query(candidature.SQL_3);
    transactionStarted = false;
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {});
    res.json({ message: "Statut de pré-sélection mis à jour." });
  } catch (err) {
    if (transactionStarted) await client.query(candidature.SQL_2);
    console.error("Erreur lors du changement de statut de la candidature :", err);
    res.status(500).json({ message: "Erreur lors du changement de statut." });
  } finally {
    client?.release();
  }
};