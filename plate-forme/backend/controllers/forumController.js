// backend/controllers/forumController.js
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'forum');
const attachmentPrefix = '__FORUM_ATTACHMENT_V1__:';

const removeUploadedFile = (file) => {
  if (file) fs.promises.unlink(file.path).catch(() => {});
};

const encodeMessageContent = (content, file) => {
  if (!file) return content;
  return attachmentPrefix + JSON.stringify({
    contenu: content,
    nom_fichier: file.originalname,
    chemin_fichier: file.filename,
    type_fichier: file.mimetype,
    taille_fichier: file.size
  });
};

const decodeMessageContent = (storedContent) => {
  if (!storedContent?.startsWith(attachmentPrefix)) return { contenu: storedContent };

  try {
    return JSON.parse(storedContent.slice(attachmentPrefix.length));
  } catch {
    return { contenu: storedContent };
  }
};

const canAccessForum = async (req, forumId) => {
  const userId = req.user.id_utilisateur;
  if (req.baseUrl.endsWith('/apprenant')) {
    const result = await db.query(
      `SELECT 1
       FROM forum fo
       JOIN inscription i ON i.id_formation = fo.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       WHERE fo.id_forum = $1 AND a.id_utilisateur = $2`,
      [forumId, userId]
    );
    return result.rowCount > 0;
  }

  if (req.baseUrl.endsWith('/formateur')) {
    const result = await db.query(
      `SELECT 1
       FROM forum fo
       JOIN formation_formateur ff ON ff.id_formation = fo.id_formation
       JOIN formateur f ON f.id_formateur = ff.id_formateur
       WHERE fo.id_forum = $1 AND f.id_utilisateur = $2`,
      [forumId, userId]
    );
    return result.rowCount > 0;
  }

  return false;
};

// Récupérer tous les messages d'un forum
exports.getMessagesByForum = async (req, res) => {
  const { id_forum } = req.params;

  try {
    if (!(await canAccessForum(req, id_forum))) {
      return res.status(403).json({ message: 'Vous n’avez pas accès à ce forum.' });
    }
    const query = `
      SELECT m.id_message, m.contenu, m.date_envoi AS created_at, m.id_utilisateur,
             u.nom AS nom_expediteur, u.prenom
      FROM message m
      JOIN utilisateur u ON m.id_utilisateur = u.id_utilisateur
      WHERE m.id_forum = $1
      ORDER BY m.date_envoi ASC
    `;
    const { rows } = await db.query(query, [id_forum]);
    res.json(rows.map((row) => ({ ...row, ...decodeMessageContent(row.contenu) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des messages" });
  }
};

// Poster un message dans un forum
exports.createMessage = async (req, res) => {
  const { id_forum } = req.params;
  const contenu = (req.body.contenu || '').trim();
  const id_utilisateur = req.user.id_utilisateur; // Récupéré de la session/JWT

  if (!contenu && !req.file) {
    return res.status(400).json({ message: 'Écrivez un message ou joignez un fichier.' });
  }

  try {
    if (!(await canAccessForum(req, id_forum))) {
      removeUploadedFile(req.file);
      return res.status(403).json({ message: 'Vous n’avez pas accès à ce forum.' });
    }
    const query = `
      INSERT INTO message (id_forum, id_utilisateur, contenu)
      VALUES ($1, $2, $3)
      RETURNING id_message, date_envoi AS created_at
    `;
    const { rows: messageRows } = await db.query(query, [
      id_forum,
      id_utilisateur,
      encodeMessageContent(contenu, req.file)
    ]);

    // Retourner le message créé avec le nom de l'expéditeur
    const { rows: userRows } = await db.query(
      'SELECT nom, prenom FROM utilisateur WHERE id_utilisateur = $1',
      [id_utilisateur]
    );
    const message = messageRows[0];
    const user = userRows[0];

    res.status(201).json({
      id_message: message.id_message,
      id_forum,
      id_utilisateur,
      contenu,
      ...decodeMessageContent(encodeMessageContent(contenu, req.file)),
      created_at: message.created_at,
      nom_expediteur: `${user.nom} ${user.prenom}`
    });
  } catch (err) {
    removeUploadedFile(req.file);
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
};

exports.downloadMessageFile = async (req, res) => {
  const { id_forum, id_message } = req.params;

  try {
    if (!(await canAccessForum(req, id_forum))) {
      return res.status(403).json({ message: 'Vous n’avez pas accès à ce forum.' });
    }

    const { rows } = await db.query(
      `SELECT contenu
       FROM message
       WHERE id_message = $1 AND id_forum = $2`,
      [id_message, id_forum]
    );
    const message = rows[0] ? decodeMessageContent(rows[0].contenu) : null;
    if (!message?.chemin_fichier) return res.status(404).json({ message: 'Fichier introuvable.' });

    const filePath = path.join(uploadDirectory, path.basename(message.chemin_fichier));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable sur le serveur.' });

    return res.download(filePath, message.nom_fichier);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur lors du téléchargement du fichier.' });
  }
};