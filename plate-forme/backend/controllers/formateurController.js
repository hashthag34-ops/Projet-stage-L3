const db = require('../config/db');
const formateur = require('../Models/formateurModel');

const { emitToRoles } = require('../services/realtime');

const getFormateurId = async (userId) => {
  const result = await db.query(
    formateur.SQL_40,
    [userId]
  );
  return result.rows[0]?.id_formateur || null;
};

const ensureAssignedFormation = async (formateurId, formationId) => {
  const result = await db.query(
    formateur.SQL_39,
    [formateurId, formationId]
  );
  return result.rows[0] || null;
};

exports.getFormations = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { rows } = await db.query(
      formateur.SQL_38,
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

    const { id_formation } = req.query;
    if (id_formation && !await ensureAssignedFormation(formateurId, id_formation)) {
      return res.status(403).json({ message: 'Formation non affectée à ce formateur.' });
    }

    const { rows } = await db.query(
      formateur.SQL_37,
      [formateurId, id_formation || null]
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
    formateur.SQL_36,
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
  let query = formateur.SQL_1;
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
      formateur.SQL_35,
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
      formateur.SQL_34,
      [req.params.id_seance, formateurId]
    );
    if (!ownedSeance.rows[0]) return res.status(404).json({ message: 'Séance introuvable.' });
    if (payload.salle && await checkRoomOverlap(payload, req.params.id_seance)) {
      return res.status(409).json({ message: `La salle "${payload.salle}" est déjà occupée sur ce créneau.` });
    }

    const { rows } = await db.query(
      formateur.SQL_33,
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
    const ownedSeance = await db.query(
      formateur.SQL_32,
      [req.params.id_seance, formateurId]
    );

    if (!ownedSeance.rows.length) return res.status(404).json({ message: 'Séance introuvable.' });
    const seance = ownedSeance.rows[0];
    if (String(seance.date_seance).slice(0, 10) < new Date().toLocaleDateString('en-CA')) {
      return res.status(409).json({ message: 'Une séance terminée ne peut pas être supprimée.' });
    }
    if (Number(seance.total_presences) > 0) {
      return res.status(409).json({ message: 'Cette séance ne peut pas être supprimée car elle contient des données de présence.' });
    }

    await db.query(
      formateur.SQL_31,
      [req.params.id_seance, formateurId]
    );
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
      formateur.SQL_30,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur apprenants formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des apprenants.' });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { id_apprenant: studentId, id_formation: formationId } = req.params;
    if (!await ensureAssignedFormation(formateurId, formationId)) {
      return res.status(403).json({ message: 'Formation non affectée à ce formateur.' });
    }

    const studentResult = await db.query(
      formateur.SQL_29,
      [studentId, formationId]
    );
    const student = studentResult.rows[0];
    if (!student) return res.status(404).json({ message: 'Apprenant inscrit à cette formation introuvable.' });

    const [gradesResult, attendanceResult] = await Promise.all([
      db.query(
        formateur.SQL_28,
        [studentId, formationId]
      ),
      db.query(
        formateur.SQL_27,
        [studentId, formationId]
      )
    ]);

    const grades = gradesResult.rows;
    const average = grades.length
      ? grades.reduce((total, grade) => total + Number(grade.note), 0) / grades.length
      : null;
    const attendance = attendanceResult.rows[0];
    const totalPresence = Number(attendance.total);
    const present = Number(attendance.present);

    res.json({
      student,
      grades,
      average,
      attendance: {
        total: totalPresence,
        present,
        absent: Number(attendance.absent),
        rate: totalPresence ? (present / totalPresence) * 100 : null
      }
    });
  } catch (error) {
    console.error('Erreur détails apprenant formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des détails de l’apprenant.' });
  }
};

