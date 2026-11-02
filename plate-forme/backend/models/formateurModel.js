const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params) };
module.exports.SQL_1 = `SELECT id_seance FROM seance
    WHERE date_seance = $1 AND LOWER(salle) = LOWER($2)
      AND (heure_debut < $3 AND heure_fin > $4)`;
module.exports.SQL_2 = `SELECT fo.id_forum, fo.nom, fo.description, f.id_formation, f.titre AS formation_titre,
              f.statut AS formation_statut
       FROM forum fo
       JOIN formation f ON f.id_formation = fo.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       WHERE ff.id_formateur = $1 ORDER BY f.titre`;
module.exports.SQL_3 = 'ROLLBACK';
module.exports.SQL_4 = 'COMMIT';
module.exports.SQL_5 = `DELETE FROM evaluation_sujet
       WHERE id_evaluation_sujet = $1 AND id_formateur = $2
       RETURNING id_evaluation_sujet`;
module.exports.SQL_6 = `DELETE FROM evaluation WHERE id_evaluation_sujet = $1`;
module.exports.SQL_7 = 'BEGIN';
module.exports.SQL_8 = `SELECT id_evaluation_sujet FROM evaluation_sujet
       WHERE id_evaluation_sujet = $1 AND id_formateur = $2`;
module.exports.SQL_9 = `SELECT et.id_tentative, et.id_evaluation_sujet, et.id_apprenant,
              et.note, et.statut, et.date_debut, et.date_fin,
              u.nom, u.prenom, u.email, es.titre AS evaluation_titre,
              f.titre AS formation_titre,
              COALESCE((
                SELECT json_agg(
                         json_build_object(
                           'id_question', eq.id_question,
                           'numero_question', eq.numero_question,
                           'enonce', eq.enonce,
                           'points', eq.points,
                           'reponse_choisie', selected.libelle,
                           'reponse_correcte', correct.libelle,
                           'correcte', COALESCE(selected.est_correct, FALSE),
                           'points_obtenus', COALESCE(er.points_obtenus, 0)
                         )
                         ORDER BY eq.numero_question
                       )
                FROM evaluation_question eq
                LEFT JOIN evaluation_reponse er
                  ON er.id_question = eq.id_question AND er.id_tentative = et.id_tentative
                LEFT JOIN evaluation_choix selected ON selected.id_choix = er.id_choix
                LEFT JOIN LATERAL (
                  SELECT ec.libelle, ec.est_correct
                  FROM evaluation_choix ec
                  WHERE ec.id_question = eq.id_question AND ec.est_correct = TRUE
                  ORDER BY ec.ordre
                  LIMIT 1
                ) correct ON TRUE
                WHERE eq.id_evaluation_sujet = es.id_evaluation_sujet
              ), '[]'::json) AS correction
       FROM evaluation_tentative et
       JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       JOIN apprenant a ON a.id_apprenant = et.id_apprenant
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       WHERE es.id_formateur = $1 AND ff.id_formateur = $1
       ORDER BY et.date_debut DESC`;
module.exports.SQL_10 = `INSERT INTO evaluation_tentative
       (id_evaluation_sujet, id_apprenant, date_debut, date_fin, note, statut)
       SELECT es.id_evaluation_sujet, a.id_apprenant, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 'TERMINEE'
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN inscription i ON i.id_formation = es.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE es.id_formateur = $1
         AND es.statut IN ('PUBLIEE', 'FERMEE')
         AND es.date_fermeture <= CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM evaluation_tentative et
           WHERE et.id_evaluation_sujet = es.id_evaluation_sujet
             AND et.id_apprenant = a.id_apprenant
         )`;
module.exports.SQL_11 = `DELETE FROM evaluation_question eq
       USING evaluation_sujet es
       WHERE eq.id_question = $1 AND eq.id_evaluation_sujet = es.id_evaluation_sujet
         AND es.id_formateur = $2
         AND es.statut = 'BROUILLON'`;
