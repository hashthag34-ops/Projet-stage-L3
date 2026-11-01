// backend/controllers/formationController.js
const db = require('../config/db');
const { emitRealtimeEvent } = require('../services/realtime');

exports.uploadFormationImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucune image reçue.' });
  }

  res.status(201).json({
    url: `/uploads/formations/${req.file.filename}`,
  });
};

exports.getCatalogue = async (req, res) => {
  try {
    const userId = req.user ? req.user.id_utilisateur : null;

    const query = `
      SELECT 
        f.id_formation,
        f.titre,
        f.description,
        f.statut,
        f.date_debut,
        f.date_fin,
        f.date_limite_inscription,
        f.capacite_max,
        f.image_url,

        COUNT(i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE')::INTEGER AS inscrits_count,
        CASE 
          WHEN f.capacite_max IS NOT NULL AND COUNT(i.id_inscription) FILTER (WHERE i.statut = 'ACCEPTEE') >= f.capacite_max 
          THEN TRUE 
          ELSE FALSE 
        END AS est_complete,
        c_user.statut_candidature,
        COALESCE(c_user.est_apprenant, FALSE) AS est_apprenant,
        c_user.id_apprenant,
        COALESCE(ratings.note_moyenne, 0) AS note_moyenne,
        COALESCE(ratings.avis_count, 0) AS avis_count,
        (user_review.id_avis IS NOT NULL) AS avis_deja_depose
      FROM formation f 
      LEFT JOIN (
        SELECT 
          i.id_formation,
          i.statut AS statut_candidature,
          a.id_apprenant,
          CASE 
            WHEN a.id_apprenant IS NOT NULL AND i.statut = 'ACCEPTEE' THEN TRUE 
            ELSE FALSE 
          END AS est_apprenant
        FROM inscription i
        JOIN candidat c ON i.id_candidat = c.id_candidat
        LEFT JOIN utilisateur u ON c.email = u.email
        LEFT JOIN apprenant a ON u.id_utilisateur = a.id_utilisateur AND a.id_candidat = c.id_candidat
        WHERE u.id_utilisateur = $1
      ) c_user ON f.id_formation = c_user.id_formation

      LEFT JOIN (
        SELECT id_formation, ROUND(AVG(note)::NUMERIC, 1) AS note_moyenne,
               COUNT(*)::INTEGER AS avis_count
        FROM formation_avis
        GROUP BY id_formation
      ) ratings ON ratings.id_formation = f.id_formation

      LEFT JOIN formation_avis user_review
        ON user_review.id_formation = f.id_formation
       AND user_review.id_apprenant = c_user.id_apprenant

      LEFT JOIN inscription i ON f.id_formation = i.id_formation

      WHERE f.statut <> 'BROUILLON'

      GROUP BY 
        f.id_formation, 
        c_user.statut_candidature, 
        c_user.est_apprenant,
        c_user.id_apprenant,
        ratings.note_moyenne,
        ratings.avis_count,
        user_review.id_avis

      ORDER BY f.date_debut DESC;
    `;

    const { rows } = await db.query(query, [userId]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération du catalogue :', error);
    return res.status(500).json({
      message: 'Une erreur serveur est survenue lors du chargement du catalogue.',
      error: error.message
    });
  }
};

exports.getFormationAvis = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT fa.id_avis, fa.note, fa.commentaire, fa.date_creation,
              u.prenom || ' ' || LEFT(u.nom, 1) || '.' AS auteur
       FROM formation_avis fa
       JOIN apprenant a ON a.id_apprenant = fa.id_apprenant
       JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
       JOIN formation f ON f.id_formation = fa.id_formation
       WHERE fa.id_formation = $1 AND f.statut IN ('TERMINEE', 'ARCHIVEE')
       ORDER BY fa.date_creation DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur chargement avis formation :', error);
    res.status(500).json({ message: 'Impossible de charger les avis.' });
  }
};

