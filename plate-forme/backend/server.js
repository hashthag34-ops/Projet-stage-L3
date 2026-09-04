// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globaux,configuration de CORS
app.use(cors());
app.use(express.json()); // Permet d'analyser le corps des requêtes en JSON

// Route de test
app.get('/', (req, res) => {
  res.json({ message: "API Plateforme de Formations opérationnelle " });
});

// Import des routes
const formationRoutes = require('./routes/formationRoutes');
const userRoutes = require('./routes/userRoutes');
const candidatRoutes = require('./routes/candidatRoutes');
const inscriptionRoutes = require('./routes/inscriptionRoutes');
const authRoutes = require('./routes/authRoutes');

const verifyToken = require('./middlewares/authMiddleware');
const authController = require('./controllers/authController');

//utilisation des routes
app.use('/api/users', userRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/candidats', candidatRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/auth', authRoutes);

// Routes Auth & Profil
app.use('/api/auth', authRoutes);
app.put('/api/users/profile', verifyToken, authController.updateProfile);

// Routes Apprenant
const apprenantController = require('./controllers/apprenantController');
app.get('/api/apprenant/seances', verifyToken, apprenantController.getMesSeances);
app.get('/api/apprenant/forums', verifyToken, apprenantController.getMesForums);

app.get('/', (req, res) => {
  res.json({ message: "API Plateforme de Formations opérationnelle " });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Serveur backend démarré sur http://localhost:${PORT}`);
});