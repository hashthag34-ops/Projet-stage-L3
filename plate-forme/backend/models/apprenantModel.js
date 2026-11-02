const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
module.exports.SQL_1 = `
      SELECT f.id_formation, f.titre, f.description, f.statut, i.statut AS statut_candidature
      FROM apprenant a
      JOIN inscription i ON EXISTS (
        SELECT 1 FROM candidat c
        WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
      )
      JOIN formation f ON i.id_formation = f.id_formation
      WHERE a.id_utilisateur = $1 AND i.statut = 'ACCEPTEE'
    `;
module.exports.SQL_2 = `
      SELECT 
        s.id_seance,
        s.titre,
        s.description,
        s.date_seance,
        s.heure_debut,
        s.heure_fin,
        s.type_seance,
        s.salle,
        f.id_formation,
        f.titre AS titre_formation,
        p.statut AS statut_presence,
        p.date_scan
      FROM utilisateur u
      JOIN apprenant a ON u.id_utilisateur = a.id_utilisateur
      JOIN inscription i ON EXISTS (
        SELECT 1 FROM candidat c
        WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
      )
      JOIN formation f ON i.id_formation = f.id_formation
      JOIN seance s ON f.id_formation = s.id_formation
      LEFT JOIN presence p ON p.id_seance = s.id_seance AND p.id_apprenant = a.id_apprenant
      WHERE u.id_utilisateur = $1
        AND i.statut = 'ACCEPTEE'
      ORDER BY s.date_seance ASC, s.heure_debut ASC;
    `;
module.exports.SQL_3 = `
      SELECT fo.id_forum, fo.nom, fo.description, f.titre AS titre_formation, f.statut AS formation_statut
      FROM apprenant a
      JOIN inscription i ON EXISTS (
        SELECT 1 FROM candidat c
        WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
      )
      JOIN formation f ON i.id_formation = f.id_formation
      JOIN forum fo ON fo.id_formation = f.id_formation
      WHERE a.id_utilisateur = $1
        AND i.statut = 'ACCEPTEE'
        AND fo.id_forum IS NOT NULL
    `;
module.exports.SQL_4 = 'ROLLBACK';
module.exports.SQL_5 = `SELECT eq.id_question, eq.numero_question, eq.enonce, eq.points,
              selected.id_choix AS reponse_choisie,
              selected.libelle AS reponse_choisie_libelle,
              correct.id_choix AS reponse_correcte,
              correct.libelle AS reponse_correcte_libelle,
              CASE WHEN selected.est_correct THEN TRUE ELSE FALSE END AS correcte,
              COALESCE(er.points_obtenus, 0) AS points_obtenus
       FROM evaluation_question eq
       LEFT JOIN evaluation_reponse er
         ON er.id_question = eq.id_question AND er.id_tentative = $1
       LEFT JOIN evaluation_choix selected ON selected.id_choix = er.id_choix
       LEFT JOIN LATERAL (
         SELECT ec.id_choix, ec.libelle, ec.est_correct
         FROM evaluation_choix ec
         WHERE ec.id_question = eq.id_question AND ec.est_correct = TRUE
         ORDER BY ec.ordre
         LIMIT 1
       ) correct ON TRUE
       WHERE eq.id_evaluation_sujet = $2
       ORDER BY eq.numero_question`;
module.exports.SQL_6 = 'COMMIT';
module.exports.SQL_7 = `UPDATE evaluation_tentative
       SET note = COALESCE((
             SELECT SUM(er.points_obtenus)
             FROM evaluation_reponse er
             WHERE er.id_tentative = $1
           ), 0),
           statut = 'TERMINEE',
           date_fin = CASE
             WHEN $2::BIGINT IS NOT NULL
               AND $2::BIGINT <= EXTRACT(EPOCH FROM (
                 LOCALTIMESTAMP AT TIME ZONE current_setting('TIMEZONE')
               )) * 1000
             THEN to_timestamp($2::BIGINT / 1000.0) AT TIME ZONE current_setting('TIMEZONE')
             ELSE LOCALTIMESTAMP
           END
       WHERE id_tentative = $1
       RETURNING id_tentative, note, statut, date_debut, date_fin`;
module.exports.SQL_8 = `SELECT et.id_tentative, et.id_apprenant, et.id_evaluation_sujet, et.statut,
              et.note, et.date_fin,
              CASE WHEN es.duree_minutes IS NULL THEN NULL
                   ELSE FLOOR(EXTRACT(EPOCH FROM (
                     (et.date_debut + es.duree_minutes * INTERVAL '1 minute')
                     AT TIME ZONE current_setting('TIMEZONE')
                   )) * 1000)::BIGINT
              END AS deadline_epoch_ms
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       JOIN apprenant a ON a.id_apprenant = et.id_apprenant
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
         AND i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       WHERE et.id_tentative = $1 AND a.id_utilisateur = $2 AND es.statut IN ('PUBLIEE', 'FERMEE')
       FOR UPDATE OF et`;
