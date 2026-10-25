const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

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
        JOIN apprenant a ON a.id_candidat = i.id_candidat
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