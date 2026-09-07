// backend/controllers/forumController.js
const db = require('../config/db');

// Récupérer tous les messages d'un forum
exports.getMessagesByForum = async (req, res) => {
  const { id_forum } = req.params;

  try {
    const query = `
      SELECT m.id_message, m.contenu, m.created_at, m.id_utilisateur, u.nom as nom_expediteur, u.prenom
      FROM messages m
      JOIN utilisateurs u ON m.id_utilisateur = u.id_utilisateur
      WHERE m.id_forum = ?
      ORDER BY m.created_at ASC
    `;
    const [messages] = await db.query(query, [id_forum]);
    res.json(messages);
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
      INSERT INTO messages (id_forum, id_utilisateur, contenu, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await db.query(query, [id_forum, id_utilisateur, contenu]);

    // Retourner le message créé avec le nom de l'expéditeur
    const [user] = await db.query('SELECT nom, prenom FROM utilisateurs WHERE id_utilisateur = ?', [id_utilisateur]);

    res.status(201).json({
      id_message: result.insertId,
      id_forum,
      id_utilisateur,
      contenu,
      created_at: new Date(),
      nom_expediteur: `${user[0].nom} ${user[0].prenom}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
};