// backend/controllers/formationController.js
const db = require('../config/db');

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
      INSERT INTO formation (
        titre, description, image_url, date_debut, date_fin, 
        date_limite_inscription, capacite_max, statut
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *;
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

// Récupérer le catalogue des formations publiques
exports.getFormationsPubliques = async (req, res) => {
  try {
    const query = `
      SELECT 
        id_formation, 
        titre, 
        description, 
        image_url, 
        date_debut, 
        date_fin, 
        date_limite_inscription, 
        capacite_max,
        statut
      FROM formation 
      WHERE statut = 'OUVERTE' 
      ORDER BY date_debut ASC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getFormationsPubliques :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des formations" });
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