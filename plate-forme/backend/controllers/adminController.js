// backend/controllers/adminController.js
const db = require('../config/db');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const nodemailer = require('nodemailer');
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
    const query = `
      SELECT 
        u.id_utilisateur, u.email, u.nom, u.prenom, u.telephone, u.age, u.photo_profil,
        u.statut_compte, u.date_creation, u.date_derniere_connexion, u.date_derniere_deconnexion,
        f.specialite,
        r.fonction,
        ap.id_apprenant,
        latest_candidature.formation_titre,
        latest_candidature.motivation,
        latest_candidature.objectif,
        latest_candidature.projet_apres_formation,
        latest_candidature.niveau_etude,
        latest_candidature.situation_professionnelle,
        latest_candidature.etablissement,
        latest_candidature.filiere,
        latest_candidature.statut AS candidature_statut,
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
      LEFT JOIN LATERAL (
        SELECT f.titre AS formation_titre, i.motivation, i.objectif, i.projet_apres_formation,
               c.niveau_etude, c.situation_professionnelle, c.etablissement, c.filiere,
               i.statut
        FROM inscription i
        JOIN candidat c ON c.id_candidat = i.id_candidat
        JOIN formation f ON f.id_formation = i.id_formation
        WHERE c.email = u.email
        ORDER BY i.date_inscription DESC
        LIMIT 1
      ) latest_candidature ON TRUE
      ORDER BY u.id_utilisateur DESC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getUsers :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Créer un utilisateur et l'assigner à son rôle
exports.createUser = async (req, res) => {
  const { email, nom, prenom, role } = req.body;
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

  let client;
  let transactionStarted = false;
  try {
    const frontendBaseUrl = getFrontendBaseUrl(req);
    await transporter.verify();
    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(activationToken).digest('hex');

    const userQuery = `
      INSERT INTO utilisateur (
        email, nom, prenom, statut_compte, email_verifie,
        jeton_activation_hash, jeton_activation_expiration
      )
      VALUES ($1, $2, $3, 'ACTIF', FALSE, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours')
      RETURNING id_utilisateur;
    `;
    const userRes = await client.query(userQuery, [normalizedEmail, normalizedNom, normalizedPrenom, activationTokenHash]);
    const userId = userRes.rows[0].id_utilisateur;

    if (role === 'ADMINISTRATEUR') {
      await client.query('INSERT INTO administrateur (id_utilisateur) VALUES ($1)', [userId]);
    } else if (role === 'RESPONSABLE') {
      await client.query('INSERT INTO responsable (id_utilisateur) VALUES ($1)', [userId]);
    } else if (role === 'FORMATEUR') {
      await client.query('INSERT INTO formateur (id_utilisateur) VALUES ($1)', [userId]);
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

    await client.query('COMMIT');
    transactionStarted = false;
    emitToRoles(['ADMINISTRATEUR'], 'users:changed', {});
    res.status(201).json({ message: 'Compte créé. Un e-mail de configuration a été envoyé à cette adresse.' });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
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
    const result = await db.query(
      'UPDATE utilisateur SET statut_compte = $1 WHERE id_utilisateur = $2',
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
      `SELECT id_formation, titre, statut
       FROM formation
       ORDER BY titre, id_formation`
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
    await client.query('BEGIN');

    const existingFormations = await client.query(
      'SELECT id_formation FROM formation WHERE id_formation = ANY($1::integer[])',
      [id_formations]
    );
    if (existingFormations.rows.length !== id_formations.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Une ou plusieurs formations sélectionnées sont introuvables.' });
    }

    const availableSeatsByFormation = new Map();
    if (mode === 'apprenant') {
      const lockedFormations = await client.query(
        `SELECT id_formation, capacite_max
         FROM formation
         WHERE id_formation = ANY($1::integer[])
         FOR UPDATE`,
        [id_formations]
      );
      const acceptedCounts = await client.query(
        `SELECT id_formation, COUNT(*)::INTEGER AS total
         FROM inscription
         WHERE id_formation = ANY($1::integer[]) AND statut = 'ACCEPTEE'
         GROUP BY id_formation`,
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
        await client.query('ROLLBACK');
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
        id_candidat: candidateIdsByEmail.get(candidate.email),
        date_creation: candidate.dateCreation,
        statut: 'ACTIF'
      }));
      await client.query(
        `INSERT INTO apprenant (id_utilisateur, id_candidat, date_creation, statut)
         VALUES ${buildValuesClause(learnerRows, 4)}`,
        learnerRows.flatMap((learner) => [
          learner.id_utilisateur,
          learner.id_candidat,
          learner.date_creation,
          learner.statut
        ])
      );
    }

    await client.query(
      `INSERT INTO inscription (
         id_candidat, id_formation, date_inscription, statut, motivation, objectif,
         projet_apres_formation, source_information, a_deja_suivi_formation,
         conditions_acceptees, date_decision
       ) VALUES ${buildValuesClause(applications, 11)}`,
      applications.flatMap((application) => [
        application.id_candidat,
        application.id_formation,
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

    await client.query('COMMIT');
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
        await client.query('ROLLBACK');
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
    const [overview, formationsByMonth, applicationsByFormation, successByFormation, ratingsByFormation] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::INTEGER AS utilisateurs,
                COUNT(*) FILTER (WHERE ap.id_apprenant IS NOT NULL)::INTEGER AS apprenants,
                COUNT(*) FILTER (WHERE fo.id_formateur IS NOT NULL)::INTEGER AS formateurs,
                COUNT(*) FILTER (WHERE r.id_responsable IS NOT NULL)::INTEGER AS responsables,
                COUNT(*) FILTER (WHERE ad.id_administrateur IS NOT NULL)::INTEGER AS administrateurs
         FROM utilisateur u
         LEFT JOIN apprenant ap ON ap.id_utilisateur = u.id_utilisateur
         LEFT JOIN formateur fo ON fo.id_utilisateur = u.id_utilisateur
         LEFT JOIN responsable r ON r.id_utilisateur = u.id_utilisateur
         LEFT JOIN administrateur ad ON ad.id_utilisateur = u.id_utilisateur`
      ),
      db.query(
        `SELECT TO_CHAR(month_start, 'YYYY-MM') AS mois,
                COUNT(f.id_formation)::INTEGER AS formations
         FROM GENERATE_SERIES(
           DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
           DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month'
         ) AS months(month_start)
         LEFT JOIN formation f ON DATE_TRUNC('month', f.date_creation) = month_start
         GROUP BY month_start ORDER BY month_start`
      ),
      db.query(
        `SELECT f.id_formation, f.titre,
                COUNT(i.id_inscription)::INTEGER AS candidatures,
                COUNT(i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS acceptees,
                COUNT(i.id_inscription) FILTER (WHERE i.statut = 'EN_ATTENTE')::INTEGER AS en_attente
         FROM formation f
         LEFT JOIN inscription i ON i.id_formation = f.id_formation
         GROUP BY f.id_formation
         ORDER BY candidatures DESC, f.titre`
      ),
      db.query(
        `WITH resultats AS (
           SELECT es.id_formation, et.id_tentative, et.note
           FROM evaluation_tentative et
           JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
           WHERE et.statut = 'TERMINEE'
         )
         SELECT f.id_formation, f.titre,
                COUNT(r.id_tentative)::INTEGER AS tentatives,
                COUNT(r.id_tentative) FILTER (WHERE r.note >= 10)::INTEGER AS reussites,
                ROUND(AVG(r.note), 1) AS note_moyenne,
                ROUND(100.0 * COUNT(r.id_tentative) FILTER (WHERE r.note >= 10)
                  / NULLIF(COUNT(r.id_tentative), 0), 1) AS taux_reussite
         FROM formation f
         LEFT JOIN resultats r ON r.id_formation = f.id_formation
         GROUP BY f.id_formation
         ORDER BY tentatives DESC, f.titre`
      ),
      db.query(
        `SELECT f.id_formation, f.titre,
                ROUND(AVG(fa.note)::NUMERIC, 1) AS note_moyenne,
                COUNT(fa.id_avis)::INTEGER AS avis_count
         FROM formation f
         LEFT JOIN formation_avis fa ON fa.id_formation = f.id_formation
         GROUP BY f.id_formation
         ORDER BY avis_count DESC, note_moyenne DESC NULLS LAST, f.titre`
      )
    ]);

    res.json({
      overview: overview.rows[0],
      formationsByMonth: formationsByMonth.rows,
      applicationsByFormation: applicationsByFormation.rows,
      successByFormation: successByFormation.rows,
      ratingsByFormation: ratingsByFormation.rows
    });
  } catch (error) {
    console.error('Erreur statistiques administrateur :', error);
    res.status(500).json({ message: 'Impossible de charger les statistiques.' });
  }
};

