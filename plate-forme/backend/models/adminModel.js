const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
module.exports.SQL_1 = `
      SELECT 
        u.id_utilisateur, u.email, u.nom, u.prenom, u.telephone, u.age, u.photo_profil,
        u.statut_compte, u.date_creation, u.date_derniere_connexion, u.date_derniere_deconnexion,
        f.specialite,
        r.fonction,
        ap.id_apprenant,
        latest_candidature.formation_titre,
        latest_candidature.motivation,
        latest_candidature.objectif,
        latest_candidature.projet_apres_formation,
        latest_candidature.niveau_etude,
        latest_candidature.situation_professionnelle,
        latest_candidature.etablissement,
        latest_candidature.filiere,
        latest_candidature.statut AS candidature_statut,
        COALESCE(learner_candidatures.candidatures, '[]'::jsonb) AS candidatures,
        CASE 
          WHEN a.id_administrateur IS NOT NULL THEN 'ADMINISTRATEUR'
          WHEN r.id_responsable IS NOT NULL THEN 'RESPONSABLE'
          WHEN f.id_formateur IS NOT NULL THEN 'FORMATEUR'
          WHEN ap.id_apprenant IS NOT NULL THEN 'APPRENANT'
          ELSE 'UTILISATEUR'
        END AS role
      FROM utilisateur u
      LEFT JOIN administrateur a ON u.id_utilisateur = a.id_utilisateur
      LEFT JOIN responsable r ON u.id_utilisateur = r.id_utilisateur
      LEFT JOIN formateur f ON u.id_utilisateur = f.id_utilisateur
      LEFT JOIN apprenant ap ON u.id_utilisateur = ap.id_utilisateur
      LEFT JOIN LATERAL (
        SELECT f.titre AS formation_titre, i.motivation, i.objectif, i.projet_apres_formation,
               c.niveau_etude, c.situation_professionnelle, c.etablissement, c.filiere,
               i.statut
        FROM inscription i
        JOIN candidat c ON c.id_candidat = i.id_candidat
        JOIN formation f ON f.id_formation = i.id_formation
        WHERE c.id_utilisateur = u.id_utilisateur OR LOWER(BTRIM(c.email)) = LOWER(BTRIM(u.email))
        ORDER BY i.date_inscription DESC
        LIMIT 1
      ) latest_candidature ON TRUE
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   'id_inscription', i.id_inscription,
                   'formation_titre', f.titre,
                   'date_inscription', i.date_inscription,
                   'statut', i.statut,
                   'motivation', i.motivation,
                   'objectif', i.objectif,
                   'projet_apres_formation', i.projet_apres_formation,
                   'niveau_etude', c.niveau_etude,
                   'situation_professionnelle', c.situation_professionnelle,
                   'etablissement', c.etablissement,
                   'filiere', c.filiere
                 )
                 ORDER BY i.date_inscription DESC, i.id_inscription DESC
               ) AS candidatures
        FROM inscription i
        JOIN candidat c ON c.id_candidat = i.id_candidat
        JOIN formation f ON f.id_formation = i.id_formation
        WHERE c.id_utilisateur = u.id_utilisateur OR LOWER(BTRIM(c.email)) = LOWER(BTRIM(u.email))
      ) learner_candidatures ON TRUE
      ORDER BY u.id_utilisateur DESC;
    `;
module.exports.SQL_2 = `
      INSERT INTO utilisateur (
        email, nom, prenom, statut_compte, email_verifie,
        jeton_activation_hash, jeton_activation_expiration
      )
      VALUES ($1, $2, $3, 'ACTIF', FALSE, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours')
      RETURNING id_utilisateur;
    `;
