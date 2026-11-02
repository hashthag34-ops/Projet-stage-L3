const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
module.exports.SQL_1 = `
      SELECT 
        f.id_formation,
        f.titre,
        f.description,
        f.statut,
        f.date_debut,
        f.date_fin,
        f.date_limite_inscription,
        f.capacite_max,
        f.image_url,

        COUNT(i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS inscrits_count,
        CASE 
          WHEN f.capacite_max IS NOT NULL AND COUNT(i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE') >= f.capacite_max 
          THEN TRUE 
          ELSE FALSE 
        END AS est_complete,
        c_user.statut_candidature,
        COALESCE(c_user.est_apprenant, FALSE) AS est_apprenant,
        c_user.id_apprenant,
        COALESCE(ratings.note_moyenne, 0) AS note_moyenne,
        COALESCE(ratings.avis_count, 0) AS avis_count,
        (user_review.id_avis IS NOT NULL) AS avis_deja_depose
      FROM formation f 
      LEFT JOIN (
        SELECT 
          i.id_formation,
          i.statut AS statut_candidature,
          a.id_apprenant,
          CASE 
            WHEN a.id_apprenant IS NOT NULL AND i.statut = 'ACCEPTEE' THEN TRUE 
            ELSE FALSE 
          END AS est_apprenant
        FROM inscription i
        JOIN candidat c ON i.id_candidat = c.id_candidat
        LEFT JOIN utilisateur u ON LOWER(BTRIM(c.email)) = LOWER(BTRIM(u.email))
        LEFT JOIN apprenant a ON u.id_utilisateur = a.id_utilisateur
        WHERE u.id_utilisateur = $1
      ) c_user ON f.id_formation = c_user.id_formation

      LEFT JOIN (
        SELECT id_formation, ROUND(AVG(note)::NUMERIC, 1) AS note_moyenne,
               COUNT(*)::INTEGER AS avis_count
        FROM formation_avis
        GROUP BY id_formation
      ) ratings ON ratings.id_formation = f.id_formation

      LEFT JOIN formation_avis user_review
        ON user_review.id_formation = f.id_formation
       AND user_review.id_apprenant = c_user.id_apprenant

      LEFT JOIN inscription i ON f.id_formation = i.id_formation

      WHERE f.statut <> 'BROUILLON'

      GROUP BY 
        f.id_formation, 
        c_user.statut_candidature, 
        c_user.est_apprenant,
        c_user.id_apprenant,
        ratings.note_moyenne,
        ratings.avis_count,
        user_review.id_avis

      ORDER BY f.date_debut DESC;
    `;
module.exports.SQL_2 = `
      SELECT * FROM formation WHERE statut = 'OUVERTE' 
      ORDER BY date_debut ASC;
    `;
module.exports.SQL_3 = `SELECT * FROM formation ORDER BY date_creation DESC;`;
module.exports.SQL_4 = `
      WITH nouvelle_formation AS (
        INSERT INTO formation (
          titre, description, image_url, date_debut, date_fin,
          date_limite_inscription, capacite_max, statut
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      ), nouveau_forum AS (
        INSERT INTO forum (id_formation, nom, description)
        SELECT id_formation, 'Forum ' || titre,
               'Espace de discussion pour la formation ' || titre || '.'
        FROM nouvelle_formation
        RETURNING id_forum
      )
      SELECT * FROM nouvelle_formation;
    `;
module.exports.SQL_5 = `
      SELECT f.id_formateur, u.nom, u.prenom, u.email, ff.role_formateur, ff.date_affectation
      FROM formation_formateur ff
      JOIN formateur f ON ff.id_formateur = f.id_formateur
      JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
      WHERE ff.id_formation = $1;
    `;
module.exports.SQL_6 = `
      SELECT f.id_formateur, u.nom, u.prenom, u.email, f.specialite
      FROM formateur f
      JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur;
    `;
module.exports.SQL_7 = `
      INSERT INTO formation_formateur (id_formation, id_formateur, role_formateur)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
module.exports.SQL_8 = 'DELETE FROM formation_formateur WHERE id_formation = $1 AND id_formateur = $2';
module.exports.SQL_9 = 'DELETE FROM formation WHERE id_formation = $1';
module.exports.SQL_10 = `UPDATE formation SET statut = 'ARCHIVEE', date_modification = CURRENT_TIMESTAMP
         WHERE id_formation = $1 AND statut <> 'ARCHIVEE'
         RETURNING id_formation`;
module.exports.SQL_11 = `SELECT statut,
        EXISTS (SELECT 1 FROM inscription WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM seance WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM formation_formateur WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM evaluation_sujet WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM formation_avis WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM forum WHERE id_formation = $1) AS has_data
       FROM formation WHERE id_formation = $1`;
module.exports.SQL_12 = 'ROLLBACK';
module.exports.SQL_13 = 'COMMIT';
module.exports.SQL_14 = `UPDATE forum SET nom = 'Forum ' || $1, description = 'Espace de discussion pour la formation ' || $1 || '.'
       WHERE id_formation = $2`;
module.exports.SQL_15 = `UPDATE formation SET titre = $1, description = $2, image_url = $3,
        date_debut = $4, date_fin = $5, date_limite_inscription = $6,
        capacite_max = $7, statut = $8, date_modification = CURRENT_TIMESTAMP
       WHERE id_formation = $9 RETURNING *`;
module.exports.SQL_16 = `DELETE FROM seance WHERE id_formation = $1
           AND (date_seance::date < $2::date OR date_seance::date > $3::date)`;
module.exports.SQL_17 = `SELECT id_seance, titre, date_seance FROM seance
         WHERE id_formation = $1 AND (date_seance::date < $2::date OR date_seance::date > $3::date)
         ORDER BY date_seance`;
module.exports.SQL_18 = 'SELECT * FROM formation WHERE id_formation = $1 FOR UPDATE';
module.exports.SQL_19 = 'BEGIN';
module.exports.SQL_20 = 'SELECT * FROM formation WHERE id_formation = $1';
module.exports.SQL_21 = `INSERT INTO formation_avis (id_formation, id_apprenant, note, commentaire)
       SELECT f.id_formation, a.id_apprenant, $3, $4
       FROM formation f
       JOIN inscription i ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE f.id_formation = $1 AND a.id_utilisateur = $2 AND f.statut IN ('TERMINEE', 'ARCHIVEE')
       RETURNING id_avis, id_formation, note, commentaire, date_creation`;
module.exports.SQL_22 = `SELECT DISTINCT f.id_formation, f.titre, f.description, f.statut
       FROM formation f
       JOIN inscription i ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE a.id_utilisateur = $1
         AND f.statut IN ('TERMINEE', 'ARCHIVEE')
         AND NOT EXISTS (
           SELECT 1
           FROM formation_avis fa
           WHERE fa.id_formation = f.id_formation
             AND fa.id_apprenant = a.id_apprenant
         )
       ORDER BY f.titre`;
module.exports.SQL_23 = `SELECT fa.id_avis, fa.note, fa.commentaire, fa.date_creation,
              u.prenom || ' ' || LEFT(u.nom, 1) || '.' AS auteur
       FROM formation_avis fa
       JOIN apprenant a ON a.id_apprenant = fa.id_apprenant
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       JOIN formation f ON f.id_formation = fa.id_formation
       WHERE fa.id_formation = $1 AND f.statut IN ('TERMINEE', 'ARCHIVEE')
       ORDER BY fa.date_creation DESC`;
