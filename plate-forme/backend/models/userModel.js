const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params), connect: () => db.connect() };
module.exports.SQL_1 = `
      SELECT 
        u.id_utilisateur, u.nom, u.prenom, u.email, u.statut_compte, u.date_creation,
        CASE 
          WHEN a.id_administrateur IS NOT NULL THEN 'ADMINISTRATEUR'
          WHEN r.id_responsable IS NOT NULL THEN 'RESPONSABLE'
          WHEN f.id_formateur IS NOT NULL THEN 'FORMATEUR'
          WHEN ap.id_apprenant IS NOT NULL THEN 'APPRENANT'
          ELSE 'UTILISATEUR'
        END AS role,
        f.specialite,
        r.fonction
      FROM utilisateur u
      LEFT JOIN administrateur a ON u.id_utilisateur = a.id_utilisateur
      LEFT JOIN responsable r ON u.id_utilisateur = r.id_utilisateur
      LEFT JOIN formateur f ON u.id_utilisateur = f.id_utilisateur
      LEFT JOIN apprenant ap ON u.id_utilisateur = ap.id_utilisateur
      ORDER BY u.date_creation DESC;
    `;
module.exports.SQL_2 = `
      INSERT INTO utilisateur (nom, prenom, email, mot_de_passe)
      VALUES ($1, $2, $3, $4)
      RETURNING id_utilisateur, nom, prenom, email;
    `;
module.exports.SQL_3 = 'ROLLBACK';
module.exports.SQL_4 = 'COMMIT';
module.exports.SQL_5 = `UPDATE utilisateur SET nom = $1, prenom = $2, email = $3 WHERE id_utilisateur = $4`;
module.exports.SQL_6 = 'BEGIN';
module.exports.SQL_7 = `UPDATE utilisateur 
         SET nom = $1, prenom = $2, telephone = $3, age = $4 
         WHERE id_utilisateur = $5`;
module.exports.SQL_8 = `UPDATE utilisateur 
         SET nom = $1, prenom = $2, telephone = $3, age = $4, photo_profil = $5 
         WHERE id_utilisateur = $6`;
module.exports.SQL_9 = 'DELETE FROM utilisateur WHERE id_utilisateur = $1';
module.exports.SQL_10 = 'DELETE FROM administrateur WHERE id_utilisateur = $1';
module.exports.SQL_11 = 'DELETE FROM responsable WHERE id_utilisateur = $1';
module.exports.SQL_12 = 'DELETE FROM formateur WHERE id_utilisateur = $1';
module.exports.SQL_13 = 'INSERT INTO administrateur (id_utilisateur) VALUES ($1)';
module.exports.SQL_14 = 'INSERT INTO responsable (id_utilisateur, fonction) VALUES ($1, $2)';
module.exports.SQL_15 = 'INSERT INTO formateur (id_utilisateur, specialite) VALUES ($1, $2)';
module.exports.SQL_16 = 'SELECT * FROM utilisateur WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))';
