const db = require('../config/db');
const { emitRealtimeEvent, emitToRoles } = require('./realtime');

const INTERVAL_MS = 15 * 1000;
let intervalId;
let taskRunning = false;

const runExpiryTasks = async () => {
  const formationResult = await db.query(
    `UPDATE formation
     SET statut = 'TERMINEE',
         date_modification = CURRENT_TIMESTAMP
     WHERE date_fin < CURRENT_DATE
       AND statut IN ('OUVERTE', 'EN_COURS')
     RETURNING id_formation`
  );

  const startedFormationResult = await db.query(
    `UPDATE formation
     SET statut = 'EN_COURS',
         date_modification = CURRENT_TIMESTAMP
     WHERE statut = 'OUVERTE'
       AND date_debut <= CURRENT_DATE
       AND date_fin >= CURRENT_DATE
     RETURNING id_formation`
  );

  const absenceResult = await db.query(
    `INSERT INTO presence (id_apprenant, id_seance, date_scan, statut, commentaire)
     SELECT DISTINCT
            a.id_apprenant,
            s.id_seance,
            NULL::timestamp without time zone,
            'ABSENT'::public.statut_presence,
            'Absence automatique : aucun scan enregistré après la séance.'
     FROM seance s
     JOIN inscription i
       ON i.id_formation = s.id_formation
      AND i.statut = 'ACCEPTEE'
     JOIN apprenant a ON a.id_candidat = i.id_candidat
     WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
     ON CONFLICT (id_apprenant, id_seance) DO NOTHING`
  );

  const publicationResult = await db.query(
    `UPDATE evaluation_sujet
     SET statut = 'PUBLIEE',
         date_modification = CURRENT_TIMESTAMP
     WHERE statut = 'BROUILLON'
       AND date_publication IS NOT NULL
       AND date_publication <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
       AND EXISTS (
         SELECT 1 FROM evaluation_question eq
         WHERE eq.id_evaluation_sujet = evaluation_sujet.id_evaluation_sujet
       )
     RETURNING id_evaluation_sujet, id_formation`
  );

  if (formationResult.rowCount > 0 || startedFormationResult.rowCount > 0) {
    emitRealtimeEvent('formations:changed', {});
  }
  publicationResult.rows.forEach((evaluation) => {
    emitToRoles(['APPRENANT', 'FORMATEUR'], 'evaluations:changed', {
      id_formation: evaluation.id_formation,
      id_evaluation_sujet: evaluation.id_evaluation_sujet
    });
  });

  const expiredAttemptResult = await db.query(
    `UPDATE evaluation_tentative et
     SET statut = 'TERMINEE',
         date_fin = et.date_debut + es.duree_minutes * INTERVAL '1 minute',
         note = COALESCE((
           SELECT SUM(er.points_obtenus)
           FROM evaluation_reponse er
           WHERE er.id_tentative = et.id_tentative
         ), 0)
     FROM evaluation_sujet es
     WHERE es.id_evaluation_sujet = et.id_evaluation_sujet
       AND es.duree_minutes IS NOT NULL
       AND et.statut = 'EN_COURS'
       AND et.date_debut + es.duree_minutes * INTERVAL '1 minute' <= LOCALTIMESTAMP`
  );

  console.log(
    `Vérification des échéances terminée : ${startedFormationResult.rowCount} formation(s) démarrée(s), ` +
    `${formationResult.rowCount} formation(s) terminée(s), ` +
    `${absenceResult.rowCount} absence(s) enregistrée(s), ` +
    `${publicationResult.rowCount} évaluation(s) publiée(s), ` +
    `${expiredAttemptResult.rowCount} tentative(s) terminée(s).`
  );
};

const runExpiryTasksSafely = async () => {
  if (taskRunning) return;

  taskRunning = true;
  try {
    await runExpiryTasks();
  } catch (error) {
    console.error('Erreur lors du traitement automatique des échéances :', error);
  } finally {
    taskRunning = false;
  }
};

exports.startExpiryTasks = async () => {
  await runExpiryTasks();
  intervalId = setInterval(runExpiryTasksSafely, INTERVAL_MS);
};

exports.stopExpiryTasks = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
};
