const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params) };
module.exports.SQL_1 = `
  UPDATE utilisateur
  SET password_reset_code_hash = $1,
      password_reset_code_expiration = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
      password_reset_code_requested_at = CURRENT_TIMESTAMP,
      password_reset_code_attempts = 0
  WHERE id_utilisateur = $2
    AND (password_reset_code_requested_at IS NULL
         OR password_reset_code_requested_at < CURRENT_TIMESTAMP - INTERVAL '1 minute')
  RETURNING id_utilisateur
`;
module.exports.SQL_2 = `UPDATE utilisateur
         SET mot_de_passe = $1,
             password_reset_code_hash = NULL,
             password_reset_code_expiration = NULL,
             password_reset_code_requested_at = NULL,
             password_reset_code_attempts = 0
         WHERE id_utilisateur = $2`;
module.exports.SQL_3 = `SELECT mot_de_passe FROM utilisateur
         WHERE id_utilisateur = $1 AND statut_compte = 'ACTIF'`;
module.exports.SQL_4 = `SELECT id_utilisateur, password_reset_code_hash, password_reset_code_expiration,
                password_reset_code_attempts
         FROM utilisateur
         WHERE id_utilisateur = $1 AND statut_compte = 'ACTIF'`;
module.exports.SQL_5 = `SELECT id_utilisateur, email
       FROM utilisateur
       WHERE id_utilisateur = $1
         AND mot_de_passe IS NOT NULL
         AND statut_compte = 'ACTIF'`;
module.exports.SQL_6 = `SELECT id_utilisateur, password_reset_code_hash, password_reset_code_expiration,
              password_reset_code_attempts
       FROM utilisateur
       WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))
         AND statut_compte = 'ACTIF'
         AND COALESCE(email_verifie, TRUE) = TRUE`;
module.exports.SQL_7 = `SELECT id_utilisateur, email
       FROM utilisateur
       WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))
         AND statut_compte = 'ACTIF'
         AND COALESCE(email_verifie, TRUE) = TRUE`;
module.exports.SQL_8 = `UPDATE utilisateur
     SET mot_de_passe = $1,
         password_reset_code_hash = NULL,
         password_reset_code_expiration = NULL,
         password_reset_code_requested_at = NULL,
         password_reset_code_attempts = 0
     WHERE id_utilisateur = $2
       AND password_reset_code_hash = $3
       AND password_reset_code_expiration > CURRENT_TIMESTAMP
       AND password_reset_code_attempts < $4`;
module.exports.SQL_9 = `UPDATE utilisateur
       SET password_reset_code_attempts = LEAST(password_reset_code_attempts + 1, $2)
       WHERE id_utilisateur = $1
         AND password_reset_code_hash = $3
         AND password_reset_code_expiration > CURRENT_TIMESTAMP
         AND password_reset_code_attempts < $2`;
module.exports.SQL_10 = `UPDATE utilisateur
       SET password_reset_code_hash = NULL,
           password_reset_code_expiration = NULL,
           password_reset_code_requested_at = NULL,
           password_reset_code_attempts = 0
       WHERE id_utilisateur = $1 AND password_reset_code_hash = $2`;
