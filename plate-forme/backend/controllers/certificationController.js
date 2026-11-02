const db = require('../config/db');
const certification = require('../Models/certificationModel');

const { emitRealtimeEvent } = require('../services/realtime');

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
      certification.SQL_12
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
      certification.SQL_11
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
      certification.SQL_10,
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
      certification.SQL_9,
      [formationId]
    );

    const savedResult = await db.query(
      certification.SQL_8,
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
    await client.query(certification.SQL_7);

    const formation = await getClosedFormation(client, formationId, true);
    if (!formation) {
      await client.query(certification.SQL_1);
      return res.status(404).json({ message: 'Formation terminée introuvable.' });
    }

    const learnersResult = await client.query(
      certification.SQL_6,
      [formationId]
    );
    const learnerIds = learnersResult.rows.map((learner) => learner.id_apprenant);
    const eligibleIds = new Set(learnerIds);
    if (certifiedLearnerIds.some((id) => !eligibleIds.has(id))) {
      await client.query(certification.SQL_1);
      return res.status(400).json({ message: 'Un apprenant sélectionné ne fait pas partie de cette formation.' });
    }
    if (learnerIds.length === 0) {
      await client.query(certification.SQL_1);
      return res.status(400).json({ message: 'Aucun apprenant accepté à enregistrer pour cette formation.' });
    }

    const decisionsResult = await client.query(
      certification.SQL_5,
      [formationId]
    );
    const frozen = decisionsResult.rowCount >= learnerIds.length;
    const frozenCertifiedIds = decisionsResult.rows
      .filter((decision) => decision.statut === 'CERTIFIE')
      .map((decision) => decision.id_apprenant)
      .sort((a, b) => a - b);
    const requestedCertifiedIds = [...certifiedLearnerIds].sort((a, b) => a - b);

    if (frozen && JSON.stringify(frozenCertifiedIds) !== JSON.stringify(requestedCertifiedIds)) {
      await client.query(certification.SQL_1);
      return res.status(409).json({ message: 'La liste des apprenants certifiés est figée et ne peut plus être modifiée.' });
    }

    await client.query(
      certification.SQL_4,
      [formationId, certifiedLearnerIds, learnerIds]
    );

    await client.query(
      certification.SQL_3,
      [formationId]
    );
    await client.query(certification.SQL_2);
    emitRealtimeEvent('formations:changed', { id_formation: formationId });
    res.json({
      message: 'La liste des certifications a été figée et la formation a été archivée.',
      certified_count: certifiedLearnerIds.length,
      archived: true
    });
  } catch (error) {
    if (client) {
      try {
        await client.query(certification.SQL_1);
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
