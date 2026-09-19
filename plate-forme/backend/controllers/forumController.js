// backend/controllers/forumController.js
const db = require('../config/db');

// Récupérer tous les messages d'un forum
exports.getMessagesByForum = async (req, res) => {
  const { id_forum } = req.params;

  try {
    const query = `
      SELECT m.id_message, m.contenu, m.date_envoi AS created_at, m.id_utilisateur,
             u.nom AS nom_expediteur, u.prenom
      FROM message m
      JOIN utilisateur u ON m.id_utilisateur = u.id_utilisateur
      WHERE m.id_forum = $1
      ORDER BY m.date_envoi ASC
    `;
    const { rows } = await db.query(query, [id_forum]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des messages" });
  }
};

// Poster un message dans un forum
exports.createMessage = async (req, res) => {
  const { id_forum } = req.params;
  const { contenu } = req.body;
  const id_utilisateur = req.user.id_utilisateur; // Récupéré de la session/JWT

  if (!contenu) {
    return res.status(400).json({ message: "Le contenu ne peut pas être vide" });
  }

  try {
    const query = `
      INSERT INTO message (id_forum, id_utilisateur, contenu)
      VALUES ($1, $2, $3)
      RETURNING id_message, date_envoi AS created_at
    `;
    const { rows: messageRows } = await db.query(query, [id_forum, id_utilisateur, contenu]);

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
      created_at: message.created_at,
      nom_expediteur: `${user.nom} ${user.prenom}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
};