// backend/controllers/formationController.js
const db = require('../config/db');
const formation = require('../Models/formationModel');

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

    const query = formation.SQL_1;

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
      formation.SQL_23,
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
      formation.SQL_22,
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
      formation.SQL_21,
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
    const query = formation.SQL_2;
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
    const query = formation.SQL_3;
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
    const { rows } = await db.query(formation.SQL_20, [id]);
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
    const query = formation.SQL_4;
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
    await client.query(formation.SQL_19);
    const currentResult = await client.query(formation.SQL_18, [id]);
    if (!currentResult.rows[0]) {
      await client.query(formation.SQL_12);
      return res.status(404).json({ message: "Formation non trouvée" });
    }
    const current = currentResult.rows[0];
    const status = current.statut;
    if (status === 'ARCHIVEE') {
      await client.query(formation.SQL_12);
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
      await client.query(formation.SQL_12);
      return res.status(403).json({ message: "Certains champs ne peuvent pas être modifiés avec le statut actuel de la formation." });
    }

    if (!next.titre?.trim()) {
      await client.query(formation.SQL_12);
      return res.status(400).json({ message: "Le titre de la formation est obligatoire." });
    }
    if (!next.date_debut || !next.date_fin || next.date_fin < next.date_debut) {
      await client.query(formation.SQL_12);
      return res.status(400).json({ message: "La date de fin doit être postérieure ou égale à la date de début." });
    }
    if (!next.date_limite_inscription || next.date_limite_inscription > next.date_debut) {
      await client.query(formation.SQL_12);
      return res.status(400).json({ message: "La limite des candidatures doit précéder ou égaler la date de début." });
    }
    if (!Number.isInteger(next.capacite_max) || next.capacite_max < 1) {
      await client.query(formation.SQL_12);
      return res.status(400).json({ message: "La capacité maximale doit être un nombre entier supérieur à zéro." });
    }
    if (['BROUILLON', 'OUVERTE'].includes(status)
      && !['BROUILLON', 'OUVERTE', 'EN_COURS', 'TERMINEE', 'FERMEE', 'ARCHIVEE'].includes(next.statut)) {
      await client.query(formation.SQL_12);
      return res.status(400).json({ message: "Statut de formation invalide." });
    }

    if (status !== 'TERMINEE') {
      const incompatibleSessions = await client.query(
        formation.SQL_17,
        [id, next.date_debut, next.date_fin]
      );
      if (incompatibleSessions.rows.length && !confirm_delete_sessions) {
        await client.query(formation.SQL_12);
        return res.status(409).json({
          code: 'SESSIONS_OUT_OF_RANGE',
          message: `${incompatibleSessions.rows.length} séance(s) seraient hors de la nouvelle période.`,
          incompatible_sessions: incompatibleSessions.rows,
        });
      }
      if (incompatibleSessions.rows.length && confirm_delete_sessions) {
        await client.query(
          formation.SQL_16,
          [id, next.date_debut, next.date_fin]
        );
      }
    }

    const { rows } = await client.query(
      formation.SQL_15,
      [next.titre.trim(), next.description, next.image_url || null, next.date_debut, next.date_fin,
       next.date_limite_inscription, next.capacite_max, next.statut, id]
    );
    await client.query(
      formation.SQL_14,
      [next.titre.trim(), id]
    );
    await client.query(formation.SQL_13);
    emitRealtimeEvent('formations:changed', {});
    res.status(200).json({ message: "Formation mise à jour !", formation: rows[0] });
  } catch (error) {
    await client.query(formation.SQL_12);
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
      formation.SQL_11,
      [id]
    );
    if (!formation.rows[0]) return res.status(404).json({ message: 'Formation non trouvée.' });

    if (formation.rows[0].has_data) {
      const archived = await db.query(
        formation.SQL_10,
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

    const { rowCount } = await db.query(formation.SQL_9, [id]);
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
    const query = formation.SQL_5;
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
    const query = formation.SQL_6;
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
    const query = formation.SQL_7;
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
      formation.SQL_8,
      [id, idFormateur]
    );
    if (rowCount > 0) emitRealtimeEvent('formations:changed', {});
    res.status(200).json({ message: "Formateur retiré de la formation" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du retrait" });
  }
};