module.exports.SQL_9 = 'BEGIN';
module.exports.SQL_10 = `INSERT INTO evaluation_reponse (id_tentative, id_question, id_choix, points_obtenus)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_tentative, id_question)
       DO UPDATE SET id_choix = EXCLUDED.id_choix,
                     points_obtenus = EXCLUDED.points_obtenus`;
module.exports.SQL_11 = `SELECT ec.id_choix, eq.points,
              CASE WHEN ec.est_correct THEN eq.points ELSE 0 END AS points_obtenus
       FROM evaluation_choix ec
       JOIN evaluation_question eq ON eq.id_question = ec.id_question
       WHERE ec.id_choix = $1
         AND eq.id_question = $2
         AND eq.id_evaluation_sujet = $3`;
module.exports.SQL_12 = `SELECT et.id_tentative, et.id_evaluation_sujet, es.duree_minutes,
              (es.duree_minutes IS NOT NULL
               AND et.date_debut + es.duree_minutes * INTERVAL '1 minute' <= LOCALTIMESTAMP) AS expired
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       JOIN apprenant a ON a.id_apprenant = et.id_apprenant
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
         AND i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       WHERE et.id_tentative = $1 AND a.id_utilisateur = $2
         AND et.statut = 'EN_COURS' AND es.statut IN ('PUBLIEE', 'FERMEE')
       FOR UPDATE OF et`;
module.exports.SQL_13 = `SELECT CASE WHEN es.duree_minutes IS NULL THEN NULL
                   ELSE FLOOR(EXTRACT(EPOCH FROM (
                     (et.date_debut + es.duree_minutes * INTERVAL '1 minute')
                     AT TIME ZONE current_setting('TIMEZONE')
                   )) * 1000)::BIGINT
              END AS deadline_epoch_ms,
              FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT AS server_now_epoch_ms
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       WHERE et.id_tentative = $1`;
module.exports.SQL_14 = `INSERT INTO evaluation_tentative (id_evaluation_sujet, id_apprenant)
       VALUES ($1, $2)
       RETURNING id_tentative, id_evaluation_sujet, date_debut, statut`;
module.exports.SQL_15 = `SELECT id_question, id_choix
         FROM evaluation_reponse
         WHERE id_tentative = $1`;
module.exports.SQL_16 = `SELECT et.id_tentative, et.id_evaluation_sujet, et.date_debut, et.statut,
              es.duree_minutes,
              CASE WHEN es.duree_minutes IS NULL THEN NULL
                   ELSE FLOOR(EXTRACT(EPOCH FROM (
                     (et.date_debut + es.duree_minutes * INTERVAL '1 minute')
                     AT TIME ZONE current_setting('TIMEZONE')
                   )) * 1000)::BIGINT
              END AS deadline_epoch_ms,
              FLOOR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT AS server_now_epoch_ms
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       WHERE et.id_evaluation_sujet = $1
         AND et.id_apprenant = $2
         AND et.statut = 'EN_COURS'
       ORDER BY et.date_debut DESC LIMIT 1`;
module.exports.SQL_17 = `SELECT 1
       FROM evaluation_tentative
       WHERE id_evaluation_sujet = $1
         AND id_apprenant = $2
         AND statut = 'TERMINEE'
       LIMIT 1`;
module.exports.SQL_18 = `SELECT es.id_evaluation_sujet, es.duree_minutes, a.id_apprenant
       FROM evaluation_sujet es
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE es.id_evaluation_sujet = $1 AND es.statut IN ('PUBLIEE', 'FERMEE')
         AND (
           es.date_fermeture IS NULL
           OR es.date_fermeture > CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
           OR EXISTS (
             SELECT 1 FROM evaluation_tentative active_attempt
             WHERE active_attempt.id_evaluation_sujet = es.id_evaluation_sujet
               AND active_attempt.id_apprenant = a.id_apprenant
               AND active_attempt.statut = 'EN_COURS'
           )
         )
         AND a.id_utilisateur = $2`;
module.exports.SQL_19 = `SELECT eq.id_question, eq.numero_question, eq.enonce, eq.points,
              COALESCE(json_agg(json_build_object(
                'id_choix', ec.id_choix,
                'libelle', ec.libelle,
                'ordre', ec.ordre
              ) ORDER BY ec.ordre) FILTER (WHERE ec.id_choix IS NOT NULL), '[]') AS choix
       FROM evaluation_question eq
       LEFT JOIN evaluation_choix ec ON ec.id_question = eq.id_question
       WHERE eq.id_evaluation_sujet = $1
       GROUP BY eq.id_question
       ORDER BY eq.numero_question`;
module.exports.SQL_20 = `SELECT es.id_evaluation_sujet, es.id_formation, es.titre, es.description,
              es.duree_minutes, es.obligatoire, es.total_points,
              f.titre AS formation_titre
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE es.id_evaluation_sujet = $1 AND es.statut IN ('PUBLIEE', 'FERMEE')
         AND (
           es.date_fermeture IS NULL
           OR es.date_fermeture > CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
           OR EXISTS (
             SELECT 1 FROM evaluation_tentative active_attempt
             JOIN apprenant active_learner ON active_learner.id_apprenant = active_attempt.id_apprenant
             WHERE active_attempt.id_evaluation_sujet = es.id_evaluation_sujet
               AND active_learner.id_utilisateur = $2
               AND active_attempt.statut = 'EN_COURS'
           )
         )
         AND a.id_utilisateur = $2`;
