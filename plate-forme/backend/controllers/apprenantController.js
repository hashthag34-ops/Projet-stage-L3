// backend/controllers/apprenantController.js
const db = require('../config/db');
const apprenant = require('../Models/apprenantModel');
 // Ton module de connexion MySQL / Postgres

// 1. Récupérer les formations auxquelles l'apprenant est inscrit (avec progression)
exports.getMesFormations = async (req, res) => {
  const id_utilisateur = req.user.id_utilisateur; // Issu du middleware d'authentification JWT

  try {
    const query = apprenant.SQL_1;
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
      apprenant.SQL_23,
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
    // 5. Joint la table presence pour récupérer le statut du scan s'il existe (PRESENT / ABSENT)
    const query = apprenant.SQL_2;

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
    const query = apprenant.SQL_3;
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
      apprenant.SQL_22,
      [req.user.id_utilisateur]
    );
    const { rows } = await db.query(
      apprenant.SQL_21,
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
      apprenant.SQL_20,
      [req.params.id, req.user.id_utilisateur]
    );
    if (!sujet.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable ou non accessible.' });

    const questions = await db.query(
      apprenant.SQL_19,
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
      apprenant.SQL_18,
      [req.params.id, req.user.id_utilisateur]
    );
    if (!subject.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable ou non accessible.' });

    const completed = await db.query(
      apprenant.SQL_17,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    if (completed.rows[0]) {
      return res.status(409).json({ message: 'Vous avez déjà terminé cette évaluation.' });
    }

    const existing = await db.query(
      apprenant.SQL_16,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    if (existing.rows[0]) {
      const answers = await db.query(
        apprenant.SQL_15,
        [existing.rows[0].id_tentative]
      );
      return res.json({ ...existing.rows[0], reponses: answers.rows });
    }

    const { rows } = await db.query(
      apprenant.SQL_14,
      [req.params.id, subject.rows[0].id_apprenant]
    );
    const attempt = rows[0];
    const deadline = await db.query(
      apprenant.SQL_13,
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
    await client.query(apprenant.SQL_9);
    const attemptResult = await client.query(
      apprenant.SQL_12,
      [req.params.id_tentative, req.user.id_utilisateur]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      await client.query(apprenant.SQL_4);
      return res.status(404).json({ message: 'Tentative introuvable ou terminée.' });
    }

    if (attempt.expired) {
      await client.query(apprenant.SQL_4);
      return res.status(409).json({ message: 'Le temps de cette évaluation est écoulé.' });
    }

    const choiceResult = await client.query(
      apprenant.SQL_11,
      [id_choix, id_question, attempt.id_evaluation_sujet]
    );
    if (!choiceResult.rows[0]) {
      await client.query(apprenant.SQL_4);
      return res.status(400).json({ message: 'Le choix ne correspond pas à cette question.' });
    }

    await client.query(
      apprenant.SQL_10,
      [attempt.id_tentative, id_question, id_choix, choiceResult.rows[0].points_obtenus]
    );
    await client.query(apprenant.SQL_6);
    res.json({ id_question: Number(id_question), id_choix: Number(id_choix) });
  } catch (error) {
    await client.query(apprenant.SQL_4);
    console.error('Erreur sauvegarde réponse évaluation :', error);
    res.status(500).json({ message: 'Impossible de sauvegarder cette réponse.' });
  } finally {
    client.release();
  }
};

exports.submitEvaluationAttempt = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query(apprenant.SQL_9);
    const attemptResult = await client.query(
      apprenant.SQL_8,
      [req.params.id_tentative, req.user.id_utilisateur]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      await client.query(apprenant.SQL_4);
      return res.status(404).json({ message: 'Tentative introuvable ou non accessible.' });
    }
    if (attempt.statut !== 'EN_COURS') {
      await client.query(apprenant.SQL_4);
      return res.json(attempt);
    }

    const deadline = attempt.deadline_epoch_ms;
    if (deadline !== null && Number(deadline) <= Date.now()) {
      await client.query(apprenant.SQL_4);
      return res.status(409).json({ message: 'Le temps de cette évaluation est écoulé.' });
    }

    const { rows } = await client.query(
      apprenant.SQL_7,
      [attempt.id_tentative, deadline]
    );
    await client.query(apprenant.SQL_6);
    const correction = await client.query(
      apprenant.SQL_5,
      [attempt.id_tentative, attempt.id_evaluation_sujet]
    );
    res.json({ ...rows[0], correction: correction.rows });
  } catch (error) {
    await client.query(apprenant.SQL_4);
    console.error('Erreur soumission évaluation :', error);
    res.status(error.status || 500).json({ message: error.message || 'Impossible d’enregistrer les réponses.' });
  } finally {
    client.release();
  }
};