module.exports.SQL_3 = `WITH months AS (
        SELECT generated.month_start::DATE AS month_start
         FROM GENERATE_SERIES(
           DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
           DATE_TRUNC('month', CURRENT_DATE),
           INTERVAL '1 month'
        ) AS generated(month_start)
       ),
       monthly_users AS (
         SELECT DATE_TRUNC('month', date_creation)::DATE AS month_start, COUNT(*)::INTEGER AS comptes
         FROM utilisateur
         WHERE date_creation >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY DATE_TRUNC('month', date_creation)
       ),
       monthly_applications AS (
         SELECT DATE_TRUNC('month', date_inscription)::DATE AS month_start, COUNT(*)::INTEGER AS candidatures
         FROM inscription
         WHERE date_inscription >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY DATE_TRUNC('month', date_inscription)
       )
       SELECT TO_CHAR(months.month_start, 'YYYY-MM') AS mois,
              COALESCE(monthly_users.comptes, 0)::INTEGER AS comptes,
              COALESCE(monthly_applications.candidatures, 0)::INTEGER AS candidatures
       FROM months
       LEFT JOIN monthly_users USING (month_start)
       LEFT JOIN monthly_applications USING (month_start)
       ORDER BY months.month_start`;
module.exports.SQL_4 = `SELECT es.id_evaluation_sujet, es.titre AS evaluation_titre,
                f.titre AS formation_titre,
                COALESCE(json_agg(json_build_object(
                  'id_tentative', r.id_tentative,
                  'id_apprenant', r.id_apprenant,
                  'nom', u.nom,
                  'prenom', u.prenom,
                  'note', r.note
                ) ORDER BY r.note DESC, u.nom, u.prenom) FILTER (WHERE r.id_tentative IS NOT NULL), '[]'::json) AS apprenants
         FROM evaluation_sujet es
         JOIN formation f ON f.id_formation = es.id_formation
         LEFT JOIN LATERAL (
           SELECT DISTINCT ON (et.id_apprenant) et.id_tentative, et.id_apprenant, et.note
           FROM evaluation_tentative et
           WHERE et.id_evaluation_sujet = es.id_evaluation_sujet
             AND et.note IS NOT NULL
           ORDER BY et.id_apprenant, et.note DESC NULLS LAST
         ) r ON TRUE
         LEFT JOIN apprenant a ON a.id_apprenant = r.id_apprenant
         LEFT JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         GROUP BY es.id_evaluation_sujet, es.titre, f.titre
         ORDER BY f.titre, es.titre`;
module.exports.SQL_5 = `WITH notes AS (
           SELECT e.id_formation, e.id_apprenant, e.note
           FROM evaluation e
           WHERE e.note IS NOT NULL
           UNION ALL
           SELECT es.id_formation, et.id_apprenant, et.note
           FROM evaluation_tentative et
           JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
           WHERE et.note IS NOT NULL
         ),
         moyennes AS (
           SELECT n.id_formation, n.id_apprenant, AVG(n.note) AS moyenne
           FROM notes n GROUP BY n.id_formation, n.id_apprenant
         )
         SELECT f.id_formation, f.titre AS formation_titre,
                COALESCE(json_agg(json_build_object(
                  'id_apprenant', m.id_apprenant,
                  'nom', u.nom,
                  'prenom', u.prenom,
                  'moyenne', ROUND(m.moyenne, 2)
                ) ORDER BY m.moyenne DESC, u.nom, u.prenom) FILTER (WHERE m.id_apprenant IS NOT NULL), '[]'::json) AS apprenants
         FROM formation f
         LEFT JOIN moyennes m ON m.id_formation = f.id_formation
         LEFT JOIN apprenant a ON a.id_apprenant = m.id_apprenant
         LEFT JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
         GROUP BY f.id_formation, f.titre
         ORDER BY f.titre`;
module.exports.SQL_6 = `SELECT f.id_formation, f.titre,
                ROUND(AVG(fa.note)::NUMERIC, 1) AS note_moyenne,
                COUNT(fa.id_avis)::INTEGER AS avis_count
         FROM formation f
         LEFT JOIN formation_avis fa ON fa.id_formation = f.id_formation
         GROUP BY f.id_formation
         ORDER BY avis_count DESC, note_moyenne DESC NULLS LAST, f.titre`;
module.exports.SQL_7 = `WITH resultats AS (
           SELECT es.id_formation, et.id_tentative, et.note
           FROM evaluation_tentative et
           JOIN evaluation_sujet es ON es.id_evaluation_sujet = et.id_evaluation_sujet
           WHERE et.statut = 'TERMINEE'
         )
         SELECT f.id_formation, f.titre,
                COUNT(r.id_tentative)::INTEGER AS tentatives,
                COUNT(r.id_tentative) FILTER (WHERE r.note >= 10)::INTEGER AS reussites,
                ROUND(AVG(r.note), 1) AS note_moyenne,
                ROUND(100.0 * COUNT(r.id_tentative) FILTER (WHERE r.note >= 10)
                  / NULLIF(COUNT(r.id_tentative), 0), 1) AS taux_reussite
         FROM formation f
         LEFT JOIN resultats r ON r.id_formation = f.id_formation
         GROUP BY f.id_formation
         ORDER BY tentatives DESC, f.titre`;
