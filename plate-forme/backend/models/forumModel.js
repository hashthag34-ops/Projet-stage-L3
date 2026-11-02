const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params) };
module.exports.SQL_1 = `
      SELECT m.id_message, m.contenu, m.date_envoi AS created_at, m.id_utilisateur,
             COALESCE(u.nom, m.auteur_nom_archive) AS nom_expediteur,
             COALESCE(u.prenom, m.auteur_prenom_archive) AS prenom
      FROM message m
      LEFT JOIN utilisateur u ON m.id_utilisateur = u.id_utilisateur
      WHERE m.id_forum = $1
      ORDER BY m.date_envoi ASC
    `;
module.exports.SQL_2 = `
      INSERT INTO message (id_forum, id_utilisateur, contenu)
      VALUES ($1, $2, $3)
      RETURNING id_message, date_envoi AS created_at
    `;
module.exports.SQL_3 = `SELECT contenu
       FROM message
       WHERE id_message = $1 AND id_forum = $2`;
module.exports.SQL_4 = 'DELETE FROM message WHERE id_message = $1 AND id_forum = $2';
module.exports.SQL_5 = `SELECT contenu, id_utilisateur FROM message WHERE id_message = $1 AND id_forum = $2`;
module.exports.SQL_6 = 'UPDATE message SET contenu = $1 WHERE id_message = $2 AND id_forum = $3';
module.exports.SQL_7 = 'SELECT nom, prenom FROM utilisateur WHERE id_utilisateur = $1';
module.exports.SQL_8 = `SELECT 1
       FROM forum fo
       JOIN formation_formateur ff ON ff.id_formation = fo.id_formation
       JOIN formateur f ON f.id_formateur = ff.id_formateur
       WHERE fo.id_forum = $1 AND f.id_utilisateur = $2`;
module.exports.SQL_9 = `SELECT 1
     FROM forum fo
     JOIN formation f ON f.id_formation = fo.id_formation
     WHERE fo.id_forum = $1
       AND f.statut NOT IN ('TERMINEE', 'ARCHIVEE')`;
module.exports.SQL_10 = `SELECT fo.id_forum, fo.nom, fo.description, f.id_formation, f.titre AS formation_titre,
              f.statut AS formation_statut
       FROM forum fo
       JOIN formation f ON f.id_formation = fo.id_formation
       ORDER BY f.titre, fo.nom`;
module.exports.SQL_11 = 'SELECT 1 FROM forum WHERE id_forum = $1';
module.exports.SQL_12 = `SELECT 1
       FROM forum fo
       JOIN inscription i ON i.id_formation = fo.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON EXISTS (
         SELECT 1 FROM candidat c
         WHERE c.id_utilisateur = a.id_utilisateur AND c.id_candidat = i.id_candidat
       )
       JOIN formation f ON f.id_formation = fo.id_formation
       WHERE fo.id_forum = $1
         AND a.id_utilisateur = $2
      `;
