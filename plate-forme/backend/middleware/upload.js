// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Choisit le sous-dossier selon le type
    let uploadPath = 'uploads/forum';
    if (file.fieldname === 'avatar') {
      uploadPath = 'uploads/avatars';
    }

    // Crée le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Formatage du nom : USERID-TIMESTAMP-RANDOM.ext (ex: user_12-1710000000-8493.jpg)
    const userId = req.user ? req.user.id_utilisateur : 'anon';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    
    cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
  }
});

// Filtre pour autoriser seulement les images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Seules les images (jpg, jpeg, png, webp) sont autorisées !'));
};

const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite 5 Mo
});

module.exports = upload;