// backend/server.js
// ============================================================
// COMPLETE PRODUCTION BACKEND – FULLY HARDENED
// Security: Helmet, CORS, Rate Limiting (global + per‑action),
//           XSS Protection, JWT, Ban Checks, Redis Caching
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');
const Redis = require('ioredis');
const sharp = require('sharp');

// ============================================================
// 0. REDIS CLIENT (with timeout guard)
// ============================================================
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// ── Redis get with 500ms timeout ──
async function redisGet(key) {
  return Promise.race([
    redis.get(key),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 500))
  ]);
}

// ── Get from cache or fetch ──
async function getOrSetCache(key, fetchFn) {
  try {
    const cached = await redisGet(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
    console.log(`📡 Cache MISS: ${key}`);
    const data = await fetchFn();
    await redis.set(key, JSON.stringify(data)); // indefinite TTL
    return data;
  } catch (error) {
    console.warn(`⚠️ Cache fallback for ${key}:`, error.message);
    return await fetchFn();
  }
}

// ── Invalidate single key ──
async function invalidateKey(key) {
  try {
    await redis.del(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  } catch (error) {
    console.error(`❌ Cache invalidation error for ${key}:`, error);
  }
}

// ── Invalidate all keys matching a pattern ──
async function invalidatePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Cache invalidated: ${pattern} (${keys.length} keys)`);
    }
  } catch (error) {
    console.error(`❌ Cache invalidation error for ${pattern}:`, error);
  }
}

// ── Update a specific campaign in all cached user list pages ──
async function updateCampaignInUserListCache(ownerId, campaignId, updates) {
  try {
    const pattern = `campaigns:user:${ownerId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      const cached = await redis.get(key);
      if (!cached) continue;

      let data = JSON.parse(cached);
      if (data.campaigns && Array.isArray(data.campaigns)) {
        let updated = false;
        data.campaigns = data.campaigns.map(camp => {
          if (camp.id === campaignId) {
            updated = true;
            return { ...camp, ...updates };
          }
          return camp;
        });
        if (updated) {
          const ttlToUse = ttl > 0 ? ttl : 86400; // keep existing TTL, default 24h
          await redis.set(key, JSON.stringify(data), 'EX', ttlToUse);
          console.log(`🔄 Updated campaign ${campaignId} in cache ${key}`);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to update campaign ${campaignId} in user list cache:`, error);
  }
}

// ============================================================
// 1. FIREBASE ADMIN SDK
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
console.log('✅ Firebase Admin SDK initialized');

// ============================================================
// 2. CLOUDINARY
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log('✅ Cloudinary initialized');

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
app.set('trust proxy', 1);

// ── Helmet (Security Headers) ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── CORS ──
const allowedOrigins = [
  process.env.CLIENT_URL || 'https://maketrend.vercel.app',
  'https://make-trend-system.vercel.app',
  'https://maketrend.vercel.app',
  'https://make-trend.vercel.app',
];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('🚫 Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// ── Global Rate Limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/check-email', strictLimiter);
app.use('/api/auth/check-username', strictLimiter);

// ── Body Parsers & Sanitization ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/[<>]/g, '').trim();
      }
    });
  }
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/[<>]/g, '').trim();
      }
    });
  }
  next();
});

// ── Health Check ──
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================
// 10. HELPER FUNCTIONS
// ============================================================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

async function isAdmin(uid) {
  try {
    const user = await admin.auth().getUser(uid);
    return user.customClaims?.admin === true;
  } catch {
    return false;
  }
}

function sanitizeUsername(str) {
  if (!str) return '';
  return String(str).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function sanitizeFullName(str) {
  if (!str) return '';
  return String(str).replace(/[^a-zA-Z0-9 ]/g, '').trim();
}

function sanitizeReferralCode(str) {
  if (!str) return '';
  return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function sanitizeCommentInput(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueReferralCode() {
  let code;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateReferralCode();
    const snapshot = await db.collection('users').where('referralCode', '==', code).limit(1).get();
    exists = !snapshot.empty;
    attempts++;
  }
  if (exists) {
    code = generateReferralCode() + Date.now().toString(36).toUpperCase().slice(-2);
  }
  return code;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.ip ||
         req.connection?.remoteAddress ||
         'unknown';
}

// ── Generic rate limit helper ──
async function checkRateLimit(identifier, action, limit, windowSeconds) {
  const key = `rate:${action}:${identifier}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return current <= limit;
  } catch (error) {
    console.error(`Rate limit error (${action}):`, error);
    return true; // allow on error
  }
}

// ── Get ban status with Redis cache (5 min TTL) ──
async function isUserBanned(uid) {
  const cacheKey = `banned:${uid}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }
  } catch (error) {
    // fall through to Firestore
  }
  // Fetch from Firestore
  const doc = await db.collection('users').doc(uid).get();
  const banned = doc.exists ? (doc.data().isBanned === true) : false;
  try {
    await redis.set(cacheKey, banned ? 'true' : 'false', 'EX', 300); // 5 min TTL
  } catch (err) { /* ignore */ }
  return banned;
}

// ── Middleware to check if user is banned (with caching) ──
async function checkBanned(req, res, next) {
  try {
    const uid = req.user.uid;
    const banned = await isUserBanned(uid);
    if (banned) {
      return res.status(403).json({ success: false, error: 'Your account has been suspended.' });
    }
    next();
  } catch (error) {
    console.error('Ban check error:', error);
    next(); // allow on error to avoid blocking
  }
}

// ── Campaign creation rate limit (3 per minute) ──
async function checkCampaignRateLimit(uid) {
  const LIMIT = 3;
  const WINDOW_SECONDS = 60;
  const key = `rate:campaigns:${uid}:${Math.floor(Date.now() / 1000 / WINDOW_SECONDS)}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return current <= LIMIT;
  } catch (error) {
    console.error('Rate limit error:', error);
    return true;
  }
}

async function hasPerformedAction(campaignId, userId, ip, deviceId, actionType) {
  try {
    // Priority: userId > deviceId > ip
    let docId;
    if (userId) {
      docId = `user_${userId}`;
    } else if (deviceId) {
      docId = `device_${deviceId}`;
    } else {
      docId = `ip_${ip}`;
    }
    const doc = await db.collection('campaigns').doc(campaignId)
      .collection(actionType)
      .doc(docId)
      .get();
    return doc.exists;
  } catch (error) {
    console.error(`❌ Check ${actionType} error:`, error);
    return false;
  }
}

async function recordAction(campaignId, userId, ip, deviceId, actionType) {
  try {
    let docId;
    if (userId) {
      docId = `user_${userId}`;
    } else if (deviceId) {
      docId = `device_${deviceId}`;
    } else {
      docId = `ip_${ip}`;
    }
    await db.collection('campaigns').doc(campaignId)
      .collection(actionType)
      .doc(docId)
      .set({
        userId: userId || null,
        deviceId: deviceId || null,
        ip: ip || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    return true;
  } catch (error) {
    console.error(`❌ Record ${actionType} error:`, error);
    return false;
  }
}

// ============================================================
// 11. AUTH ENDPOINTS
// ============================================================

// ── Check username availability ── (public, already IP-rate-limited via strictLimiter)
app.get('/api/auth/check-username', async (req, res) => {
  try {
    const username = sanitizeUsername(req.query.username);
    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
    }
    const snapshot = await db.collection('users').where('username', '==', username).limit(1).get();
    const available = snapshot.empty;
    res.json({ success: true, available });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ success: false, error: 'Failed to check username' });
  }
});

// ── Check email availability ── (public, already IP-rate-limited)
app.get('/api/auth/check-email', async (req, res) => {
  try {
    const email = req.query.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    const exists = !snapshot.empty;
    res.json({ success: true, exists });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Register new user ── (rate-limited by authLimiter)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { uid, username, fullname, email, avatar, referralCode: referredByCode, deviceFingerprint } = req.body;
    const cleanUsername = sanitizeUsername(username);
    const cleanFullname = sanitizeFullName(fullname);
    const cleanEmail = email?.trim().toLowerCase();

    if (!uid || !cleanUsername || !cleanFullname || !cleanEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ success: false, error: 'Username must be 3-30 characters' });
    }
    if (cleanFullname.length < 2 || cleanFullname.length > 100) {
      return res.status(400).json({ success: false, error: 'Full name must be 2-100 characters' });
    }

    const existingUser = await db.collection('users').where('username', '==', cleanUsername).get();
    if (!existingUser.empty) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }
    const existingEmail = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!existingEmail.empty) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const newReferralCode = await generateUniqueReferralCode();
    const cleanReferredBy = sanitizeReferralCode(referredByCode);

    const userData = {
      uid,
      username: cleanUsername,
      fullname: cleanFullname,
      email: cleanEmail,
      avatar: avatar || '',
      referralCode: newReferralCode,
      referredBy: cleanReferredBy || null,
      deviceFingerprint: deviceFingerprint || '',
      completed: true,
      plan: 'free',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
    };

    await db.collection('users').doc(uid).set(userData);
    delete userData.deviceFingerprint;
    res.status(201).json({ success: true, user: userData });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ── Complete social profile ── (authenticated, with rate limit and ban check)
