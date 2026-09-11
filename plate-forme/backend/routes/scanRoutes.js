const express = require('express');
const router = express.Router();
const db = require('../db'); // Votre client pg / Pool

// Vérifier les droits du responsable (middleware d'authentification requis)
router.post('/scan', async (req, res) => {
  const { id_seance, qr_data } = req.body;

  if (!id_seance || !qr_data) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  let parsedQr;
  try {
    parsedQr = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
  } catch (err) {
    return res.status(400).json({ error: 'Format QR Code invalide' });
  }

  // Contrôle du type
  if (parsedQr.type !== 'BADGE_PRESENCE') {
    return res.status(400).json({ error: 'QR Code non reconnu' });
  }

  const { id_apprenant, id_utilisateur } = parsedQr;

  try {
    // 1. Vérifier la cohérence de l'apprenant
    const appCheck = await db.query(
      `SELECT id_apprenant FROM apprenant WHERE id_apprenant = $1 AND id_utilisateur = $2`,
      [id_apprenant, id_utilisateur]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Apprenant introuvable' });
    }

    // 2. Enregistrer ou mettre à jour la présence (UPSERT grâce au UNIQUE(id_apprenant, id_seance))
    const query = `
      INSERT INTO presence (id_apprenant, id_seance, date_scan, statut)
      VALUES ($1, $2, NOW(), 'PRESENT')
      ON CONFLICT (id_apprenant, id_seance) 
      DO UPDATE SET 
        statut = 'PRESENT',
        date_scan = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [id_apprenant, id_seance]);

    // 3. Récupérer les informations de l'apprenant pour le retour visuel
    const userResult = await db.query(
      `SELECT nom, prenom FROM utilisateur WHERE id_utilisateur = $1`,
      [id_utilisateur]
    );

    const apprenantInfos = userResult.rows[0];

    return res.status(200).json({
      success: true,
      message: `Présence enregistrée pour ${apprenantInfos.prenom} ${apprenantInfos.nom}`,
      presence: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur enregistrement présence:', error);
    return res.status(500).json({ error: 'Erreur serveur lors du scan' });
  }
});

module.exports = router;