module.exports.SQL_21 = `SELECT es.id_evaluation_sujet, es.id_formation, es.titre, es.description,
              es.duree_minutes, es.obligatoire, es.total_points, es.date_publication,
              f.titre AS formation_titre,
              (SELECT COUNT(*)::INTEGER FROM evaluation_question eq
               WHERE eq.id_evaluation_sujet = es.id_evaluation_sujet) AS questions_count,
              latest.id_tentative, latest.statut AS tentative_statut,
              latest.note, latest.date_debut, latest.date_fin
       FROM apprenant a
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       ) AND i.statut = 'ACCEPTEE'
       JOIN evaluation_sujet es ON es.id_formation = i.id_formation AND es.statut IN ('PUBLIEE', 'FERMEE')
       JOIN formation f ON f.id_formation = es.id_formation
       LEFT JOIN LATERAL (
         SELECT et.id_tentative, et.statut, et.note, et.date_debut, et.date_fin
         FROM evaluation_tentative et
         WHERE et.id_evaluation_sujet = es.id_evaluation_sujet
           AND et.id_apprenant = a.id_apprenant
         ORDER BY et.date_debut DESC
         LIMIT 1
       ) latest ON TRUE
       WHERE a.id_utilisateur = $1
       ORDER BY es.date_publication DESC, es.id_evaluation_sujet DESC`;
module.exports.SQL_22 = `INSERT INTO evaluation_tentative
       (id_evaluation_sujet, id_apprenant, date_debut, date_fin, note, statut)
       SELECT es.id_evaluation_sujet, a.id_apprenant, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 'TERMINEE'
       FROM evaluation_sujet es
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE a.id_utilisateur = $1
         AND es.statut IN ('PUBLIEE', 'FERMEE')
         AND es.date_fermeture <= CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM evaluation_tentative et
           WHERE et.id_evaluation_sujet = es.id_evaluation_sujet
             AND et.id_apprenant = a.id_apprenant
         )`;
module.exports.SQL_23 = `SELECT f.id_formation, f.titre, f.description, f.statut AS statut_formation,
              f.date_debut, f.date_fin,
              COALESCE(presences.total_seances, 0)::INTEGER AS total_seances,
              COALESCE(presences.presentes, 0)::INTEGER AS presentes,
              COALESCE(presences.absentes, 0)::INTEGER AS absentes,
              COALESCE(notes.evaluations, '[]'::json) AS notes,
              certification.statut::TEXT AS statut_certification,
              certification.date_certification,
              certification.numero_certification,
              certification.fichier_certification
       FROM apprenant a
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       ) AND i.statut = 'ACCEPTEE'
       JOIN formation f ON f.id_formation = i.id_formation
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                )::INTEGER AS total_seances,
                COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                    AND p.statut = 'PRESENT'
                )::INTEGER AS presentes,
                COUNT(*) FILTER (
                  WHERE s.date_seance + s.heure_fin <= LOCALTIMESTAMP
                    AND (p.statut = 'ABSENT' OR p.id_presence IS NULL)
                )::INTEGER AS absentes
         FROM seance s
         LEFT JOIN presence p
           ON p.id_seance = s.id_seance AND p.id_apprenant = a.id_apprenant
         WHERE s.id_formation = f.id_formation
       ) presences ON TRUE
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'id_note', notes.id_note,
                    'type_evaluation', notes.type_evaluation,
                    'note', notes.note,
                    'date_evaluation', notes.date_evaluation,
                    'commentaire', notes.commentaire,
                    'origine', notes.origine
                  )
                  ORDER BY notes.date_evaluation DESC NULLS LAST, notes.id_note DESC
                ) AS evaluations
         FROM (
           SELECT e.id_evaluation AS id_note, e.type_evaluation, e.note,
                  e.date_evaluation, e.commentaire, 'MANUELLE' AS origine
           FROM evaluation e
           WHERE e.id_apprenant = a.id_apprenant
             AND e.id_formation = f.id_formation
             AND e.note IS NOT NULL
           UNION ALL
           SELECT et.id_tentative AS id_note, es.titre AS type_evaluation, et.note,
                  et.date_fin::date AS date_evaluation, NULL::text AS commentaire,
                  'ÉVALUATION' AS origine
           FROM evaluation_tentative et
           JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
           WHERE et.id_apprenant = a.id_apprenant
             AND es.id_formation = f.id_formation
             AND et.note IS NOT NULL
         ) notes
       ) notes ON TRUE
       LEFT JOIN certification
         ON certification.id_apprenant = a.id_apprenant
        AND certification.id_formation = f.id_formation
       WHERE a.id_utilisateur = $1
       ORDER BY f.date_fin DESC, f.id_formation DESC`;