app.post('/api/auth/complete-social', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    // ── Rate limit: 10 completions per minute ──
    if (!(await checkRateLimit(uid, 'complete-social', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many attempts. Please wait.' });
    }
    const { email, fullname, username, avatar, referralCode: referredByCode, deviceFingerprint } = req.body;
    const cleanUsername = sanitizeUsername(username);
    const cleanFullname = sanitizeFullName(fullname);
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanUsername || !cleanFullname || !cleanEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ success: false, error: 'Username must be 3-30 characters' });
    }

    const existing = await db.collection('users').where('username', '==', cleanUsername).get();
    if (!existing.empty && existing.docs[0].id !== uid) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    const newReferralCode = await generateUniqueReferralCode();
    const cleanReferredBy = sanitizeReferralCode(referredByCode);

    const userData = {
      uid,
      username: cleanUsername,
      fullname: cleanFullname,
      email: cleanEmail,
      avatar: avatar || '',
      referralCode: newReferralCode,
      referredBy: cleanReferredBy || null,
      deviceFingerprint: deviceFingerprint || '',
      completed: true,
      plan: 'free',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
    };

    await db.collection('users').doc(uid).set(userData, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Complete social profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete profile' });
  }
});

// ── Get current user profile ── (authenticated, with ban check + rate limit)
app.get('/api/auth/me', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    // ── Rate limit: 20 requests per minute ──
    if (!(await checkRateLimit(uid, 'profile-get', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const cacheKey = `user:profile:${uid}`;
    let result;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        console.log(`📦 User profile cache HIT: ${uid}`);
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.warn(`⚠️ User cache miss/error for ${uid}:`, error.message);
    }

    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = doc.data();
    delete userData.deviceFingerprint;
    result = { success: true, user: { uid, ...userData } };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
      console.log(`💾 User profile cached: ${uid}`);
    } catch (err) { /* ignore */ }
    res.json(result);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ── Check if user is banned ── (public, IP rate limit)
app.get('/api/auth/check-ban', async (req, res) => {
  try {
    const ip = getClientIp(req);
    // ── Rate limit: 20 requests per minute per IP ──
    if (!(await checkRateLimit(ip, 'ban-check', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ success: false, error: 'Missing uid' });
    }
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.json({ success: true, banned: false });
    }
    const data = doc.data();
    res.json({ success: true, banned: data.isBanned || false });
  } catch (error) {
    console.error('Check ban error:', error);
    res.status(500).json({ success: false, error: 'Failed to check ban status' });
  }
});

// ── Record login ── (authenticated, low risk – could add rate limit, but optional)
app.post('/api/auth/record-login', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    // ── Rate limit: 5 login recordings per minute ──
    if (!(await checkRateLimit(uid, 'record-login', 5, 60))) {
      // Still return success to not reveal the limit
      return res.json({ success: true });
    }
    await db.collection('users').doc(uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Record login error:', error);
    res.json({ success: true });
  }
});