module.exports.SQL_12 = `UPDATE evaluation_sujet
       SET statut = CASE WHEN $4::TIMESTAMP IS NOT NULL THEN 'BROUILLON'::statut_evaluation ELSE $1::statut_evaluation END,
           date_publication = CASE
             WHEN $4::TIMESTAMP IS NOT NULL THEN $4::TIMESTAMP
             WHEN $1 = 'PUBLIEE' THEN CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
             ELSE date_publication
           END,
           date_modification = CURRENT_TIMESTAMP
       WHERE id_evaluation_sujet = $2
         AND id_formateur = $3
         AND (
           ($4::TIMESTAMP IS NOT NULL AND statut = 'BROUILLON'
             AND NOT EXISTS (
               SELECT 1 FROM evaluation_tentative et
               WHERE et.id_evaluation_sujet = evaluation_sujet.id_evaluation_sujet
             ))
           OR ($4::TIMESTAMP IS NULL AND $1 = 'PUBLIEE' AND statut = 'BROUILLON'
             AND NOT EXISTS (
               SELECT 1 FROM evaluation_tentative et
               WHERE et.id_evaluation_sujet = evaluation_sujet.id_evaluation_sujet
             )
             AND EXISTS (
               SELECT 1 FROM evaluation_question eq
               WHERE eq.id_evaluation_sujet = evaluation_sujet.id_evaluation_sujet
             ))
           OR ($4::TIMESTAMP IS NULL AND $1 = 'FERMEE' AND statut = 'PUBLIEE')
         )
       RETURNING *`;
module.exports.SQL_13 = `UPDATE evaluation_sujet
       SET titre = $1, description = $2, duree_minutes = $3,
           obligatoire = $4, date_fermeture = $5, date_modification = CURRENT_TIMESTAMP
       WHERE id_evaluation_sujet = $6 AND id_formateur = $7 AND statut = 'BROUILLON'
       RETURNING *`;
module.exports.SQL_14 = `INSERT INTO evaluation_choix (id_question, libelle, est_correct, ordre)
         VALUES ($1, $2, $3, $4)`;
module.exports.SQL_15 = `INSERT INTO evaluation_question (id_evaluation_sujet, numero_question, enonce, points)
       VALUES ($1, $2, $3, $4) RETURNING *`;
module.exports.SQL_16 = 'SELECT COALESCE(MAX(numero_question), 0) + 1 AS numero FROM evaluation_question WHERE id_evaluation_sujet = $1';
module.exports.SQL_17 = `SELECT id_evaluation_sujet
       FROM evaluation_sujet
       WHERE id_evaluation_sujet = $1 AND id_formateur = $2 AND statut = 'BROUILLON'`;
module.exports.SQL_18 = `SELECT eq.id_question, eq.numero_question, eq.enonce, eq.points,
              COALESCE(json_agg(json_build_object(
                'id_choix', ec.id_choix,
                'libelle', ec.libelle,
                'est_correct', ec.est_correct,
                'ordre', ec.ordre
              ) ORDER BY ec.ordre) FILTER (WHERE ec.id_choix IS NOT NULL), '[]') AS choix
       FROM evaluation_question eq
       LEFT JOIN evaluation_choix ec ON ec.id_question = eq.id_question
       WHERE eq.id_evaluation_sujet = $1
       GROUP BY eq.id_question
       ORDER BY eq.numero_question`;
module.exports.SQL_19 = `SELECT es.*, f.titre AS formation_titre,
              to_char(es.date_publication, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date_publication_utc,
              to_char(es.date_fermeture, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date_fermeture_utc
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       WHERE es.id_evaluation_sujet = $1 AND es.id_formateur = $2`;
module.exports.SQL_20 = `INSERT INTO evaluation_sujet
       (id_formation, id_formateur, titre, description, duree_minutes, obligatoire, date_fermeture)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`;
