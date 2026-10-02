// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// 1. Configuration CORS pour autoriser PC + Mobile
app.use(cors({
  origin: true, // Accepte dynamiquement l'origine (localhost, IP locale, etc.)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json()); // Support du JSON

// Fichiers statiques
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));

// Route racine de test
app.get('/', (req, res) => {
  res.json({ message: "API Plateforme de Formations opérationnelle 🚀" });
});

// Importation des routes
const formationRoutes = require('./routes/formationRoutes');
const userRoutes = require('./routes/userRoutes');
const candidatRoutes = require('./routes/candidatRoutes');
const inscriptionRoutes = require('./routes/inscriptionRoutes');
const authRoutes = require('./routes/authRoutes');
const apprenantRoutes = require('./routes/apprenantRoutes');
const responsableRoutes = require('./routes/responsableRoutes');
const scanRoutes = require('./routes/scanRoutes');
const formateurRoutes = require('./routes/formateurRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Attachement des routes
app.use('/api/users', userRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/candidats', candidatRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/responsable', responsableRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/apprenant', apprenantRoutes);
app.use('/api/presences', scanRoutes);
app.use('/api/formateur', formateurRoutes);
app.use('/api/admin', adminRoutes);

// Démarrage du serveur sur 0.0.0.0 (Accessible depuis PC et Mobile)
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
  console.log(`Aussi accessible sur le réseau via ton IP locale sur le port ${PORT}`);
});