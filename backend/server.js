// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

// ============================================================
// 1. INITIALIZE FIREBASE ADMIN SDK
// ============================================================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();
console.log('🔥 Firebase Admin SDK initialized');

// ============================================================
// 2. INITIALIZE CLOUDINARY
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log('☁️ Cloudinary initialized');

// ============================================================
// 3. MULTER SETUP
// ============================================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, and GIF are allowed'), false);
    }
  },
});

// ============================================================
// 4. EXPRESS APP
// ============================================================
const app = express();
app.set('trust proxy', 1); // ✅ Add this line

// ============================================================
// 5. HELMET (Security Headers)
// ============================================================
app.use(helmet());

// ============================================================
// 6. CORS (Allow multiple domains)
// ============================================================
const allowedOrigins = [
  process.env.CLIENT_URL || 'https://maketrend.vercel.app',
  'https://make-trend-system.vercel.app',
  'https://maketrend.vercel.app',
  'https://make-trend.vercel.app',
  'http://localhost:3000',
  // Add your admin domain here if different
  // 'https://admin.maketrend.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// ============================================================
// 7. RATE LIMITING
// ============================================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============================================================
// 8. BODY PARSERS
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// 9. HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================
// 10. ROUTES
// ============================================================
const apiRoutes = require('./routes/route');
app.use('/api', apiRoutes);

// ============================================================
// 11. CLOUDINARY UPLOAD ROUTE
// ============================================================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

app.post('/api/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'maketrend/avatars',
          transformation: [{ width: 400, height: 400, crop: 'limit' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// ============================================================
// 12. GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('🔥 Global error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({ success: false, error: 'Image must be smaller than 5MB' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(500).json({
    success: false,
    error: 'Internal server error. Please try again later.',
  });
});

// ============================================================
// 13. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🔒 Allowed origins:`, allowedOrigins);
  console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
});