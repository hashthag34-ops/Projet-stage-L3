const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'formations');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

module.exports = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
      callback(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
      return callback(null, true);
    }
    callback(new Error('Seules les images JPG, PNG et WEBP sont autorisées.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});
