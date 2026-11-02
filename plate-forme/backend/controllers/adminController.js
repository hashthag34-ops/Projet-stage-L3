// backend/controllers/adminController.js
const db = require('../config/db');
const admin = require('../Models/adminModel');

const crypto = require('crypto');
const { randomUUID } = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { emitToRoles, disconnectUser } = require('../services/realtime');
const getFrontendBaseUrl = require('../utils/frontendUrl');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const syntheticFirstNames = ['Aina', 'Tiana', 'Miora', 'Fara', 'Nomena', 'Lova', 'Hery', 'Soa', 'Tahina', 'Mialy'];
const syntheticLastNames = ['Rakoto', 'Ramanantsoa', 'Andria', 'Rasoanaivo', 'Randria', 'Razafy', 'Rabe', 'Raveloson'];
const syntheticSchools = ['Établissement de test A', 'Établissement de test B', 'Centre de formation fictif'];
const syntheticFields = ['Informatique', 'Gestion', 'Communication', 'Réseaux', 'Marketing'];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomInteger = (minimum, maximum) => Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
const randomRecentDate = (now) => new Date(now.getTime() - randomInteger(0, 180) * 24 * 60 * 60 * 1000);
const buildValuesClause = (rows, columnCount) => rows.map((_, rowIndex) => (
  `(${Array.from({ length: columnCount }, (__, columnIndex) => `$${rowIndex * columnCount + columnIndex + 1}`).join(', ')})`
)).join(', ');

