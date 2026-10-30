// backend/controllers/seanceController.js
const db = require('../config/db');

// Récupérer toutes les séances (avec possibilité de filtrer par formation)
exports.getSeances = async (req, res) => {
  const { id_formation } = req.query;

  try {
    let query = `
      SELECT 
        s.id_seance,
        s.id_formation,
        s.titre,
        s.description,
        s.date_seance,
        s.heure_debut,
        s.heure_fin,
        s.type_seance,
        s.salle,
        f.titre AS formation_titre,
        COUNT(p.id_presence)::INTEGER AS total_presences
      FROM seance s
      JOIN formation f ON s.id_formation = f.id_formation
      LEFT JOIN presence p ON p.id_seance = s.id_seance
    `;
    const params = [];

    if (id_formation) {
      query += ` WHERE s.id_formation = $1`;
      params.push(id_formation);
    }

    query += ` GROUP BY s.id_seance, f.id_formation, f.titre ORDER BY s.date_seance ASC, s.heure_debut ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récuperation séances :", err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération du planning." });
  }
};

// Créer une nouvelle séance
// controllers/seanceController.js
exports.createSeance = async (req, res) => {
  const { id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle } = req.body;

  if (heure_debut >= heure_fin) {
    return res.status(400).json({ message: "L'heure de début doit être antérieure à l'heure de fin." });
  }

  try {
    // 1. Vérification période de formation
    const formationRes = await db.query(
      `SELECT date_debut, date_fin FROM formation WHERE id_formation = $1`,
      [id_formation]
    );

    if (formationRes.rows.length === 0) {
      return res.status(404).json({ message: "Formation introuvable." });
    }

    const { date_debut, date_fin } = formationRes.rows[0];
    const dateSeanceObj = new Date(date_seance);

    if ( new Date(date_debut) <= dateSeanceObj || dateSeanceObj <= new Date(date_fin)) {
    } else {
      return res.status(400).json({
        message: `La date doit être comprise entre le ${new Date(date_debut).toLocaleDateString('fr-FR')} et le ${new Date(date_fin).toLocaleDateString('fr-FR')}.`
      });
    }

    // 2. Chevauchement de salle
    if (salle && salle.trim() !== '') {
      const overlapQuery = `
        SELECT id_seance FROM seance
        WHERE date_seance = $1
          AND LOWER(salle) = LOWER($2)
          AND (heure_debut < $3 AND heure_fin > $4)
      `;
      const overlapRes = await db.query(overlapQuery, [date_seance, salle.trim(), heure_fin, heure_debut]);

      if (overlapRes.rows.length > 0) {
        return res.status(409).json({
          message: `La salle "${salle}" est déjà occupée sur ce créneau (${heure_debut} - ${heure_fin}).`
        });
      }
    }

    // 3. Insertion
    const newSeance = await db.query(
      `INSERT INTO seance (id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle]
    );

    res.status(201).json({
      message: "Séance programmée avec succès !",
      seance: newSeance.rows[0]
    });

  } catch (error) {
    console.error("Erreur création séance :", error);
    res.status(500).json({ message: "Erreur serveur lors de la création." });
  }
};

// Supprimer une séance
exports.deleteSeance = async (req, res) => {
  const { id_seance } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT s.date_seance, COUNT(p.id_presence)::INTEGER AS total_presences
       FROM seance s
       LEFT JOIN presence p ON p.id_seance = s.id_seance
       WHERE s.id_seance = $1
       GROUP BY s.id_seance`,
      [id_seance]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Séance introuvable." });
    }

    if (String(rows[0].date_seance).slice(0, 10) < new Date().toLocaleDateString('en-CA')) {
      return res.status(409).json({ message: "Une séance terminée ne peut pas être supprimée." });
    }

    if (Number(rows[0].total_presences) > 0) {
      return res.status(409).json({ message: "Cette séance ne peut pas être supprimée car elle contient des données de présence." });
    }

    await db.query(`DELETE FROM seance WHERE id_seance = $1`, [id_seance]);
    res.json({ message: "Séance supprimée avec succès." });
  } catch (err) {
    console.error("Erreur suppression séance :", err);
    res.status(500).json({ message: "Erreur lors de la suppression de la séance." });
  }
};