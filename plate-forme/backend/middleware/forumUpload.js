const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'forum');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 20);
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});