// ── Get profile completion status ── (public, IP rate limit)
app.get('/api/auth/profile', async (req, res) => {
  try {
    const ip = getClientIp(req);
    // ── Rate limit: 20 requests per minute per IP ──
    if (!(await checkRateLimit(ip, 'profile-check', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ success: false, error: 'Missing uid' });
    }
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.json({ success: true, completed: false, username: null });
    }
    const data = doc.data();
    res.json({
      success: true,
      completed: data.completed || false,
      username: data.username || null,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ── Update user profile ── (authenticated, with ban check + rate limit)
app.put('/api/auth/profile', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'profile-update', 3, 60))) {
      return res.status(429).json({ success: false, error: 'Too many profile updates. Please wait.' });
    }

    const { username, fullname, email, avatar } = req.body;
    const cleanUsername = sanitizeUsername(username);
    const cleanFullname = sanitizeFullName(fullname);
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanUsername || !cleanFullname || !cleanEmail) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ success: false, error: 'Username must be 3-30 characters' });
    }
    if (cleanFullname.length < 2 || cleanFullname.length > 100) {
      return res.status(400).json({ success: false, error: 'Full name must be 2-100 characters' });
    }
    if (!cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const currentData = userDoc.data();

    if (cleanUsername !== currentData.username) {
      const existingUsername = await db.collection('users')
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();
      if (!existingUsername.empty) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
    }

    if (cleanEmail !== currentData.email) {
      const existingEmail = await db.collection('users')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();
      if (!existingEmail.empty) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      try {
        await admin.auth().updateUser(uid, { email: cleanEmail });
      } catch (authError) {
        console.error('Firebase Auth email update error:', authError);
        return res.status(400).json({
          success: false,
          error: 'Failed to update email. You may need to re‑authenticate.',
        });
      }
    }

    const updateData = {
      username: cleanUsername,
      fullname: cleanFullname,
      email: cleanEmail,
      avatar: avatar || currentData.avatar || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(uid).update(updateData);
    await invalidateKey(`user:profile:${uid}`);

    const updatedDoc = await db.collection('users').doc(uid).get();
    const updatedUser = updatedDoc.data();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { uid, ...updatedUser },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ── Get referrals ── (authenticated, with ban check + rate limit)
app.get('/api/auth/referrals', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'referrals-get', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const referralCode = userData.referralCode;

    if (!referralCode) {
      return res.json({ success: true, referrals: [], referrer: null });
    }

    const snapshot = await db.collection('users')
      .where('referredBy', '==', referralCode)
      .orderBy('createdAt', 'desc')
      .get();

    const referredUsers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      referredUsers.push({
        uid: doc.id,
        username: data.username || '',
        fullname: data.fullname || '',
        email: data.email || '',
        avatar: data.avatar || '',
        createdAt: data.createdAt || null,
      });
    });

    let referrer = null;
    if (userData.referredBy) {
      const referrerDoc = await db.collection('users')
        .where('referralCode', '==', userData.referredBy)
        .limit(1)
        .get();
      if (!referrerDoc.empty) {
        const refData = referrerDoc.docs[0].data();
        referrer = {
          uid: referrerDoc.docs[0].id,
          username: refData.username || '',
          fullname: refData.fullname || '',
          email: refData.email || '',
          avatar: refData.avatar || '',
        };
      }
    }

    res.json({
      success: true,
      referralCode,
      totalReferrals: referredUsers.length,
      referredUsers,
      referrer,
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch referrals' });
  }
});

