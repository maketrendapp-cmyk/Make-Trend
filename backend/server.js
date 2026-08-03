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
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// ── Ensure DEVICE_SECRET is set (fallback for development only) ──
if (!process.env.DEVICE_SECRET) {
  console.warn('⚠️ DEVICE_SECRET not set – using a random fallback (insecure!). Set it in production.');
  process.env.DEVICE_SECRET = require('crypto').randomBytes(32).toString('hex');
}
console.log('🔐 DEVICE_SECRET set:', process.env.DEVICE_SECRET ? 'Yes' : 'No');

// ── Global error handlers for uncaught exceptions ──
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

// ============================================================
// 0. REDIS CLIENT (with timeout guard)
// ============================================================
// ── Redis client with robust retry and longer timeouts ──
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  connectTimeout: 5000,        // 5 seconds to connect
  commandTimeout: 3000,        // 3 seconds for commands
  maxRetriesPerRequest: 3,     // retry failed requests up to 3 times
  retryStrategy: (times) => {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ... up to 30s
    const delay = Math.min(times * 50, 30000);
    console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  keepAlive: 30000,            // keep connection alive
});

redis.on('error', (err) => {
  console.warn('⚠️ Redis error (will retry):', err.message);
});
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('ready', () => console.log('✅ Redis ready'));
redis.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