module.exports.SQL_21 = `SELECT es.id_evaluation_sujet, es.id_formation, es.titre, es.description,
              es.duree_minutes, es.obligatoire, es.statut, es.total_points,
              es.date_creation, es.date_publication, es.date_fermeture, f.titre AS formation_titre,
              to_char(es.date_publication, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date_publication_utc,
              to_char(es.date_fermeture, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date_fermeture_utc,
              COUNT(DISTINCT eq.id_question)::INTEGER AS questions_count,
              COUNT(DISTINCT et.id_tentative)::INTEGER AS tentatives_count
       FROM evaluation_sujet es
       JOIN formation f ON f.id_formation = es.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       LEFT JOIN evaluation_question eq ON eq.id_evaluation_sujet = es.id_evaluation_sujet
       LEFT JOIN evaluation_tentative et ON et.id_evaluation_sujet = es.id_evaluation_sujet
       WHERE es.id_formateur = $1 AND ff.id_formateur = $1
       GROUP BY es.id_evaluation_sujet, f.titre
       ORDER BY es.date_creation DESC`;
module.exports.SQL_22 = `WITH affectations AS (
         SELECT DISTINCT a.id_apprenant, a.id_utilisateur, u.nom, u.prenom, u.email,
                         f.id_formation, f.titre AS formation_titre
         FROM apprenant a
         JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         JOIN inscription i ON EXISTS (
           SELECT 1 FROM candidat c
           WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
         ) AND i.statut = 'ACCEPTEE'
         JOIN formation f ON f.id_formation = i.id_formation
         JOIN formation_formateur ff ON ff.id_formation = f.id_formation
         WHERE ff.id_formateur = $1
       ),
       suivi AS (
         SELECT af.*, COUNT(p.id_presence) FILTER (WHERE p.statut = 'PRESENT')::INTEGER AS presents,
                COUNT(p.id_presence) FILTER (WHERE p.statut = 'ABSENT')::INTEGER AS absents,
                COUNT(s.id_seance)::INTEGER AS total_seances
         FROM affectations af
         LEFT JOIN seance s ON s.id_formation = af.id_formation
         LEFT JOIN presence p ON p.id_seance = s.id_seance AND p.id_apprenant = af.id_apprenant
         GROUP BY af.id_apprenant, af.id_utilisateur, af.nom, af.prenom, af.email,
                  af.id_formation, af.formation_titre
       )
       SELECT *, CASE WHEN total_seances = 0 THEN 0
                      ELSE ROUND(100.0 * presents / total_seances, 1)
                 END AS taux_presence
       FROM suivi
       ORDER BY formation_titre, nom, prenom`;
module.exports.SQL_23 = `SELECT s.id_seance, s.id_formation, s.titre AS seance_titre,
              s.date_seance, s.heure_debut, s.heure_fin, f.titre AS formation_titre,
              COUNT(p.id_presence)::INTEGER AS total_enregistres,
              COUNT(p.id_presence) FILTER (WHERE p.statut = 'PRESENT')::INTEGER AS presents,
              COUNT(p.id_presence) FILTER (WHERE p.statut = 'ABSENT')::INTEGER AS absents,
              CASE WHEN COUNT(p.id_presence) = 0 THEN 0
                   ELSE                    ROUND(100.0 * COUNT(p.id_presence) FILTER (WHERE p.statut = 'PRESENT') / COUNT(p.id_presence), 1)
              END AS taux_presence
       FROM seance s
       JOIN formation f ON f.id_formation = s.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       LEFT JOIN presence p ON p.id_seance = s.id_seance
       WHERE ff.id_formateur = $1
       GROUP BY s.id_seance, f.id_formation, f.titre
       ORDER BY s.date_seance DESC, s.heure_debut DESC`;