// ── SET ADMIN ── (protected by secret)
app.post('/api/auth/set-admin', async (req, res) => {
  try {
    const ip = getClientIp(req);
    // ── Rate limit: 3 attempts per hour per IP ──
    if (!(await checkRateLimit(ip, 'set-admin', 3, 3600))) {
      return res.status(429).json({ success: false, error: 'Too many attempts. Please wait an hour.' });
    }

    const { email, secret } = req.body;
    if (secret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, error: 'Invalid secret key' });
    }
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ success: false, error: 'User not found. Please create an account first.' });
      }
      throw error;
    }
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.json({
      success: true,
      message: `Admin claim set for ${email}`,
      uid: userRecord.uid,
    });
  } catch (error) {
    console.error('Set admin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Set session cookie ──
app.post('/api/auth/set-session', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ success: true });
    try {
      await db.collection('users').doc(decoded.uid).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn('Background lastLogin update failed:', err);
    }
  } catch (error) {
    console.error('Set session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Clear session cookie ──
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true });
});

// ============================================================
// 12. TEMPLATE ENDPOINTS
// ============================================================

// ── Get all templates ── (public, IP rate limit)
app.get('/api/templates', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'templates-get', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const cacheKey = 'templates:all';
    const result = await getOrSetCache(cacheKey, async () => {
      console.log('📡 Fetching templates from Firestore...');
      let query = db.collection('templates').where('isActive', '==', true);
      const { category, platform, highlight, plan, limit = 50 } = req.query;
      if (category) query = query.where('category', '==', category);
      if (platform) query = query.where('platform', '==', platform);
      if (highlight === 'true') query = query.where('isHighlight', '==', true);
      if (plan) query = query.where('plan', '==', plan);
      query = query.limit(parseInt(limit) || 50);

      const snapshot = await query.get();
      const templates = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          ...data,
          title: data.title || 'Untitled',
          slug: data.slug || doc.id,
          description: data.description || '',
          image: data.image || '',
          category: data.category || '',
          platform: data.platform || 'all',
          hashtags: data.hashtags || [],
          isHighlight: data.isHighlight || false,
          usageCount: data.usageCount || 0,
          plan: data.plan || 'free',
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        });
      });
      return { success: true, templates };
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Create template (admin only) ──
app.post('/api/templates', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'admin-template-create', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many template creations. Please wait.' });
    }
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const { title, slug, description, image, thumbnail, category, platform, hashtags, isHighlight, plan = 'free', reward } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ success: false, error: 'Title and slug are required' });
    }
    const validPlans = ['free', 'pro'];
    if (plan && !validPlans.includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan. Must be: free, pro' });
    }

    const existing = await db.collection('templates').where('slug', '==', slug).get();
    if (!existing.empty) {
      return res.status(409).json({ success: false, error: 'Slug already exists' });
    }

    const templateData = {
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: description || '',
      image: image || '',
      thumbnail: thumbnail || image || '',
      category: category || '',
      platform: platform || '',
      hashtags: hashtags || [],
      isHighlight: isHighlight || false,
      plan: plan || 'free',
      reward: reward || 'Exclusive Reward',
      isActive: true,
      usageCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('templates').add(templateData);
    await invalidatePattern('templates:*');
    res.status(201).json({ success: true, template: { id: docRef.id, ...templateData } });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// ── Update template (admin only) ──
app.put('/api/templates/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'admin-template-update', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many template updates. Please wait.' });
    }
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const updates = req.body;
    delete updates.createdAt;
    delete updates.usageCount;
    delete updates.id;

    if (updates.plan) {
      const validPlans = ['free', 'pro'];
      if (!validPlans.includes(updates.plan)) {
        return res.status(400).json({ success: false, error: 'Invalid plan. Must be: free, pro' });
      }
    }
    if (updates.slug) {
      updates.slug = updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const existing = await db.collection('templates').where('slug', '==', updates.slug).get();
      if (!existing.empty && existing.docs[0].id !== id) {
        return res.status(409).json({ success: false, error: 'Slug already exists' });
      }
    }
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('templates').doc(id).update(updates);
    await invalidatePattern('templates:*');
    res.json({ success: true, message: 'Template updated' });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

