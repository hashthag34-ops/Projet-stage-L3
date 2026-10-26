const db = require('../config/db');

const getFormationId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getClosedFormation = async (client, formationId, lock = false) => {
  const result = await client.query(
    `SELECT id_formation, titre, date_debut, date_fin
     FROM formation
     WHERE id_formation = $1 AND statut = 'TERMINEE'${lock ? ' FOR UPDATE' : ''}`,
    [formationId]
  );
  return result.rows[0] || null;
};

exports.getClosedFormations = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id_formation, f.titre, f.date_debut, f.date_fin,
              COUNT(DISTINCT a.id_apprenant)::INTEGER AS apprenants_count,
              COUNT(DISTINCT c.id_certification)::INTEGER AS decisions_count,
              COUNT(DISTINCT c.id_certification)
                FILTER (WHERE c.statut = 'CERTIFIE')::INTEGER AS certifies_count
       FROM formation f
       LEFT JOIN inscription i
         ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       LEFT JOIN apprenant a ON a.id_candidat = i.id_candidat
       LEFT JOIN certification c
         ON c.id_formation = f.id_formation AND c.id_apprenant = a.id_apprenant
       WHERE f.statut = 'TERMINEE'
       GROUP BY f.id_formation
       ORDER BY f.date_fin DESC, f.id_formation DESC`
    );
    res.json(rows.map((formation) => ({
      ...formation,
      is_saved: Number(formation.apprenants_count) > 0
        && Number(formation.decisions_count) >= Number(formation.apprenants_count)
    })));
  } catch (error) {
    console.error('Erreur formations à certifier :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des formations terminées.' });
  }
};

exports.getAdminCertificationFormations = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id_formation, f.titre, f.date_debut, f.date_fin,
              COUNT(DISTINCT a.id_apprenant)::INTEGER AS apprenants_count,
              COUNT(DISTINCT c.id_apprenant)
                FILTER (WHERE c.statut = 'CERTIFIE')::INTEGER AS certifies_count,
              COUNT(DISTINCT c.id_apprenant)
                FILTER (WHERE c.statut = 'NON_CERTIFIE')::INTEGER AS non_certifies_count,
              COUNT(DISTINCT a.id_apprenant)
                FILTER (WHERE c.id_certification IS NULL OR c.statut = 'EN_ATTENTE')::INTEGER AS en_attente_count
       FROM formation f
       LEFT JOIN inscription i
         ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       LEFT JOIN apprenant a ON a.id_candidat = i.id_candidat
       LEFT JOIN certification c
         ON c.id_formation = f.id_formation AND c.id_apprenant = a.id_apprenant
       WHERE f.statut = 'TERMINEE'
       GROUP BY f.id_formation
       ORDER BY f.date_fin DESC, f.id_formation DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur statistiques certifications admin :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques de certification.' });
  }
};

exports.getAdminCertificationLearners = async (req, res) => {
  const formationId = getFormationId(req.params.id_formation);
  if (!formationId) return res.status(400).json({ message: 'Identifiant de formation invalide.' });

  try {
    const formation = await getClosedFormation(db, formationId);
    if (!formation) return res.status(404).json({ message: 'Formation terminée introuvable.' });

    const { rows } = await db.query(
      `SELECT DISTINCT a.id_apprenant, u.nom, u.prenom, u.email,
              COALESCE(c.statut::TEXT, 'EN_ATTENTE') AS certification_statut,
              c.date_certification
       FROM inscription i
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       LEFT JOIN certification c
         ON c.id_formation = i.id_formation AND c.id_apprenant = a.id_apprenant
       WHERE i.id_formation = $1 AND i.statut = 'ACCEPTEE'
       ORDER BY u.nom, u.prenom`,
      [formationId]
    );

    res.json({ formation, learners: rows });
  } catch (error) {
    console.error('Erreur liste certifications admin :', error);
    res.status(500).json({ message: 'Erreur lors du chargement de la liste des apprenants.' });
  }
};

exports.getFormationLearners = async (req, res) => {
  const formationId = getFormationId(req.params.id_formation);
  if (!formationId) return res.status(400).json({ message: 'Identifiant de formation invalide.' });

  try {
    const formation = await getClosedFormation(db, formationId);
    if (!formation) {
      return res.status(404).json({ message: 'Formation terminée introuvable.' });
    }

    const { rows } = await db.query(
      `WITH inscrits AS (
         SELECT DISTINCT a.id_apprenant, u.nom, u.prenom, u.email, u.telephone
         FROM inscription i
         JOIN apprenant a ON a.id_candidat = i.id_candidat
         JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         WHERE i.id_formation = $1 AND i.statut = 'ACCEPTEE'
       ),
       notes AS (
         SELECT e.id_apprenant, e.type_evaluation AS titre, e.note,
                e.date_evaluation AS date_note
         FROM evaluation e
         WHERE e.id_formation = $1 AND e.note IS NOT NULL
         UNION ALL
         SELECT et.id_apprenant, es.titre, et.note, et.date_fin::date
         FROM evaluation_tentative et
         JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
         WHERE es.id_formation = $1 AND et.note IS NOT NULL
       ),
       notes_agregees AS (
         SELECT id_apprenant, AVG(note)::NUMERIC AS moyenne,
                json_agg(
                  json_build_object('titre', titre, 'note', note, 'date', date_note)
                  ORDER BY date_note DESC NULLS LAST
                ) AS notes
         FROM notes
         GROUP BY id_apprenant
       ),
       presences_agregees AS (
         SELECT i.id_apprenant,
                COUNT(DISTINCT s.id_seance)::INTEGER AS seances_total,
                COUNT(DISTINCT s.id_seance)
                  FILTER (WHERE p.statut IN ('PRESENT', 'RETARD'))::INTEGER AS seances_presentes
         FROM inscrits i
         LEFT JOIN seance s ON s.id_formation = $1
         LEFT JOIN presence p
           ON p.id_seance = s.id_seance AND p.id_apprenant = i.id_apprenant
         GROUP BY i.id_apprenant
       )
       SELECT i.id_apprenant, i.nom, i.prenom, i.email, i.telephone,
              ROUND(n.moyenne, 2) AS moyenne,
              COALESCE(n.notes, '[]'::json) AS notes,
              p.seances_total,
              p.seances_presentes,
              CASE
                WHEN p.seances_total = 0 THEN NULL
                ELSE ROUND(
                  100.0 * p.seances_presentes / p.seances_total, 1
                )
              END AS taux_presence,
              c.statut AS certification_statut
       FROM inscrits i
       LEFT JOIN notes_agregees n ON n.id_apprenant = i.id_apprenant
       LEFT JOIN presences_agregees p ON p.id_apprenant = i.id_apprenant
       LEFT JOIN certification c
         ON c.id_formation = $1 AND c.id_apprenant = i.id_apprenant
       ORDER BY i.nom, i.prenom`,
      [formationId]
    );

    const savedResult = await db.query(
      `SELECT COUNT(DISTINCT c.id_certification)::INTEGER AS decisions_count
       FROM certification c
       JOIN apprenant a ON a.id_apprenant = c.id_apprenant
       JOIN inscription i
         ON i.id_candidat = a.id_candidat
        AND i.id_formation = c.id_formation
        AND i.statut = 'ACCEPTEE'
       WHERE c.id_formation = $1`,
      [formationId]
    );
    const decisionsCount = Number(savedResult.rows[0].decisions_count);

    res.json({
      formation,
      learners: rows,
      is_saved: rows.length > 0 && decisionsCount >= rows.length
    });
  } catch (error) {
    console.error('Erreur apprenants à certifier :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des apprenants.' });
  }
};

exports.saveCertificationSelection = async (req, res) => {
  const formationId = getFormationId(req.params.id_formation);
  if (!formationId) return res.status(400).json({ message: 'Identifiant de formation invalide.' });

  const { certifiedLearnerIds } = req.body || {};
  if (!Array.isArray(certifiedLearnerIds)
    || certifiedLearnerIds.some((id) => !Number.isInteger(id) || id < 1)
    || new Set(certifiedLearnerIds).size !== certifiedLearnerIds.length) {
    return res.status(400).json({ message: 'La liste des apprenants certifiés est invalide.' });
  }

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    const formation = await getClosedFormation(client, formationId, true);
    if (!formation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Formation terminée introuvable.' });
    }

    const learnersResult = await client.query(
      `SELECT DISTINCT a.id_apprenant
       FROM inscription i
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE i.id_formation = $1 AND i.statut = 'ACCEPTEE'
       ORDER BY a.id_apprenant`,
      [formationId]
    );
    const learnerIds = learnersResult.rows.map((learner) => learner.id_apprenant);
    const eligibleIds = new Set(learnerIds);
    if (certifiedLearnerIds.some((id) => !eligibleIds.has(id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Un apprenant sélectionné ne fait pas partie de cette formation.' });
    }
    if (learnerIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Aucun apprenant accepté à enregistrer pour cette formation.' });
    }

    await client.query(
      `INSERT INTO certification (id_apprenant, id_formation, statut, date_certification)
       SELECT id_apprenant, $1,
              CASE
                WHEN id_apprenant = ANY($2::INTEGER[]) THEN 'CERTIFIE'::statut_certification
                ELSE 'NON_CERTIFIE'::statut_certification
              END,
              CASE WHEN id_apprenant = ANY($2::INTEGER[]) THEN CURRENT_DATE ELSE NULL END
       FROM unnest($3::INTEGER[]) AS eligible(id_apprenant)
       ON CONFLICT (id_apprenant, id_formation)
       DO UPDATE SET statut = EXCLUDED.statut,
                     date_certification = EXCLUDED.date_certification`,
      [formationId, certifiedLearnerIds, learnerIds]
    );

    await client.query('COMMIT');
    res.json({
      message: 'La liste des certifications a été enregistrée.',
      certified_count: certifiedLearnerIds.length
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erreur annulation enregistrement certifications :', rollbackError);
      }
    }
    console.error('Erreur enregistrement certifications :', error);
    res.status(500).json({ message: 'Erreur lors de l’enregistrement de la liste.' });
  } finally {
    client?.release();
  }
};