// ── Redis get with 1s timeout (increased from 500ms) ──
async function redisGet(key) {
  return Promise.race([
    redis.get(key),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
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
    await redis.set(key, JSON.stringify(data)); // indefinite TTL – invalidated on changes
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

// ── Helper to parse campaign cache key ──
function parseCampaignCacheKey(key) {
  // Example: campaigns:user:abc123:limit:25:lastCreatedAt:null:lastId:null
  const parts = key.split(':');
  const uid = parts[2]; // index 2
  let limit = 25;
  let lastCreatedAt = null;
  let lastId = null;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'limit') limit = parseInt(parts[i+1]) || 25;
    if (parts[i] === 'lastCreatedAt') lastCreatedAt = parts[i+1] === 'null' ? null : parts[i+1];
    if (parts[i] === 'lastId') lastId = parts[i+1] === 'null' ? null : parts[i+1];
  }
  return { uid, limit, lastCreatedAt, lastId };
}

// ── Find all cache keys for a user ──
async function findUserCacheKeys(uid) {
  const pattern = `campaigns:user:${uid}:*`;
  return await redis.keys(pattern);
}

// ── Find the first page key (no cursor) ──
async function findFirstPageKey(uid) {
  const keys = await findUserCacheKeys(uid);
  for (const key of keys) {
    const parsed = parseCampaignCacheKey(key);
    if (parsed.lastCreatedAt === null && parsed.lastId === null) {
      return key;
    }
  }
  return null;
}

// ── Add a campaign to the user's list cache (first page) ──
// ── Add a campaign to the user's list cache (first page) ──
async function addCampaignToUserListCache(uid, campaign) {
  try {
    const firstPageKey = await findFirstPageKey(uid);

    // ── If cache doesn't exist, CREATE it ──
    if (!firstPageKey) {
      console.log(`📦 No cache exists for user ${uid}, creating new cache entry`);
      const newCacheKey = `campaigns:user:${uid}:limit:25:lastCreatedAt:null:lastId:null`;
      const newData = {
        success: true,
        campaigns: [campaign],
        hasMore: false,
        lastCreatedAt: null,
        lastId: null,
      };
      await redis.set(newCacheKey, JSON.stringify(newData), 'EX', 86400);
      console.log(`✅ Created new cache entry with campaign ${campaign.id} for user ${uid}`);
      return;
    }

    // ── Cache exists – update it ──
    const ttl = await redis.ttl(firstPageKey);
    const cached = await redis.get(firstPageKey);
    if (!cached) return;

    let data = JSON.parse(cached);
    if (data.campaigns && Array.isArray(data.campaigns)) {
      // Add to the beginning (most recent)
      data.campaigns = [campaign, ...data.campaigns];
      // If the list exceeds the limit, remove the last element
      const limit = parseCampaignCacheKey(firstPageKey).limit || 25;
      if (data.campaigns.length > limit) {
        data.campaigns = data.campaigns.slice(0, limit);
      }
      const ttlToUse = ttl > 0 ? ttl : 86400;
      await redis.set(firstPageKey, JSON.stringify(data), 'EX', ttlToUse);
      console.log(`🔄 Added campaign ${campaign.id} to user ${uid} list cache`);
    }
  } catch (error) {
    console.warn(`Failed to add campaign to user list cache:`, error);
  }
}

// ── Remove a campaign from the user's list cache (all pages) ──
async function removeCampaignFromUserListCache(uid, campaignId) {
  try {
    const keys = await findUserCacheKeys(uid);
    if (keys.length === 0) return;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      const cached = await redis.get(key);
      if (!cached) continue;

      let data = JSON.parse(cached);
      if (data.campaigns && Array.isArray(data.campaigns)) {
        const originalLength = data.campaigns.length;
        data.campaigns = data.campaigns.filter(c => c.id !== campaignId);
        if (data.campaigns.length < originalLength) {
          const ttlToUse = ttl > 0 ? ttl : 86400;
          await redis.set(key, JSON.stringify(data), 'EX', ttlToUse);
          console.log(`🔄 Removed campaign ${campaignId} from cache ${key}`);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to remove campaign from user list cache:`, error);
  }
}

// ── Update a specific template in all cached template list pages ──
async function updateTemplateInAllCaches(templateId, updates) {
  try {
    const pattern = 'templates:*';
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      const cached = await redis.get(key);
      if (!cached) continue;

      let data = JSON.parse(cached);
      if (data.templates && Array.isArray(data.templates)) {
        let updated = false;
        data.templates = data.templates.map(t => {
          if (t.id === templateId) {
            updated = true;
            return { ...t, ...updates };
          }
          return t;
        });
        if (updated) {
          const ttlToUse = ttl > 0 ? ttl : 86400; // keep existing TTL, default 24h
          await redis.set(key, JSON.stringify(data), 'EX', ttlToUse);
          console.log(`🔄 Updated template ${templateId} in cache ${key}`);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to update template ${templateId} in cache:`, error);
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

// ── Enforce HTTPS in production ──
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
});

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
// ── Response-time logging ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`⚠️ Slow API: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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

// ── Grant PRO for 24 hours ──
async function grantProFor24Hours(uid) {
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.collection('users').doc(uid).update({
    plan: 'pro',
    proExpiry: admin.firestore.Timestamp.fromDate(expiry),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await invalidateKey(`user:profile:${uid}`);
  console.log(`👑 PRO granted for 24h to ${uid}`);
}

// ── Get client IP ──
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.ip ||
         req.connection?.remoteAddress ||
         'unknown';
}

// ── Validate device ID (mandatory, proper fingerprint format) ──
function validateDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') return false;
  const trimmed = deviceId.trim();
  if (trimmed.length < 5) return false;
  // Reject common placeholders
  const invalid = ['null', 'undefined', 'none', 'n/a', 'unknown', 'not-provided'];
  if (invalid.includes(trimmed.toLowerCase())) return false;
  return true;
}


// ── Enhanced middleware: token‑first, deviceId recovery, no fallback ──
const injectDeviceIdFromToken = async (req, res, next) => {
  const ip = getClientIp(req);
  let token = req.cookies.device_token || req.headers['x-device-token'];
  const clientDeviceId = req.body.deviceId || req.headers['x-device-id']; // FingerprintJS value

  // 1. Token present → validate and use it (ignore clientDeviceId)
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.DEVICE_SECRET);
      req.deviceId = decoded.deviceId;
      req.body.deviceId = decoded.deviceId;
      req.headers['x-device-id'] = decoded.deviceId;
      req.ip = ip;
      return next();
    } catch (e) {
      console.warn('⚠️ Invalid token, attempting deviceId recovery...');
    }
  }

  // 2. No token → require a valid clientDeviceId (fingerprint)
  if (!clientDeviceId || typeof clientDeviceId !== 'string' || clientDeviceId.length < 5) {
    return res.status(400).json({
      success: false,
      error: 'Valid device ID is required. Please refresh your browser.',
    });
  }

  // 3. Rate‑limit new device creation per IP (5 per hour)
  if (!(await checkRateLimit(ip, 'new-device', 5, 3600))) {
    return res.status(429).json({
      success: false,
      error: 'Too many new devices from this IP. Please try later.',
    });
  }

  // 4. Look up or create device mapping in Firestore
  const doc = await db.collection('deviceMappings').doc(clientDeviceId).get();
  let deviceId = clientDeviceId;
  if (!doc.exists) {
    await db.collection('deviceMappings').doc(deviceId).set({
      deviceId: deviceId,
      ip: ip,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    deviceId = doc.data().deviceId; // should match clientDeviceId
  }

  // 5. Issue a new token for this device
  const newToken = jwt.sign(
    { deviceId, iat: Date.now() },
    process.env.DEVICE_SECRET,
    { expiresIn: '365d' }
  );
  res.cookie('device_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  req.deviceId = deviceId;
  req.body.deviceId = deviceId;
  req.headers['x-device-id'] = deviceId;
  req.ip = ip;
  next();
};

// ── Manual device registration with IP rate‑limit ──
app.post('/api/device/register', async (req, res) => {
  const ip = getClientIp(req);
  const clientDeviceId = req.body.deviceId || req.headers['x-device-id'];
  
  if (!clientDeviceId || typeof clientDeviceId !== 'string' || clientDeviceId.length < 5) {
    return res.status(400).json({ success: false, error: 'Valid device ID is required.' });
  }
  
  if (!(await checkRateLimit(ip, 'device-register', 5, 3600))) {
    return res.status(429).json({ success: false, error: 'Too many registrations from this IP.' });
  }
  
  // Check if mapping exists, create if not
  const doc = await db.collection('deviceMappings').doc(clientDeviceId).get();
  const deviceId = doc.exists ? doc.data().deviceId : clientDeviceId;
  if (!doc.exists) {
    await db.collection('deviceMappings').doc(deviceId).set({
      deviceId: deviceId,
      ip: ip,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  
  const token = jwt.sign(
    { deviceId, iat: Date.now() },
    process.env.DEVICE_SECRET,
    { expiresIn: '365d' }
  );
  // Detect if the request is cross-origin (frontend on different domain)
  const isCrossOrigin = req.headers.origin && !req.headers.origin.includes(req.get('host'));
  const isSecure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';

  res.cookie('device_token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isCrossOrigin ? 'none' : 'lax',
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({ success: true, deviceId });
});

// ── Extract device ID from request (body or headers) ──
function extractDeviceId(req) {
  return req.body?.deviceId || req.headers['x-device-id'] || null;
}

// ── Middleware to require device ID ──
function requireDeviceId(req, res, next) {
  const deviceId = extractDeviceId(req);
  if (!validateDeviceId(deviceId)) {
    return res.status(400).json({
      success: false,
      error: 'Valid device ID is required. Please refresh your browser and try again.'
    });
  }
  req.deviceId = deviceId;
  next();
}

// ── Validate image URL (prevent malicious/invalid URLs) ──
function validateImageUrl(url) {
  if (!url) return true; // empty is allowed (optional field)
  try {
    const parsed = new URL(url);
    // Only allow HTTPS URLs (no data:, javascript:, etc.)
    if (parsed.protocol !== 'https:') return false;

    // ── Allowed social media and CDN hosts ──
    const allowedHosts = [
      'cloudinary.com',
      'res.cloudinary.com',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'pbs.twimg.com',
      'abs.twimg.com',
    ];
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost = allowedHosts.some(host => hostname.includes(host));

    // ── Or it must have a valid image extension ──
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico)(\?.*)?$/i.test(parsed.pathname);

    return isAllowedHost || isImage;
  } catch {
    return false;
  }
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
    return false; // ❌ Block on error to prevent abuse
  }
}

// ── Global per‑IP rate limit (hard cap on total actions) ──
async function checkGlobalRateLimit(ip, action, limit, windowSeconds) {
  const key = `global:${action}:${ip}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);
  return current <= limit;
}

// ── Combined (deviceId + IP) rate limit ──
async function checkCombinedRateLimit(deviceId, ip, action, limit, windowSeconds) {
  const key = `rate:${action}:${deviceId}:${ip}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);
  return current <= limit;
}

// ── Daily cap per (deviceId, IP)
async function checkDailyLimit(deviceId, ip, action, limit) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily:${action}:${deviceId}:${ip}:${today}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
  return count <= limit;
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
const banCache = new Map();

async function checkBanned(req, res, next) {
  try {
    const uid = req.user.uid;
    let banned = banCache.get(uid);
    if (banned === undefined) {
      banned = await isUserBanned(uid);
      banCache.set(uid, banned);
      setTimeout(() => banCache.delete(uid), 60000); // clear after 30s
    }
    if (banned) {
      return res.status(403).json({ success: false, error: 'Your account has been suspended.' });
    }
    next();
  } catch (error) {
    console.error('Ban check error:', error);
    next();
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

// ── Cooldown check for device actions (minimum gap in seconds) ──
async function checkActionCooldown(campaignId, deviceId, minInterval = 2) {
  if (!deviceId) return true; // Shouldn't happen (we validate)
  const key = `cooldown:${campaignId}:${deviceId}`;
  try {
    const last = await redis.get(key);
    if (last) {
      const elapsed = (Date.now() - parseInt(last)) / 1000;
      if (elapsed < minInterval) {
        console.warn(`⏱️ Cooldown: device ${deviceId} on campaign ${campaignId} tried action too fast (${elapsed.toFixed(2)}s)`);
        return false;
      }
    }
    // Update timestamp with TTL slightly longer than cooldown
    await redis.set(key, Date.now().toString(), 'EX', minInterval + 1);
    return true;
  } catch (error) {
    console.warn('Cooldown check failed, allowing:', error);
    return true; // Fail-open
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
    const cacheKey = `check-username:${username}`;
    let cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const snapshot = await db.collection('users').where('username', '==', username).limit(1).get();
    const available = snapshot.empty;
    const response = { success: true, available };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
    res.json(response);
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
    const cacheKey = `check-email:${email}`;
    let cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    const exists = !snapshot.empty;
    const response = { success: true, exists };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
    res.json(response);
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Register new user ── (rate-limited by authLimiter)
app.post('/api/auth/register', injectDeviceIdFromToken, async (req, res) => {
  try {
    const { uid, username, fullname, email, avatar, referralCode: referredByCode, deviceId } = req.body;

    // ── Require valid device ID ──
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required. Please refresh your browser and try again.'
      });
    }
    const cleanUsername = sanitizeUsername(username);
    const cleanFullname = sanitizeFullName(fullname);
    const cleanEmail = email?.trim().toLowerCase();

    if (!uid || !cleanUsername || !cleanFullname || !cleanEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    // ── Validate avatar URL ──
    if (avatar && !validateImageUrl(avatar)) {
      return res.status(400).json({ success: false, error: 'Invalid avatar URL' });
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
      deviceId: deviceId || '',   // store as deviceFingerprint
      completed: true,
      plan: 'free',
      mtCoinsEarned: 0,           // default (will be set to 100 if referral is valid)
      mtCoinsSpent: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
    };

    let bonusAwarded = false;

    // ── Process referral reward (increment referrer count, grant PRO, give bonus to new user) ──
    if (cleanReferredBy) {
      console.log(`🔍 Referral processing: code="${cleanReferredBy}" from device "${req.body.deviceId || 'none'}"`);
      try {
        const referrerSnapshot = await db.collection('users')
          .where('referralCode', '==', cleanReferredBy)
          .limit(1)
          .get();
        if (!referrerSnapshot.empty) {
          const referrerUid = referrerSnapshot.docs[0].id;
          const referrerData = referrerSnapshot.docs[0].data();
          console.log(`✅ Referrer found: uid=${referrerUid}, deviceId="${referrerData.deviceId || 'none'}"`);

          // ── Check if the referrer is using the same device (self-referral prevention) ──
          const referrerDeviceId = referrerData.deviceId || '';
          const newUserDeviceId = req.body.deviceId || '';
          // Only treat as same device if BOTH IDs are present and equal
          const isSameDevice = referrerDeviceId && newUserDeviceId &&
                               referrerDeviceId === newUserDeviceId;

          if (isSameDevice) {
            console.warn(`⚠️ Self‑referral blocked: same device "${newUserDeviceId}" for referrer ${referrerUid}`);
            await invalidateKey(`referrals:${referrerUid}`);
          } else {
            // ── Check if this device already used this referral code ──
            const existingReferralQuery = await db.collection('users')
              .where('referredBy', '==', cleanReferredBy)
              .where('deviceId', '==', newUserDeviceId)
              .limit(1)
              .get();

            if (!existingReferralQuery.empty) {
              console.warn(`⚠️ Duplicate device referral blocked: device "${newUserDeviceId}" already used for code "${cleanReferredBy}"`);
              await invalidateKey(`referrals:${referrerUid}`);
            } else {
              // ── Give 100 MT Coins bonus to the new user ──
              bonusAwarded = true;
              userData.mtCoinsEarned = 100;

              // ── Atomically increment referrals count ──
              const currentReferrals = referrerData.referrals || 0;
              const newReferrals = currentReferrals + 1;
              console.log(`📊 Updating referrals: ${currentReferrals} → ${newReferrals}`);

              await db.collection('users').doc(referrerUid).update({
                referrals: newReferrals,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`✅ Referral count updated to ${newReferrals} for user ${referrerUid}`);

              // ── Grant PRO for every 5 referrals ──
              if (newReferrals % 5 === 0) {
                await grantProFor24Hours(referrerUid);
                console.log(`🎉 User ${referrerUid} got PRO for 24h (${newReferrals} referrals)`);
              }

              // ── Invalidate caches ──
              await invalidateKey(`referrals:${referrerUid}`);
              await invalidateKey(`user:profile:${referrerUid}`);
              console.log(`🗑️ Caches invalidated for referrer ${referrerUid}`);
            }
          }
        } else {
          console.warn(`❌ Referrer not found for code: "${cleanReferredBy}"`);
        }
      } catch (err) {
        console.error('🔥 Referral processing error:', err.message);
        console.error(err.stack);
        // Do NOT throw – we don't want to fail the registration, just log the error
      }
    }

    await db.collection('users').doc(uid).set(userData);
    delete userData.deviceId;

    if (bonusAwarded) {
      console.log(`🎁 New user ${uid} received 100 MT Coins referral bonus`);
    }

    res.status(201).json({ success: true, user: userData });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ── Complete social profile ── (authenticated, with rate limit and ban check)
app.post('/api/auth/complete-social', verifyToken, checkBanned, injectDeviceIdFromToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    // ── Rate limit: 10 completions per minute ──
    if (!(await checkRateLimit(uid, 'complete-social', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many attempts. Please wait.' });
    }
    const { email, fullname, username, avatar, referralCode: referredByCode, deviceId } = req.body;

    // ── Require valid device ID ──
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required. Please refresh your browser and try again.'
      });
    }
    const cleanUsername = sanitizeUsername(username);
    const cleanFullname = sanitizeFullName(fullname);
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanUsername || !cleanFullname || !cleanEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    // ── Validate avatar URL ──
    if (avatar && !validateImageUrl(avatar)) {
      return res.status(400).json({ success: false, error: 'Invalid avatar URL' });
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
      deviceId: deviceId || '',   // store as deviceFingerprint
      completed: true,
      plan: 'free',
      mtCoinsEarned: 0,           // default (will be set to 100 if referral is valid)
      mtCoinsSpent: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
    };

    let bonusAwarded = false;

    // ── Process referral reward (increment count, grant PRO, give bonus to new user) ──
    if (cleanReferredBy) {
      console.log(`🔍 Referral processing: code="${cleanReferredBy}" from device "${req.body.deviceId || 'none'}"`);
      try {
        const referrerSnapshot = await db.collection('users')
          .where('referralCode', '==', cleanReferredBy)
          .limit(1)
          .get();
        if (!referrerSnapshot.empty) {
          const referrerUid = referrerSnapshot.docs[0].id;
          const referrerData = referrerSnapshot.docs[0].data();
          const newUserDeviceId = req.body.deviceId || '';
          console.log(`✅ Referrer found: uid=${referrerUid}, deviceId="${referrerData.deviceId || 'none'}"`);

          // ── Check 1: Self‑referral (referrer's own device) ──
          const referrerDeviceId = referrerData.deviceId || '';
          const isSelfReferral = referrerDeviceId && newUserDeviceId &&
                                 referrerDeviceId === newUserDeviceId;

          if (isSelfReferral) {
            console.warn(`⚠️ Self‑referral blocked: same device "${newUserDeviceId}" for referrer ${referrerUid}`);
            await invalidateKey(`referrals:${referrerUid}`);
          } else {
            // ── Check 2: Has this device already used this referral code? ──
            // Prevent multiple accounts from the same device from earning multiple bonuses.
            const existingReferralQuery = await db.collection('users')
              .where('referredBy', '==', cleanReferredBy)
              .where('deviceId', '==', newUserDeviceId)
              .limit(1)
              .get();

            if (!existingReferralQuery.empty) {
              console.warn(`⚠️ Duplicate device referral blocked: device "${newUserDeviceId}" already used for code "${cleanReferredBy}"`);
              await invalidateKey(`referrals:${referrerUid}`);
            } else {
              // ── Give 100 MT Coins bonus to the new user ──
              bonusAwarded = true;
              userData.mtCoinsEarned = 100;

              // ── All checks passed: increment referral count ──
              const currentReferrals = referrerData.referrals || 0;
              const newReferrals = currentReferrals + 1;
              console.log(`📊 Updating referrals: ${currentReferrals} → ${newReferrals}`);

              await db.collection('users').doc(referrerUid).update({
                referrals: newReferrals,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`✅ Referral count updated to ${newReferrals} for user ${referrerUid}`);

              // ── Grant PRO for every 5 referrals ──
              if (newReferrals % 5 === 0) {
                await grantProFor24Hours(referrerUid);
                console.log(`🎉 User ${referrerUid} got PRO for 24h (${newReferrals} referrals)`);
              }

              // ── Invalidate caches ──
              await invalidateKey(`referrals:${referrerUid}`);
              await invalidateKey(`user:profile:${referrerUid}`);
              console.log(`🗑️ Caches invalidated for referrer ${referrerUid}`);
            }
          }
        } else {
          console.warn(`❌ Referrer not found for code: "${cleanReferredBy}"`);
        }
      } catch (err) {
        console.error('🔥 Referral processing error:', err.message);
        console.error(err.stack);
        // Do NOT throw – we don't want to fail the registration
      }
    }

    await db.collection('users').doc(uid).set(userData, { merge: true });

    if (bonusAwarded) {
      console.log(`🎁 New user ${uid} received 100 MT Coins referral bonus via social completion`);
    }

    // Invalidate profile cache so the next request gets fresh data
    await invalidateKey(`user:profile:${uid}`);
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

    // ── Always fetch fresh from Firestore ──
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = doc.data();
    delete userData.deviceId;

    // ── Auto‑downgrade expired PRO ──
    if (userData.plan === 'pro' && userData.proExpiry) {
      const now = admin.firestore.Timestamp.now();
      if (userData.proExpiry.toMillis() < now.toMillis()) {
        await doc.ref.update({
          plan: 'free',
          proExpiry: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        userData.plan = 'free';
        delete userData.proExpiry;
        console.log(`⏰ PRO expired for user ${uid}, downgraded to free`);
      }
    }

    res.json({ success: true, user: { uid, ...userData } });
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
app.post('/api/auth/record-login', verifyToken, checkBanned, async (req, res) => {
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
    if (!(await checkRateLimit(ip, 'profile-check', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const uid = req.query.uid;
    if (!uid) {
      return res.status(400).json({ success: false, error: 'Missing uid' });
    }
    const cacheKey = `profile-status:${uid}`;
    let cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      const response = { success: true, completed: false, username: null };
      await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
      return res.json(response);
    }
    const data = doc.data();
    const response = {
      success: true,
      completed: data.completed || false,
      username: data.username || null,
    };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
    res.json(response);
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
    // ── Validate avatar URL ──
    if (avatar && !validateImageUrl(avatar)) {
      return res.status(400).json({ success: false, error: 'Invalid avatar URL' });
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
    const cacheKey = `referrals:${uid}`;
    let cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const referralCode = userData.referralCode;

    if (!referralCode) {
      const response = { success: true, referralCode: '', totalReferrals: 0, referredUsers: [], referrer: null };
      await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
      return res.json(response);
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

    const response = {
      success: true,
      referralCode,
      totalReferrals: referredUsers.length,
      referredUsers,
      referrer,
    };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
    res.json(response);
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
    // ── Build cache key from all filter parameters ──
    const { category, platform, highlight, plan, limit, all } = req.query;
    const filterKey = [
      'templates',
      all === 'true' ? 'all' : 'active',
      category || '',
      platform || '',
      highlight || '',
      plan || '',
      limit || 50
    ].join(':');
    const cacheKey = filterKey;
    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching templates from Firestore (${all === 'true' ? 'all' : 'active'})...`);
      let query = db.collection('templates');
      // Only filter by isActive if not requesting all
      if (all !== 'true') {
        query = query.where('isActive', '==', true);
      }
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
    // ── Validate image URL ──
    if (image && !validateImageUrl(image)) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
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

    // ── Validate image URL if provided ──
    if (updates.image && !validateImageUrl(updates.image)) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
    }

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

// ── Removed: template usage is now incremented internally via POST /api/campaigns ──

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
  await redis.set(cacheKey, JSON.stringify(response)); // indefinite TTL – invalidated on changes
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
        await redis.set(cacheKey, JSON.stringify(result));
        console.log(`💾 Campaign cached (60s TTL): ${id}`);
      } catch (err) { /* ignore */ }
    }

    // ── Return the result immediately ──
    res.json(result);
    
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
    if (templateData.isActive !== true) {
      return res.status(400).json({ success: false, error: 'Template is not available' });
    }

    // ── Validation (unchanged) ──
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

    // ── Firestore writes (fast) ──
    const docRef = await db.collection('campaigns').add(campaignData);
    await templateRef.update({ usageCount: admin.firestore.FieldValue.increment(1) });

    const campaignId = docRef.id;

    // ── ✅ IMMEDIATE RESPONSE (no waiting for cache updates) ──
    res.status(201).json({
      success: true,
      campaignId,
      message: 'Campaign created successfully',
    });

    // ── BACKGROUND: Async cache updates (non‑blocking) ──
    setImmediate(async () => {
      try {
        // Fetch the newly created campaign with server timestamps
        const docSnapshot = await docRef.get();
        const actualCampaignData = docSnapshot.data();
        const newCampaign = { id: campaignId, ...actualCampaignData };

        // ── Update user's list cache ──
        await addCampaignToUserListCache(uid, newCampaign);

        // ── Invalidate user stats cache ──
        await invalidateKey(`stats:user:${uid}`);

        // ── Update template usage in cache (only affected template) ──
        const updatedTemplateDoc = await templateRef.get();
        const newUsageCount = updatedTemplateDoc.data().usageCount || 0;
        await updateTemplateInAllCaches(templateId, { usageCount: newUsageCount });

        console.log(`✅ Background cache updates completed for campaign ${campaignId}`);
      } catch (err) {
        console.error('❌ Background cache update failed:', err);
      }
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

    // ── Update the specific campaign in the list cache ──
    await updateCampaignInUserListCache(uid, id, filteredUpdates);
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

    // ── Remove the campaign from the user's list cache ──
    await removeCampaignFromUserListCache(uid, id);
    await invalidateKey(`campaigns:id:${id}`);
    await invalidateKey(`stats:user:${uid}`);

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// ── Record share ── (public, IP rate limit)
app.post('/api/campaigns/:id/share', injectDeviceIdFromToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'share-post', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many share requests. Please wait.' });
    }

    // ── Require valid device ID ──
    const deviceId = req.body.deviceId || null;
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required. Please refresh your browser and try again.'
      });
    }

    // ── Cooldown check ──
    if (!(await checkActionCooldown(id, deviceId))) {
      return res.status(429).json({
        success: false,
        error: 'Too many actions. Please wait a moment between actions.'
      });
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

    // ── Update campaign cache with new shares (in‑place) ──
    const cacheKey = `campaigns:id:${id}`;
    try {
      const cachedStr = await redis.get(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.campaign) {
          cached.campaign.shares = result.shares;
          const ttl = await redis.ttl(cacheKey);
          await redis.set(cacheKey, JSON.stringify(cached), 'EX', ttl > 0 ? ttl : 86400);
          console.log(`🔄 Updated campaign cache for ${id} (shares: ${result.shares})`);
        }
      }
    } catch (e) { /* ignore */ }

    // ── Update list cache and stats cache (in‑place) ──
    await invalidateKey(`campaigns:sharecount:${id}`); // this is a separate cache, okay to invalidate
    if (campaignData.userId) {
      await updateCampaignInUserListCache(campaignData.userId, id, { shares: result.shares });

      // ── Update stats cache (increment totalShares) ──
      try {
        const statsCacheKey = `stats:user:${campaignData.userId}`;
        const statsCached = await redis.get(statsCacheKey);
        if (statsCached) {
          const stats = JSON.parse(statsCached);
          if (stats.stats && typeof stats.stats.totalShares === 'number') {
            stats.stats.totalShares += 1;
            const ttl = await redis.ttl(statsCacheKey);
            await redis.set(statsCacheKey, JSON.stringify(stats), 'EX', ttl > 0 ? ttl : 86400);
          }
        }
      } catch (e) { /* ignore */ }
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
app.post('/api/campaigns/:id/complete', injectDeviceIdFromToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'complete-post', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many complete requests. Please wait.' });
    }

    // ── Require valid device ID ──
    const deviceId = req.body.deviceId || null;
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required. Please refresh your browser and try again.'
      });
    }

    // ── Cooldown check ──
    if (!(await checkActionCooldown(id, deviceId))) {
      return res.status(429).json({
        success: false,
        error: 'Too many actions. Please wait a moment between actions.'
      });
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

    // ── Update campaign cache with new completions (in‑place) ──
    const newCompletions = (campaignData.completions || 0) + 1;
    const cacheKey = `campaigns:id:${id}`;
    try {
      const cachedStr = await redis.get(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.campaign) {
          cached.campaign.completions = newCompletions;
          const ttl = await redis.ttl(cacheKey);
          await redis.set(cacheKey, JSON.stringify(cached), 'EX', ttl > 0 ? ttl : 86400);
          console.log(`🔄 Updated campaign cache for ${id} (completions: ${newCompletions})`);
        }
      }
    } catch (e) { /* ignore */ }

    // ── Update user list cache and stats cache (in‑place) ──
    if (campaignData.userId) {
      await updateCampaignInUserListCache(campaignData.userId, id, { completions: newCompletions });

      // ── Update stats cache (increment totalCompletions) ──
      try {
        const statsCacheKey = `stats:user:${campaignData.userId}`;
        const statsCached = await redis.get(statsCacheKey);
        if (statsCached) {
          const stats = JSON.parse(statsCached);
          if (stats.stats && typeof stats.stats.totalCompletions === 'number') {
            stats.stats.totalCompletions += 1;
            const ttl = await redis.ttl(statsCacheKey);
            await redis.set(statsCacheKey, JSON.stringify(stats), 'EX', ttl > 0 ? ttl : 86400);
          }
        }
      } catch (e) { /* ignore */ }
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
app.post('/api/campaigns/:id/unlock', injectDeviceIdFromToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'unlock-post', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many unlock requests. Please wait.' });
    }

    // ── Require valid device ID ──
    const deviceId = req.body.deviceId || null;
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required. Please refresh your browser and try again.'
      });
    }

    // ── Cooldown check ──
    if (!(await checkActionCooldown(id, deviceId))) {
      return res.status(429).json({
        success: false,
        error: 'Too many actions. Please wait a moment between actions.'
      });
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

    // ── Update campaign cache with new unlocks (in‑place) ──
    const newUnlocks = (campaignData.unlockCount || 0) + 1;
    const cacheKey = `campaigns:id:${id}`;
    try {
      const cachedStr = await redis.get(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.campaign) {
          cached.campaign.unlockCount = newUnlocks;
          const ttl = await redis.ttl(cacheKey);
          await redis.set(cacheKey, JSON.stringify(cached), 'EX', ttl > 0 ? ttl : 86400);
          console.log(`🔄 Updated campaign cache for ${id} (unlocks: ${newUnlocks})`);
        }
      }
    } catch (e) { /* ignore */ }

    // ── Update user list cache and stats cache (in‑place) ──
    if (campaignData.userId) {
      await updateCampaignInUserListCache(campaignData.userId, id, { unlockCount: newUnlocks });

      // ── Update stats cache (increment totalUnlocks) ──
      try {
        const statsCacheKey = `stats:user:${campaignData.userId}`;
        const statsCached = await redis.get(statsCacheKey);
        if (statsCached) {
          const stats = JSON.parse(statsCached);
          if (stats.stats && typeof stats.stats.totalUnlocks === 'number') {
            stats.stats.totalUnlocks += 1;
            const ttl = await redis.ttl(statsCacheKey);
            await redis.set(statsCacheKey, JSON.stringify(stats), 'EX', ttl > 0 ? ttl : 86400);
          }
        }
      } catch (e) { /* ignore */ }
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
    const cacheKey = `stats:user:${uid}`;
    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching stats for user ${uid} from Firestore...`);
      const snapshot = await db.collection('campaigns')
        .where('userId', '==', uid)
        .select('views', 'unlockCount', 'shares', 'completions', 'shareCount', 'status')
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

// ── Record a view (dedicated endpoint – updates campaign and stats caches without invalidation) ──
app.post('/api/campaigns/:id/view', injectDeviceIdFromToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    // 1. Device ID validation – mandatory
    const deviceId = req.body.deviceId || req.headers['x-device-id'];
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required.',
      });
    }

    // 2. Rate limiting per device (10 views per minute per campaign)
    const rateKey = `rate:view:${id}:${deviceId}`;
    const current = await redis.incr(rateKey);
    if (current === 1) await redis.expire(rateKey, 60);
    if (current > 10) {
      return res.status(429).json({
        success: false,
        error: 'Too many view attempts. Please slow down.',
      });
    }

    // 3. Cooldown (2s) to prevent rapid spam
    if (!(await checkActionCooldown(id, deviceId))) {
      return res.status(429).json({
        success: false,
        error: 'Please wait a moment before recording another view.',
      });
    }

    // 4. Fetch campaign
    const docRef = db.collection('campaigns').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const campaignData = doc.data();
    if (campaignData.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Campaign not available' });
    }

    // 5. Check if already viewed by this device
    const userId = req.user?.uid || null;
    const viewDocId = userId ? `user_${userId}` : `device_${deviceId}`;
    const viewDocRef = docRef.collection('views').doc(viewDocId);
    const viewDoc = await viewDocRef.get();

    if (viewDoc.exists) {
      // Already viewed – no increment
      return res.json({
        success: true,
        alreadyViewed: true,
        views: campaignData.views || 0,
      });
    }

    // 6. Atomic increment
    const newViews = (campaignData.views || 0) + 1;
    await db.runTransaction(async (transaction) => {
      transaction.update(docRef, {
        views: newViews,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(viewDocRef, {
        userId: userId || null,
        deviceId: deviceId,
        ip: ip || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // ── 7. Update campaign cache (in‑place) ──
    const campaignCacheKey = `campaigns:id:${id}`;
    try {
      const cachedStr = await redis.get(campaignCacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.campaign) {
          cached.campaign.views = newViews;
          const ttl = await redis.ttl(campaignCacheKey);
          await redis.set(campaignCacheKey, JSON.stringify(cached), 'EX', ttl > 0 ? ttl : 300);
        }
      }
    } catch (e) {
      console.warn(`View: campaign cache update failed for ${id}:`, e.message);
    }

    // ── 8. Update user campaign list cache and stats cache (in‑place) ──
    const ownerId = campaignData.userId;
    if (ownerId) {
      // Update the list cache (specific campaign entry)
      await updateCampaignInUserListCache(ownerId, id, { views: newViews });

      // Update the stats cache (increment totalViews)
      try {
        const statsCacheKey = `stats:user:${ownerId}`;
        const statsCached = await redis.get(statsCacheKey);
        if (statsCached) {
          const stats = JSON.parse(statsCached);
          if (stats.stats && typeof stats.stats.totalViews === 'number') {
            stats.stats.totalViews += 1;
            const ttl = await redis.ttl(statsCacheKey);
            await redis.set(statsCacheKey, JSON.stringify(stats), 'EX', ttl > 0 ? ttl : 86400);
          }
        }
        // If stats cache doesn't exist, we don't create it – it will be built on demand.
      } catch (e) {
        console.warn(`View: stats cache update failed for ${ownerId}:`, e.message);
      }
    }

    // 9. Return success
    res.json({
      success: true,
      views: newViews,
      alreadyViewed: false,
    });
  } catch (error) {
    console.error('❌ View tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record view. Please try again later.',
    });
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
    // ── Validate image URL ──
    if (image && !validateImageUrl(image)) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
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

// ── Get referral status (including PRO expiry) ──
app.get('/api/auth/referral-status', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'referral-status', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const data = doc.data();
    const now = admin.firestore.Timestamp.now();
    const proExpiry = data.proExpiry || null;
    const isProActive = data.plan === 'pro' && (!proExpiry || proExpiry.toMillis() > now.toMillis());

    res.json({
      success: true,
      referrals: data.referrals || 0,
      plan: data.plan || 'free',
      proExpiry: proExpiry ? proExpiry.toDate().toISOString() : null,
      isProActive,
    });
  } catch (error) {
    console.error('Referral status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch referral status' });
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

    // ── Determine folder from query param (default: avatars) ──
    const folder = req.query.folder || 'avatars';
    const transformation = folder === 'templates' 
      ? [{ width: 800, height: 600, crop: 'limit' }]
      : [{ width: 400, height: 400, crop: 'limit' }];

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `maketrend/${folder}`,
          transformation: transformation,
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
// 19. WITHDRAWAL ENDPOINTS
// ============================================================

// ── Get user's withdrawal history ──
app.get('/api/withdrawals', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'withdrawals-get', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `withdrawals:user:${uid}`;
    let result;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.warn(`⚠️ Withdrawals cache miss: ${error.message}`);
    }

    const snapshot = await db.collection('withdrawals')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const withdrawals = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      withdrawals.push({
        id: doc.id,
        amount: data.amount || 0,
        mtCoins: data.mtCoins || 0,
        method: data.method || '',
        details: data.details || {},
        status: data.status || 'pending',
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    });

    result = { success: true, withdrawals };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
    res.json(result);
  } catch (error) {
    console.error('❌ Get withdrawals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// ── Request a withdrawal ──
app.post('/api/withdrawals', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'withdrawal-request', 2, 60))) {
      return res.status(429).json({ success: false, error: 'Too many withdrawal requests. Please wait.' });
    }

    const { mtCoins, method, details } = req.body;

    // ── Validation ──
    if (!mtCoins || !method || !details) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const numCoins = Number(mtCoins);
    if (!Number.isInteger(numCoins) || numCoins !== 2500) {
      return res.status(400).json({ success: false, error: 'Withdrawal must be exactly 2,500 MT Coins ($15)' });
    }

    // ── Validate method and required fields ──
    const validMethods = ['esewa', 'khalti', 'bank', 'wise', 'crypto', 'paypal', 'wire'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    // ── Validate details based on method ──
    switch (method) {
      // ── NEPAL ──
      case 'esewa':
        if (!details.phone) return res.status(400).json({ success: false, error: 'eSewa phone number required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name is required for eSewa' });
        break;
      case 'khalti':
        if (!details.phone) return res.status(400).json({ success: false, error: 'Khalti phone number required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name is required for Khalti' });
        break;
      case 'bank_nepal':
        if (!details.bankName || !details.accountNumber || !details.accountName) {
          return res.status(400).json({ success: false, error: 'Bank details required' });
        }
        break;

      // ── INDIA ──
      case 'paytm':
      case 'phonepe':
      case 'gpay':
      case 'bhim_upi':
        if (!details.upiId) return res.status(400).json({ success: false, error: `${method.toUpperCase()} UPI ID / number required` });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;
      case 'bank_india':
        if (!details.bankName || !details.accountNumber || !details.accountName || !details.ifscCode) {
          return res.status(400).json({ success: false, error: 'All bank details required (Bank Name, Account Name, Account Number, IFSC Code)' });
        }
        break;

      // ── BANGLADESH ──
      case 'bkash':
      case 'rocket':
        if (!details.phone) return res.status(400).json({ success: false, error: `${method.toUpperCase()} phone number required` });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;

      // ── PAKISTAN ──
      case 'easypesa':
        if (!details.phone) return res.status(400).json({ success: false, error: 'EasyPesa phone number required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;

      // ── INDONESIA ──
      case 'dana':
      case 'gopay':
        if (!details.phone) return res.status(400).json({ success: false, error: `${method.toUpperCase()} phone number required` });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;

      // ── OTHER WALLETS ──
      case 'vodafone_cash':
        if (!details.phone) return res.status(400).json({ success: false, error: 'Vodafone Cash phone number required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;

      // ── INTERNATIONAL WALLETS ──
      case 'payeer':
      case 'webmoney':
        if (!details.walletId) return res.status(400).json({ success: false, error: `${method.toUpperCase()} wallet ID required` });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;
      case 'payoneer':
        if (!details.email) return res.status(400).json({ success: false, error: 'Payoneer email required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;

      // ── CRYPTO ──
      case 'binance':
        if (!details.email) return res.status(400).json({ success: false, error: 'Binance email required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;
      case 'usdt_trc20':
        if (!details.address) return res.status(400).json({ success: false, error: 'USDT TRC-20 address required' });
        if (!details.accountName) return res.status(400).json({ success: false, error: 'Account holder name required' });
        break;

      // ── EXISTING (keep) ──
      case 'wise':
        if (!details.email) return res.status(400).json({ success: false, error: 'Wise email required' });
        break;
      case 'paypal':
        if (!details.email) return res.status(400).json({ success: false, error: 'PayPal email required' });
        break;
      case 'wire':
        if (!details.bankName || !details.accountNumber || !details.swiftCode || !details.accountName) {
          return res.status(400).json({ success: false, error: 'Wire transfer details required' });
        }
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    // ── ✅ ATOMIC TRANSACTION ──
    let withdrawalId;
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const data = userDoc.data();
      
      // ── ✅ CORRECT balance calculation ──
      const earned = data.mtCoinsEarned || 0;
      const spent = data.mtCoinsSpent || 0;
      const available = earned - spent;

      if (numCoins > available) {
        throw new Error('Insufficient MT Coins balance');
      }

      // ── Deduct by incrementing spent ──
      transaction.update(userRef, {
        mtCoinsSpent: admin.firestore.FieldValue.increment(numCoins),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Create withdrawal record ──
      const withdrawalRef = db.collection('withdrawals').doc();
      const withdrawalData = {
        userId: uid,
        mtCoins: numCoins,
        amount: 15.00,
        method,
        details: {
          ...details,
          phone: details.phone || '',
          email: details.email || '',
          bankName: details.bankName || '',
          accountNumber: details.accountNumber || '',
          accountName: details.accountName || '',
          swiftCode: details.swiftCode || '',
          address: details.address || '',
          currency: details.currency || '',
        },
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(withdrawalRef, withdrawalData);
      withdrawalId = withdrawalRef.id;
    });

    // ── Invalidate caches ──
    await invalidateKey(`withdrawals:user:${uid}`);
    await invalidateKey(`user:profile:${uid}`);
    await invalidateKey(`stats:user:${uid}`);
    await invalidateKey(`mtcoins:user:${uid}`); // ✅ ADDED

    res.status(201).json({
      success: true,
      withdrawalId,
      mtCoins: numCoins,
      amount: 15.00,
      message: 'Withdrawal request submitted successfully',
    });
  } catch (error) {
    console.error('❌ Withdrawal error:', error);
    if (error.message === 'Insufficient MT Coins balance') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

// ── Admin: Update withdrawal status ──
app.put('/api/withdrawals/:id/status', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'open', 'processing', 'successful', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const docRef = db.collection('withdrawals').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    }

    await docRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Invalidate user's withdrawal cache ──
    const data = doc.data();
    if (data.userId) {
      await invalidateKey(`withdrawals:user:${data.userId}`);
    }

    res.json({ success: true, message: `Withdrawal status updated to ${status}` });
  } catch (error) {
    console.error('❌ Update withdrawal status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update withdrawal status' });
  }
});

// ── Get user's MT Coin balance ──
app.get('/api/mt-coins', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    // ── 1. Calculate earned from campaign stats ──
    const statsSnapshot = await db.collection('campaigns')
      .where('userId', '==', uid)
      .select('views', 'completions', 'shares', 'unlockCount', 'status')
      .get();

    let totalViews = 0;
    let totalCompletions = 0;
    let totalShares = 0;
    let totalUnlocks = 0;

    statsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'deleted') return;
      totalViews += data.views || 0;
      totalCompletions += data.completions || 0;
      totalShares += data.shares || 0;
      totalUnlocks += data.unlockCount || 0;
    });

    // ── MT Coins = minimum of all four ──
    const earnedFromStats = Math.min(
      totalViews,
      totalShares,
      totalUnlocks,
      totalCompletions
    );

    // ── 2. Get user document ──
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const data = userDoc.data();
    let mtCoinsEarned = data.mtCoinsEarned || 0;
    let mtCoinsSpent = data.mtCoinsSpent || 0;

    // ── 3. MIGRATION: Initialize if missing ──
    if (data.mtCoinsEarned === undefined && data.mtCoinsSpent === undefined) {
      const withdrawSnapshot = await db.collection('withdrawals')
        .where('userId', '==', uid)
        .where('status', '==', 'successful')
        .get();
      
      let totalWithdrawn = 0;
      withdrawSnapshot.forEach(doc => {
        totalWithdrawn += doc.data().mtCoins || 0;
      });

      const currentAvailable = data.mtCoins || 0;
      mtCoinsSpent = totalWithdrawn;
      mtCoinsEarned = Math.max(earnedFromStats, totalWithdrawn + currentAvailable);

      await db.collection('users').doc(uid).update({
        mtCoinsEarned,
        mtCoinsSpent,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      if (earnedFromStats > mtCoinsEarned) {
        mtCoinsEarned = earnedFromStats;
        await db.collection('users').doc(uid).update({
          mtCoinsEarned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const available = mtCoinsEarned - mtCoinsSpent;
    const usdValue = (available / 2500) * 15;

    res.json({
      success: true,
      mtCoins: {
        earned: mtCoinsEarned,
        spent: mtCoinsSpent,
        available: available,
        usdValue: parseFloat(usdValue.toFixed(2)),
        stats: {
          views: totalViews,
          completions: totalCompletions,
          shares: totalShares,
          unlocks: totalUnlocks,
        },
      },
    });
  } catch (error) {
    console.error('❌ MT Coins error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch MT Coins' });
  }
});

// ── Get available withdrawal methods ──
// ── Get available withdrawal methods (authenticated, 24h cache) ──
app.get('/api/withdrawal-methods', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'methods-get', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = 'withdrawal-methods-v3';
    let result;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.warn(`⚠️ Methods cache miss: ${error.message}`);
    }

    const methods = [
  // ── NEPAL ──
  {
    id: 'esewa',
    name: 'eSewa',
    icon: '📱',
    description: 'Nepal mobile wallet',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '98XXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name on account', required: true },
    ],
  },
  {
    id: 'khalti',
    name: 'Khalti',
    icon: '📱',
    description: 'Nepal mobile wallet',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '98XXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name on account', required: true },
    ],
  },
  {
    id: 'bank_nepal',
    name: 'Bank Transfer (Nepal)',
    icon: '🏦',
    description: 'Local bank transfer',
    fields: [
      { key: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'e.g. NMB Bank', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
      { key: 'accountNumber', label: 'Account Number', type: 'text', placeholder: 'e.g. 1234567890', required: true },
    ],
  },

  // ── INDIA ──
  {
    id: 'paytm',
    name: 'Paytm',
    icon: '📱',
    description: 'India UPI / Wallet',
    fields: [
      { key: 'upiId', label: 'UPI ID / Paytm Number', type: 'text', placeholder: 'example@paytm / 98XXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    icon: '📱',
    description: 'India UPI / Wallet',
    fields: [
      { key: 'upiId', label: 'UPI ID / PhonePe Number', type: 'text', placeholder: 'example@phonepe / 98XXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    icon: '📱',
    description: 'India UPI / Wallet',
    fields: [
      { key: 'upiId', label: 'UPI ID / GPay Number', type: 'text', placeholder: 'example@gpay / 98XXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'bhim_upi',
    name: 'BHIM UPI',
    icon: '📱',
    description: 'India UPI',
    fields: [
      { key: 'upiId', label: 'UPI ID / VPA', type: 'text', placeholder: 'example@upi / 98XXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'bank_india',
    name: 'Bank Transfer (India)',
    icon: '🏦',
    description: 'Indian bank transfer (NEFT/IMPS)',
    fields: [
      { key: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'e.g. SBI', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
      { key: 'accountNumber', label: 'Account Number', type: 'text', placeholder: 'e.g. 1234567890', required: true },
      { key: 'ifscCode', label: 'IFSC Code', type: 'text', placeholder: 'e.g. SBIN0001234', required: true },
    ],
  },

  // ── BANGLADESH ──
  {
    id: 'bkash',
    name: 'bKash',
    icon: '📱',
    description: 'Bangladesh mobile wallet',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '01XXXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    icon: '📱',
    description: 'Bangladesh mobile wallet',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '01XXXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },

  // ── PAKISTAN ──
  {
    id: 'easypesa',
    name: 'EasyPesa',
    icon: '📱',
    description: 'Pakistan mobile wallet',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '03XXXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
      { key: 'cnic', label: 'CNIC Number', type: 'text', placeholder: 'XXXXX-XXXXXXX-X', required: false },
    ],
  },

  // ── INDONESIA ──
  {
    id: 'dana',
    name: 'Dana',
    icon: '📱',
    description: 'Indonesia mobile wallet',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '08XXXXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'gopay',
    name: 'GoPay',
    icon: '📱',
    description: 'Indonesia mobile wallet (Gojek)',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '08XXXXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },

  // ── OTHER WALLETS ──
  {
    id: 'vodafone_cash',
    name: 'Vodafone Cash',
    icon: '📱',
    description: 'Vodafone M-Pesa / Cash',
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'XX-XXX-XXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },

  // ── INTERNATIONAL / CRYPTO ──
  {
    id: 'payeer',
    name: 'Payeer',
    icon: '💳',
    description: 'International payment system',
    fields: [
      { key: 'walletId', label: 'Payeer Wallet ID', type: 'text', placeholder: 'PXXXXXXXXXX', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'payoneer',
    name: 'Payoneer',
    icon: '💳',
    description: 'International payment system',
    fields: [
      { key: 'email', label: 'Payoneer Email', type: 'email', placeholder: 'you@payoneer.com', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'webmoney',
    name: 'WebMoney',
    icon: '💳',
    description: 'International payment system',
    fields: [
      { key: 'walletId', label: 'WebMoney Wallet ID (Z/R/U)', type: 'text', placeholder: 'Z123456789012', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },

  // ── CRYPTO (Expanded) ──
  {
    id: 'binance',
    name: 'Binance Pay',
    icon: '₿',
    description: 'Binance crypto wallet',
    fields: [
      { key: 'email', label: 'Binance Email', type: 'email', placeholder: 'you@binance.com', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC-20)',
    icon: '₿',
    description: 'USDT on TRC-20 network (Tron)',
    fields: [
      { key: 'address', label: 'TRC-20 Wallet Address', type: 'text', placeholder: 'T...', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
    ],
  },

  // ── WISE / PAYPAL (already exists, keeping for reference) ──
  {
    id: 'wise',
    name: 'Wise',
    icon: '💳',
    description: 'International bank transfer via Wise',
    fields: [
      { key: 'email', label: 'Wise Email', type: 'email', placeholder: 'you@wise.com', required: true },
    ],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: '💸',
    description: 'Receive via PayPal',
    fields: [
      { key: 'email', label: 'PayPal Email', type: 'email', placeholder: 'you@paypal.com', required: true },
    ],
  },

  // ── INTERNATIONAL WIRE ──
  {
    id: 'wire',
    name: 'International Wire Transfer',
    icon: '🌍',
    description: 'IBAN/SWIFT wire transfer',
    fields: [
      { key: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'e.g. HSBC', required: true },
      { key: 'accountName', label: 'Account Holder Name', type: 'text', placeholder: 'Full name', required: true },
      { key: 'accountNumber', label: 'Account Number / IBAN', type: 'text', placeholder: 'e.g. IBAN', required: true },
      { key: 'swiftCode', label: 'SWIFT Code', type: 'text', placeholder: 'e.g. HSBCGB2L', required: true },
    ],
  },
];

    result = { success: true, methods };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400); // ✅ 24 hours
    res.json(result);
  } catch (error) {
    console.error('❌ Get methods error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawal methods' });
  }
});


// ── Refund a failed withdrawal (admin only) ──
app.post('/api/withdrawals/:id/refund', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { id } = req.params;
    const docRef = db.collection('withdrawals').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    const data = doc.data();
    if (data.status !== 'failed') {
      return res.status(400).json({ success: false, error: 'Only failed withdrawals can be refunded' });
    }
    if (data.refunded) {
      return res.status(400).json({ success: false, error: 'Already refunded' });
    }

    const userId = data.userId;
    const mtCoins = data.mtCoins || 0;

    await db.collection('users').doc(userId).update({
      mtCoinsSpent: admin.firestore.FieldValue.increment(-mtCoins),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await docRef.update({
      refunded: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await invalidateKey(`mtcoins:user:${userId}`);
    await invalidateKey(`stats:user:${userId}`);

    res.json({ success: true, message: `Refunded ${mtCoins} MT Coins to user ${userId}` });
  } catch (error) {
    console.error('❌ Refund error:', error);
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
});


// ── Admin: Get all withdrawals ──
app.get('/api/admin/withdrawals', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    // ── Check admin ──
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    // ── Rate limit for admin ──
    if (!(await checkRateLimit(uid, 'admin-withdrawals-get', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }

    // ── Fetch all withdrawals (latest first) ──
    const snapshot = await db.collection('withdrawals')
      .orderBy('createdAt', 'desc')
      .limit(100) // Optional: paginate later
      .get();

    const withdrawals = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // ── Fetch user email for display ──
      let userEmail = null;
      if (data.userId) {
        try {
          const userDoc = await db.collection('users').doc(data.userId).get();
          if (userDoc.exists) {
            userEmail = userDoc.data().email || null;
          }
        } catch (e) { /* ignore */ }
      }
      withdrawals.push({
        id: doc.id,
        userId: data.userId || null,
        userEmail: userEmail,
        amount: data.amount || 0,
        mtCoins: data.mtCoins || 0,
        method: data.method || '',
        details: data.details || {},
        status: data.status || 'pending',
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    }

    res.json({ success: true, withdrawals });
  } catch (error) {
    console.error('❌ Admin get withdrawals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// ── Admin: Update withdrawal details ──
app.put('/api/withdrawals/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    // ── Admin only ──
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { id } = req.params;
    const { amount, mtCoins, method, details } = req.body;

    // ── Validate fields ──
    if (amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
      return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }
    if (mtCoins !== undefined && (typeof mtCoins !== 'number' || mtCoins < 0 || !Number.isInteger(mtCoins))) {
      return res.status(400).json({ success: false, error: 'MT Coins must be a positive integer' });
    }
    const validMethods = ['esewa', 'khalti', 'bank_nepal', 'paytm', 'phonepe', 'gpay', 'bhim_upi', 'bank_india', 'bkash', 'rocket', 'easypesa', 'dana', 'gopay', 'vodafone_cash', 'payeer', 'payoneer', 'webmoney', 'binance', 'usdt_trc20', 'wise', 'paypal', 'wire'];
if (method !== undefined && !validMethods.includes(method)) {
  return res.status(400).json({ success: false, error: 'Invalid payment method' });
}
    if (details !== undefined && (typeof details !== 'object' || Array.isArray(details))) {
      return res.status(400).json({ success: false, error: 'Details must be an object' });
    }

    // ── Prepare update data ──
    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (mtCoins !== undefined) updateData.mtCoins = mtCoins;
    if (method !== undefined) updateData.method = method;
    if (details !== undefined) updateData.details = details;
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('withdrawals').doc(id).update(updateData);

    // ── Invalidate user cache (if we have user ID) ──
    const doc = await db.collection('withdrawals').doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      if (data.userId) {
        await invalidateKey(`withdrawals:user:${data.userId}`);
      }
    }

    res.json({ success: true, message: 'Withdrawal updated successfully' });
  } catch (error) {
    console.error('❌ Update withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update withdrawal' });
  }
});

// ============================================================
// 20. EARN CASH & ADS (WATCH ADS & EARN)
// ============================================================

// ── Get ad status ──
app.post('/api/ads/status', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const deviceId = req.body.deviceId || req.headers['x-device-id'];
    const today = new Date().toISOString().split('T')[0];
    const key = `ad:${uid}:${today}`;

    // ── Get data from Redis ──
    const data = await redis.hgetall(key);
    const adsWatched = parseInt(data.ads || '0');
    const coinsEarned = parseInt(data.coins || '0');
    const lastAdTime = parseInt(data.lastAdTime || '0');

    const MAX_ADS = 5;
    const COOLDOWN_SECONDS = 20;
    const now = Date.now();

    // ── Check cooldown ──
    const cooldownSeconds = Math.max(0, COOLDOWN_SECONDS - Math.floor((now - lastAdTime) / 1000));
    const canWatch = adsWatched < MAX_ADS && cooldownSeconds === 0;

    res.json({
      success: true,
      adsWatched,
      maxAds: MAX_ADS,
      coinsEarned,
      canWatch,
      cooldownSeconds,
      nextAdAvailableAt: canWatch ? null : lastAdTime + COOLDOWN_SECONDS * 1000,
    });
  } catch (error) {
    console.error('❌ Ad status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get ad status' });
  }
});

// ── Start ad session ──
app.post('/api/ads/start', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { deviceId } = req.body;
    
    // ── Validate device ID ──
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required.',
      });
    }

    // ── Check if user already has an active session ──
    const startKey = `ad:start:${uid}`;
    const existing = await redis.get(startKey);
    if (existing) {
      const elapsed = (Date.now() - parseInt(existing)) / 1000;
      if (elapsed < 30) {
        return res.status(400).json({
          success: false,
          error: `Please wait ${Math.ceil(30 - elapsed)} seconds before starting a new ad.`,
        });
      }
    }

    // ── Store start time with 120s expiry ──
    await redis.set(startKey, Date.now(), 'EX', 120);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Ad start error:', error);
    res.status(500).json({ success: false, error: 'Failed to start ad session' });
  }
});

// ── Complete ad view (FULL VALIDATION) ──
app.post('/api/ads/complete', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { deviceId } = req.body;
    const ip = getClientIp(req);

    // ─── 1. DEVICE ID VALIDATION ───
    if (!validateDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid device ID is required.',
      });
    }

    const AD_REWARD = 10;
    const MAX_ADS = 5;
    const COOLDOWN_SECONDS = 20;
    const AD_DURATION = 30;
    const today = new Date().toISOString().split('T')[0];
    const key = `ad:${uid}:${today}`;

    // ─── 2. DAILY LIMIT CHECK ───
    const current = await redis.hgetall(key);
    const adsWatched = parseInt(current.ads || '0');

    if (adsWatched >= MAX_ADS) {
      return res.status(429).json({
        success: false,
        error: 'Daily limit reached. Come back tomorrow!',
        adsWatched,
        maxAds: MAX_ADS,
      });
    }

    // ─── 3. COOLDOWN CHECK ───
    const lastAdTime = parseInt(current.lastAdTime || '0');
    if (lastAdTime > 0 && Date.now() - lastAdTime < COOLDOWN_SECONDS * 1000) {
      const remaining = Math.ceil((COOLDOWN_SECONDS - (Date.now() - lastAdTime) / 1000));
      return res.status(429).json({
        success: false,
        error: `Please wait ${remaining} seconds before claiming again.`,
        cooldownSeconds: remaining,
      });
    }

    // ─── 4. SESSION CHECK (Must have started) ───
    const startKey = `ad:start:${uid}`;
    const startTime = await redis.get(startKey);
    
    if (!startTime) {
      return res.status(400).json({
        success: false,
        error: 'Ad session not found. Please start the ad first.',
      });
    }
    
    // ─── 5. ELAPSED TIME CHECK (Must have watched 30s) ───
    const elapsed = (Date.now() - parseInt(startTime)) / 1000;
    if (elapsed < AD_DURATION) {
      console.warn(`⚠️ Ad watched too quickly for user ${uid}: ${elapsed.toFixed(1)}s (required ${AD_DURATION}s)`);
      return res.status(400).json({
        success: false,
        error: `Please watch the ads for the full ${AD_DURATION} seconds. (${elapsed.toFixed(0)}s so far)`,
        elapsed: Math.floor(elapsed),
        required: AD_DURATION,
      });
    }
    
    // ─── 6. CLEAN UP SESSION ───
    await redis.del(startKey);

    // ─── 7. DEVICE FINGERPRINT CHECK (Fraud detection) ───
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const storedDeviceId = userDoc.data().deviceId;
      if (storedDeviceId && storedDeviceId !== deviceId) {
        console.warn(`⚠️ Device mismatch for user ${uid}: stored ${storedDeviceId.substring(0, 20)}..., received ${deviceId.substring(0, 20)}...`);
        // Still allow, but log for fraud detection
      }
    }

    // ─── 8. MULTIPLE DEVICES TRACKING ───
    const deviceCountKey = `ad:devices:${uid}`;
    const deviceCount = await redis.sadd(deviceCountKey, deviceId);
    if (deviceCount > 3) {
      console.warn(`⚠️ User ${uid} using multiple devices (${deviceCount}) for ads`);
      // Optionally flag for admin review
    }
    await redis.expire(deviceCountKey, 86400 * 7); // 7 days

    // ─── 9. UPDATE REDIS COUNTER ───
    const pipeline = redis.pipeline();
    pipeline.hincrby(key, 'ads', 1);
    pipeline.hincrby(key, 'coins', AD_REWARD);
    pipeline.hset(key, 'lastAdTime', Date.now());
    pipeline.expire(key, 86400); // 24 hours
    await pipeline.exec();

    // ─── 10. UPDATE USER MT COINS ───
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      mtCoinsEarned: admin.firestore.FieldValue.increment(AD_REWARD),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ─── 11. INVALIDATE CACHE ───
    await invalidateKey(`mtcoins:user:${uid}`);

    // ─── 12. RESPONSE ───
    const newAdsWatched = adsWatched + 1;
    const remaining = MAX_ADS - newAdsWatched;
    const canWatch = remaining > 0;

    res.json({
      success: true,
      reward: AD_REWARD,
      adsWatched: newAdsWatched,
      coinsEarned: parseInt((await redis.hget(key, 'coins')) || '0'),
      remaining,
      canWatch,
      cooldownSeconds: canWatch ? COOLDOWN_SECONDS : 0,
      // ── Additional info for debugging ──
      elapsed: Math.floor(elapsed),
      required: AD_DURATION,
    });
  } catch (error) {
    console.error('❌ Ad completion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process ad view. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ── Check daily bonus status ──
app.get('/api/daily-bonus/status', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const data = doc.data();
    const lastClaim = data.dailyBonusLastClaim?.toDate?.() || null;
    const now = new Date();

    let canClaim = true;
    let nextClaimTime = null;
    if (lastClaim) {
      // Check if last claim was today (same UTC date)
      const lastDate = new Date(lastClaim);
      const today = new Date(now);
      if (lastDate.getUTCFullYear() === today.getUTCFullYear() &&
          lastDate.getUTCMonth() === today.getUTCMonth() &&
          lastDate.getUTCDate() === today.getUTCDate()) {
        canClaim = false;
        // Next claim at midnight UTC (next day)
        const next = new Date(now);
        next.setUTCHours(0, 0, 0, 0);
        next.setUTCDate(next.getUTCDate() + 1);
        nextClaimTime = next.toISOString();
      }
    }

    res.json({
      success: true,
      canClaim,
      lastClaim: lastClaim ? lastClaim.toISOString() : null,
      nextClaimTime,
      bonusAmount: 10,
    });
  } catch (error) {
    console.error('❌ Daily bonus status error:', error);
    res.status(500).json({ success: false, error: 'Failed to check daily bonus' });
  }
});

// ── Claim daily bonus ──
app.post('/api/daily-bonus/claim', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Rate limit: max 1 claim per minute (to prevent spamming)
    if (!(await checkRateLimit(uid, 'daily-bonus-claim', 1, 60))) {
      return res.status(429).json({ success: false, error: 'Too many attempts. Please wait a moment.' });
    }

    const userRef = db.collection('users').doc(uid);
    const BONUS = 10;

    let claimed = false;
    let newEarned = 0;
    let newAvailable = 0;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      if (!doc.exists) {
        throw new Error('User not found');
      }
      const data = doc.data();

      // Check if already claimed today
      const lastClaim = data.dailyBonusLastClaim?.toDate?.() || null;
      const now = new Date();
      if (lastClaim) {
        const lastDate = new Date(lastClaim);
        const today = new Date(now);
        if (lastDate.getUTCFullYear() === today.getUTCFullYear() &&
            lastDate.getUTCMonth() === today.getUTCMonth() &&
            lastDate.getUTCDate() === today.getUTCDate()) {
          throw new Error('Already claimed today');
        }
      }

      // Update mtCoinsEarned and set last claim timestamp
      const currentEarned = data.mtCoinsEarned || 0;
      newEarned = currentEarned + BONUS;

      transaction.update(userRef, {
        mtCoinsEarned: newEarned,
        dailyBonusLastClaim: admin.firestore.Timestamp.fromDate(now),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      claimed = true;
      // Calculate new available (earned - spent)
      const spent = data.mtCoinsSpent || 0;
      newAvailable = newEarned - spent;
    });

    if (claimed) {
      // Invalidate relevant caches
      await invalidateKey(`mtcoins:user:${uid}`);
      await invalidateKey(`user:profile:${uid}`);
      await invalidateKey(`stats:user:${uid}`);

      res.json({
        success: true,
        message: `Claimed ${BONUS} MT Coins daily bonus!`,
        bonus: BONUS,
        newTotalEarned: newEarned,
        newAvailable,
      });
    } else {
      res.status(400).json({ success: false, error: 'Unable to claim bonus' });
    }
  } catch (error) {
    console.error('❌ Daily bonus claim error:', error);
    if (error.message === 'Already claimed today') {
      return res.status(429).json({ success: false, error: 'Daily bonus already claimed today. Come back tomorrow!' });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to claim daily bonus' });
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
// 19. START SERVER (for both local & serverless)
// ============================================================
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
    console.log(`🔒 Allowed origins:`, allowedOrigins);
    console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`✅ Security: Helmet, CORS, Rate Limiting, XSS Protection`);
    console.log(`📦 Redis: ${process.env.REDIS_URL ? 'connected' : 'not configured'}`);
  });
}
module.exports = app; // ✅ Required for Vercel serverless deployment
