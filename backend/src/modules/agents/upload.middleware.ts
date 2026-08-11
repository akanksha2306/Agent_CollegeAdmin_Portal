import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

// Files land in backend/uploads/ (gitignored). Fine for local/demo; swap for
// object storage (S3/GCS) in production.
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, or PNG files up to 10 MB are allowed'));
  },
});
