const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params) };
module.exports.SQL_1 = `
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
module.exports.SQL_2 = `
        SELECT id_seance FROM seance
        WHERE date_seance = $1
          AND LOWER(salle) = LOWER($2)
          AND (heure_debut < $3 AND heure_fin > $4)
      `;
module.exports.SQL_3 = `DELETE FROM seance WHERE id_seance = $1`;
module.exports.SQL_4 = `SELECT s.date_seance, COUNT(p.id_presence)::INTEGER AS total_presences
       FROM seance s
       LEFT JOIN presence p ON p.id_seance = s.id_seance
       WHERE s.id_seance = $1
       GROUP BY s.id_seance`;
module.exports.SQL_5 = `UPDATE seance
       SET id_formation = $1, titre = $2, description = $3, date_seance = $4,
           heure_debut = $5, heure_fin = $6, type_seance = $7, salle = $8
       WHERE id_seance = $9
       RETURNING *`;
module.exports.SQL_6 = `SELECT id_seance FROM seance
         WHERE id_seance <> $1 AND date_seance = $2
           AND LOWER(salle) = LOWER($3)
           AND heure_debut < $4 AND heure_fin > $5`;
module.exports.SQL_7 = `SELECT date_debut, date_fin FROM formation WHERE id_formation = $1`;
module.exports.SQL_8 = `SELECT id_seance, id_formation FROM seance WHERE id_seance = $1`;
module.exports.SQL_9 = `INSERT INTO seance (id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`;
