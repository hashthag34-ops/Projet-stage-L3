const db = require('../config/db');

const getFormateurId = async (userId) => {
  const result = await db.query(
    'SELECT id_formateur FROM formateur WHERE id_utilisateur = $1',
    [userId]
  );
  return result.rows[0]?.id_formateur || null;
};

const ensureAssignedFormation = async (formateurId, formationId) => {
  const result = await db.query(
    `SELECT f.*
     FROM formation f
     JOIN formation_formateur ff ON ff.id_formation = f.id_formation
     WHERE ff.id_formateur = $1 AND f.id_formation = $2`,
    [formateurId, formationId]
  );
  return result.rows[0] || null;
};

exports.getFormations = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { rows } = await db.query(
      `SELECT f.id_formation, f.titre, f.description, f.image_url, f.date_debut,
              f.date_fin, f.statut, ff.role_formateur,
              COUNT(DISTINCT i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS apprenants_count
       FROM formation_formateur ff
       JOIN formation f ON f.id_formation = ff.id_formation
       LEFT JOIN inscription i ON i.id_formation = f.id_formation
       WHERE ff.id_formateur = $1
       GROUP BY f.id_formation, ff.role_formateur
       ORDER BY f.date_debut DESC`,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur formations formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des formations.' });
  }
};

exports.getPlanning = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { rows } = await db.query(
      `SELECT s.id_seance, s.id_formation, s.titre, s.description,
              s.date_seance, s.heure_debut, s.heure_fin, s.type_seance, s.salle,
              f.titre AS formation_titre
       FROM seance s
       JOIN formation f ON f.id_formation = s.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       WHERE ff.id_formateur = $1
       ORDER BY s.date_seance ASC, s.heure_debut ASC`,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur planning formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement du planning.' });
  }
};

const getSeancePayload = (body) => ({
  id_formation: body.id_formation,
  titre: body.titre,
  description: body.description || null,
  date_seance: body.date_seance,
  heure_debut: body.heure_debut,
  heure_fin: body.heure_fin,
  type_seance: body.type_seance || 'Cours Magistral',
  salle: body.salle || null
});

const validateSeance = ({ date_seance, heure_debut, heure_fin }) => {
  if (!date_seance || !heure_debut || !heure_fin) return 'La date et les horaires sont obligatoires.';
  if (heure_debut >= heure_fin) return "L'heure de début doit être antérieure à l'heure de fin.";
  return null;
};

const ensureFormateurSeanceAccess = async (formateurId, formationId) => {
  const result = await db.query(
    `SELECT f.date_debut, f.date_fin
     FROM formation f
     JOIN formation_formateur ff ON ff.id_formation = f.id_formation
     WHERE ff.id_formateur = $1 AND f.id_formation = $2`,
    [formateurId, formationId]
  );
  return result.rows[0] || null;
};

const validateSeancePeriod = (formation, dateSeance) => {
  if (!formation) return 'Formation non affectée à ce formateur.';
  if (dateSeance < String(formation.date_debut).slice(0, 10) || dateSeance > String(formation.date_fin).slice(0, 10)) {
    return `La date doit être comprise entre le ${new Date(formation.date_debut).toLocaleDateString('fr-FR')} et le ${new Date(formation.date_fin).toLocaleDateString('fr-FR')}.`;
  }
  return null;
};