module.exports.SQL_24 = `WITH formations AS (
         SELECT f.id_formation, f.titre
         FROM formation f
         JOIN formation_formateur ff ON ff.id_formation = f.id_formation
         WHERE ff.id_formateur = $1
       ),
       notes AS (
         SELECT e.id_formation, e.id_apprenant, e.note
         FROM evaluation e
         JOIN formations f ON f.id_formation = e.id_formation
         WHERE e.note IS NOT NULL
         UNION ALL
         SELECT es.id_formation, et.id_apprenant, et.note
         FROM evaluation_tentative et
         JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
         JOIN formations f ON f.id_formation = es.id_formation
         WHERE et.note IS NOT NULL
       ),
       moyennes AS (
         SELECT id_formation, id_apprenant, AVG(note) AS moyenne
         FROM notes
         GROUP BY id_formation, id_apprenant
       ),
       resultats AS (
         SELECT id_formation,
                ROUND(100.0 * COUNT(*) FILTER (WHERE moyenne >= 10)
                  / NULLIF(COUNT(*), 0), 1) AS taux_reussite
         FROM moyennes
         GROUP BY id_formation
       ),
       presences AS (
         SELECT s.id_formation,
                COUNT(p.id_presence)::INTEGER AS total,
                COUNT(p.id_presence) FILTER (WHERE p.statut = 'PRESENT')::INTEGER AS presents,
                COUNT(p.id_presence) FILTER (WHERE p.statut = 'ABSENT')::INTEGER AS absents
         FROM seance s
         JOIN formations f ON f.id_formation = s.id_formation
         LEFT JOIN presence p ON p.id_seance = s.id_seance
         GROUP BY s.id_formation
       )
       SELECT f.id_formation, f.titre AS formation_titre,
              COALESCE(r.taux_reussite, 0)::NUMERIC AS taux_reussite,
              COALESCE(p.total, 0)::INTEGER AS total_presences,
              COALESCE(p.presents, 0)::INTEGER AS presents,
              COALESCE(p.absents, 0)::INTEGER AS absents,
              CASE WHEN COALESCE(p.total, 0) = 0 THEN 0
                ELSE ROUND(100.0 * p.presents / p.total, 1) END AS taux_presence,
              CASE WHEN COALESCE(p.total, 0) = 0 THEN 0
                ELSE ROUND(100.0 * p.absents / p.total, 1) END AS taux_absence
       FROM formations f
       LEFT JOIN resultats r ON r.id_formation = f.id_formation
       LEFT JOIN presences p ON p.id_formation = f.id_formation
       ORDER BY f.titre`;
module.exports.SQL_25 = `INSERT INTO evaluation (id_apprenant, id_formation, id_formateur, type_evaluation, note, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_evaluation AS id_note, type_evaluation, note, date_evaluation, commentaire`;
module.exports.SQL_26 = `SELECT 1 FROM apprenant a
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       WHERE a.id_apprenant = $1 AND i.id_formation = $2 AND i.statut = 'ACCEPTEE'`;
module.exports.SQL_27 = `SELECT COUNT(p.id_presence)::INTEGER AS total,
                COUNT(p.id_presence) FILTER (WHERE p.statut = 'PRESENT')::INTEGER AS present,
                COUNT(p.id_presence) FILTER (WHERE p.statut = 'ABSENT')::INTEGER AS absent
         FROM presence p
         JOIN seance s ON s.id_seance = p.id_seance
         WHERE p.id_apprenant = $1 AND s.id_formation = $2`;
module.exports.SQL_28 = `SELECT e.id_evaluation AS id_note, e.type_evaluation, e.note,
                e.date_evaluation, e.commentaire, 'MANUELLE' AS origine
         FROM evaluation e
         WHERE e.id_apprenant = $1 AND e.id_formation = $2 AND e.note IS NOT NULL
         UNION ALL
         SELECT et.id_tentative AS id_note, es.titre AS type_evaluation, et.note,
                et.date_fin::date AS date_evaluation, NULL::text AS commentaire,
                'ÉVALUATION' AS origine
         FROM evaluation_tentative et
         JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
         WHERE et.id_apprenant = $1 AND es.id_formation = $2 AND et.note IS NOT NULL
         ORDER BY date_evaluation DESC NULLS LAST, id_note DESC`;
