const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
module.exports.SQL_1 = 'ROLLBACK';
module.exports.SQL_2 = 'COMMIT';
module.exports.SQL_3 = `UPDATE formation
       SET statut = 'ARCHIVEE', date_modification = CURRENT_TIMESTAMP
       WHERE id_formation = $1 AND statut = 'TERMINEE'`;
module.exports.SQL_4 = `INSERT INTO certification (id_apprenant, id_formation, statut, date_certification)
       SELECT id_apprenant, $1,
              CASE
                WHEN id_apprenant = ANY($2::INTEGER[]) THEN 'CERTIFIE'::statut_certification
                ELSE 'NON_CERTIFIE'::statut_certification
              END,
              CASE WHEN id_apprenant = ANY($2::INTEGER[]) THEN CURRENT_DATE ELSE NULL END
       FROM unnest($3::INTEGER[]) AS eligible(id_apprenant)
       ON CONFLICT (id_apprenant, id_formation)
       DO UPDATE SET statut = EXCLUDED.statut,
                     date_certification = EXCLUDED.date_certification`;
module.exports.SQL_5 = `SELECT id_apprenant, statut::TEXT AS statut
       FROM certification
       WHERE id_formation = $1`;
module.exports.SQL_6 = `SELECT DISTINCT a.id_apprenant
       FROM inscription i
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE i.id_formation = $1 AND i.statut = 'ACCEPTEE'
       ORDER BY a.id_apprenant`;
module.exports.SQL_7 = 'BEGIN';
module.exports.SQL_8 = `SELECT COUNT(DISTINCT c.id_certification)::INTEGER AS decisions_count
       FROM certification c
       JOIN apprenant a ON a.id_apprenant = c.id_apprenant
       JOIN inscription i
         ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         )
        AND i.id_formation = c.id_formation
        AND i.statut = 'ACCEPTEE'
       WHERE c.id_formation = $1`;
module.exports.SQL_9 = `WITH inscrits AS (
        SELECT DISTINCT a.id_apprenant, u.nom, u.prenom, u.email, u.telephone, ca.genre
         FROM inscription i
         JOIN apprenant a ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         )
         JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
        JOIN candidat ca ON ca.id_utilisateur = a.id_utilisateur
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
                  FILTER (WHERE p.statut = 'PRESENT')::INTEGER AS seances_presentes
         FROM inscrits i
         LEFT JOIN seance s ON s.id_formation = $1
         LEFT JOIN presence p
           ON p.id_seance = s.id_seance AND p.id_apprenant = i.id_apprenant
         GROUP BY i.id_apprenant
       )
       SELECT i.id_apprenant, i.nom, i.prenom, i.email, i.telephone, i.genre,
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
       ORDER BY
         ROUND(n.moyenne, 2) DESC NULLS LAST,
         CASE
           WHEN p.seances_total = 0 THEN NULL
           ELSE ROUND(100.0 * p.seances_presentes / p.seances_total, 1)
         END DESC NULLS LAST,
         i.nom, i.prenom`;
module.exports.SQL_10 = `SELECT DISTINCT a.id_apprenant, u.nom, u.prenom, u.email,
              c.statut::TEXT AS certification_statut,
              c.date_certification
       FROM inscription i
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       LEFT JOIN certification c
         ON c.id_formation = i.id_formation AND c.id_apprenant = a.id_apprenant
       WHERE i.id_formation = $1 AND i.statut = 'ACCEPTEE'
       ORDER BY u.nom, u.prenom`;
module.exports.SQL_11 = `SELECT f.id_formation, f.titre, f.date_debut, f.date_fin,
              COUNT(DISTINCT a.id_apprenant)::INTEGER AS apprenants_count,
              COUNT(DISTINCT c.id_apprenant)
                FILTER (WHERE c.statut = 'CERTIFIE')::INTEGER AS certifies_count,
              COUNT(DISTINCT c.id_apprenant)
                FILTER (WHERE c.statut = 'NON_CERTIFIE')::INTEGER AS non_certifies_count,
              COUNT(DISTINCT a.id_apprenant)
                FILTER (WHERE c.id_certification IS NULL)::INTEGER AS en_attente_count
       FROM formation f
       LEFT JOIN inscription i
         ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       LEFT JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       LEFT JOIN certification c
         ON c.id_formation = f.id_formation AND c.id_apprenant = a.id_apprenant
       WHERE f.statut = 'TERMINEE'
       GROUP BY f.id_formation
       ORDER BY f.date_fin DESC, f.id_formation DESC`;
module.exports.SQL_12 = `SELECT f.id_formation, f.titre, f.date_debut, f.date_fin,
              COUNT(DISTINCT a.id_apprenant)::INTEGER AS apprenants_count,
              COUNT(DISTINCT c.id_certification)::INTEGER AS decisions_count,
              COUNT(DISTINCT c.id_certification)
                FILTER (WHERE c.statut = 'CERTIFIE')::INTEGER AS certifies_count
       FROM formation f
       LEFT JOIN inscription i
         ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       LEFT JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       LEFT JOIN certification c
         ON c.id_formation = f.id_formation AND c.id_apprenant = a.id_apprenant
       WHERE f.statut = 'TERMINEE'
       GROUP BY f.id_formation
       ORDER BY f.date_fin DESC, f.id_formation DESC`;