exports.getAvisEnAttente = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT f.id_formation, f.titre, f.description, f.statut
       FROM formation f
       JOIN inscription i ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE a.id_utilisateur = $1
         AND f.statut IN ('TERMINEE', 'ARCHIVEE')
         AND NOT EXISTS (
           SELECT 1
           FROM formation_avis fa
           WHERE fa.id_formation = f.id_formation
             AND fa.id_apprenant = a.id_apprenant
         )
       ORDER BY f.titre`,
      [req.user.id_utilisateur]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur chargement des avis en attente :', error);
    return res.status(500).json({ message: 'Impossible de charger les formations à noter.' });
  }
};

exports.createFormationAvis = async (req, res) => {
  const note = Number(req.body.note);
  const commentaire = typeof req.body.commentaire === 'string' ? req.body.commentaire.trim() : '';
  if (!Number.isInteger(note) || note < 1 || note > 5 || !commentaire || commentaire.length > 2000) {
    return res.status(400).json({ message: 'Saisissez une note de 1 à 5 étoiles et un commentaire de 1 à 2000 caractères.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO formation_avis (id_formation, id_apprenant, note, commentaire)
       SELECT f.id_formation, a.id_apprenant, $3, $4
       FROM formation f
       JOIN inscription i ON i.id_formation = f.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE f.id_formation = $1 AND a.id_utilisateur = $2 AND f.statut IN ('TERMINEE', 'ARCHIVEE')
       RETURNING id_avis, id_formation, note, commentaire, date_creation`,
      [req.params.id, req.user.id_utilisateur, note, commentaire]
    );
    if (!rows[0]) return res.status(403).json({ message: 'Seuls les apprenants inscrits peuvent noter une formation terminée.' });
    emitRealtimeEvent('formations:changed', {});
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Vous avez déjà publié un avis pour cette formation.' });
    console.error('Erreur création avis formation :', error);
    res.status(500).json({ message: 'Impossible de publier cet avis.' });
  }
};