exports.addStudentGrade = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { id_apprenant: studentId, id_formation: formationId } = req.params;
    const typeEvaluation = typeof req.body.type_evaluation === 'string' ? req.body.type_evaluation.trim() : '';
    const note = Number(req.body.note);
    const commentaire = typeof req.body.commentaire === 'string' ? req.body.commentaire.trim() : '';

    if (!typeEvaluation || typeEvaluation.length > 150) {
      return res.status(400).json({ message: 'Le type de note est obligatoire (150 caractères maximum).' });
    }
    if (req.body.note === '' || req.body.note === undefined || !Number.isFinite(note) || note < 0 || note > 20) {
      return res.status(400).json({ message: 'La note doit être comprise entre 0 et 20.' });
    }
    if (commentaire.length > 2000) {
      return res.status(400).json({ message: 'Le commentaire ne peut pas dépasser 2000 caractères.' });
    }

    if (!await ensureAssignedFormation(formateurId, formationId)) {
      return res.status(403).json({ message: 'Formation non affectée à ce formateur.' });
    }
    const enrollment = await db.query(
      formateur.SQL_26,
      [studentId, formationId]
    );
    if (!enrollment.rowCount) {
      return res.status(404).json({ message: 'Apprenant inscrit à cette formation introuvable.' });
    }

    const { rows } = await db.query(
      formateur.SQL_25,
      [studentId, formationId, formateurId, typeEvaluation, note, commentaire || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur ajout note apprenant :', error);
    res.status(500).json({ message: 'Erreur lors de l’enregistrement de la note.' });
  }
};

exports.getStudentStatistics = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const formationsResult = await db.query(
      formateur.SQL_24,
      [formateurId]
    );
    const seancesResult = await db.query(
      formateur.SQL_23,
      [formateurId]
    );
    const apprenantsResult = await db.query(
      formateur.SQL_22,
      [formateurId]
    );
    res.json({
      formations: formationsResult.rows,
      seances: seancesResult.rows,
      apprenants: apprenantsResult.rows
    });
  } catch (error) {
    console.error('Erreur statistiques apprenants formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques.' });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    if (!formateurId) return res.status(403).json({ message: 'Profil formateur introuvable.' });

    const { rows } = await db.query(
      formateur.SQL_21,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur évaluations formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des évaluations.' });
  }
};

exports.createEvaluation = async (req, res) => {
  const { id_formation, titre, description, duree_minutes, obligatoire, date_fermeture } = req.body;
  const duration = Number(duree_minutes);
  if (!Number.isInteger(duration) || duration < 1) {
    return res.status(400).json({ message: 'La durée doit être un nombre entier de minutes supérieur à zéro.' });
  }
  const closingTime = date_fermeture ? new Date(date_fermeture).getTime() : NaN;
  if (!Number.isFinite(closingTime) || closingTime <= Date.now()) {
    return res.status(400).json({ message: 'Choisissez une date et une heure de fermeture futures.' });
  }
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const formation = await ensureAssignedFormation(formateurId, id_formation);
    if (!formation) return res.status(403).json({ message: 'Cette formation ne vous est pas assignée.' });

    const { rows } = await db.query(
      formateur.SQL_20,
      [id_formation, formateurId, titre, description || null, duration, obligatoire !== false, new Date(closingTime).toISOString()]
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
      formateur.SQL_19,
      [id, formateurId]
    );
    if (!sujet.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable.' });

    const questions = await db.query(
      formateur.SQL_18,
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
      formateur.SQL_17,
      [id, formateurId]
    );
    if (!subject.rows[0]) return res.status(409).json({ message: 'Seules les évaluations en brouillon peuvent être modifiées.' });
    if (!Array.isArray(choix) || choix.length < 2 || choix.filter((item) => item.est_correct).length !== 1) {
      return res.status(400).json({ message: 'Ajoutez au moins deux choix et une seule bonne réponse.' });
    }

    const nextNumber = await db.query(
      formateur.SQL_16,
      [id]
    );
    const question = await db.query(
      formateur.SQL_15,
      [id, nextNumber.rows[0].numero, enonce, points]
    );
    for (let index = 0; index < choix.length; index += 1) {
      await db.query(
        formateur.SQL_14,
        [question.rows[0].id_question, choix[index].libelle, choix[index].est_correct === true, index + 1]
      );
    }
    res.status(201).json(question.rows[0]);
  } catch (error) {
    console.error('Erreur ajout question :', error);
    res.status(400).json({ message: error.message || 'Impossible d’ajouter la question.' });
  }
};

