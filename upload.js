const multer = require('multer');

// Konfiguracja multer do uploadu plików do pamięci (buffer)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Akceptuj tylko obrazy
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Tylko pliki graficzne!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

module.exports = upload;
