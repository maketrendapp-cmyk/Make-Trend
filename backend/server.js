// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const path = require('path');

// ============================================================
// 1. INITIALIZE FIREBASE ADMIN SDK (Backend only)
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
// 2. EXPRESS APP
// ============================================================
const app = express();

// ============================================================
// 3. SECURITY MIDDLEWARE
// ============================================================

// Helmet – sets secure HTTP headers
app.use(helmet());

// CORS – only allow your frontend domain
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Rate Limiting – prevent brute force / DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter); // Apply to all API routes

// JSON body parser (limit 10mb for images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// 4. HEALTH CHECK (for Render)
// ============================================================
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================
// 5. ROUTES
// ============================================================
const apiRoutes = require('./routes/route');
app.use('/api', apiRoutes);

// ============================================================
// 6. GLOBAL ERROR HANDLER (Catches all unhandled errors)
// ============================================================
app.use((err, req, res, next) => {
  console.error('🔥 Global error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error. Please try again later.' 
  });
});

// ============================================================
// 7. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🔒 Allowed origin: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});