// 1. Obtenir toutes les formations publiques (Statut = OUVERTE)
exports.getFormationsPubliques = async (req, res) => {
  try {
    const query = `
      SELECT * FROM formation WHERE statut = 'OUVERTE' 
      ORDER BY date_debut ASC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getFormationsPubliques :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des formations" });
  }
};

// 2. Obtenir TOUTES les formations (Espace Responsable / Admin)
exports.getAllFormations = async (req, res) => {
  try {
    const query = `SELECT * FROM formation ORDER BY date_creation DESC;`;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getAllFormations :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 3. Obtenir une formation par son ID
exports.getFormationById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM formation WHERE id_formation = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Formation non trouvée" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Erreur getFormationById :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 4. Créer une nouvelle formation (Responsable)
exports.createFormation = async (req, res) => {
  const { 
    titre, 
    description, 
    image_url, 
    date_debut, 
    date_fin, 
    date_limite_inscription, 
    capacite_max, 
    statut 
  } = req.body;

  try {
    const query = `
      WITH nouvelle_formation AS (
        INSERT INTO formation (
          titre, description, image_url, date_debut, date_fin,
          date_limite_inscription, capacite_max, statut
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      ), nouveau_forum AS (
        INSERT INTO forum (id_formation, nom, description)
        SELECT id_formation, 'Forum ' || titre,
               'Espace de discussion pour la formation ' || titre || '.'
        FROM nouvelle_formation
        RETURNING id_forum
      )
      SELECT * FROM nouvelle_formation;
    `;
    const values = [
      titre, 
      description, 
      image_url || null, 
      date_debut, 
      date_fin, 
      date_limite_inscription, 
      capacite_max, 
      statut || 'BROUILLON'
    ];

    const { rows } = await db.query(query, values);
    emitRealtimeEvent('formations:changed', {});
    res.status(201).json({ message: "Formation créée avec succès !", formation: rows[0] });
  } catch (error) {
    console.error("Erreur createFormation :", error);
    res.status(500).json({ message: "Erreur lors de la création de la formation" });
  }
};

// 5. Mettre à jour une formation (Responsable)
exports.updateFormation = async (req, res) => {
  const { id } = req.params;
  const { confirm_delete_sessions = false } = req.body;
  const client = await db.connect();
  const dateOnly = (value) => value ? String(value).slice(0, 10) : null;

  try {
    await client.query('BEGIN');
    const currentResult = await client.query('SELECT * FROM formation WHERE id_formation = $1 FOR UPDATE', [id]);
    if (!currentResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Formation non trouvée" });
    }
    const current = currentResult.rows[0];
    const status = current.statut;
    if (status === 'ARCHIVEE') {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "Une formation archivée ne peut plus être modifiée." });
    }

    const next = {
      titre: req.body.titre ?? current.titre,
      description: req.body.description ?? current.description,
      image_url: req.body.image_url ?? current.image_url,
      date_debut: dateOnly(req.body.date_debut ?? current.date_debut),
      date_fin: dateOnly(req.body.date_fin ?? current.date_fin),
      date_limite_inscription: dateOnly(req.body.date_limite_inscription ?? current.date_limite_inscription),
      capacite_max: req.body.capacite_max === undefined ? current.capacite_max : Number(req.body.capacite_max),
      statut: req.body.statut ?? current.statut,
    };

    let forbiddenFields = [];
    if (status === 'EN_COURS') {
      forbiddenFields = ['date_debut', 'date_limite_inscription', 'capacite_max', 'statut'];
    } else if (status === 'TERMINEE') {
      forbiddenFields = ['date_debut', 'date_fin', 'date_limite_inscription', 'capacite_max', 'statut'];
    } else if (!['BROUILLON', 'OUVERTE'].includes(status)) {
      forbiddenFields = ['date_debut', 'date_fin', 'date_limite_inscription', 'capacite_max', 'statut'];
    }
    const changedForbiddenField = forbiddenFields.find((field) => {
      if (req.body[field] === undefined) return false;
      return String(req.body[field]).slice(0, 10) !== String(field === 'capacite_max' ? current[field] : current[field] ?? '').slice(0, 10);
    });
    if (changedForbiddenField) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "Certains champs ne peuvent pas être modifiés avec le statut actuel de la formation." });
    }

    if (!next.titre?.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Le titre de la formation est obligatoire." });
    }
    if (!next.date_debut || !next.date_fin || next.date_fin < next.date_debut) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "La date de fin doit être postérieure ou égale à la date de début." });
    }
    if (!next.date_limite_inscription || next.date_limite_inscription > next.date_debut) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "La limite des candidatures doit précéder ou égaler la date de début." });
    }
    if (!Number.isInteger(next.capacite_max) || next.capacite_max < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "La capacité maximale doit être un nombre entier supérieur à zéro." });
    }
    if (['BROUILLON', 'OUVERTE'].includes(status)
      && !['BROUILLON', 'OUVERTE', 'EN_COURS', 'TERMINEE', 'FERMEE', 'ARCHIVEE'].includes(next.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Statut de formation invalide." });
    }

    if (status !== 'TERMINEE') {
      const incompatibleSessions = await client.query(
        `SELECT id_seance, titre, date_seance FROM seance
         WHERE id_formation = $1 AND (date_seance::date < $2::date OR date_seance::date > $3::date)
         ORDER BY date_seance`,
        [id, next.date_debut, next.date_fin]
      );
      if (incompatibleSessions.rows.length && !confirm_delete_sessions) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          code: 'SESSIONS_OUT_OF_RANGE',
          message: `${incompatibleSessions.rows.length} séance(s) seraient hors de la nouvelle période.`,
          incompatible_sessions: incompatibleSessions.rows,
        });
      }
      if (incompatibleSessions.rows.length && confirm_delete_sessions) {
        await client.query(
          `DELETE FROM seance WHERE id_formation = $1
           AND (date_seance::date < $2::date OR date_seance::date > $3::date)`,
          [id, next.date_debut, next.date_fin]
        );
      }
    }

    const { rows } = await client.query(
      `UPDATE formation SET titre = $1, description = $2, image_url = $3,
        date_debut = $4, date_fin = $5, date_limite_inscription = $6,
        capacite_max = $7, statut = $8, date_modification = CURRENT_TIMESTAMP
       WHERE id_formation = $9 RETURNING *`,
      [next.titre.trim(), next.description, next.image_url || null, next.date_debut, next.date_fin,
       next.date_limite_inscription, next.capacite_max, next.statut, id]
    );
    await client.query(
      `UPDATE forum SET nom = 'Forum ' || $1, description = 'Espace de discussion pour la formation ' || $1 || '.'
       WHERE id_formation = $2`,
      [next.titre.trim(), id]
    );
    await client.query('COMMIT');
    emitRealtimeEvent('formations:changed', {});
    res.status(200).json({ message: "Formation mise à jour !", formation: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur updateFormation :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  } finally {
    client.release();
  }
};

// 6. Supprimer une formation (Responsable)
exports.deleteFormation = async (req, res) => {
  const { id } = req.params;
  try {
    const formation = await db.query(
      `SELECT statut,
        EXISTS (SELECT 1 FROM inscription WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM seance WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM formation_formateur WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM evaluation_sujet WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM formation_avis WHERE id_formation = $1) OR
        EXISTS (SELECT 1 FROM forum WHERE id_formation = $1) AS has_data
       FROM formation WHERE id_formation = $1`,
      [id]
    );
    if (!formation.rows[0]) return res.status(404).json({ message: 'Formation non trouvée.' });

    if (formation.rows[0].has_data) {
      const archived = await db.query(
        `UPDATE formation SET statut = 'ARCHIVEE', date_modification = CURRENT_TIMESTAMP
         WHERE id_formation = $1 AND statut <> 'ARCHIVEE'
         RETURNING id_formation`,
        [id]
      );
      emitRealtimeEvent('formations:changed', {});
      return res.status(200).json({
        archived: true,
        message: archived.rows.length
          ? 'La formation contient des données. Elle a été archivée et retirée du catalogue public.'
          : 'La formation est déjà archivée et ses données sont conservées.'
      });
    }

    const { rowCount } = await db.query('DELETE FROM formation WHERE id_formation = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Formation non trouvée.' });
    emitRealtimeEvent('formations:changed', {});
    return res.status(200).json({ archived: false, message: 'Formation vierge supprimée définitivement.' });
  } catch (error) {
    console.error('Erreur deleteFormation :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression ou de l’archivage.' });
  }
};

                                           // METHODE POUR LES RESPONSABLE POUR L'AFFECTATION DES FORMATEUR A LEUR FORMATION
// Obtenir la liste des formateurs affectés à une formation
exports.getFormateursByFormation = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT f.id_formateur, u.nom, u.prenom, u.email, ff.role_formateur, ff.date_affectation
      FROM formation_formateur ff
      JOIN formateur f ON ff.id_formateur = f.id_formateur
      JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
      WHERE ff.id_formation = $1;
    `;
    const { rows } = await db.query(query, [id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des formateurs" });
  }
};
// Obtenir TOUS les formateurs disponibles pour la sélection
exports.getAllFormateursList = async (req, res) => {
  try {
    const query = `
      SELECT f.id_formateur, u.nom, u.prenom, u.email, f.specialite
      FROM formateur f
      JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de la liste des formateurs" });
  }
};
// Affecter un formateur à une formation
exports.assignFormateur = async (req, res) => {
  const { id } = req.params; // id_formation
  const { id_formateur, role_formateur } = req.body;

  try {
    const query = `
      INSERT INTO formation_formateur (id_formation, id_formateur, role_formateur)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [id, id_formateur, role_formateur || 'Intervenant Principal']);
    emitRealtimeEvent('formations:changed', {});
    res.status(201).json({ message: "Formateur affecté avec succès !", data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'affectation du formateur" });
  }
};
// Retirer un formateur d'une formation
exports.removeFormateur = async (req, res) => {
  const { id, idFormateur } = req.params;
  try {
    const { rowCount } = await db.query(
      'DELETE FROM formation_formateur WHERE id_formation = $1 AND id_formateur = $2',
      [id, idFormateur]
    );
    if (rowCount > 0) emitRealtimeEvent('formations:changed', {});
    res.status(200).json({ message: "Formateur retiré de la formation" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du retrait" });
  }
};