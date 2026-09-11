// middleware/authOptional.js
const jwt = require('jsonwebtoken');

module.exports = {
  authOptional: (req, res, next) => {
    const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Ex: { id_utilisateur: 12, email: '...' }
    } catch (err) {
      // Token invalide ou expiré : on ignore l'erreur et on continue en tant qu'anonyme
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}
};