const checkRoomOverlap = async (payload, excludedId = null) => {
  const params = [payload.date_seance, payload.salle.trim(), payload.heure_fin, payload.heure_debut];
  let query = `SELECT id_seance FROM seance
    WHERE date_seance = $1 AND LOWER(salle) = LOWER($2)
      AND (heure_debut < $3 AND heure_fin > $4)`;
  if (excludedId) {
    params.push(excludedId);
    query += ' AND id_seance <> $5';
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
};

exports.createSeance = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const payload = getSeancePayload(req.body);
    const validationError = validateSeance(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const formation = await ensureFormateurSeanceAccess(formateurId, payload.id_formation);
    const periodError = validateSeancePeriod(formation, payload.date_seance);
    if (periodError) return res.status(403).json({ message: periodError });
    if (payload.salle && await checkRoomOverlap(payload)) {
      return res.status(409).json({ message: `La salle "${payload.salle}" est déjà occupée sur ce créneau.` });
    }

    const { rows } = await db.query(
      `INSERT INTO seance (id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      Object.values(payload)
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur création séance formateur :', error);
    res.status(500).json({ message: 'Erreur lors de la création de la séance.' });
  }
};

exports.updateSeance = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const payload = getSeancePayload(req.body);
    const validationError = validateSeance(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const formation = await ensureFormateurSeanceAccess(formateurId, payload.id_formation);
    const periodError = validateSeancePeriod(formation, payload.date_seance);
    if (periodError) return res.status(403).json({ message: periodError });
    const ownedSeance = await db.query(
      `SELECT s.id_seance FROM seance s JOIN formation_formateur ff ON ff.id_formation = s.id_formation
       WHERE s.id_seance = $1 AND ff.id_formateur = $2`,
      [req.params.id_seance, formateurId]
    );
    if (!ownedSeance.rows[0]) return res.status(404).json({ message: 'Séance introuvable.' });
    if (payload.salle && await checkRoomOverlap(payload, req.params.id_seance)) {
      return res.status(409).json({ message: `La salle "${payload.salle}" est déjà occupée sur ce créneau.` });
    }

    const { rows } = await db.query(
      `UPDATE seance SET id_formation = $1, titre = $2, description = $3, date_seance = $4,
       heure_debut = $5, heure_fin = $6, type_seance = $7, salle = $8
       WHERE id_seance = $9 RETURNING *`,
      [...Object.values(payload), req.params.id_seance]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur modification séance formateur :', error);
    res.status(500).json({ message: 'Erreur lors de la modification de la séance.' });
  }
};

exports.deleteSeance = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const result = await db.query(
      `DELETE FROM seance s USING formation_formateur ff
       WHERE s.id_seance = $1 AND ff.id_formation = s.id_formation AND ff.id_formateur = $2`,
      [req.params.id_seance, formateurId]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Séance introuvable.' });
    res.json({ message: 'Séance supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur suppression séance formateur :', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la séance.' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { rows } = await db.query(
      `SELECT DISTINCT a.id_apprenant, u.id_utilisateur, u.nom, u.prenom, u.email,
              u.telephone, f.id_formation, f.titre AS formation_titre,
              i.statut AS inscription_statut
       FROM apprenant a
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       JOIN inscription i ON i.id_candidat = a.id_candidat AND i.statut = 'ACCEPTEE'
       JOIN formation f ON f.id_formation = i.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       WHERE ff.id_formateur = $1
       ORDER BY f.titre, u.nom, u.prenom`,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur apprenants formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des apprenants.' });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { rows } = await db.query(
      `SELECT es.id_evaluation_sujet, es.id_formation, es.titre, es.description,
              es.duree_minutes, es.obligatoire, es.statut, es.total_points,
              es.date_creation, es.date_publication, f.titre AS formation_titre,
              COUNT(DISTINCT eq.id_question)::INTEGER AS questions_count,
              COUNT(DISTINCT et.id_tentative)::INTEGER AS tentatives_count
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       LEFT JOIN evaluation_question eq ON eq.id_evaluation_sujet = es.id_evaluation_sujet
       LEFT JOIN evaluation_tentative et ON et.id_evaluation_sujet = es.id_evaluation_sujet
       WHERE es.id_formateur = $1 AND ff.id_formateur = $1
       GROUP BY es.id_evaluation_sujet, f.titre
       ORDER BY es.date_creation DESC`,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur évaluations formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des évaluations.' });
  }
};

exports.createEvaluation = async (req, res) => {
  const { id_formation, titre, description, duree_minutes, obligatoire } = req.body;
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const formation = await ensureAssignedFormation(formateurId, id_formation);
    if (!formation) return res.status(403).json({ message: 'Cette formation ne vous est pas assignée.' });

    const { rows } = await db.query(
      `INSERT INTO evaluation_sujet
       (id_formation, id_formateur, titre, description, duree_minutes, obligatoire)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_formation, formateurId, titre, description || null, duree_minutes || null, obligatoire !== false]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur création évaluation :', error);
    res.status(500).json({ message: error.message || 'Erreur lors de la création de l’évaluation.' });
  }
};

