const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/seances/:id_seance/apprenants', async (req, res) => {
  const idSeance = Number(req.params.id_seance);
  if (!Number.isInteger(idSeance) || idSeance <= 0) {
    return res.status(400).json({ error: 'Séance invalide.' });
  }

  try {
    const { rows } = await db.query(
      `WITH eligible AS (
         SELECT a.id_apprenant, u.nom, u.prenom, u.email
         FROM seance s
         JOIN inscription i ON i.id_formation = s.id_formation AND i.statut = 'ACCEPTEE'
         JOIN apprenant a ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         )
         JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         WHERE s.id_seance = $1
       ),
       recorded_states AS (
         SELECT COUNT(*)::INTEGER AS total
         FROM eligible e
         JOIN presence p ON p.id_apprenant = e.id_apprenant AND p.id_seance = $1
       )
       SELECT a.id_apprenant, a.nom, a.prenom, a.email,
              p.statut AS statut_presence,
              p.date_scan,
              r.total AS total_enregistres
       FROM eligible a
       LEFT JOIN presence p ON p.id_seance = $1 AND p.id_apprenant = a.id_apprenant,
       recorded_states r
       ORDER BY a.nom, a.prenom`,
      [idSeance]
    );
    const eligibleCountResult = await db.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM seance s
       JOIN inscription i ON i.id_formation = s.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE s.id_seance = $1`,
      [idSeance]
    );
    const eligibleTotal = eligibleCountResult.rows[0].total;
    const totalRecorded = rows[0]?.total_enregistres || 0;
    res.json({
      closed: eligibleTotal > 0 && totalRecorded >= eligibleTotal,
      apprenants: rows.map(({ total_enregistres, ...learner }) => learner)
    });
  } catch (error) {
    console.error('Erreur chargement apprenants de la séance :', error);
    res.status(500).json({ error: 'Impossible de charger les apprenants.' });
  }
});

router.post('/manuel', async (req, res) => {
  const idSeance = Number(req.body.id_seance);
  const ids = req.body.id_apprenants;
  if (!Number.isInteger(idSeance) || idSeance <= 0 || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Séance ou liste d’apprenants invalide.' });
  }

  const idApprenants = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  try {
    const { rows } = await db.query(
      `WITH apprenants_eligibles AS (
         SELECT a.id_apprenant, u.nom, u.prenom
         FROM seance s
         JOIN inscription i ON i.id_formation = s.id_formation AND i.statut = 'ACCEPTEE'
         JOIN apprenant a ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         )
         JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         WHERE s.id_seance = $1 AND a.id_apprenant = ANY($2::INTEGER[])
       ), presence_enregistree AS (
         INSERT INTO presence (id_apprenant, id_seance, date_scan, statut)
         SELECT id_apprenant, $1, NOW(), 'PRESENT'
         FROM apprenants_eligibles
         ON CONFLICT (id_apprenant, id_seance)
         DO UPDATE SET statut = 'PRESENT', date_scan = NOW()
         RETURNING id_apprenant
       )
       SELECT ae.* FROM apprenants_eligibles ae
       JOIN presence_enregistree pe ON pe.id_apprenant = ae.id_apprenant`,
      [idSeance, idApprenants]
    );
    res.json({ message: `${rows.length} présence(s) enregistrée(s).`, apprenants: rows });
  } catch (error) {
    console.error('Erreur émargement manuel :', error);
    res.status(500).json({ error: 'Impossible d’enregistrer les présences manuelles.' });
  }
});

router.post('/seances/:id_seance/cloturer', async (req, res) => {
    const idSeance = Number(req.params.id_seance);
    try {
      const { rows } = await db.query(
        `INSERT INTO presence (id_apprenant, id_seance, date_scan, statut)
         SELECT a.id_apprenant, s.id_seance, NOW(), 'ABSENT'
         FROM seance s
         JOIN inscription i ON i.id_formation = s.id_formation AND i.statut = 'ACCEPTEE'
         JOIN apprenant a ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         )
         WHERE s.id_seance = $1
           AND NOT EXISTS (
             SELECT 1 FROM presence p
             WHERE p.id_seance = s.id_seance AND p.id_apprenant = a.id_apprenant
           )
         ON CONFLICT (id_apprenant, id_seance) DO NOTHING
         RETURNING id_apprenant`,
        [idSeance]
      );
      res.json({ message: `Pointage clôturé. ${rows.length} apprenant(s) marqué(s) absent(s).` });
    } catch (error) {
      console.error('Erreur clôture du pointage :', error);
      res.status(500).json({ error: 'Impossible de clôturer cette séance.' });
    }
});

router.patch('/seances/:id_seance/apprenants/:id_apprenant', async (req, res) => {
    const idSeance = Number(req.params.id_seance);
    const idApprenant = Number(req.params.id_apprenant);
    const statut = req.body.statut;
    if (!['PRESENT', 'ABSENT'].includes(statut)) {
      return res.status(400).json({ error: 'Statut de présence invalide.' });
    }
    try {
      await db.query(
        `INSERT INTO presence (id_apprenant, id_seance, date_scan, statut)
         SELECT $2, $1, NOW(), $3::statut_presence
         FROM seance s
         JOIN inscription i ON i.id_formation = s.id_formation AND i.statut = 'ACCEPTEE'
         JOIN apprenant a ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         )
         WHERE s.id_seance = $1 AND a.id_apprenant = $2
         ON CONFLICT (id_apprenant, id_seance)
         DO UPDATE SET statut = EXCLUDED.statut, date_scan = NOW()`,
        [idSeance, idApprenant, statut]
      );
      res.json({ message: 'Présence modifiée.' });
    } catch (error) {
      console.error('Erreur modification présence :', error);
      res.status(500).json({ error: 'Impossible de modifier la présence.' });
    }
});

// Vérifier les droits du responsable (middleware d'authentification requis)
router.post('/scan', async (req, res) => {
  const { id_seance, qr_data } = req.body;

  if (!Number.isInteger(id_seance) || id_seance <= 0 || !qr_data) {
    return res.status(400).json({ error: 'Identifiant de séance ou données QR invalides' });
  }

  let parsedQr;
  try {
    parsedQr = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
  } catch (err) {
    return res.status(400).json({ error: 'Format QR Code invalide' });
  }

  if (!parsedQr || typeof parsedQr !== 'object' || parsedQr.type !== 'BADGE_PRESENCE') {
    return res.status(400).json({ error: 'QR Code non reconnu' });
  }

  const { id_apprenant, id_utilisateur } = parsedQr;
  if (!Number.isInteger(id_apprenant) || id_apprenant <= 0 ||
      !Number.isInteger(id_utilisateur) || id_utilisateur <= 0) {
    return res.status(400).json({ error: 'QR Code non reconnu' });
  }

  try {
    const query = `
      WITH apprenant_eligible AS (
        SELECT a.id_apprenant, u.nom, u.prenom
        FROM seance s
        JOIN inscription i
          ON i.id_formation = s.id_formation
         AND i.statut = 'ACCEPTEE'
        JOIN apprenant a ON EXISTS (
          SELECT 1 FROM candidat c
          WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
        )
        JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
        WHERE s.id_seance = $2
          AND a.id_apprenant = $1
          AND a.id_utilisateur = $3
      ),
      presence_enregistree AS (
        INSERT INTO presence (id_apprenant, id_seance, date_scan, statut)
        SELECT id_apprenant, $2, NOW(), 'PRESENT'
        FROM apprenant_eligible
        ON CONFLICT (id_apprenant, id_seance)
        DO UPDATE SET
          -- Un scan tardif corrige aussi l'absence créée automatiquement.
          statut = 'PRESENT',
          date_scan = NOW()
        RETURNING *
      )
      SELECT presence_enregistree.*, apprenant_eligible.nom, apprenant_eligible.prenom
      FROM presence_enregistree
      JOIN apprenant_eligible USING (id_apprenant);
    `;

    const result = await db.query(query, [id_apprenant, id_seance, id_utilisateur]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "Cet apprenant n'est pas inscrit à la formation de cette séance."
      });
    }

    return res.status(200).json({
      success: true,
      message: `Présence enregistrée pour ${result.rows[0].prenom} ${result.rows[0].nom}`,
      presence: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur enregistrement présence:', error);
    return res.status(500).json({ error: 'Erreur serveur lors du scan' });
  }
});

module.exports = router;