// backend/controllers/candidatureController.js
const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.validerCandidature = async (req, res) => {
  const { id_inscription } = req.params;
  const client = await db.connect();

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

    // 3. Récupérer ou créer l'utilisateur
    let id_utilisateur;
    const resUser = await client.query(`SELECT id_utilisateur FROM utilisateur WHERE email = $1`, [cand.email]);

    if (resUser.rows.length > 0) {
      id_utilisateur = resUser.rows[0].id_utilisateur;
    } else {
      const resNewUser = await client.query(
        `INSERT INTO utilisateur (email, nom, prenom, telephone, age, statut_compte)
         VALUES ($1, $2, $3, $4, $5, 'ACTIF')
         RETURNING id_utilisateur`,
        [cand.email, cand.nom, cand.prenom, cand.telephone, cand.age]
      );
      id_utilisateur = resNewUser.rows[0].id_utilisateur;
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

    await client.query('COMMIT');

    // 7. Envoi de l'email
    const configLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/setup-account?email=${encodeURIComponent(cand.email)}`;

    const mailOptions = {
      from: '"Plateforme Formations" <no-reply@formation.com>',
      to: cand.email,
      subject: '🎉 Candidature acceptée - Activez votre compte & votre Badge',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Bonjour ${cand.prenom} ${cand.nom},</h2>
          <p>Félicitations ! Votre candidature pour <strong>${cand.formation_titre}</strong> a été acceptée.</p>
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
      `,
      attachments: [
        {
          filename: 'badge-qrcode.png',
          path: qrCodeDataURL,
          cid: 'qrcode_badge'
        }
      ]
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.error("Erreur d'envoi du mail :", err);
    });

    res.json({ message: "Candidature acceptée et QR code enregistré dans le compte utilisateur." });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la validation :", err);
    res.status(500).json({ message: "Erreur serveur lors de la validation." });
  } finally {
    client.release();
  }
};

// Modification ici : de `export const getCandidatures` à `exports.getCandidatures`
exports.getCandidatures = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id_inscription,
        i.statut,
        i.date_inscription,
        i.motivation,
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
  const client = await db.connect();

  try {
    await client.query('BEGIN');

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
       WHERE i.id_formation = $1 AND i.statut = 'PRESELECTIONNEE'
       FOR UPDATE`,
      [id_formation]
    );

    const candidats = resPreselection.rows;

    if (candidats.length > capaciteMax) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `La limite est dépassée : ${candidats.length} candidats sélectionnés pour une capacité maximale de ${capaciteMax}.`
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
      const resUser = await client.query(`SELECT id_utilisateur FROM utilisateur WHERE email = $1`, [cand.email]);

      if (resUser.rows.length > 0) {
        id_utilisateur = resUser.rows[0].id_utilisateur;
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
        qrCodeDataURL
      });
    }

    await client.query('COMMIT');

    for (const item of candidatsTraites) {
      const configLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/setup-account?email=${encodeURIComponent(item.email)}`;

      const mailOptions = {
        from: '"Plateforme Formations" <no-reply@formation.com>',
        to: item.email,
        subject: '🎉 Candidature acceptée - Activez votre compte & votre Badge',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>Bonjour ${item.prenom} ${item.nom},</h2>
            <p>Félicitations ! Votre candidature pour <strong>${item.formation_titre}</strong> a été acceptée.</p>
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
        `,
        attachments: [
          {
            filename: 'badge-qrcode.png',
            path: item.qrCodeDataURL,
            cid: 'qrcode_badge'
          }
        ]
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) console.error(`Erreur d'envoi du mail à ${item.email} :`, err);
      });
    }

    res.json({ 
      message: `Validation réussie ! ${candidatsTraites.length} comptes créés et emails envoyés.`,
      totalTraites: candidatsTraites.length 
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la validation globale :", err);
    res.status(500).json({ message: "Erreur serveur lors de la validation globale." });
  } finally {
    client.release();
  }
};

exports.togglePreselection = async (req, res) => {
  const { id_inscription } = req.params;
  const { statut } = req.body;

  try {
    await db.query(
      `UPDATE inscription SET statut = $1 WHERE id_inscription = $2`,
      [statut, id_inscription]
    );
    res.json({ message: "Statut de pré-sélection mis à jour." });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors du changement de statut." });
  }
};