module.exports.SQL_29 = `SELECT a.id_apprenant, u.nom, u.prenom, u.email, u.telephone,
              f.id_formation, f.titre AS formation_titre
       FROM apprenant a
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       JOIN formation f ON f.id_formation = i.id_formation
       WHERE a.id_apprenant = $1 AND f.id_formation = $2 AND i.statut = 'ACCEPTEE'`;
module.exports.SQL_30 = `SELECT DISTINCT a.id_apprenant, u.id_utilisateur, u.nom, u.prenom, u.email,
              u.telephone, f.id_formation, f.titre AS formation_titre,
              i.statut AS inscription_statut
       FROM apprenant a
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       JOIN inscription i ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       ) AND i.statut = 'ACCEPTEE'
       JOIN formation f ON f.id_formation = i.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       WHERE ff.id_formateur = $1
       ORDER BY f.titre, u.nom, u.prenom`;
module.exports.SQL_31 = `DELETE FROM seance s USING formation_formateur ff
       WHERE s.id_seance = $1 AND ff.id_formation = s.id_formation AND ff.id_formateur = $2`;
module.exports.SQL_32 = `SELECT s.id_seance, s.date_seance, COUNT(p.id_presence)::INTEGER AS total_presences
       FROM seance s
       JOIN formation_formateur ff ON ff.id_formation = s.id_formation
       LEFT JOIN presence p ON p.id_seance = s.id_seance
       WHERE s.id_seance = $1 AND ff.id_formateur = $2
       GROUP BY s.id_seance, s.date_seance`;
module.exports.SQL_33 = `UPDATE seance SET id_formation = $1, titre = $2, description = $3, date_seance = $4,
       heure_debut = $5, heure_fin = $6, type_seance = $7, salle = $8
       WHERE id_seance = $9 RETURNING *`;
module.exports.SQL_34 = `SELECT s.id_seance FROM seance s JOIN formation_formateur ff ON ff.id_formation = s.id_formation
       WHERE s.id_seance = $1 AND ff.id_formateur = $2`;
module.exports.SQL_35 = `INSERT INTO seance (id_formation, titre, description, date_seance, heure_debut, heure_fin, type_seance, salle)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
module.exports.SQL_36 = `SELECT f.date_debut, f.date_fin
     FROM formation f
     JOIN formation_formateur ff ON ff.id_formation = f.id_formation
     WHERE ff.id_formateur = $1 AND f.id_formation = $2`;
module.exports.SQL_37 = `SELECT s.id_seance, s.id_formation, s.titre, s.description,
              s.date_seance, s.heure_debut, s.heure_fin, s.type_seance, s.salle,
              f.titre AS formation_titre,
              COUNT(p.id_presence)::INTEGER AS total_presences
       FROM seance s
       JOIN formation f ON f.id_formation = s.id_formation
       JOIN formation_formateur ff ON ff.id_formation = f.id_formation
       LEFT JOIN presence p ON p.id_seance = s.id_seance
       WHERE ff.id_formateur = $1
         AND ($2::INTEGER IS NULL OR s.id_formation = $2::INTEGER)
       GROUP BY s.id_seance, f.id_formation, f.titre
       ORDER BY s.date_seance ASC, s.heure_debut ASC`;
module.exports.SQL_38 = `SELECT f.id_formation, f.titre, f.description, f.image_url, f.date_debut,
              f.date_fin, f.statut, ff.role_formateur,
              COUNT(DISTINCT i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS apprenants_count
       FROM formation_formateur ff
       JOIN formation f ON f.id_formation = ff.id_formation
       LEFT JOIN inscription i ON i.id_formation = f.id_formation
       WHERE ff.id_formateur = $1
       GROUP BY f.id_formation, ff.role_formateur
       ORDER BY f.date_debut DESC`;
module.exports.SQL_39 = `SELECT f.*
     FROM formation f
     JOIN formation_formateur ff ON ff.id_formation = f.id_formation
     WHERE ff.id_formateur = $1 AND f.id_formation = $2`;
module.exports.SQL_40 = 'SELECT id_formateur FROM formateur WHERE id_utilisateur = $1';
