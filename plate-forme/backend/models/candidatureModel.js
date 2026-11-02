const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
module.exports.SQL_1 = `
      SELECT 
        i.id_inscription,
        i.statut,
        i.date_inscription,
        i.motivation,
        i.conditions_acceptees,
        c.id_candidat,
        c.nom,
        c.prenom,
        i.email_candidat AS email,
        c.telephone,
        c.age,
        c.genre,
        c.niveau_etude,
        c.situation_professionnelle,
        c.etablissement,
        c.filiere,
        COALESCE(a.id_apprenant IS NOT NULL AND u.mot_de_passe IS NOT NULL, FALSE) AS est_apprenant,
        f.id_formation,
        f.titre AS formation_titre,
        f.capacite_max,
        i.objectif,
        i.projet_apres_formation,
        i.source_information,
        i.formation_precedente,
        i.retour_suggestion,
        i.a_deja_suivi_formation,
        (
          SELECT COUNT(*)::INTEGER 
          FROM inscription i2 
          WHERE i2.id_formation = f.id_formation AND i2.statut = 'ACCEPTEE'
        ) AS total_acceptes
      FROM inscription i
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      LEFT JOIN utilisateur u ON LOWER(BTRIM(u.email)) = LOWER(BTRIM(i.email_candidat))
      LEFT JOIN apprenant a ON a.id_utilisateur = u.id_utilisateur
      ORDER BY i.date_inscription DESC;
    `;
module.exports.SQL_2 = 'ROLLBACK';
module.exports.SQL_3 = 'COMMIT';
module.exports.SQL_4 = `UPDATE inscription i
       SET statut = 'REFUSEE', date_decision = CURRENT_TIMESTAMP
       WHERE i.id_formation = $1
         AND i.statut IN ('EN_ATTENTE', 'PRESELECTIONNEE')
         AND (
           SELECT COUNT(*) FROM inscription occupied
           WHERE occupied.id_formation = i.id_formation
             AND occupied.statut = 'ACCEPTEE'
         ) >= $2`;
module.exports.SQL_5 = `UPDATE inscription SET statut = $1, date_decision = CASE WHEN $1 = 'REFUSEE' THEN CURRENT_TIMESTAMP ELSE date_decision END
       WHERE id_inscription = $2`;
module.exports.SQL_6 = `SELECT COUNT(*)::INTEGER AS total
         FROM inscription
         WHERE id_formation = $1
           AND statut IN ('ACCEPTEE', 'PRESELECTIONNEE')`;
module.exports.SQL_7 = `SELECT i.id_formation, f.capacite_max, i.statut AS statut_actuel
       FROM inscription i
       JOIN formation f ON f.id_formation = i.id_formation
       WHERE i.id_inscription = $1
       FOR UPDATE`;
module.exports.SQL_8 = 'BEGIN';
module.exports.SQL_9 = `UPDATE utilisateur SET qr_code = $1 WHERE id_utilisateur = $2`;
module.exports.SQL_10 = `INSERT INTO apprenant (id_utilisateur, statut)
         VALUES ($1, 'ACTIF')
         ON CONFLICT (id_utilisateur) DO UPDATE SET statut = 'ACTIF'
         RETURNING id_apprenant`;
module.exports.SQL_11 = `UPDATE utilisateur
           SET jeton_activation_hash = $1,
               jeton_activation_expiration = CURRENT_TIMESTAMP + INTERVAL '24 hours'
           WHERE id_utilisateur = $2`;
module.exports.SQL_12 = `UPDATE inscription i
         SET statut = 'REFUSEE', date_decision = CURRENT_TIMESTAMP
         FROM formation f
         WHERE f.id_formation = i.id_formation
           AND i.id_formation = $1
           AND i.statut IN ('EN_ATTENTE', 'PRESELECTIONNEE')
           AND f.capacite_max IS NOT NULL
           AND (
             SELECT COUNT(*) FROM inscription occupied
             WHERE occupied.id_formation = f.id_formation
               AND occupied.statut = 'ACCEPTEE'
           ) >= f.capacite_max`;