// ── Delete/archive template (admin only) ──
app.delete('/api/templates/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'admin-template-delete', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many template deletions. Please wait.' });
    }
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    await db.collection('templates').doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await invalidatePattern('templates:*');
    res.json({ success: true, message: 'Template archived' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

// ── Permanently delete template (admin only) ──
app.delete('/api/templates/:id/permanent', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    // Actually delete the document from Firestore
    await db.collection('templates').doc(id).delete();

    // Invalidate templates cache
    await invalidatePattern('templates:*');

    res.json({ success: true, message: 'Template permanently deleted' });
  } catch (error) {
    console.error('❌ Permanent delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Increment template usage ── (public, low risk, IP rate limit optional)
app.post('/api/templates/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    // optional IP rate limit
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'template-usage', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    await db.collection('templates').doc(id).update({
      usageCount: admin.firestore.FieldValue.increment(1),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Increment usage error:', error);
    res.status(500).json({ success: false, error: 'Failed to increment usage' });
  }
});

// ============================================================
// 13. CAMPAIGN ENDPOINTS
// ============================================================

// ── Get user's campaigns ── (authenticated, with ban check + rate limit)
app.get('/api/campaigns', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'campaigns-get', 60, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    let limit = parseInt(req.query.limit) || 25;
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastCreatedAt = req.query.lastCreatedAt ? new Date(parseInt(req.query.lastCreatedAt)) : null;
    const lastId = req.query.lastId || null;

    const cacheKey = `campaigns:user:${uid}:limit:${limit}:lastCreatedAt:${req.query.lastCreatedAt || 'null'}:lastId:${lastId || 'null'}`;

    let result;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        console.log(`📦 Cache HIT: ${cacheKey}`);
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.warn(`⚠️ Cache miss/error for ${cacheKey}:`, error.message);
    }

    console.log(`📡 Fetching campaigns for user ${uid} (limit=${limit})...`);
    let query = db.collection('campaigns')
      .where('userId', '==', uid)
      .where('status', 'in', ['active', 'paused'])
      .orderBy('createdAt', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(limit + 1);

    if (lastCreatedAt && lastId) {
      query = query.startAfter(lastCreatedAt, lastId);
    }

    const snapshot = await query.get();
    const campaigns = [];
    let hasMore = false;
    snapshot.forEach(doc => {
      if (campaigns.length < limit) {
        campaigns.push({ id: doc.id, ...doc.data() });
      } else {
        hasMore = true;
      }
    });

    let nextLastCreatedAt = null;
    let nextLastId = null;
    if (campaigns.length > 0) {
      const lastCampaign = campaigns[campaigns.length - 1];
      let createdAtMs = lastCampaign.createdAt;
      if (createdAtMs && typeof createdAtMs === 'object' && createdAtMs.seconds !== undefined) {
        createdAtMs = createdAtMs.seconds * 1000 + Math.floor(createdAtMs.nanoseconds / 1e6);
      } else if (createdAtMs instanceof Date) {
        createdAtMs = createdAtMs.getTime();
      } else if (typeof createdAtMs === 'string') {
        createdAtMs = new Date(createdAtMs).getTime();
      }
      nextLastCreatedAt = createdAtMs;
      nextLastId = lastCampaign.id;
    }

    const response = {
      success: true,
      campaigns,
      hasMore,
      lastCreatedAt: nextLastCreatedAt,
      lastId: nextLastId,
    };

    // Cache with 24 hour TTL – invalidation on change ensures freshness
try {
  await redis.set(cacheKey, JSON.stringify(response), 'EX', 86400);
  console.log(`💾 Campaigns cached (24 hour TTL): ${cacheKey}`);
} catch (err) {
  // ignore
}
    res.json(response);
  } catch (error) {
    console.error('❌ Get campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Get campaign by ID ── (public, IP rate limit)
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'campaign-view', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `campaigns:id:${id}`;
    let result = null;

    // ── Try cache first ──
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        result = JSON.parse(cached);
        console.log(`📦 Campaign cache HIT: ${id}`);
      }
    } catch (error) {
      console.warn(`⚠️ Cache miss/error for ${cacheKey}:`, error.message);
    }

    // ── If not in cache, fetch from Firestore ──
    if (!result) {
      const doc = await db.collection('campaigns').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }
      const campaignData = doc.data();
      if (campaignData.status === 'deleted') {
        return res.status(404).json({ success: false, error: 'Campaign not available' });
      }
      result = { success: true, campaign: { id: doc.id, ...campaignData } };
      // Store in cache with 60 second TTL
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
        console.log(`💾 Campaign cached (60s TTL): ${id}`);
      } catch (err) { /* ignore */ }
    }

    // ── Return the result immediately ──
    res.json(result);

    // ── Silent view tracking (asynchronous, non-blocking) ──
    setImmediate(async () => {
      try {
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            const decoded = await admin.auth().verifyIdToken(token);
            userId = decoded.uid;
          } catch (e) { /* ignore */ }
        }
        if (!userId) {
          userId = req.headers['x-user-id'] || null;
        }
        const deviceId = req.headers['x-device-id'] || null;

        // ── Use transaction to prevent race condition ──
        await db.runTransaction(async (transaction) => {
          const docRef = db.collection('campaigns').doc(id);
          const doc = await transaction.get(docRef);
          if (!doc.exists) return;
          const data = doc.data();
          if (data.status === 'deleted') return;

          const docId = userId ? `user_${userId}` : (deviceId ? `device_${deviceId}` : `ip_${ip}`);
          const actionDocRef = docRef.collection('views').doc(docId);
          const actionDoc = await transaction.get(actionDocRef);
          if (actionDoc.exists) return;

          transaction.update(docRef, {
            views: admin.firestore.FieldValue.increment(1),
          });
          transaction.set(actionDocRef, {
            userId: userId || null,
            deviceId: deviceId || null,
            ip: ip || 'unknown',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

              // ── Invalidate single campaign cache and update list cache ──
        await invalidateKey(`campaigns:id:${id}`);
        const campaignDoc = await db.collection('campaigns').doc(id).get();
        const data = campaignDoc.data();
        if (data && data.userId) {
          // Update the specific campaign in the user's list cache with new views
          await updateCampaignInUserListCache(data.userId, id, { views: (data.views || 0) });
          await invalidateKey(`stats:user:${data.userId}`);
        }
      } catch (err) {
        console.warn('View tracking failed:', err.message);
      }
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
});

// ── Create campaign ── (authenticated, with ban check + creation rate limit)
app.post('/api/campaigns', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkCampaignRateLimit(uid))) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. You can create up to 3 campaigns per minute. Please wait a moment.',
      });
    }
    const { templateId, shareCount, tasks, finalUrl, features, title, description, reward } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }
    const templateRef = db.collection('templates').doc(templateId);
    const templateDoc = await templateRef.get();
    if (!templateDoc.exists) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    const templateData = templateDoc.data();

    const { shareCount: scEnabled, tasks: tasksEnabled, finalUrl: fuEnabled } = features || {};
    if (typeof scEnabled !== 'boolean' || typeof tasksEnabled !== 'boolean' || typeof fuEnabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Features must include shareCount, tasks, finalUrl as booleans' });
    }
    if (!scEnabled && !tasksEnabled && !fuEnabled) {
      return res.status(400).json({ success: false, error: 'At least one feature must be enabled' });
    }

    let finalShareCount = 0;
    if (scEnabled) {
      if (shareCount === undefined || shareCount === null) {
        return res.status(400).json({ success: false, error: 'Share count is required when enabled' });
      }
      const num = Number(shareCount);
      if (!Number.isInteger(num) || num < 1 || num > 9999) {
        return res.status(400).json({ success: false, error: 'Share count must be a whole number between 1 and 9999' });
      }
      finalShareCount = num;
    }

    let finalTasks = [];
    if (tasksEnabled) {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one task is required when tasks are enabled' });
      }
      if (tasks.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 tasks allowed' });
      }
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (!task.text || typeof task.text !== 'string' || task.text.length < 1 || task.text.length > 250) {
          return res.status(400).json({ success: false, error: `Task ${i+1}: Text must be between 1 and 250 characters` });
        }
        if (!task.url || typeof task.url !== 'string') {
          return res.status(400).json({ success: false, error: `Task ${i+1}: URL is required` });
        }
        try { new URL(task.url); } catch {
          return res.status(400).json({ success: false, error: `Task ${i+1}: Invalid URL format` });
        }
      }
      finalTasks = tasks.map(t => ({ text: t.text.trim(), url: t.url.trim() }));
    }

    let finalFinalUrl = '';
    if (fuEnabled) {
      if (!finalUrl || typeof finalUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'Final URL is required when enabled' });
      }
      try {
        new URL(finalUrl);
        finalFinalUrl = finalUrl.trim();
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid final redirect URL format' });
      }
    }

    const finalTitle = title?.trim() || templateData.title || 'Untitled Campaign';
    const finalDescription = description?.trim() || templateData.description || '';
    const finalReward = reward?.trim() || templateData.reward || 'Exclusive Reward';

    const campaignData = {
      templateId,
      userId: uid,
      shareCount: finalShareCount,
      tasks: finalTasks,
      finalUrl: finalFinalUrl,
      features: { shareCount: scEnabled, tasks: tasksEnabled, finalUrl: fuEnabled },
      title: finalTitle,
      description: finalDescription,
      image: templateData.image || '',
      reward: finalReward,
      templateSlug: templateData.slug || 'campaign',
      status: 'active',
      views: 0,
      completions: 0,
      shares: 0,
      unlockCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('campaigns').add(campaignData);
    await templateRef.update({ usageCount: admin.firestore.FieldValue.increment(1) });

    // ── Invalidate user campaigns and stats ──
    await invalidatePattern(`campaigns:user:${uid}:*`);
    await invalidateKey(`stats:user:${uid}`);

    res.status(201).json({
      success: true,
      campaignId: docRef.id,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// ── Update campaign ── (authenticated, with ban check + rate limit)
app.put('/api/campaigns/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'campaign-update', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many updates. Please wait.' });
    }
    const updates = req.body;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const data = doc.data();
    if (data.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }
    if (data.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const allowedFields = ['title', 'description', 'reward', 'image', 'shareCount', 'tasks', 'finalUrl', 'status', 'features'];
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    filteredUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await doc.ref.update(filteredUpdates);

    // ── Invalidate caches ──
    await invalidatePattern(`campaigns:user:${uid}:*`);
    await invalidateKey(`campaigns:id:${id}`);
    await invalidateKey(`stats:user:${uid}`);

    res.json({ success: true, message: 'Campaign updated' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

// ── Delete campaign ── (authenticated, with ban check + rate limit)
app.delete('/api/campaigns/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'campaign-delete', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many deletions. Please wait.' });
    }
    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const data = doc.data();
    if (data.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    await doc.ref.update({
      status: 'deleted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Invalidate caches ──
    await invalidatePattern(`campaigns:user:${uid}:*`);
    await invalidateKey(`campaigns:id:${id}`);
    await invalidateKey(`stats:user:${uid}`);

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// ── Record share ── (public, IP rate limit)
app.post('/api/campaigns/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'share-post', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many share requests. Please wait.' });
    }

    // ── Determine acting user (verify token) ──
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        userId = decoded.uid;
      } catch (e) { /* ignore */ }
    }
    if (!userId) {
      userId = req.body.userId || null;
    }
    const deviceId = req.body.deviceId || null;

    // ── Get campaign to invalidate owner stats later ──
    const campaignDoc = await db.collection('campaigns').doc(id).get();
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const campaignData = campaignDoc.data();
    if (campaignData.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // ── Atomic transaction ──
    const result = await db.runTransaction(async (transaction) => {
      const docRef = db.collection('campaigns').doc(id);
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Campaign not found');
      const data = doc.data();
      if (data.status === 'deleted') throw new Error('Campaign not found');

      const docId = userId ? `user_${userId}` : (deviceId ? `device_${deviceId}` : `ip_${ip}`);
      const actionDocRef = docRef.collection('shares').doc(docId);
      const actionDoc = await transaction.get(actionDocRef);
      if (actionDoc.exists) {
        return { alreadyDone: true, shares: data.shares || 0, shareCount: data.shareCount || 0 };
      }

      const shareCountValue = data.shareCount || 0;
      const newShares = (data.shares || 0) + shareCountValue;
      transaction.update(docRef, {
        shares: newShares,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(actionDocRef, {
        userId: userId || null,
        deviceId: deviceId || null,
        ip: ip || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { alreadyDone: false, shares: newShares, shareCount: data.shareCount || 0 };
    });

    if (result.alreadyDone) {
      return res.json({
        success: true,
        shares: result.shares,
        shareCount: result.shareCount,
        message: 'Already shared',
      });
    }

    // ── Invalidate caches and update list cache ──
    await invalidateKey(`campaigns:sharecount:${id}`);
    await invalidateKey(`campaigns:id:${id}`);
    if (campaignData.userId) {
      // Update the specific campaign in the user's list cache with new shares
      await updateCampaignInUserListCache(campaignData.userId, id, { shares: result.shares });
      await invalidateKey(`stats:user:${campaignData.userId}`);
    }

    res.json({
      success: true,
      shares: result.shares,
      shareCount: result.shareCount,
    });
  } catch (error) {
    console.error('❌ Share error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to record share' });
  }
});

// ── Get share count ── (public, IP rate limit)
app.get('/api/campaigns/:id/share-count', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'share-count-get', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const cacheKey = `campaigns:sharecount:${id}`;
    const result = await getOrSetCache(cacheKey, async () => {
      const doc = await db.collection('campaigns').doc(id).get();
      if (!doc.exists) {
        return { success: false, error: 'Campaign not found' };
      }
      const data = doc.data();
      if (data.status === 'deleted') {
        return { success: false, error: 'Campaign not found' };
      }
      return {
        success: true,
        shares: data.shares || 0,
        shareCount: data.shareCount || 0,
        isComplete: (data.shares || 0) >= (data.shareCount || 0),
      };
    });
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error getting share count:', error);
    res.status(500).json({ success: false, error: 'Failed to get share count' });
  }
});