exports.getUserActivityByMonth = async (req, res) => {
  try {
    const { rows } = await db.query(
      `WITH months AS (
        SELECT generated.month_start::DATE AS month_start
         FROM GENERATE_SERIES(
           DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
           DATE_TRUNC('month', CURRENT_DATE),
           INTERVAL '1 month'
        ) AS generated(month_start)
       ),
       monthly_users AS (
         SELECT DATE_TRUNC('month', date_creation)::DATE AS month_start, COUNT(*)::INTEGER AS comptes
         FROM utilisateur
         WHERE date_creation >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY DATE_TRUNC('month', date_creation)
       ),
       monthly_applications AS (
         SELECT DATE_TRUNC('month', date_inscription)::DATE AS month_start, COUNT(*)::INTEGER AS candidatures
         FROM inscription
         WHERE date_inscription >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY DATE_TRUNC('month', date_inscription)
       )
       SELECT TO_CHAR(months.month_start, 'YYYY-MM') AS mois,
              COALESCE(monthly_users.comptes, 0)::INTEGER AS comptes,
              COALESCE(monthly_applications.candidatures, 0)::INTEGER AS candidatures
       FROM months
       LEFT JOIN monthly_users USING (month_start)
       LEFT JOIN monthly_applications USING (month_start)
       ORDER BY months.month_start`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur activité mensuelle utilisateurs :', error);
    res.status(500).json({ message: 'Impossible de charger l’activité mensuelle.' });
  }
};