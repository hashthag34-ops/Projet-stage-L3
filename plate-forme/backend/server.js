// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// Middlewares globaux,configuration de CORS
// 2. Configuration CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Ton URL Vite/React
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json()); // Permet d'analyser le corps des requêtes en JSON

// Route de test
app.get('/', (req, res) => {
  res.json({ message: "API Plateforme de Formations opérationnelle " });
});

// Rendre le dossier 'uploads' accessible en HTTP
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import des routes
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

const verifyToken = require('./middleware/authMiddleware');
const authController = require('./controllers/authController');

// Routes visiteurs / utilisateurs
app.use('/api/users', userRoutes); // Traite /api/users, /api/users/profile, etc.
app.use('/api/formations', formationRoutes);
app.use('/api/candidats', candidatRoutes);
app.use('/api/inscriptions', inscriptionRoutes);

// Routes Responsable
app.use('/api/responsable', responsableRoutes);

// Routes Auth
app.use('/api/auth', authRoutes);

// Routes Apprenant
app.use('/api/apprenant', apprenantRoutes);
app.use('/api/presences', scanRoutes);
app.use('/api/formateur', formateurRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: "API Plateforme de Formations opérationnelle " });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Serveur backend démarré sur http://localhost:${PORT}`);
});