// ── Complete campaign ── (public, IP rate limit)
app.post('/api/campaigns/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'complete-post', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many complete requests. Please wait.' });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        userId = decoded.uid;
      } catch (e) { /* ignore */ }
    }
    if (!userId) {
      userId = req.body.userId || null;
    }
    const deviceId = req.body.deviceId || null;

    const campaignDoc = await db.collection('campaigns').doc(id).get();
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const campaignData = campaignDoc.data();
    if (campaignData.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    await db.runTransaction(async (transaction) => {
      const docRef = db.collection('campaigns').doc(id);
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Campaign not found');
      const data = doc.data();
      if (data.status === 'deleted') throw new Error('Campaign not found');

      const docId = userId ? `user_${userId}` : (deviceId ? `device_${deviceId}` : `ip_${ip}`);
      const actionDocRef = docRef.collection('completions').doc(docId);
      const actionDoc = await transaction.get(actionDocRef);
      if (actionDoc.exists) throw new Error('Already completed');

      transaction.update(docRef, {
        completions: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(actionDocRef, {
        userId: userId || null,
        deviceId: deviceId || null,
        ip: ip || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

        await invalidateKey(`campaigns:id:${id}`);
    if (campaignData.userId) {
      // Compute new completions (increment by 1)
      const newCompletions = (campaignData.completions || 0) + 1;
      await updateCampaignInUserListCache(campaignData.userId, id, { completions: newCompletions });
      await invalidateKey(`stats:user:${campaignData.userId}`);
    }

    res.json({ success: true, message: 'Campaign completed!' });
  } catch (error) {
    console.error('❌ Complete error:', error);
    if (error.message === 'Already completed') {
      return res.json({ success: true, message: 'Already completed' });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to record completion' });
  }
});

// ── Unlock campaign ── (public, IP rate limit)
app.post('/api/campaigns/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'unlock-post', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many unlock requests. Please wait.' });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        userId = decoded.uid;
      } catch (e) { /* ignore */ }
    }
    if (!userId) {
      userId = req.body.userId || null;
    }
    const deviceId = req.body.deviceId || null;

    const campaignDoc = await db.collection('campaigns').doc(id).get();
    if (!campaignDoc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const campaignData = campaignDoc.data();
    if (campaignData.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    await db.runTransaction(async (transaction) => {
      const docRef = db.collection('campaigns').doc(id);
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Campaign not found');
      const data = doc.data();
      if (data.status === 'deleted') throw new Error('Campaign not found');

      const docId = userId ? `user_${userId}` : (deviceId ? `device_${deviceId}` : `ip_${ip}`);
      const actionDocRef = docRef.collection('unlocks').doc(docId);
      const actionDoc = await transaction.get(actionDocRef);
      if (actionDoc.exists) throw new Error('Already unlocked');

      transaction.update(docRef, {
        unlockCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(actionDocRef, {
        userId: userId || null,
        deviceId: deviceId || null,
        ip: ip || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

        await invalidateKey(`campaigns:id:${id}`);
    if (campaignData.userId) {
      // Compute new unlocks (increment by 1)
      const newUnlocks = (campaignData.unlockCount || 0) + 1;
      await updateCampaignInUserListCache(campaignData.userId, id, { unlockCount: newUnlocks });
      await invalidateKey(`stats:user:${campaignData.userId}`);
    }

    res.json({ success: true, message: 'Campaign unlocked!' });
  } catch (error) {
    console.error('❌ Unlock error:', error);
    if (error.message === 'Already unlocked') {
      return res.json({ success: true, message: 'Already unlocked' });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to record unlock' });
  }
});

// ============================================================
// 14. USER STATS (cached, with ban check + rate limit)
// ============================================================
app.get('/api/stats', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'stats-get', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const cacheKey = `stats:user:${uid}`;
    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching stats for user ${uid} from Firestore...`);
      const snapshot = await db.collection('campaigns')
        .where('userId', '==', uid)
        .get();

      let totalCampaigns = 0;
      let totalViews = 0;
      let totalUnlocks = 0;
      let totalShares = 0;
      let totalCompletions = 0;
      let successfulCampaigns = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'deleted') return;
        totalCampaigns++;
        totalViews += data.views || 0;
        totalUnlocks += data.unlockCount || 0;
        totalShares += data.shares || 0;
        totalCompletions += data.completions || 0;
        if (data.shareCount > 0 && (data.shares || 0) >= data.shareCount) {
          successfulCampaigns++;
        }
      });

      return {
        success: true,
        stats: {
          totalCampaigns,
          totalViews,
          totalUnlocks,
          totalShares,
          totalCompletions,
          successfulCampaigns,
        },
      };
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 15. SUPPORT TICKETS
// ============================================================

// ── Get tickets ── (authenticated, with ban check + rate limit)
app.get('/api/support', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'support-get', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const cacheKey = `support:user:${uid}`;
    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching support tickets for user ${uid} from Firestore...`);
      const snapshot = await db.collection('supportTickets')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();

      const tickets = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          image: data.image || '',
          status: data.status || 'open',
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        });
      });
      return { success: true, tickets };
    });
    res.json(result);
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// ── Create ticket ── (authenticated, with ban check + rate limit)
app.post('/api/support', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'support', 3, 3600))) {
      return res.status(429).json({ success: false, error: 'Too many tickets. Please wait an hour.' });
    }

    const { title, description, image } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    const ticketData = {
      userId: uid,
      title: title.trim(),
      description: description.trim(),
      image: image || '',
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('supportTickets').add(ticketData);
    const newTicket = { id: docRef.id, ...ticketData };
    await invalidateKey(`support:user:${uid}`);
    res.status(201).json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

// ============================================================
// 16. COMMENTS
// ============================================================

// ── Get comments ── (public, IP rate limit)
app.get('/api/comments', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'comments-get', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const cacheKey = 'comments:all';
    const result = await getOrSetCache(cacheKey, async () => {
      console.log('📡 Fetching comments from Firestore...');
      const snapshot = await db.collection('comments')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      const comments = [];
      snapshot.forEach(doc => {
        comments.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, comments };
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Get comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Post comment ── (public, IP rate limit)
app.post('/api/comments', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'comment', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many comments. Please wait.' });
    }

    const { name, comment, rating } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
    }
    if (!comment || comment.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Comment must be at least 3 characters' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be a whole number between 1 and 5' });
    }

    const sanitisedName = sanitizeCommentInput(name.trim());
    const sanitisedComment = sanitizeCommentInput(comment.trim());

    const commentData = {
      name: sanitisedName,
      comment: sanitisedComment,
      rating: ratingNum,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('comments').add(commentData);
    const newComment = { id: docRef.id, ...commentData };
    await invalidateKey('comments:all');
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('❌ Post comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 17. CLOUDINARY UPLOAD
// ============================================================
app.post('/api/upload', verifyToken, checkBanned, upload.single('image'), async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'upload', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many uploads. Please wait a moment.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    // ── Validate image content (sharp) ──
    try {
      await sharp(req.file.buffer).metadata();
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid image file' });
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
// 18. GLOBAL ERROR HANDLER
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
// 19. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🔒 Allowed origins:`, allowedOrigins);
  console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`✅ Security: Helmet, CORS, Rate Limiting, XSS Protection`);
  console.log(`📦 Redis: INDEFINITE CACHE with smart invalidation`);
});