module.exports.SQL_8 = `SELECT f.id_formation, f.titre,
                COUNT(i.id_inscription)::INTEGER AS candidatures,
                COUNT(i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS acceptees,
                COUNT(i.id_inscription) FILTER (WHERE i.statut = 'EN_ATTENTE')::INTEGER AS en_attente
         FROM formation f
         LEFT JOIN inscription i ON i.id_formation = f.id_formation
         GROUP BY f.id_formation
         ORDER BY candidatures DESC, f.titre`;
module.exports.SQL_9 = `SELECT TO_CHAR(month_start, 'YYYY-MM') AS mois,
                COUNT(f.id_formation)::INTEGER AS formations
         FROM GENERATE_SERIES(
           DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
           DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month'
         ) AS months(month_start)
         LEFT JOIN formation f ON DATE_TRUNC('month', f.date_creation) = month_start
         GROUP BY month_start ORDER BY month_start`;
module.exports.SQL_10 = `SELECT COUNT(*)::INTEGER AS formations,
                COUNT(*) FILTER (WHERE statut = 'ARCHIVEE')::INTEGER AS formations_archivees
         FROM formation
         WHERE statut <> 'BROUILLON'`;
module.exports.SQL_11 = `SELECT COUNT(*)::INTEGER AS utilisateurs,
                COUNT(*) FILTER (WHERE ap.id_apprenant IS NOT NULL)::INTEGER AS apprenants,
                COUNT(*) FILTER (WHERE fo.id_formateur IS NOT NULL)::INTEGER AS formateurs,
                COUNT(*) FILTER (WHERE r.id_responsable IS NOT NULL)::INTEGER AS responsables,
                COUNT(*) FILTER (WHERE ad.id_administrateur IS NOT NULL)::INTEGER AS administrateurs
         FROM utilisateur u
         LEFT JOIN apprenant ap ON ap.id_utilisateur = u.id_utilisateur
         LEFT JOIN formateur fo ON fo.id_utilisateur = u.id_utilisateur
         LEFT JOIN responsable r ON r.id_utilisateur = u.id_utilisateur
         LEFT JOIN administrateur ad ON ad.id_utilisateur = u.id_utilisateur`;
module.exports.SQL_12 = 'ROLLBACK';
module.exports.SQL_13 = 'COMMIT';
module.exports.SQL_14 = `SELECT id_formation, COUNT(*)::INTEGER AS total
         FROM inscription
         WHERE id_formation = ANY($1::integer[]) AND statut = 'ACCEPTEE'
         GROUP BY id_formation`;
module.exports.SQL_15 = `SELECT id_formation, capacite_max
         FROM formation
         WHERE id_formation = ANY($1::integer[])
         FOR UPDATE`;
module.exports.SQL_16 = 'SELECT id_formation FROM formation WHERE id_formation = ANY($1::integer[])';
module.exports.SQL_17 = 'BEGIN';
module.exports.SQL_18 = `SELECT id_formation, titre, statut
       FROM formation
       ORDER BY titre, id_formation`;
module.exports.SQL_19 = 'UPDATE utilisateur SET statut_compte = $1 WHERE id_utilisateur = $2';
module.exports.SQL_20 = 'INSERT INTO formateur (id_utilisateur) VALUES ($1)';
module.exports.SQL_21 = 'INSERT INTO responsable (id_utilisateur) VALUES ($1)';
module.exports.SQL_22 = 'INSERT INTO administrateur (id_utilisateur) VALUES ($1)';
module.exports.SQL_23 = `INSERT INTO utilisateur (email, nom, prenom, telephone, mot_de_passe, statut_compte, email_verifie)
         VALUES ($1, $2, $3, NULLIF($4, ''), $5, 'ACTIF', TRUE)
         RETURNING id_utilisateur`;