exports.getEvaluation = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { id } = req.params;
    const sujet = await db.query(
      `SELECT es.*, f.titre AS formation_titre
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       WHERE es.id_evaluation_sujet = $1 AND es.id_formateur = $2`,
      [id, formateurId]
    );
    if (!sujet.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable.' });

    const questions = await db.query(
      `SELECT eq.id_question, eq.numero_question, eq.enonce, eq.points,
              COALESCE(json_agg(json_build_object(
                'id_choix', ec.id_choix,
                'libelle', ec.libelle,
                'est_correct', ec.est_correct,
                'ordre', ec.ordre
              ) ORDER BY ec.ordre) FILTER (WHERE ec.id_choix IS NOT NULL), '[]') AS choix
       FROM evaluation_question eq
       LEFT JOIN evaluation_choix ec ON ec.id_question = eq.id_question
       WHERE eq.id_evaluation_sujet = $1
       GROUP BY eq.id_question
       ORDER BY eq.numero_question`,
      [id]
    );
    res.json({ ...sujet.rows[0], questions: questions.rows });
  } catch (error) {
    console.error('Erreur détail évaluation :', error);
    res.status(500).json({ message: 'Erreur lors du chargement de l’évaluation.' });
  }
};

exports.addQuestion = async (req, res) => {
  const { enonce, points, choix = [] } = req.body;
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { id } = req.params;
    const subject = await db.query(
      'SELECT id_evaluation_sujet FROM evaluation_sujet WHERE id_evaluation_sujet = $1 AND id_formateur = $2',
      [id, formateurId]
    );
    if (!subject.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable.' });
    if (!Array.isArray(choix) || choix.length < 2 || choix.filter((item) => item.est_correct).length !== 1) {
      return res.status(400).json({ message: 'Ajoutez au moins deux choix et une seule bonne réponse.' });
    }

    const nextNumber = await db.query(
      'SELECT COALESCE(MAX(numero_question), 0) + 1 AS numero FROM evaluation_question WHERE id_evaluation_sujet = $1',
      [id]
    );
    const question = await db.query(
      `INSERT INTO evaluation_question (id_evaluation_sujet, numero_question, enonce, points)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, nextNumber.rows[0].numero, enonce, points]
    );
    for (let index = 0; index < choix.length; index += 1) {
      await db.query(
        `INSERT INTO evaluation_choix (id_question, libelle, est_correct, ordre)
         VALUES ($1, $2, $3, $4)`,
        [question.rows[0].id_question, choix[index].libelle, choix[index].est_correct === true, index + 1]
      );
    }
    res.status(201).json(question.rows[0]);
  } catch (error) {
    console.error('Erreur ajout question :', error);
    res.status(400).json({ message: error.message || 'Impossible d’ajouter la question.' });
  }
};

exports.updateEvaluationStatus = async (req, res) => {
  const { statut } = req.body;
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { rows } = await db.query(
      `UPDATE evaluation_sujet SET statut = $1
       WHERE id_evaluation_sujet = $2 AND id_formateur = $3
       RETURNING *`,
      [statut, req.params.id, formateurId]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Évaluation introuvable.' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur publication évaluation :', error);
    res.status(400).json({ message: error.message || 'Impossible de modifier le statut.' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const result = await db.query(
      `DELETE FROM evaluation_question eq
       USING evaluation_sujet es
       WHERE eq.id_question = $1 AND eq.id_evaluation_sujet = es.id_evaluation_sujet
         AND es.id_formateur = $2`,
      [req.params.questionId, formateurId]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Question introuvable.' });
    res.json({ message: 'Question supprimée.' });
  } catch (error) {
    console.error('Erreur suppression question :', error);
    res.status(400).json({ message: error.message || 'Impossible de supprimer la question.' });
  }
};

exports.getResults = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { rows } = await db.query(
      `SELECT et.id_tentative, et.id_evaluation_sujet, et.id_apprenant,
              et.note, et.statut, et.date_debut, et.date_fin,
              u.nom, u.prenom, u.email, es.titre AS evaluation_titre,
              f.titre AS formation_titre
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       JOIN apprenant a ON a.id_apprenant = et.id_apprenant
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       WHERE es.id_formateur = $1 AND ff.id_formateur = $1
       ORDER BY et.date_debut DESC`,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur résultats évaluations :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des résultats.' });
  }
};

exports.getForums = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { rows } = await db.query(
      `SELECT fo.id_forum, fo.nom, fo.description, f.id_formation, f.titre AS formation_titre
       FROM forum fo
       JOIN formation f ON f.id_formation = fo.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       WHERE ff.id_formateur = $1 ORDER BY f.titre`,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur forums formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement de la messagerie.' });
  }
};
