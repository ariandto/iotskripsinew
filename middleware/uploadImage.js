const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Folder upload
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueName + ext); // Nama file unik
  }
});

// Filter untuk memastikan hanya gambar yang boleh diupload
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Hanya jpeg, jpg, png, gif.'));
  }
};

// Membuat instance upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Maksimal 5MB
  fileFilter: fileFilter
});

module.exports = upload;
