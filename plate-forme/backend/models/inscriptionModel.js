const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), begin: () => db.query('BEGIN'), commit: () => db.query('COMMIT'), rollback: () => db.query('ROLLBACK') };
module.exports.SQL_1 = `
      SELECT 
        i.*, 
        c.nom, c.prenom, i.email_candidat AS email, c.telephone, c.niveau_etude,
        f.titre AS formation_titre
      FROM inscription i
      JOIN candidat c ON i.id_candidat = c.id_candidat
      JOIN formation f ON i.id_formation = f.id_formation
      ORDER BY i.date_inscription DESC;
    `;
module.exports.SQL_2 = 'ROLLBACK';
module.exports.SQL_3 = 'COMMIT';
module.exports.SQL_4 = 'INSERT INTO apprenant (id_utilisateur) VALUES ($1)';
module.exports.SQL_5 = 'SELECT id_apprenant FROM apprenant WHERE id_utilisateur = $1';
module.exports.SQL_6 = 'UPDATE candidat SET id_utilisateur = $1 WHERE id_candidat = $2';
module.exports.SQL_7 = `INSERT INTO utilisateur (email, nom, prenom, mot_de_passe, telephone, age)
           VALUES (LOWER(BTRIM($1)), $2, $3, $4, $5, $6)
           RETURNING id_utilisateur`;
module.exports.SQL_8 = 'SELECT id_utilisateur FROM utilisateur WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))';
module.exports.SQL_9 = 'SELECT c.*, i.email_candidat AS application_email FROM candidat c JOIN inscription i ON i.id_candidat = c.id_candidat WHERE c.id_candidat = $1';
module.exports.SQL_10 = `UPDATE inscription 
       SET statut = $1, motif_decision = $2, date_decision = CURRENT_TIMESTAMP 
       WHERE id_inscription = $3 RETURNING *`;
module.exports.SQL_11 = 'BEGIN';
