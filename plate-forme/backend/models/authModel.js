const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params) };
module.exports.SQL_1 = `
      SELECT 
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
      WHERE u.id_utilisateur = $1;
    `;
module.exports.SQL_2 = `
      SELECT 
        u.id_utilisateur, 
        u.nom, 
        u.prenom, 
        u.email, 
        u.telephone, 
        u.age, 
        u.photo_profil, 
        u.statut_compte, 
        u.qr_code, 
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
      WHERE u.id_utilisateur = $1;
    `;
module.exports.SQL_3 = `
      UPDATE utilisateur 
      SET nom = $1, prenom = $2, telephone = $3, age = $4, photo_profil = $5
      WHERE id_utilisateur = $6
      RETURNING id_utilisateur, nom, prenom, email, telephone, age, photo_profil;
    `;
module.exports.SQL_4 = 'UPDATE utilisateur SET date_derniere_connexion = CURRENT_TIMESTAMP WHERE id_utilisateur = $1';
module.exports.SQL_5 = 'SELECT * FROM utilisateur WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))';
module.exports.SQL_6 = `UPDATE utilisateur AS u
         SET username = $1, mot_de_passe = $2, photo_profil = $3,
             email_verifie = TRUE
         WHERE LOWER(BTRIM(u.email)) = LOWER(BTRIM($4))
           AND u.mot_de_passe IS NULL
           AND EXISTS (
             SELECT 1 FROM apprenant ap
             WHERE ap.id_utilisateur = u.id_utilisateur
           )
         RETURNING u.id_utilisateur, u.email, u.nom, u.prenom, u.username`;
module.exports.SQL_7 = `UPDATE utilisateur
         SET username = $1, mot_de_passe = $2, photo_profil = $3,
             email_verifie = TRUE, jeton_activation_hash = NULL,
             jeton_activation_expiration = NULL
         WHERE jeton_activation_hash = $4
           AND jeton_activation_expiration > CURRENT_TIMESTAMP
           AND mot_de_passe IS NULL
         RETURNING id_utilisateur, email, nom, prenom, username`;
