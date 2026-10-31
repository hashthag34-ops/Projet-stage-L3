// backend/controllers/apprenantController.js
const db = require('../config/db'); // Ton module de connexion MySQL / Postgres

// 1. Récupérer les formations auxquelles l'apprenant est inscrit (avec progression)
exports.getMesFormations = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur; // Issu du middleware d'authentification JWT

  try {
    const query = `
      SELECT f.id_formation, f.titre, f.description, f.statut, i.statut AS statut_candidature
      FROM apprenant a
      JOIN inscription i ON a.id_candidat = i.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      WHERE a.id_utilisateur = $1 AND i.statut = 'ACCEPTEE'
    `;
    const { rows } = await db.query(query, [id_utilisateur]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des formations" });
  }
};

exports.getHistoriqueFormations = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id_formation, f.titre, f.description, f.statut AS statut_formation,
              f.date_debut, f.date_fin,
              COALESCE(presences.total_seances, 0)::INTEGER AS total_seances,
              COALESCE(presences.presentes, 0)::INTEGER AS presentes,
              COALESCE(presences.absentes, 0)::INTEGER AS absentes,
              COALESCE(presences.retards, 0)::INTEGER AS retards,
              COALESCE(notes.evaluations, '[]'::json) AS notes,
              COALESCE(certification.statut::TEXT, 'EN_ATTENTE') AS statut_certification,
              certification.date_certification,
              certification.numero_certification,
              certification.fichier_certification
       FROM apprenant a
       JOIN inscription i ON i.id_candidat = a.id_candidat AND i.statut = 'ACCEPTEE'
       JOIN formation f ON f.id_formation = i.id_formation
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                )::INTEGER AS total_seances,
                COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                    AND p.statut = 'PRESENT'
                )::INTEGER AS presentes,
                COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                    AND (p.statut = 'ABSENT' OR p.id_presence IS NULL)
                )::INTEGER AS absentes,
                COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                    AND p.statut = 'RETARD'
                )::INTEGER AS retards
         FROM seance s
         LEFT JOIN presence p
           ON p.id_seance = s.id_seance AND p.id_apprenant = a.id_apprenant
         WHERE s.id_formation = f.id_formation
       ) presences ON TRUE
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id_note', notes.id_note,
                    'type_evaluation', notes.type_evaluation,
                    'note', notes.note,
                    'date_evaluation', notes.date_evaluation,
                    'commentaire', notes.commentaire,
                    'origine', notes.origine
                  )
                  ORDER BY notes.date_evaluation DESC NULLS LAST, notes.id_note DESC
                ) AS evaluations
         FROM (
           SELECT e.id_evaluation AS id_note, e.type_evaluation, e.note,
                  e.date_evaluation, e.commentaire, 'MANUELLE' AS origine
           FROM evaluation e
           WHERE e.id_apprenant = a.id_apprenant
             AND e.id_formation = f.id_formation
             AND e.note IS NOT NULL
           UNION ALL
           SELECT et.id_tentative AS id_note, es.titre AS type_evaluation, et.note,
                  et.date_fin::date AS date_evaluation, NULL::text AS commentaire,
                  'ÉVALUATION' AS origine
           FROM evaluation_tentative et
           JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
           WHERE et.id_apprenant = a.id_apprenant
             AND es.id_formation = f.id_formation
             AND et.note IS NOT NULL
         ) notes
       ) notes ON TRUE
       LEFT JOIN certification
         ON certification.id_apprenant = a.id_apprenant
        AND certification.id_formation = f.id_formation
       WHERE a.id_utilisateur = $1
       ORDER BY f.date_fin DESC, f.id_formation DESC`,
      [req.user.id_utilisateur]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur historique des formations apprenant :', error);
    res.status(500).json({ message: 'Erreur lors du chargement de votre historique de formations.' });
  }
};

// 2. Récupérer les séances de cours de l'apprenant (Planning)
exports.getMesSeances = async (req, res) => {
  try {
    const id_utilisateur = req.user.id_utilisateur; // Récupéré depuis le token JWT ou la session

    // Requête SQL complète :
    // 1. Trouve l'apprenant correspondant à l'utilisateur connecté
    // 2. Récupère le candidat associé à cet apprenant
    // 3. Récupère les inscriptions ACCEPTEES de ce candidat
    // 4. Joint les formations et leurs séances
    // 5. Joint la table presence pour récupérer le statut du scan s'il existe (PRESENT / ABSENT / RETARD)
    const query = `
      SELECT 
        s.id_seance,
        s.titre,
        s.description,
        s.date_seance,
        s.heure_debut,
        s.heure_fin,
        s.type_seance,
        s.salle,
        f.id_formation,
        f.titre AS titre_formation,
        p.statut AS statut_presence,
        p.date_scan
      FROM utilisateur u
      JOIN apprenant a ON u.id_utilisateur = a.id_utilisateur
      JOIN inscription i ON a.id_candidat = i.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      JOIN seance s ON f.id_formation = s.id_formation
      LEFT JOIN presence p ON p.id_seance = s.id_seance AND p.id_apprenant = a.id_apprenant
      WHERE u.id_utilisateur = $1
        AND i.statut = 'ACCEPTEE'
      ORDER BY s.date_seance ASC, s.heure_debut ASC;
    `;

    const { rows } = await db.query(query, [id_utilisateur]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur récupération planning apprenant :", error);
    return res.status(500).json({ error: "Erreur lors du chargement du planning" });
  }
};

// 3. Récupérer les forums des formations autorisées
exports.getMesForums = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur;

  try {
    const query = `
      SELECT fo.id_forum, fo.nom, fo.description, f.titre AS titre_formation
      FROM apprenant a
      JOIN inscription i ON a.id_candidat = i.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      JOIN forum fo ON fo.id_formation = f.id_formation
      WHERE a.id_utilisateur = $1
        AND i.statut = 'ACCEPTEE'
        AND f.date_fin >= CURRENT_DATE
    `;
    const { rows } = await db.query(query, [id_utilisateur]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des forums" });
  }
};

exports.getMesEvaluations = async (req, res) => {
  try {
    await db.query(
      `INSERT INTO evaluation_tentative
       (id_evaluation_sujet, id_apprenant, date_debut, date_fin, note, statut)
       SELECT es.id_evaluation_sujet, a.id_apprenant, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 'TERMINEE'
       FROM evaluation_sujet es
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE a.id_utilisateur = $1
         AND es.statut = 'PUBLIEE'
         AND es.date_fermeture <= CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM evaluation_tentative et
           WHERE et.id_evaluation_sujet = es.id_evaluation_sujet
             AND et.id_apprenant = a.id_apprenant
         )`,
      [req.user.id_utilisateur]
    );
    const { rows } = await db.query(
      `SELECT es.id_evaluation_sujet, es.id_formation, es.titre, es.description,
              es.duree_minutes, es.obligatoire, es.total_points, es.date_publication,
              f.titre AS formation_titre,
              (SELECT COUNT(*)::INTEGER FROM evaluation_question eq
               WHERE eq.id_evaluation_sujet = es.id_evaluation_sujet) AS questions_count,
              latest.id_tentative, latest.statut AS tentative_statut,
              latest.note, latest.date_debut, latest.date_fin
       FROM apprenant a
       JOIN inscription i ON i.id_candidat = a.id_candidat AND i.statut = 'ACCEPTEE'
       JOIN evaluation_sujet es ON es.id_formation = i.id_formation AND es.statut = 'PUBLIEE'
       JOIN formation f ON f.id_formation = es.id_formation
       LEFT JOIN LATERAL (
         SELECT et.id_tentative, et.statut, et.note, et.date_debut, et.date_fin
         FROM evaluation_tentative et
         WHERE et.id_evaluation_sujet = es.id_evaluation_sujet
           AND et.id_apprenant = a.id_apprenant
         ORDER BY et.date_debut DESC
         LIMIT 1
       ) latest ON TRUE
       WHERE a.id_utilisateur = $1
       ORDER BY es.date_publication DESC, es.id_evaluation_sujet DESC`,
      [req.user.id_utilisateur]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur évaluations apprenant :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des évaluations.' });
  }
};

exports.getEvaluationApprenant = async (req, res) => {
  try {
    const sujet = await db.query(
      `SELECT es.id_evaluation_sujet, es.id_formation, es.titre, es.description,
              es.duree_minutes, es.obligatoire, es.total_points,
              f.titre AS formation_titre
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE es.id_evaluation_sujet = $1 AND es.statut = 'PUBLIEE'         AND (es.date_fermeture IS NULL OR es.date_fermeture > CURRENT_TIMESTAMP AT TIME ZONE 'UTC')         AND (es.date_fermeture IS NULL OR es.date_fermeture > CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
         AND a.id_utilisateur = $2`,
      [req.params.id, req.user.id_utilisateur]
    );
    if (!sujet.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable ou non accessible.' });

    const questions = await db.query(
      `SELECT eq.id_question, eq.numero_question, eq.enonce, eq.points,
              COALESCE(json_agg(json_build_object(
                'id_choix', ec.id_choix,
                'libelle', ec.libelle,
                'ordre', ec.ordre
              ) ORDER BY ec.ordre) FILTER (WHERE ec.id_choix IS NOT NULL), '[]') AS choix
       FROM evaluation_question eq
       LEFT JOIN evaluation_choix ec ON ec.id_question = eq.id_question
       WHERE eq.id_evaluation_sujet = $1
       GROUP BY eq.id_question
       ORDER BY eq.numero_question`,
      [req.params.id]
    );
    res.json({ ...sujet.rows[0], questions: questions.rows });
  } catch (error) {
    console.error('Erreur détail évaluation apprenant :', error);
    res.status(500).json({ message: 'Erreur lors du chargement de l’évaluation.' });
  }
};

exports.startEvaluationAttempt = async (req, res) => {
  try {
    const subject = await db.query(
      `SELECT es.id_evaluation_sujet, es.duree_minutes, a.id_apprenant
       FROM evaluation_sujet es
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE es.id_evaluation_sujet = $1 AND es.statut = 'PUBLIEE'
         AND (es.date_fermeture IS NULL OR es.date_fermeture > CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
         AND a.id_utilisateur = $2`,
      [req.params.id, req.user.id_utilisateur]
    );
    if (!subject.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable ou non accessible.' });

    const completed = await db.query(
      `SELECT 1
       FROM evaluation_tentative
       WHERE id_evaluation_sujet = $1
         AND id_apprenant = $2
         AND statut = 'TERMINEE'
       LIMIT 1`,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    if (completed.rows[0]) {
      return res.status(409).json({ message: 'Vous avez déjà terminé cette évaluation.' });
    }

    const existing = await db.query(
      `SELECT et.id_tentative, et.id_evaluation_sujet, et.date_debut, et.statut,
              es.duree_minutes,
              CASE WHEN es.duree_minutes IS NULL THEN NULL
                   ELSE FLOOR(EXTRACT(EPOCH FROM (
                     (et.date_debut + es.duree_minutes * INTERVAL '1 minute')
                     AT TIME ZONE current_setting('TIMEZONE')
                   )) * 1000)::BIGINT
              END AS deadline_epoch_ms,
              FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT AS server_now_epoch_ms
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       WHERE et.id_evaluation_sujet = $1
         AND et.id_apprenant = $2
         AND et.statut = 'EN_COURS'
       ORDER BY et.date_debut DESC LIMIT 1`,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    if (existing.rows[0]) {
      const answers = await db.query(
        `SELECT id_question, id_choix
         FROM evaluation_reponse
         WHERE id_tentative = $1`,
        [existing.rows[0].id_tentative]
      );
      return res.json({ ...existing.rows[0], reponses: answers.rows });
    }

    const { rows } = await db.query(
      `INSERT INTO evaluation_tentative (id_evaluation_sujet, id_apprenant)
       VALUES ($1, $2)
       RETURNING id_tentative, id_evaluation_sujet, date_debut, statut`,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    const attempt = rows[0];
    const deadline = await db.query(
      `SELECT CASE WHEN es.duree_minutes IS NULL THEN NULL
                   ELSE FLOOR(EXTRACT(EPOCH FROM (
                     (et.date_debut + es.duree_minutes * INTERVAL '1 minute')
                     AT TIME ZONE current_setting('TIMEZONE')
                   )) * 1000)::BIGINT
              END AS deadline_epoch_ms,
              FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT AS server_now_epoch_ms
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       WHERE et.id_tentative = $1`,
      [attempt.id_tentative]
    );
    res.status(201).json({
      ...attempt,
      duree_minutes: subject.rows[0].duree_minutes,
      deadline_epoch_ms: deadline.rows[0].deadline_epoch_ms,
      server_now_epoch_ms: deadline.rows[0].server_now_epoch_ms,
      reponses: []
    });
  } catch (error) {
    console.error('Erreur démarrage tentative :', error);
    res.status(500).json({ message: 'Impossible de démarrer cette évaluation.' });
  }
};

exports.saveEvaluationAnswer = async (req, res) => {
  const { id_question, id_choix } = req.body;
  if (!id_question || !id_choix) {
    return res.status(400).json({ message: 'La question et le choix sont obligatoires.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const attemptResult = await client.query(
      `SELECT et.id_tentative, et.id_evaluation_sujet, es.duree_minutes,
              (es.duree_minutes IS NOT NULL
               AND et.date_debut + es.duree_minutes * INTERVAL '1 minute' <= LOCALTIMESTAMP) AS expired
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       JOIN apprenant a ON a.id_apprenant = et.id_apprenant
       JOIN inscription i ON i.id_candidat = a.id_candidat
         AND i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       WHERE et.id_tentative = $1 AND a.id_utilisateur = $2
         AND et.statut = 'EN_COURS' AND es.statut = 'PUBLIEE'
       FOR UPDATE OF et`,
      [req.params.id_tentative, req.user.id_utilisateur]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Tentative introuvable ou terminée.' });
    }

    if (attempt.expired) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Le temps de cette évaluation est écoulé.' });
    }

    const choiceResult = await client.query(
      `SELECT ec.id_choix, eq.points,
              CASE WHEN ec.est_correct THEN eq.points ELSE 0 END AS points_obtenus
       FROM evaluation_choix ec
       JOIN evaluation_question eq ON eq.id_question = ec.id_question
       WHERE ec.id_choix = $1
         AND eq.id_question = $2
         AND eq.id_evaluation_sujet = $3`,
      [id_choix, id_question, attempt.id_evaluation_sujet]
    );
    if (!choiceResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Le choix ne correspond pas à cette question.' });
    }

    await client.query(
      `INSERT INTO evaluation_reponse (id_tentative, id_question, id_choix, points_obtenus)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_tentative, id_question)
       DO UPDATE SET id_choix = EXCLUDED.id_choix,
                     points_obtenus = EXCLUDED.points_obtenus`,
      [attempt.id_tentative, id_question, id_choix, choiceResult.rows[0].points_obtenus]
    );
    await client.query('COMMIT');
    res.json({ id_question: Number(id_question), id_choix: Number(id_choix) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur sauvegarde réponse évaluation :', error);
    res.status(500).json({ message: 'Impossible de sauvegarder cette réponse.' });
  } finally {
    client.release();
  }
};

exports.submitEvaluationAttempt = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const attemptResult = await client.query(
      `SELECT et.id_tentative, et.id_apprenant, et.id_evaluation_sujet, et.statut,
              et.note, et.date_fin,
              CASE WHEN es.duree_minutes IS NULL THEN NULL
                   ELSE FLOOR(EXTRACT(EPOCH FROM (
                     (et.date_debut + es.duree_minutes * INTERVAL '1 minute')
                     AT TIME ZONE current_setting('TIMEZONE')
                   )) * 1000)::BIGINT
              END AS deadline_epoch_ms
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       JOIN apprenant a ON a.id_apprenant = et.id_apprenant
       JOIN inscription i ON i.id_candidat = a.id_candidat
         AND i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       WHERE et.id_tentative = $1 AND a.id_utilisateur = $2 AND es.statut = 'PUBLIEE'
       FOR UPDATE OF et`,
      [req.params.id_tentative, req.user.id_utilisateur]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Tentative introuvable ou non accessible.' });
    }
    if (attempt.statut !== 'EN_COURS') {
      await client.query('ROLLBACK');
      return res.json(attempt);
    }

    const deadline = attempt.deadline_epoch_ms;

    const { rows } = await client.query(
      `UPDATE evaluation_tentative
       SET note = COALESCE((
             SELECT SUM(er.points_obtenus)
             FROM evaluation_reponse er
             WHERE er.id_tentative = $1
           ), 0),
           statut = 'TERMINEE',
           date_fin = CASE
             WHEN $2::BIGINT IS NOT NULL
               AND $2::BIGINT <= EXTRACT(EPOCH FROM (
                 LOCALTIMESTAMP AT TIME ZONE current_setting('TIMEZONE')
               )) * 1000
             THEN to_timestamp($2::BIGINT / 1000.0) AT TIME ZONE current_setting('TIMEZONE')
             ELSE LOCALTIMESTAMP
           END
       WHERE id_tentative = $1
       RETURNING id_tentative, note, statut, date_debut, date_fin`,
      [attempt.id_tentative, deadline]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur soumission évaluation :', error);
    res.status(error.status || 500).json({ message: error.message || 'Impossible d’enregistrer les réponses.' });
  } finally {
    client.release();
  }
};