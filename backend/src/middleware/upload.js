const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['photos', 'documents'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(process.env.UPLOAD_DIR || './uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.uploadType || 'documents';
    const dest = path.join(process.env.UPLOAD_DIR || './uploads', type);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    photos: /jpeg|jpg|png|gif|webp|heic/i,
    documents: /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|dwg|dxf/i
  };

  const type = req.uploadType || 'documents';
  const ext = path.extname(file.originalname).slice(1);
  
  if (allowedTypes[type].test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${type}`), false);
  }
};

// Create multer instances
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Middleware to set upload type
const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

module.exports = { upload, setUploadType };
