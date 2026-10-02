// backend/controllers/formationController.js
const db = require('../config/db');

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

      WHERE f.statut NOT IN ('BROUILLON', 'ARCHIVEE')

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
       WHERE fa.id_formation = $1 AND f.statut = 'TERMINEE'
       ORDER BY fa.date_creation DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur chargement avis formation :', error);
    res.status(500).json({ message: 'Impossible de charger les avis.' });
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
       WHERE f.id_formation = $1 AND a.id_utilisateur = $2 AND f.statut = 'TERMINEE'
       RETURNING id_avis, id_formation, note, commentaire, date_creation`,
      [req.params.id, req.user.id_utilisateur, note, commentaire]
    );
    if (!rows[0]) return res.status(403).json({ message: 'Seuls les apprenants inscrits peuvent noter une formation terminée.' });
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
    res.status(201).json({ message: "Formation créée avec succès !", formation: rows[0] });
  } catch (error) {
    console.error("Erreur createFormation :", error);
    res.status(500).json({ message: "Erreur lors de la création de la formation" });
  }
};

// 5. Mettre à jour une formation (Responsable)
exports.updateFormation = async (req, res) => {
  const { id } = req.params;
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
      UPDATE formation 
      SET 
        titre = $1, 
        description = $2, 
        image_url = $3, 
        date_debut = $4, 
        date_fin = $5, 
        date_limite_inscription = $6, 
        capacite_max = $7, 
        statut = $8
      WHERE id_formation = $9
      RETURNING *;
    `;
    const values = [
      titre, 
      description, 
      image_url, 
      date_debut, 
      date_fin, 
      date_limite_inscription, 
      capacite_max, 
      statut, 
      id
    ];

    const { rows } = await db.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Formation non trouvée" });
    }
    res.status(200).json({ message: "Formation mise à jour !", formation: rows[0] });
  } catch (error) {
    console.error("Erreur updateFormation :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

// 6. Supprimer une formation (Responsable)
exports.deleteFormation = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await db.query('DELETE FROM formation WHERE id_formation = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: "Formation non trouvée" });
    }
    res.status(200).json({ message: "Formation supprimée avec succès !" });
  } catch (error) {
    console.error("Erreur deleteFormation :", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
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
    await db.query(
      'DELETE FROM formation_formateur WHERE id_formation = $1 AND id_formateur = $2',
      [id, idFormateur]
    );
    res.status(200).json({ message: "Formateur retiré de la formation" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du retrait" });
  }
};