// Lister tous les utilisateurs avec leur rôle
exports.getUsers = async (req, res) => {
  try {
    const query = admin.SQL_1;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getUsers :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Créer un utilisateur et l'assigner à son rôle
exports.createUser = async (req, res) => {
  const { email, nom, prenom, telephone = '', role, mot_de_passe } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedNom = typeof nom === 'string' ? nom.trim() : '';
  const normalizedPrenom = typeof prenom === 'string' ? prenom.trim() : '';
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    || !normalizedNom
    || !normalizedPrenom
    || !['ADMINISTRATEUR', 'RESPONSABLE', 'FORMATEUR'].includes(role)
  ) {
    return res.status(400).json({ message: 'Veuillez renseigner le nom, le prénom, l’email et un rôle valide.' });
  }
  if (role === 'ADMINISTRATEUR' && (typeof mot_de_passe !== 'string' || mot_de_passe.length < 8)) {
    return res.status(400).json({ message: 'Le mot de passe administrateur doit contenir au moins 8 caractères.' });
  }

  let client;
  let transactionStarted = false;
  try {
    if (role === 'ADMINISTRATEUR') {
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      client = await db.connect();
      await client.query(admin.SQL_17);
      transactionStarted = true;

      const userRes = await client.query(
        admin.SQL_23,
        [normalizedEmail, normalizedNom, normalizedPrenom, telephone.trim(), hashedPassword]
      );
      await client.query(
        admin.SQL_22,
        [userRes.rows[0].id_utilisateur]
      );
      await client.query(admin.SQL_13);
      transactionStarted = false;
      emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
      return res.status(201).json({ message: 'Administrateur créé avec succès.' });
    }

    const frontendBaseUrl = getFrontendBaseUrl(req);
    await transporter.verify();
    client = await db.connect();
    await client.query(admin.SQL_17);
    transactionStarted = true;

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(activationToken).digest('hex');

    const userQuery = admin.SQL_2;
    const userRes = await client.query(userQuery, [normalizedEmail, normalizedNom, normalizedPrenom, activationTokenHash]);
    const userId = userRes.rows[0].id_utilisateur;

    if (role === 'ADMINISTRATEUR') {
      await client.query(admin.SQL_22, [userId]);
    } else if (role === 'RESPONSABLE') {
      await client.query(admin.SQL_21, [userId]);
    } else if (role === 'FORMATEUR') {
      await client.query(admin.SQL_20, [userId]);
    }

    const setupLink = `${frontendBaseUrl}/setup-account?token=${encodeURIComponent(activationToken)}`;
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
    await transporter.sendMail({
      to: normalizedEmail,
      from: `"Plateforme Formations" <${process.env.EMAIL_USER}>`,
      subject: 'Finalisez la configuration de votre compte',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Bonjour ${escapeHtml(normalizedPrenom)} ${escapeHtml(normalizedNom)},</h2>
          <p>Un compte ${escapeHtml(role.toLowerCase())} a été créé pour vous.</p>
          <p>Pour vérifier votre adresse e-mail et définir votre nom d’utilisateur ainsi que votre mot de passe, utilisez le lien ci-dessous. Il est valable pendant 24 heures.</p>
          <p style="margin: 24px 0;">
            <a href="${setupLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Configurer mon compte
            </a>
          </p>
          <p>Si vous n’attendiez pas cet e-mail, vous pouvez l’ignorer.</p>
        </div>
      `
    });

    await client.query(admin.SQL_13);
    transactionStarted = false;
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.status(201).json({ message: 'Compte créé. Un e-mail de configuration a été envoyé à cette adresse.' });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query(admin.SQL_12);
      } catch (rollbackError) {
        console.error('Erreur lors de l’annulation de la création du compte :', rollbackError);
      }
    }
    console.error("Erreur createUser :", error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Cette adresse e-mail est déjà utilisée.' });
    }
    if (error.code === 'INVALID_FRONTEND_URL') {
      return res.status(400).json({ message: error.message });
    }
    res.status(503).json({ message: "Impossible de créer le compte ou d'envoyer l'e-mail de configuration. Vérifiez la configuration du service e-mail puis réessayez." });
  } finally {
    client?.release();
  }
};

// Changer le statut d'un compte (ACTIF, DESACTIVE, SUSPENDU)
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { statut_compte } = req.body;

  try {
    if (Number(id) === Number(req.user.id_utilisateur)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas modifier le statut de votre propre compte.' });
    }
    if (!['ACTIF', 'DESACTIVE', 'SUSPENDU'].includes(statut_compte)) {
      return res.status(400).json({ message: 'Statut de compte invalide.' });
    }
    const result = await db.query(
      admin.SQL_19,
      [statut_compte, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Utilisateur introuvable." });
    if (statut_compte !== 'ACTIF') disconnectUser(id);
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.status(200).json({ message: "Statut mis à jour." });
  } catch (error) {
    console.error("Erreur updateUserStatus :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

exports.getSyntheticDataFormations = async (req, res) => {
  try {
    const { rows } = await db.query(
      admin.SQL_18
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur getSyntheticDataFormations :', error);
    res.status(500).json({ message: 'Impossible de charger les formations.' });
  }
};

exports.createSyntheticCandidates = async (req, res) => {
  const { nombre, id_formations, mode, max_formations } = req.body;
  if (!Number.isInteger(nombre) || nombre < 1 || nombre > 500) {
    return res.status(400).json({ message: 'Le nombre doit être compris entre 1 et 500.' });
  }
  if (!Array.isArray(id_formations) || id_formations.length < 1 || id_formations.length > 10
    || id_formations.some((id) => !Number.isInteger(id) || id < 1)
    || new Set(id_formations).size !== id_formations.length) {
    return res.status(400).json({ message: 'Sélectionnez entre 1 et 10 formations valides.' });
  }
  if (!['attente', 'apprenant'].includes(mode)) {
    return res.status(400).json({ message: 'Le mode de génération est invalide.' });
  }
  if (!Number.isInteger(max_formations) || max_formations < 1 || max_formations > id_formations.length) {
    return res.status(400).json({ message: 'Le nombre de formations par candidat est invalide.' });
  }

  let client;
  try {
    client = await db.connect();
    await client.query(admin.SQL_17);

    const existingFormations = await client.query(
      admin.SQL_16,
      [id_formations]
    );
    if (existingFormations.rows.length !== id_formations.length) {
      await client.query(admin.SQL_12);
      return res.status(400).json({ message: 'Une ou plusieurs formations sélectionnées sont introuvables.' });
    }

    const availableSeatsByFormation = new Map();
    if (mode === 'apprenant') {
      const lockedFormations = await client.query(
        admin.SQL_15,
        [id_formations]
      );
      const acceptedCounts = await client.query(
        admin.SQL_14,
        [id_formations]
      );
      const acceptedByFormation = new Map(
        acceptedCounts.rows.map((row) => [row.id_formation, Number(row.total)])
      );
      lockedFormations.rows.forEach((formation) => {
        availableSeatsByFormation.set(
          formation.id_formation,
          formation.capacite_max == null
            ? Number.POSITIVE_INFINITY
            : Math.max(0, Number(formation.capacite_max) - (acceptedByFormation.get(formation.id_formation) || 0))
        );
      });

      const totalAvailableSeats = [...availableSeatsByFormation.values()]
        .reduce((total, seats) => total + seats, 0);
      if (totalAvailableSeats < nombre) {
        await client.query(admin.SQL_12);
        return res.status(400).json({
          message: `Capacité insuffisante : ${totalAvailableSeats} place(s) disponible(s) pour ${nombre} apprenant(s) demandé(s).`
        });
      }
    }

    const now = new Date();
    const candidates = Array.from({ length: nombre }, () => {
      const prenom = randomItem(syntheticFirstNames);
      const nom = randomItem(syntheticLastNames);
      const dateCreation = randomRecentDate(now);
      return {
        email: `synthetic-${randomUUID()}@example.invalid`,
        nom,
        prenom,
        age: randomInteger(18, 40),
        genre: randomItem(['Femme', 'Homme', 'Non renseigné']),
        telephone: '000000000',
        niveau_etude: randomItem(['Baccalauréat', 'Licence', 'Master', 'Formation professionnelle']),
        situation_professionnelle: randomItem(['Étudiant', 'En recherche d’emploi', 'Salarié']),
        etablissement: randomItem(syntheticSchools),
        filiere: randomItem(syntheticFields),
        dateCreation
      };
    });

    const candidateValues = candidates.flatMap((candidate) => [
      candidate.email,
      candidate.nom,
      candidate.prenom,
      candidate.age,
      candidate.genre,
      candidate.telephone,
      candidate.niveau_etude,
      candidate.situation_professionnelle,
      candidate.etablissement,
      candidate.filiere,
      candidate.dateCreation
    ]);
    const candidateResult = await client.query(
      `INSERT INTO candidat (
         email, nom, prenom, age, genre, telephone, niveau_etude,
         situation_professionnelle, etablissement, filiere, date_creation
       ) VALUES ${buildValuesClause(candidates, 11)}
       RETURNING id_candidat, email`,
      candidateValues
    );
    const candidateIdsByEmail = new Map(candidateResult.rows.map((row) => [row.email, row.id_candidat]));

    const applications = [];
    const selectedFormationsByCandidate = candidates.map(() => []);
    if (mode === 'apprenant') {
      candidates.forEach((__, candidateIndex) => {
        const availableFormations = [...availableSeatsByFormation.entries()]
          .filter(([, seats]) => seats > 0)
          .map(([id]) => id);
        const selectedFormation = randomItem(availableFormations);
        selectedFormationsByCandidate[candidateIndex].push(selectedFormation);
        availableSeatsByFormation.set(
          selectedFormation,
          availableSeatsByFormation.get(selectedFormation) - 1
        );
      });
    }

    candidates.forEach((candidate, candidateIndex) => {
      const selectedForCandidate = selectedFormationsByCandidate[candidateIndex];
      const targetCount = randomInteger(1, max_formations);
      while (selectedForCandidate.length < targetCount) {
        const availableFormations = id_formations.filter((id) => (
          !selectedForCandidate.includes(id)
          && (mode !== 'apprenant' || availableSeatsByFormation.get(id) > 0)
        ));
        if (availableFormations.length === 0) break;
        const selectedFormation = randomItem(availableFormations);
        selectedForCandidate.push(selectedFormation);
        if (mode === 'apprenant') {
          availableSeatsByFormation.set(
            selectedFormation,
            availableSeatsByFormation.get(selectedFormation) - 1
          );
        }
      }
      const applicationDate = candidate.dateCreation > now ? now : candidate.dateCreation;
      selectedForCandidate.forEach((id_formation) => {
        applications.push({
          id_candidat: candidateIdsByEmail.get(candidate.email),
          id_formation,
          email: candidate.email,
          date_inscription: applicationDate,
          statut: mode === 'apprenant' ? 'ACCEPTEE' : 'EN_ATTENTE',
          motivation: 'Candidature de démonstration générée par l’administration.',
          objectif: 'Développer des compétences dans cette formation.',
          projet_apres_formation: 'Mettre en pratique les compétences acquises.',
          source_information: 'Jeu de données synthétique',
          a_deja_suivi_formation: false,
          conditions_acceptees: true,
          date_decision: mode === 'apprenant' ? applicationDate : null
        });
      });
    });

    if (mode === 'apprenant') {
      const userValues = candidates.flatMap((candidate) => [
        candidate.email,
        candidate.nom,
        candidate.prenom,
        candidate.telephone,
        candidate.age,
        candidate.dateCreation
      ]);
      const userResult = await client.query(
        `INSERT INTO utilisateur (email, nom, prenom, telephone, age, date_creation)
         VALUES ${buildValuesClause(candidates, 6)}
         RETURNING id_utilisateur, email`,
        userValues
      );
      const userIdsByEmail = new Map(userResult.rows.map((row) => [row.email, row.id_utilisateur]));
      const learnerRows = candidates.map((candidate) => ({
        id_utilisateur: userIdsByEmail.get(candidate.email),
        date_creation: candidate.dateCreation,
        statut: 'ACTIF'
      }));
      await client.query(
        `INSERT INTO apprenant (id_utilisateur, date_creation, statut)
         VALUES ${buildValuesClause(learnerRows, 3)}
         ON CONFLICT (id_utilisateur) DO UPDATE SET statut = 'ACTIF'`,
        learnerRows.flatMap((learner) => [
          learner.id_utilisateur,
          learner.date_creation,
          learner.statut
        ])
      );
    }

    await client.query(
      `INSERT INTO inscription (
         id_candidat, id_formation, email_candidat, date_inscription, statut, motivation, objectif,
         projet_apres_formation, source_information, a_deja_suivi_formation,
         conditions_acceptees, date_decision
       ) VALUES ${buildValuesClause(applications, 12)}`,
      applications.flatMap((application) => [
        application.id_candidat,
        application.id_formation,
        application.email,
        application.date_inscription,
        application.statut,
        application.motivation,
        application.objectif,
        application.projet_apres_formation,
        application.source_information,
        application.a_deja_suivi_formation,
        application.conditions_acceptees,
        application.date_decision
      ])
    );

    await client.query(admin.SQL_13);
    emitToRoles(['RESPONSABLE', 'ADMINISTRATEUR'], 'candidatures:changed', {});
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.status(201).json({
      message: 'Les données synthétiques ont été ajoutées sans envoyer d’e-mail.',
      candidats_crees: candidates.length,
      candidatures_creees: applications.length,
      apprenants_crees: mode === 'apprenant' ? candidates.length : 0,
      comptes_sans_mot_de_passe: mode === 'apprenant' ? candidates.length : 0
    });
  } catch (error) {
    if (client) {
      try {
        await client.query(admin.SQL_12);
      } catch (rollbackError) {
        console.error('Erreur lors de l’annulation de la génération synthétique :', rollbackError);
      }
    }
    console.error('Erreur createSyntheticCandidates :', error);
    res.status(500).json({ message: 'Erreur lors de la génération des données synthétiques.' });
  } finally {
    client?.release();
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const [overview, formationOverview, formationsByMonth, applicationsByFormation, successByFormation, ratingsByFormation, formationRanking, evaluationRanking] = await Promise.all([
      db.query(
        admin.SQL_11
      ),
      db.query(
        admin.SQL_10
      ),
      db.query(
        admin.SQL_9
      ),
      db.query(
        admin.SQL_8
      ),
      db.query(
        admin.SQL_7
      ),
      db.query(
        admin.SQL_6
      ),
      db.query(
        admin.SQL_5
      ),
      db.query(
        admin.SQL_4
      )
    ]);

    res.json({
      overview: { ...overview.rows[0], ...formationOverview.rows[0] },
      formationsByMonth: formationsByMonth.rows,
      applicationsByFormation: applicationsByFormation.rows,
      successByFormation: successByFormation.rows,
      ratingsByFormation: ratingsByFormation.rows,
      formationRanking: formationRanking.rows,
      evaluationRanking: evaluationRanking.rows
    });
  } catch (error) {
    console.error('Erreur statistiques administrateur :', error);
    res.status(500).json({ message: 'Impossible de charger les statistiques.' });
  }
};

exports.getUserActivityByMonth = async (req, res) => {
  try {
    const { rows } = await db.query(
      admin.SQL_3
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur activité mensuelle utilisateurs :', error);
    res.status(500).json({ message: 'Impossible de charger l’activité mensuelle.' });
  }
};