exports.updateEvaluation = async (req, res) => {
  const { titre, description, duree_minutes, obligatoire, date_fermeture } = req.body;
  const duration = Number(duree_minutes);
  const closingTime = new Date(date_fermeture).getTime();
  if (!titre?.trim()) return res.status(400).json({ message: 'Le titre est obligatoire.' });
  if (!Number.isInteger(duration) || duration < 1) {
    return res.status(400).json({ message: 'La durée doit être un nombre entier de minutes supérieur à zéro.' });
  }
  if (!Number.isFinite(closingTime) || closingTime <= Date.now()) {
    return res.status(400).json({ message: 'Choisissez une date et une heure de fermeture futures.' });
  }

  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { rows } = await db.query(
      formateur.SQL_13,
      [titre.trim(), description || null, duration, obligatoire !== false, new Date(closingTime).toISOString(), req.params.id, formateurId]
    );
    if (!rows[0]) return res.status(409).json({ message: 'Seules les évaluations en brouillon peuvent être modifiées.' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur modification évaluation :', error);
    res.status(500).json({ message: 'Impossible de modifier cette évaluation.' });
  }
};

exports.updateEvaluationStatus = async (req, res) => {
  const { statut, date_publication } = req.body;
  if (date_publication !== undefined) {
    const publicationTime = new Date(date_publication).getTime();
    if (
      statut !== 'BROUILLON' ||
      typeof date_publication !== 'string' ||
      !Number.isFinite(publicationTime) ||
      publicationTime <= Date.now()
    ) {
      return res.status(400).json({ message: 'Choisissez une date et une heure de publication futures.' });
    }
  } else if (!['PUBLIEE', 'FERMEE'].includes(statut)) {
    return res.status(400).json({ message: 'Statut de publication invalide.' });
  }

  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const publicationUtc = date_publication
      ? new Date(date_publication).toISOString().slice(0, 23).replace('T', ' ')
      : null;
    const { rows } = await db.query(
      formateur.SQL_12,
      [statut, req.params.id, formateurId, publicationUtc]
    );
    if (!rows[0]) return res.status(409).json({ message: 'Évaluation introuvable ou déjà publiée/utilisée.' });
    emitToRoles(['APPRENANT', 'FORMATEUR'], 'evaluations:changed', {
      id_formation: rows[0].id_formation,
      id_evaluation_sujet: rows[0].id_evaluation_sujet
    });
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
      formateur.SQL_11,
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
    await db.query(
      formateur.SQL_10,
      [formateurId]
    );
    const { rows } = await db.query(
      formateur.SQL_9,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur résultats évaluations :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des résultats.' });
  }
};

exports.deleteEvaluation = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const owned = await db.query(
      formateur.SQL_8,
      [req.params.id, formateurId]
    );
    if (!owned.rows[0]) return res.status(404).json({ message: 'Évaluation introuvable.' });
    await db.query(formateur.SQL_7);
    await db.query(
      formateur.SQL_6,
      [req.params.id]
    );
    const result = await db.query(
      formateur.SQL_5,
      [req.params.id, formateurId]
    );
    if (!result.rows[0]) {
      await db.query(formateur.SQL_3);
      return res.status(404).json({ message: 'Évaluation introuvable.' });
    }
    await db.query(formateur.SQL_4);
    res.json({ message: 'Évaluation et ses données supprimées avec succès.' });
  } catch (error) {
    await db.query(formateur.SQL_3);
    console.error('Erreur suppression évaluation :', error);
    res.status(500).json({ message: 'Impossible de supprimer cette évaluation.' });
  }
};

exports.getForums = async (req, res) => {
  try {
    const formateurId = await getFormateurId(req.user.id_utilisateur);
    const { rows } = await db.query(
      formateur.SQL_2,
      [formateurId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur forums formateur :', error);
    res.status(500).json({ message: 'Erreur lors du chargement de la messagerie.' });
  }
};
