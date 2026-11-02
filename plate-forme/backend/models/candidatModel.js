const db = require('../config/db');
module.exports = { query: (sql, params) => db.query(sql, params) };
module.exports.SQL_1 = 'ROLLBACK';
module.exports.SQL_2 = 'COMMIT';
module.exports.SQL_3 = `UPDATE inscription SET motivation=$1, objectif=$2, projet_apres_formation=$3, source_information=$4,
       a_deja_suivi_formation=$5, formation_precedente=$6, retour_suggestion=$7 WHERE id_inscription=$8`;
module.exports.SQL_4 = `UPDATE candidat SET nom=$1, prenom=$2, age=$3, genre=$4, telephone=$5, niveau_etude=$6,
       situation_professionnelle=$7, etablissement=$8, filiere=$9 WHERE id_candidat = (SELECT id_candidat FROM inscription WHERE id_inscription = $10)`;
module.exports.SQL_5 = 'BEGIN';
module.exports.SQL_6 = `UPDATE inscription i
       SET statut = 'ANNULEE', date_decision = CURRENT_TIMESTAMP
       FROM candidat c, formation f
       WHERE i.id_candidat = c.id_candidat
         AND i.id_formation = f.id_formation
         AND i.id_inscription = $1
         AND LOWER(BTRIM(i.email_candidat)) = LOWER(BTRIM($2))
         AND i.statut = 'EN_ATTENTE'
         AND f.date_limite_inscription >= CURRENT_DATE
       RETURNING i.id_inscription, i.id_formation`;
module.exports.SQL_7 = `SELECT nom, prenom, age, genre, telephone, niveau_etude,
              situation_professionnelle, etablissement, filiere
       FROM candidat WHERE LOWER(email) = LOWER($1)
       ORDER BY date_creation DESC
       LIMIT 1`;
module.exports.SQL_8 = `INSERT INTO inscription (
        id_candidat, id_formation, email_candidat, motivation, objectif, projet_apres_formation, 
        source_information, a_deja_suivi_formation, formation_precedente, retour_suggestion, conditions_acceptees
      ) VALUES ($1, $2, LOWER(BTRIM($11)), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
module.exports.SQL_9 = 'SELECT EXISTS (SELECT 1 FROM inscription WHERE id_candidat = $1) AS deja_suivi';
module.exports.SQL_10 = `SELECT i.id_inscription
       FROM inscription i
       WHERE i.id_formation = $1 AND LOWER(BTRIM(i.email_candidat)) = LOWER(BTRIM($2))
       LIMIT 1`
module.exports.SQL_11 = `INSERT INTO candidat (
         id_utilisateur, email, nom, prenom, age, genre, telephone,
         niveau_etude, situation_professionnelle, etablissement, filiere
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id_candidat`;
module.exports.SQL_12 = 'SELECT id_utilisateur FROM utilisateur WHERE id_utilisateur = $1 AND LOWER(BTRIM(email)) = LOWER(BTRIM($2))';
module.exports.SQL_13 = `SELECT titre, date_limite_inscription FROM formation
       WHERE id_formation = $1 AND statut = 'OUVERTE'`;
module.exports.SQL_14 = `SELECT i.id_inscription, i.id_formation, i.statut, i.motivation, i.objectif,
            i.projet_apres_formation, i.source_information, i.a_deja_suivi_formation,
            i.formation_precedente, i.retour_suggestion, i.conditions_acceptees,
            i.email_candidat AS email, c.nom, c.prenom, c.age, c.genre, c.telephone,
            c.niveau_etude, c.situation_professionnelle, c.etablissement, c.filiere,
            f.titre AS formation_titre, f.date_limite_inscription
     FROM inscription i
     JOIN candidat c ON c.id_candidat = i.id_candidat
     JOIN formation f ON f.id_formation = i.id_formation
     WHERE i.id_inscription = $1 AND LOWER(BTRIM(i.email_candidat)) = LOWER(BTRIM($2))`;
