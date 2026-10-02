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
      WHERE a.id_utilisateur = $1 AND i.statut = 'ACCEPTEE'
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
       WHERE es.id_evaluation_sujet = $1 AND es.statut = 'PUBLIEE'
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
      `SELECT es.id_evaluation_sujet, a.id_apprenant
       FROM evaluation_sujet es
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE es.id_evaluation_sujet = $1 AND es.statut = 'PUBLIEE'
         AND a.id_utilisateur = $2`,
      [req.params.id, req.user.id_utilisateur]
    );
    if (!subject.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable ou non accessible.' });

    const existing = await db.query(
      `SELECT id_tentative, id_evaluation_sujet, date_debut, statut
       FROM evaluation_tentative
       WHERE id_evaluation_sujet = $1 AND id_apprenant = $2 AND statut = 'EN_COURS'
       ORDER BY date_debut DESC LIMIT 1`,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    if (existing.rows[0]) return res.json(existing.rows[0]);

    const { rows } = await db.query(
      `INSERT INTO evaluation_tentative (id_evaluation_sujet, id_apprenant)
       VALUES ($1, $2)
       RETURNING id_tentative, id_evaluation_sujet, date_debut, statut`,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur démarrage tentative :', error);
    res.status(500).json({ message: 'Impossible de démarrer cette évaluation.' });
  }
};

exports.submitEvaluationAttempt = async (req, res) => {
  const { reponses } = req.body;
  if (!Array.isArray(reponses)) {
    return res.status(400).json({ message: 'Les réponses fournies sont invalides.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const attemptResult = await client.query(
      `SELECT et.id_tentative, et.id_apprenant, et.id_evaluation_sujet, et.statut
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
      return res.status(409).json({ message: 'Cette tentative est déjà terminée.' });
    }

    const questionsResult = await client.query(
      `SELECT eq.id_question, eq.points, ec.id_choix, ec.est_correct
       FROM evaluation_question eq
       JOIN evaluation_choix ec ON ec.id_question = eq.id_question
       WHERE eq.id_evaluation_sujet = $1`,
      [attempt.id_evaluation_sujet]
    );
    const choicesByQuestion = new Map();
    questionsResult.rows.forEach((row) => {
      if (!choicesByQuestion.has(row.id_question)) choicesByQuestion.set(row.id_question, []);
      choicesByQuestion.get(row.id_question).push(row);
    });

    const answeredQuestions = new Set();
    let note = 0;
    for (const answer of reponses) {
      const questionId = Number(answer.id_question);
      const choiceId = Number(answer.id_choix);
      const choices = choicesByQuestion.get(questionId);
      const selectedChoice = choices?.find((choice) => choice.id_choix === choiceId);
      if (!selectedChoice || answeredQuestions.has(questionId)) {
        const error = new Error('Une ou plusieurs réponses ne correspondent pas à cette évaluation.');
        error.status = 400;
        throw error;
      }
      answeredQuestions.add(questionId);
      const points = selectedChoice.est_correct ? Number(selectedChoice.points) : 0;
      note += points;
      await client.query(
        `INSERT INTO evaluation_reponse (id_tentative, id_question, id_choix, points_obtenus)
         VALUES ($1, $2, $3, $4)`,
        [attempt.id_tentative, questionId, choiceId, points]
      );
    }

    const { rows } = await client.query(
      `UPDATE evaluation_tentative
       SET note = $1, statut = 'TERMINEE', date_fin = CURRENT_TIMESTAMP
       WHERE id_tentative = $2
       RETURNING id_tentative, note, statut, date_debut, date_fin`,
      [note, attempt.id_tentative]
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