module.exports.SQL_13 = `INSERT INTO utilisateur (email, nom, prenom, telephone, age, statut_compte)
           VALUES (LOWER(BTRIM($1)), $2, $3, $4, $5, 'ACTIF')
           RETURNING id_utilisateur`;
module.exports.SQL_14 = `UPDATE utilisateur SET statut_compte = 'ACTIF', nom = $1, prenom = $2, telephone = $3, age = $4
           WHERE id_utilisateur = $5`;
module.exports.SQL_15 = `SELECT id_utilisateur, mot_de_passe FROM utilisateur WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))`;
module.exports.SQL_16 = `UPDATE inscription 
         SET statut = 'ACCEPTEE', date_decision = CURRENT_TIMESTAMP 
         WHERE id_inscription = $1`;
module.exports.SQL_17 = `SELECT COUNT(*)::INTEGER AS total FROM inscription WHERE id_formation = $1 AND statut = 'ACCEPTEE'`;
module.exports.SQL_18 = `SELECT i.id_inscription, c.id_candidat, i.email_candidat AS email, c.nom, c.prenom, c.telephone, c.age, f.titre as formation_titre
       FROM inscription i
       JOIN candidat c ON i.id_candidat = c.id_candidat
       JOIN formation f ON i.id_formation = f.id_formation
       WHERE i.id_formation = $1
         AND (
           ($2::INTEGER[] IS NULL AND i.statut = 'PRESELECTIONNEE')
           OR ($2::INTEGER[] IS NOT NULL AND i.id_inscription = ANY($2::INTEGER[])
             AND i.statut IN ('EN_ATTENTE', 'PRESELECTIONNEE'))
         )
       FOR UPDATE`;
module.exports.SQL_19 = `SELECT capacite_max FROM formation WHERE id_formation = $1 FOR UPDATE`;
module.exports.SQL_20 = `INSERT INTO apprenant (id_utilisateur, statut)
       VALUES ($1, 'ACTIF')
       ON CONFLICT (id_utilisateur) DO UPDATE SET statut = 'ACTIF'
       RETURNING id_apprenant`;
module.exports.SQL_21 = `UPDATE utilisateur
         SET jeton_activation_hash = $1,
             jeton_activation_expiration = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE id_utilisateur = $2`;
module.exports.SQL_22 = `INSERT INTO utilisateur (email, nom, prenom, telephone, age, statut_compte)
         VALUES (LOWER(BTRIM($1)), $2, $3, $4, $5, 'ACTIF')
         RETURNING id_utilisateur`;
module.exports.SQL_23 = `UPDATE inscription pending
       SET statut = 'REFUSEE', date_decision = CURRENT_TIMESTAMP
       FROM formation f
       WHERE f.id_formation = pending.id_formation
         AND pending.id_formation = (SELECT id_formation FROM inscription WHERE id_inscription = $1)
         AND pending.statut IN ('EN_ATTENTE', 'PRESELECTIONNEE')
         AND f.capacite_max IS NOT NULL
         AND (
           SELECT COUNT(*) FROM inscription occupied
           WHERE occupied.id_formation = f.id_formation
             AND occupied.statut = 'ACCEPTEE'
         ) >= f.capacite_max`;
module.exports.SQL_24 = `UPDATE inscription 
       SET statut = 'ACCEPTEE', date_decision = CURRENT_TIMESTAMP 
       WHERE id_inscription = $1`;
module.exports.SQL_25 = `SELECT capacite_max, COUNT(*) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS acceptes
       FROM formation f
       LEFT JOIN inscription i ON i.id_formation = f.id_formation
       WHERE f.id_formation = (
         SELECT id_formation FROM inscription WHERE id_inscription = $1
       )
       GROUP BY f.id_formation, f.capacite_max`;
module.exports.SQL_26 = `SELECT i.id_inscription, i.statut, c.id_candidat, i.email_candidat AS email, c.nom, c.prenom, c.telephone, c.age, f.titre as formation_titre
       FROM inscription i
       JOIN candidat c ON i.id_candidat = c.id_candidat
       JOIN formation f ON i.id_formation = f.id_formation
       WHERE i.id_inscription = $1`;
