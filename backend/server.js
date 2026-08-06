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
      // Extract limit from the cache key
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

// ─────────────────────────────────────────────
// Global feed cache helpers
// ─────────────────────────────────────────────

function getGlobalFeedCacheKey(limit = 25, lastTaskId = null) {
  return `grow-feed:global:limit:${limit}:lastTaskId:${lastTaskId || 'null'}`;
}

async function getFirstFeedPageKey(limit = 25) {
  const key = getGlobalFeedCacheKey(limit, null);
  const exists = await redis.exists(key);
  return exists ? key : null;
}

// ── Add a new task to the global feed cache (first page only) ──
async function addTaskToGlobalFeed(task, limit = 25) {
  try {
    const firstPageKey = await getFirstFeedPageKey(limit);
    if (!firstPageKey) {
      // No cache exists – create first page
      const newKey = getGlobalFeedCacheKey(limit, null);
      const newData = {
        tasks: [task],
        hasMore: false,
        lastId: null,
      };
      await redis.set(newKey, JSON.stringify(newData));
      console.log(`✅ Created global feed cache with task ${task.id}`);
      return;
    }

    const cached = await redis.get(firstPageKey);
    if (!cached) return;
    let data = JSON.parse(cached);
    if (data.tasks && Array.isArray(data.tasks)) {
      data.tasks = [task, ...data.tasks];
      if (data.tasks.length > limit) {
        data.tasks = data.tasks.slice(0, limit);
      }
      // ✅ Update lastId to the new last task (if any)
      data.lastId = data.tasks.length > 0 ? data.tasks[data.tasks.length - 1].id : null;
      // Optionally set hasMore to true if we have exactly limit items,
      // but we cannot know for sure without a DB query; leaving as is is fine.
      await redis.set(firstPageKey, JSON.stringify(data));
      console.log(`🔄 Added task ${task.id} to global feed cache`);
    }
  } catch (error) {
    console.warn('Failed to add task to global feed cache:', error);
  }
}

// ── Update a task in all global feed cache pages ──
async function updateTaskInGlobalFeed(taskId, updates) {
  try {
    const pattern = 'grow-feed:global:*';
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;

    for (const key of keys) {
      const cached = await redis.get(key);
      if (!cached) continue;
      let data = JSON.parse(cached);
      if (data.tasks && Array.isArray(data.tasks)) {
        let updated = false;
        data.tasks = data.tasks.map(t => {
          if (t.id === taskId) {
            updated = true;
            return { ...t, ...updates };
          }
          return t;
        });
        if (updated) {
          await redis.set(key, JSON.stringify(data));
        }
      }
    }
    console.log(`🔄 Updated task ${taskId} in global feed cache`);
  } catch (error) {
    console.warn('Failed to update task in global feed cache:', error);
  }
}

// ── Remove a task from all global feed cache pages ──
async function removeTaskFromGlobalFeed(taskId) {
  try {
    const pattern = 'grow-feed:global:*';
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;

    for (const key of keys) {
      const cached = await redis.get(key);
      if (!cached) continue;
      let data = JSON.parse(cached);
      if (data.tasks && Array.isArray(data.tasks)) {
        const originalLength = data.tasks.length;
        const wasLastId = data.lastId === taskId;
        data.tasks = data.tasks.filter(t => t.id !== taskId);
        if (data.tasks.length < originalLength) {
          // ✅ If the removed task was the lastId, update it to the new last task
          if (wasLastId) {
            data.lastId = data.tasks.length > 0 ? data.tasks[data.tasks.length - 1].id : null;
          }
          await redis.set(key, JSON.stringify(data));
        }
      }
    }
    console.log(`🗑️ Removed task ${taskId} from global feed cache`);
  } catch (error) {
    console.warn('Failed to remove task from global feed cache:', error);
  }
}

// ── Get a user's exchanged task IDs (cached in Redis) ──
async function getUserExchangedTaskIds(uid) {
  const cacheKey = `user:exchanges:${uid}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) { /* ignore */ }

  const [exchangesA, exchangesB] = await Promise.all([
    db.collection('exchanges')
      .where('userAUid', '==', uid)
      .where('overallStatus', 'in', ['active', 'completed'])
      .get(),
    db.collection('exchanges')
      .where('userBUid', '==', uid)
      .where('overallStatus', 'in', ['active', 'completed'])
      .get(),
  ]);

  const taskIds = new Set();
  exchangesA.forEach(doc => {
    const data = doc.data();
    taskIds.add(data.userATaskId);
    taskIds.add(data.userBTaskId);
  });
  exchangesB.forEach(doc => {
    const data = doc.data();
    taskIds.add(data.userATaskId);
    taskIds.add(data.userBTaskId);
  });
  const result = Array.from(taskIds);
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 60); // 1 minute TTL
  return result;
}

async function invalidateUserExchanges(uid) {
  await invalidateKey(`user:exchanges:${uid}`);
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
// ── Grant PRO for 24 hours (stacking) ──
async function grantProFor24Hours(uid) {
  // Fetch the user's current data
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  
  let expiry;
  
  // Check if user already has a valid PRO expiry
  if (userData?.plan === 'pro' && userData?.proExpiry) {
    const currentExpiry = userData.proExpiry.toDate(); // Convert Firestore timestamp to Date
    const now = new Date();
    
    if (currentExpiry > now) {
      // PRO is still active → add 24 hours to the existing expiry
      expiry = new Date(currentExpiry.getTime() + 24 * 60 * 60 * 1000);
      console.log(`🔄 PRO extended for ${uid} from ${currentExpiry.toISOString()} to ${expiry.toISOString()}`);
    } else {
      // PRO has expired → start from now
      expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      console.log(`⏰ PRO expired, granting fresh 24h to ${uid}`);
    }
  } else {
    // No PRO or free plan → start from now
    expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    console.log(`👑 PRO granted for 24h to ${uid}`);
  }
  
  // Update the user
  await db.collection('users').doc(uid).update({
    plan: 'pro',
    proExpiry: admin.firestore.Timestamp.fromDate(expiry),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Invalidate cache
  await invalidateKey(`user:profile:${uid}`);
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

// ── Validate URL format ──
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
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
app.post('/api/auth/register', async (req, res) => {
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
app.post('/api/auth/complete-social', verifyToken, checkBanned, async (req, res) => {
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

    // ── Ensure new fields exist with default values ──
    const userWithDefaults = {
      uid,
      ...userData,
      // Basic info (already there, but keep safe)
      username: userData.username || '',
      fullname: userData.fullname || '',
      email: userData.email || '',
      avatar: userData.avatar || '',
      // New fields
      bio: userData.bio || '',
      age: userData.age ?? null,
      phone: userData.phone || '',
      country: userData.country || '',
      gender: userData.gender || '',
      skills: Array.isArray(userData.skills) ? userData.skills : [],
      socialLinks: Array.isArray(userData.socialLinks) ? userData.socialLinks : [],
      websites: Array.isArray(userData.websites) ? userData.websites : [],
    };

    res.json({ success: true, user: userWithDefaults });
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

    // ── 1. Extract all fields ──
    const {
      username,
      fullname,
      email,
      avatar,
      bio,
      age,
      phone,
      country,
      gender,
      skills,
      socialLinks,
      websites,
    } = req.body;

    // ── 2. Sanitize required fields ──
    const cleanUsername = username !== undefined ? sanitizeUsername(username) : undefined;
    const cleanFullname = fullname !== undefined ? sanitizeFullName(fullname) : undefined;
    const cleanEmail = email !== undefined ? email?.trim().toLowerCase() : undefined;

    // ── 3. Validate required fields (if provided) ──
    if (cleanUsername !== undefined) {
      if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ success: false, error: 'Username must be 3-30 characters' });
      }
    }
    if (cleanFullname !== undefined) {
      if (!cleanFullname || cleanFullname.length < 2 || cleanFullname.length > 100) {
        return res.status(400).json({ success: false, error: 'Full name must be 2-100 characters' });
      }
    }
    if (cleanEmail !== undefined) {
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ success: false, error: 'Invalid email' });
      }
    }
    if (avatar !== undefined && !validateImageUrl(avatar)) {
      return res.status(400).json({ success: false, error: 'Invalid avatar URL' });
    }

    // ── 4. Validate optional fields ──

    // Bio
    if (bio !== undefined && (typeof bio !== 'string' || bio.length > 500)) {
      return res.status(400).json({ success: false, error: 'Bio must be a string of max 500 characters' });
    }

    // Age – allow null or empty string to clear, else must be number 1-150
    let cleanAge = null;
    if (age !== undefined) {
      if (age === null || age === '') {
        cleanAge = null; // clear the field
      } else {
        const ageNum = Number(age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
          return res.status(400).json({ success: false, error: 'Age must be between 1 and 150' });
        }
        cleanAge = ageNum;
      }
    }

    // Phone – optional, allow empty string to clear
    if (phone !== undefined && phone.trim() !== '') {
      const phoneRegex = /^[+]?[\d\s()-]{5,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }
    }

    // Country – if provided, must be string ≤100 chars
    if (country !== undefined && (typeof country !== 'string' || country.length > 100)) {
      return res.status(400).json({ success: false, error: 'Country must be a string of max 100 characters' });
    }

    // Gender – optional, must be one of allowed values, or empty to clear
    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    if (gender !== undefined && gender.trim() !== '' && !allowedGenders.includes(gender.trim())) {
      return res.status(400).json({ success: false, error: 'Gender must be one of: Male, Female, Other, Prefer not to say' });
    }

    // Skills – array of strings, max 50 items
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({ success: false, error: 'Skills must be an array' });
      }
      if (skills.length > 50) {
        return res.status(400).json({ success: false, error: 'Maximum 50 skills allowed' });
      }
      for (let i = 0; i < skills.length; i++) {
        if (typeof skills[i] !== 'string' || skills[i].trim().length === 0) {
          return res.status(400).json({ success: false, error: `Skill at index ${i} must be a non-empty string` });
        }
        if (skills[i].trim().length > 100) {
          return res.status(400).json({ success: false, error: `Skill "${skills[i]}" is too long (max 100 chars)` });
        }
      }
    }

    // Social Links – array of objects, max 100
    if (socialLinks !== undefined) {
      if (!Array.isArray(socialLinks)) {
        return res.status(400).json({ success: false, error: 'SocialLinks must be an array' });
      }
      if (socialLinks.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 social links allowed' });
      }
      for (let i = 0; i < socialLinks.length; i++) {
        const link = socialLinks[i];
        if (!link || typeof link !== 'object') {
          return res.status(400).json({ success: false, error: `Social link at index ${i} is invalid` });
        }
        const { platform, channelName, url } = link;
        if (!platform || typeof platform !== 'string' || platform.trim().length === 0 || platform.trim().length > 50) {
          return res.status(400).json({ success: false, error: `Social link ${i}: platform is required and must be 1-50 chars` });
        }
        if (!channelName || typeof channelName !== 'string' || channelName.trim().length === 0 || channelName.trim().length > 100) {
          return res.status(400).json({ success: false, error: `Social link ${i}: channel name is required and must be 1-100 chars` });
        }
        if (!url || typeof url !== 'string' || !isValidUrl(url.trim())) {
          return res.status(400).json({ success: false, error: `Social link ${i}: URL is invalid` });
        }
      }
    }

    // Websites – array of objects, max 100
    if (websites !== undefined) {
      if (!Array.isArray(websites)) {
        return res.status(400).json({ success: false, error: 'Websites must be an array' });
      }
      if (websites.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 websites allowed' });
      }
      for (let i = 0; i < websites.length; i++) {
        const site = websites[i];
        if (!site || typeof site !== 'object') {
          return res.status(400).json({ success: false, error: `Website at index ${i} is invalid` });
        }
        const { label, url } = site;
        if (!label || typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 100) {
          return res.status(400).json({ success: false, error: `Website ${i}: label is required and must be 1-100 chars` });
        }
        if (!url || typeof url !== 'string' || !isValidUrl(url.trim())) {
          return res.status(400).json({ success: false, error: `Website ${i}: URL is invalid` });
        }
      }
    }

    // ── 5. Fetch existing user data ──
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const currentData = userDoc.data();

    // ── 6. Check uniqueness for username and email (if changed) ──
    if (cleanUsername !== undefined && cleanUsername !== currentData.username) {
      const existingUsername = await db.collection('users')
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();
      if (!existingUsername.empty) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
    }

    if (cleanEmail !== undefined && cleanEmail !== currentData.email) {
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

    // ── 7. Build updateData object (only include fields that were sent) ──
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (cleanUsername !== undefined) updateData.username = cleanUsername;
    if (cleanFullname !== undefined) updateData.fullname = cleanFullname;
    if (cleanEmail !== undefined) updateData.email = cleanEmail;
    if (avatar !== undefined) updateData.avatar = avatar || '';

    // Optional fields – include only if sent
    if (bio !== undefined) updateData.bio = bio.trim();
    if (age !== undefined) {
      // If age is null or empty, we store null (clears the field)
      updateData.age = cleanAge;
    }
    if (phone !== undefined) updateData.phone = phone.trim();
    if (country !== undefined) updateData.country = country.trim();
    if (gender !== undefined) updateData.gender = gender.trim();

    // Arrays – store trimmed versions (or empty arrays if sent)
    if (skills !== undefined) {
      updateData.skills = skills.map(s => s.trim());
    }
    if (socialLinks !== undefined) {
      updateData.socialLinks = socialLinks.map(link => ({
        platform: link.platform.trim(),
        channelName: link.channelName.trim(),
        url: link.url.trim(),
      }));
    }
    if (websites !== undefined) {
      updateData.websites = websites.map(site => ({
        label: site.label.trim(),
        url: site.url.trim(),
      }));
    }

    // ── 8. Update Firestore ──
    await db.collection('users').doc(uid).update(updateData);
    await invalidateKey(`user:profile:${uid}`);

    // ── 9. Fetch updated document and return ──
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

    // ── Get deviceId from query or header ──
    const deviceId = req.query.deviceId || req.headers['x-device-id'] || null;
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        userId = decoded.uid;
      } catch (e) { /* ignore */ }
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
      try {
        await redis.set(cacheKey, JSON.stringify(result));
        console.log(`💾 Campaign cached (60s TTL): ${id}`);
      } catch (err) { /* ignore */ }
    }

    // ── ✅ NEW: Check if this user/device already shared ──
    let userHasShared = false;
    if (deviceId || userId) {
      const shareDocId = userId ? `user_${userId}` : (deviceId ? `device_${deviceId}` : null);
      if (shareDocId) {
        try {
          const shareDoc = await db.collection('campaigns').doc(id).collection('shares').doc(shareDocId).get();
          userHasShared = shareDoc.exists;
        } catch (e) {
          console.warn('Error checking share status:', e);
        }
      }
    }

    // ── Return the result with userHasShared ──
    res.json({ ...result, userHasShared });
    
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

    // ── Synchronous cache updates (completed before response) ──
    try {
      // Fetch the newly created campaign with server timestamps
      const docSnapshot = await docRef.get();
      const actualCampaignData = docSnapshot.data();
      const newCampaign = { id: campaignId, ...actualCampaignData };

      // ── Update user's list cache (first page) ──
      await addCampaignToUserListCache(uid, newCampaign);

      // ── Invalidate user stats cache ──
      await invalidateKey(`stats:user:${uid}`);

      // ── Update template usage in cache (only affected template) ──
      const updatedTemplateDoc = await templateRef.get();
      const newUsageCount = updatedTemplateDoc.data().usageCount || 0;
      await updateTemplateInAllCaches(templateId, { usageCount: newUsageCount });

      console.log(`✅ Cache updates completed for campaign ${campaignId}`);
    } catch (err) {
      console.error('❌ Cache update error:', err);
      // Continue even if cache fails – data is already in Firestore
    }

    // ── Respond to client ──
    res.status(201).json({
      success: true,
      campaignId,
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
    const ip = getClientIp(req);
    
    // ── Rate limit: 5 updates per minute (reduced from 10) ──
    if (!(await checkRateLimit(uid, 'campaign-update', 5, 60, ip))) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many update attempts. Please wait a moment.' 
      });
    }

    // ── 1. Fetch existing campaign ──
    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const data = doc.data();
    
    // ── 2. Ownership verification ──
    if (data.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }
    if (data.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // ── 3. Extract ONLY allowed fields (NO status, NO views/unlocks/shares/completions) ──
    const {
      title, description, reward, image,
      shareCount, tasks, finalUrl,
      features
    } = req.body;

    // ── Build update object with validation ──
    const updates = {};
    let hasChanges = false;

    // ── Validate Title (optional) ──
    if (title !== undefined) {
      const trimmed = title.trim();
      if (trimmed.length < 1 || trimmed.length > 100) {
        return res.status(400).json({ 
          success: false, 
          error: 'Title must be between 1 and 100 characters' 
        });
      }
      updates.title = trimmed;
      hasChanges = true;
    }

    // ── Validate Description (optional) ──
    if (description !== undefined) {
      const trimmed = description.trim();
      if (trimmed.length > 500) {
        return res.status(400).json({ 
          success: false, 
          error: 'Description must be less than 500 characters' 
        });
      }
      updates.description = trimmed;
      hasChanges = true;
    }

    // ── Validate Reward (optional) ──
    if (reward !== undefined) {
      const trimmed = reward.trim();
      if (trimmed.length > 100) {
        return res.status(400).json({ 
          success: false, 
          error: 'Reward must be less than 100 characters' 
        });
      }
      updates.reward = trimmed;
      hasChanges = true;
    }

    // ── Validate Image URL (optional) ──
    if (image !== undefined) {
      if (image && !validateImageUrl(image)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid image URL. Only HTTPS images from allowed domains are accepted.' 
        });
      }
      updates.image = image || '';
      hasChanges = true;
    }

    // ── Validate Features (optional) ──
    if (features !== undefined) {
      // Must be an object
      if (typeof features !== 'object' || Array.isArray(features)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Features must be an object' 
        });
      }
      
      const { shareCount: sc, tasks: ts, finalUrl: fu } = features;
      
      // All features must be booleans
      if (typeof sc !== 'boolean' || typeof ts !== 'boolean' || typeof fu !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          error: 'Each feature must be a boolean (true/false)' 
        });
      }
      
      // At least one feature must be enabled
      if (!sc && !ts && !fu) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one feature (Share Count, Tasks, or Final URL) must be enabled' 
        });
      }
      
      updates.features = { shareCount: sc, tasks: ts, finalUrl: fu };
      hasChanges = true;
    }

    // ── Validate ShareCount (only if feature enabled) ──
    if (shareCount !== undefined) {
      // Determine if the shareCount feature is enabled (using updated features or existing)
      const featureEnabled = (features !== undefined) 
        ? features.shareCount 
        : (data.features?.shareCount || false);
      
      if (featureEnabled) {
        const num = Number(shareCount);
        if (!Number.isInteger(num) || num < 1 || num > 9999) {
          return res.status(400).json({ 
            success: false, 
            error: 'Share count must be a whole number between 1 and 9999' 
          });
        }
        updates.shareCount = num;
        hasChanges = true;
      } else {
        // If feature disabled, force shareCount to 0 (clean up)
        updates.shareCount = 0;
        hasChanges = true;
      }
    }

    // ── Validate Tasks (only if feature enabled) ──
    if (tasks !== undefined) {
      const featureEnabled = (features !== undefined) 
        ? features.tasks 
        : (data.features?.tasks || false);
      
      if (featureEnabled) {
        // Must be an array
        if (!Array.isArray(tasks)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Tasks must be an array' 
          });
        }
        
        // At least one task required
        if (tasks.length === 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'At least one task is required when tasks are enabled' 
          });
        }
        
        // Max 100 tasks
        if (tasks.length > 100) {
          return res.status(400).json({ 
            success: false, 
            error: 'Maximum 100 tasks allowed' 
          });
        }
        
        // Validate each task
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          
          // Check text
          if (!task.text || typeof task.text !== 'string') {
            return res.status(400).json({ 
              success: false, 
              error: `Task ${i+1}: Text is required and must be a string` 
            });
          }
          
          const textTrimmed = task.text.trim();
          if (textTrimmed.length < 1 || textTrimmed.length > 250) {
            return res.status(400).json({ 
              success: false, 
              error: `Task ${i+1}: Text must be between 1-250 characters` 
            });
          }
          
          // Check URL
          if (!task.url || typeof task.url !== 'string') {
            return res.status(400).json({ 
              success: false, 
              error: `Task ${i+1}: URL is required and must be a string` 
            });
          }
          
          const urlTrimmed = task.url.trim();
          if (!isValidUrl(urlTrimmed)) {
            return res.status(400).json({ 
              success: false, 
              error: `Task ${i+1}: Invalid URL format` 
            });
          }
        }
        
        // All valid - store cleaned tasks
        updates.tasks = tasks.map(t => ({ 
          text: t.text.trim(), 
          url: t.url.trim() 
        }));
        hasChanges = true;
      } else {
        // If feature disabled, set tasks to empty array
        updates.tasks = [];
        hasChanges = true;
      }
    }

    // ── Validate FinalUrl (only if feature enabled) ──
    if (finalUrl !== undefined) {
      const featureEnabled = (features !== undefined) 
        ? features.finalUrl 
        : (data.features?.finalUrl || false);
      
      if (featureEnabled) {
        if (!finalUrl || typeof finalUrl !== 'string') {
          return res.status(400).json({ 
            success: false, 
            error: 'Final redirect URL is required when enabled' 
          });
        }
        
        const urlTrimmed = finalUrl.trim();
        if (!isValidUrl(urlTrimmed)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid final redirect URL format. Please enter a valid HTTPS URL.' 
          });
        }
        
        updates.finalUrl = urlTrimmed;
        hasChanges = true;
      } else {
        // If feature disabled, set finalUrl to empty string
        updates.finalUrl = '';
        hasChanges = true;
      }
    }

    // ── 4. If no changes, return early ──
    if (!hasChanges) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fields to update. Please provide at least one field.' 
      });
    }

    // ── 5. Prevent updating protected fields ──
    // These fields should NEVER be updated by users
    const protectedFields = ['views', 'unlockCount', 'shares', 'completions', 'userId', 'templateId', 'createdAt', 'status'];
    for (const field of protectedFields) {
      if (req.body[field] !== undefined) {
        console.warn(`⚠️ User ${uid} attempted to update protected field: ${field}`);
        // Silently ignore - don't block the entire request, just ignore the protected field
        // But we should NOT add it to updates
      }
    }

    // ── 6. Apply updates ──
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await doc.ref.update(updates);

    // ── 7. Invalidate caches ──
    await updateCampaignInUserListCache(uid, id, updates);
    await invalidateKey(`campaigns:id:${id}`);
    await invalidateKey(`stats:user:${uid}`);

    // ── 8. Success response ──
    res.json({ 
      success: true, 
      message: 'Campaign updated successfully',
      updatedFields: Object.keys(updates).filter(key => key !== 'updatedAt')
    });

  } catch (error) {
    console.error('❌ Update campaign error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update campaign. Please try again later.' 
    });
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
app.post('/api/campaigns/:id/share', async (req, res) => {
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
      const newShares = (data.shares || 0) + (data.shareCount || 0);
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
app.post('/api/campaigns/:id/complete', async (req, res) => {
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

    // ─── ✅ NEW: Check if this user/device already shared ───
    const docRef = campaignDoc.ref;
    const shareDocId = userId ? `user_${userId}` : (deviceId ? `device_${deviceId}` : `ip_${ip}`);
    const shareDocRef = docRef.collection('shares').doc(shareDocId);
    const shareDoc = await shareDocRef.get();
    if (!shareDoc.exists) {
      return res.status(403).json({
        success: false,
        error: 'You must share this campaign before claiming.'
      });
    }

    // ── Transaction ──
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
app.post('/api/campaigns/:id/unlock', async (req, res) => {
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
app.post('/api/campaigns/:id/view', async (req, res) => {
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
// 21. GROW TOGETHER – SOCIAL TASKS & EXCHANGES
// ============================================================

// ── Helper: Fetch user info (cached 5 min) ──
async function getUserInfo(uid) {
  if (!uid) return null;
  const cacheKey = `user:info:${uid}`;
  try {
    const cached = await redisGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) { /* ignore */ }
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const result = {
    uid,
    username: data.username || '',
    fullname: data.fullname || '',
    avatar: data.avatar || ''
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return result;
}

// ── Helper: Populate exchange with tasks and user info ──
async function populateExchange(data) {
  if (!data) return null;
  const [userATask, userBTask, userA, userB] = await Promise.all([
    db.collection('socialTasks').doc(data.userATaskId).get(),
    db.collection('socialTasks').doc(data.userBTaskId).get(),
    getUserInfo(data.userAUid),
    getUserInfo(data.userBUid),
  ]);
  // Preserve the id if it exists (data.id)
  const result = {
    ...data,
    userATask: userATask.exists ? { id: userATask.id, ...userATask.data() } : null,
    userBTask: userBTask.exists ? { id: userBTask.id, ...userBTask.data() } : null,
    userA,
    userB,
  };
  return result;
}



// ── Helper: Update a user's exchange cache in‑place ──
async function updateUserExchangeCache(uid, updateFn) {
  try {
    const pattern = `exchanges:${uid}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return;
    for (const key of keys) {
      const cached = await redis.get(key);
      if (!cached) continue;
      let data = JSON.parse(cached);
      const newData = updateFn(data);
      if (newData) {
        await redis.set(key, JSON.stringify(newData));
        console.log(`🔄 Updated exchange cache: ${key}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Failed to update exchange cache for user ${uid}:`, error.message);
  }
}



// ─────────────────────────────────────────────
// 1. CREATE SOCIAL TASK
// ─────────────────────────────────────────────
app.post('/api/social-tasks', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'social-task-create', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const { platform, url, taskType, title, description } = req.body;
    if (!platform || typeof platform !== 'string' || platform.trim().length === 0 || platform.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'Platform is required (max 50 chars)' });
    }
    if (!url || typeof url !== 'string' || !isValidUrl(url.trim())) {
      return res.status(400).json({ success: false, error: 'Valid URL is required' });
    }
    if (!taskType || typeof taskType !== 'string' || taskType.trim().length === 0 || taskType.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'Task type is required (max 50 chars)' });
    }
    let cleanDescription = '';
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 500) {
        return res.status(400).json({ success: false, error: 'Description must be a string of max 500 characters' });
      }
      cleanDescription = description.trim();
    }
    const cleanTitle = title ? title.trim().slice(0, 100) : '';
    const taskData = {
      uid,
      platform: platform.trim(),
      url: url.trim(),
      taskType: taskType.trim(),
      title: cleanTitle,
      description: cleanDescription,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('socialTasks').add(taskData);
    const newTask = { id: docRef.id, ...taskData };

    // ── Fetch the user's info to populate owner ──
    const ownerInfo = await getUserInfo(uid);
    const taskWithOwner = { ...newTask, owner: ownerInfo };

    // ── Add to global feed cache ──
    await addTaskToGlobalFeed(taskWithOwner);

    // ── Invalidate user's own tasks cache so it appears in "My Tasks" ──
    await invalidatePattern(`social-tasks:${uid}:*`);

    console.log(`✅ Task created and global feed updated for user ${uid}`);
    res.status(201).json({ success: true, task: newTask });
  } catch (error) {
    console.error('Create social task error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

// ─────────────────────────────────────────────
// 2. LIST USER'S TASKS (paginated)
// ─────────────────────────────────────────────
app.get('/api/social-tasks', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const lastId = req.query.lastId || null;
    if (!(await checkRateLimit(uid, 'social-task-list', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const cacheKey = `social-tasks:${uid}:${limit}:${lastId || 'null'}`;
    console.log(`📦 GET social-tasks cache key: ${cacheKey}`);
    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`🔁 Fetching fresh tasks for user ${uid}`);
      let query = db.collection('socialTasks')
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);
      if (lastId) {
        const lastDoc = await db.collection('socialTasks').doc(lastId).get();
        if (lastDoc.exists) query = query.startAfter(lastDoc);
      }
      const snapshot = await query.get();
      console.log(`📊 Query returned ${snapshot.size} documents`);
      const tasks = [];
      let hasMore = false;
      let nextId = null;
      // Using a for loop instead of forEach for clarity
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i < limit) {
          const doc = docs[i];
          tasks.push({ id: doc.id, ...doc.data() });
          nextId = doc.id;
        } else {
          hasMore = true;
        }
      }
      console.log(`✅ tasks: ${tasks.length}, hasMore: ${hasMore}, nextId: ${nextId}`);
      return { success: true, tasks, hasMore, lastId: nextId };
    });
    res.json(result);
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// ─────────────────────────────────────────────
// 3. UPDATE SOCIAL TASK
// ─────────────────────────────────────────────
app.put('/api/social-tasks/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const { platform, url, taskType, title, active, description } = req.body;
    if (!(await checkRateLimit(uid, 'social-task-update', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const docRef = db.collection('socialTasks').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Task not found' });
    if (doc.data().uid !== uid) return res.status(403).json({ success: false, error: 'Not your task' });

    // ── Store old active state ──
    const oldActive = doc.data().active;

    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (platform !== undefined) {
      if (typeof platform !== 'string' || platform.trim().length === 0 || platform.trim().length > 50) {
        return res.status(400).json({ success: false, error: 'Platform must be 1-50 chars' });
      }
      updateData.platform = platform.trim();
    }
    if (url !== undefined) {
      if (!isValidUrl(url.trim())) return res.status(400).json({ success: false, error: 'Invalid URL' });
      updateData.url = url.trim();
    }
    if (taskType !== undefined) {
      if (typeof taskType !== 'string' || taskType.trim().length === 0 || taskType.trim().length > 50) {
        return res.status(400).json({ success: false, error: 'Task type must be 1-50 chars' });
      }
      updateData.taskType = taskType.trim();
    }
    if (title !== undefined) updateData.title = title.trim().slice(0, 100);
    if (active !== undefined) {
      if (typeof active !== 'boolean') return res.status(400).json({ success: false, error: 'Active must be boolean' });
      updateData.active = active;
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 500) {
        return res.status(400).json({ success: false, error: 'Description must be a string of max 500 characters' });
      }
      updateData.description = description.trim();
    }

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    // ── Handle feed cache based on active status change ──
    if (active !== undefined && active !== oldActive) {
      if (active === false) {
        // Deactivated → remove from feed
        await removeTaskFromGlobalFeed(id);
      } else {
        // Reactivated → add back to feed
        const ownerInfo = await getUserInfo(uid);
        const taskWithOwner = { id, ...updatedData, owner: ownerInfo };
        await addTaskToGlobalFeed(taskWithOwner);
      }
    } else {
      // No active change → just update the task in cache
      await updateTaskInGlobalFeed(id, updateData);
    }

    // ── Invalidate user's own tasks cache so changes appear in "My Tasks" ──
    await invalidatePattern(`social-tasks:${uid}:*`);

    res.json({ success: true, task: { id: updatedDoc.id, ...updatedData } });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// ─────────────────────────────────────────────
// 4. DELETE SOCIAL TASK
// ─────────────────────────────────────────────
app.delete('/api/social-tasks/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    if (!(await checkRateLimit(uid, 'social-task-delete', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const docRef = db.collection('socialTasks').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Task not found' });
    if (doc.data().uid !== uid) return res.status(403).json({ success: false, error: 'Not your task' });

    // ── Find all exchanges that reference this task ──
    const exchangesA = await db.collection('exchanges')
      .where('userATaskId', '==', id)
      .get();
    const exchangesB = await db.collection('exchanges')
      .where('userBTaskId', '==', id)
      .get();

    const allExchanges = [...exchangesA.docs, ...exchangesB.docs];
    const affectedUserIds = new Set();

    // ── Cancel only ACTIVE exchanges, leave others unchanged ──
    for (const exchangeDoc of allExchanges) {
      const data = exchangeDoc.data();
      affectedUserIds.add(data.userAUid);
      affectedUserIds.add(data.userBUid);

      if (data.overallStatus === 'active') {
        await exchangeDoc.ref.update({
          overallStatus: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`🔄 Cancelled active exchange ${exchangeDoc.id} because task ${id} was deleted.`);
      }
    }

    // ── Invalidate exchange caches for all affected users ──
    for (const userId of affectedUserIds) {
      await invalidateUserExchanges(userId);
    }

    // ── Remove from global feed cache ──
    await removeTaskFromGlobalFeed(id);

    // ── ✅ NEW: Clear the user's own tasks cache so the task disappears from "My Tasks" ──
    await invalidatePattern(`social-tasks:${uid}:*`);

    // ── Delete the task document ──
    await docRef.delete();

    res.json({
      success: true,
      message: `Task deleted${allExchanges.some(e => e.data().overallStatus === 'active') ? ' and active exchanges cancelled' : ''}.`
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

// // // ─────────────────────────────────────────────
// 5. GROW FEED – PUBLIC TASKS (global cache)
// ─────────────────────────────────────────────
app.get('/api/grow-feed', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const limit = parseInt(req.query.limit) || 25;
    const lastTaskId = req.query.lastTaskId || null;

    if (!(await checkRateLimit(uid, 'grow-feed', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }

    const cacheKey = getGlobalFeedCacheKey(limit, lastTaskId);

    // ── Try global cache ──
    let result = null;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) result = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    // ── If not cached, fetch from Firestore ──
    if (!result) {
      console.log(`📡 Fetching global feed from Firestore (limit=${limit}, lastTaskId=${lastTaskId})...`);
      let query = db.collection('socialTasks')
        .where('active', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);
      if (lastTaskId) {
        const lastDoc = await db.collection('socialTasks').doc(lastTaskId).get();
        if (lastDoc.exists) query = query.startAfter(lastDoc);
      }
      const snapshot = await query.get();
      const tasks = [];
      let hasMore = false;
      let lastId = null;
      for (const doc of snapshot.docs) {
        if (tasks.length >= limit) {
          hasMore = true;
          break;
        }
        const data = doc.data();
        const user = await getUserInfo(data.uid);
        tasks.push({
          id: doc.id,
          ...data,
          owner: user,
        });
        lastId = doc.id;
      }
      result = { tasks, hasMore, lastId };
      await redis.set(cacheKey, JSON.stringify(result));
      console.log(`💾 Global feed cached: ${cacheKey}`);
    }

    // ── Compute per‑user flags ──
    const exchangedIds = await getUserExchangedTaskIds(uid);
    result.tasks = result.tasks.map(task => ({
      ...task,
      isOwn: task.uid === uid,
      hasExchange: exchangedIds.includes(task.id),
    }));

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Grow feed error:', error);
    res.status(500).json({ success: false, error: 'Failed to load feed' });
  }
});

// ─────────────────────────────────────────────
// 6. CREATE EXCHANGE (with duplicate prevention & in‑place cache updates)
// ─────────────────────────────────────────────
app.post('/api/exchanges', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { targetTaskId, yourTaskId } = req.body;
    if (!targetTaskId || !yourTaskId) {
      return res.status(400).json({ success: false, error: 'Both task IDs are required' });
    }
    if (!(await checkRateLimit(uid, 'exchange-create', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many exchanges. Please wait.' });
    }
    const targetTaskDoc = await db.collection('socialTasks').doc(targetTaskId).get();
    if (!targetTaskDoc.exists) return res.status(404).json({ success: false, error: 'Target task not found' });
    const targetTask = targetTaskDoc.data();
    if (targetTask.uid === uid) return res.status(400).json({ success: false, error: 'Cannot exchange with yourself' });
    if (!targetTask.active) return res.status(400).json({ success: false, error: 'Target task is inactive' });

    const yourTaskDoc = await db.collection('socialTasks').doc(yourTaskId).get();
    if (!yourTaskDoc.exists) return res.status(404).json({ success: false, error: 'Your task not found' });
    const yourTask = yourTaskDoc.data();
    if (yourTask.uid !== uid) return res.status(403).json({ success: false, error: 'Not your task' });
    if (!yourTask.active) return res.status(400).json({ success: false, error: 'Your task is inactive' });

    // ── Prevent duplicate exchange (same pair of tasks, any status) ──
    // Users can reuse tasks with different partners, but cannot create the exact same pair again.
    const existingPair = await db.collection('exchanges')
      .where('userATaskId', '==', yourTaskId)
      .where('userBTaskId', '==', targetTaskId)
      .get();
    if (!existingPair.empty) {
      return res.status(409).json({ success: false, error: 'An exchange already exists between these two tasks.' });
    }
    const existingPairReverse = await db.collection('exchanges')
      .where('userATaskId', '==', targetTaskId)
      .where('userBTaskId', '==', yourTaskId)
      .get();
    if (!existingPairReverse.empty) {
      return res.status(409).json({ success: false, error: 'An exchange already exists between these two tasks.' });
    }

    // ── Create exchange ──
    const exchangeData = {
      userAUid: uid,
      userBUid: targetTask.uid,
      userATaskId: yourTaskId,
      userBTaskId: targetTaskId,
      userAStatus: 'waiting',
      userBStatus: 'waiting',
      overallStatus: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const exchangeRef = await db.collection('exchanges').add(exchangeData);
    const newExchange = { id: exchangeRef.id, ...exchangeData };

    // ── Update exchange caches in‑place ──
    const populatedNewExchange = await populateExchange(newExchange);
    await updateUserExchangeCache(uid, (data) => {
      if (!data.exchanges) return null;
      data.exchanges = [populatedNewExchange, ...data.exchanges];
      return data;
    });
    await updateUserExchangeCache(targetTask.uid, (data) => {
      if (!data.exchanges) return null;
      data.exchanges = [populatedNewExchange, ...data.exchanges];
      return data;
    });


    // ── Invalidate per‑user exchange caches ──
    await invalidateUserExchanges(uid);
    await invalidateUserExchanges(targetTask.uid);

    res.status(201).json({ success: true, exchange: populatedNewExchange });
  } catch (error) {
    console.error('Create exchange error:', error);
    res.status(500).json({ success: false, error: 'Failed to create exchange' });
  }
});

// ─────────────────────────────────────────────
// 7. LIST EXCHANGES (paginated, with status filter)
// ─────────────────────────────────────────────
app.get('/api/exchanges', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const lastId = req.query.lastId || null;
    if (!(await checkRateLimit(uid, 'exchanges-list', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const cacheKey = `exchanges:${uid}:${status || 'all'}:${limit}:${lastId || 'null'}`;
    const result = await getOrSetCache(cacheKey, async () => {
      const statuses = status ? [status] : ['active', 'completed', 'cancelled'];
      let baseQuery = db.collection('exchanges')
        .where('overallStatus', 'in', statuses)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);
      if (lastId) {
        const lastDoc = await db.collection('exchanges').doc(lastId).get();
        if (lastDoc.exists) baseQuery = baseQuery.startAfter(lastDoc);
      }
      const snapshotA = await baseQuery.where('userAUid', '==', uid).get();
      const snapshotB = await baseQuery.where('userBUid', '==', uid).get();
      const exchangeMap = new Map();
      snapshotA.forEach(doc => exchangeMap.set(doc.id, { id: doc.id, ...doc.data() }));
      snapshotB.forEach(doc => exchangeMap.set(doc.id, { id: doc.id, ...doc.data() }));
      const exchanges = Array.from(exchangeMap.values())
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      const hasMore = exchanges.length > limit;
      const paginated = exchanges.slice(0, limit);
      const nextId = paginated.length > 0 ? paginated[paginated.length - 1].id : null;
      const populated = await Promise.all(paginated.map(populateExchange));
      return { success: true, exchanges: populated, hasMore, lastId: nextId };
    });
    res.json(result);
  } catch (error) {
    console.error('List exchanges error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchanges' });
  }
});

// ─────────────────────────────────────────────
// 8. GET SINGLE EXCHANGE
// ─────────────────────────────────────────────
app.get('/api/exchanges/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    if (!(await checkRateLimit(uid, 'exchange-detail', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const doc = await db.collection('exchanges').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Exchange not found' });
    const data = doc.data();
    if (data.userAUid !== uid && data.userBUid !== uid) {
      return res.status(403).json({ success: false, error: 'Not your exchange' });
    }
    // ── Pass the document ID along with the data ──
    const populated = await populateExchange({ id: doc.id, ...data });
    res.json({ success: true, exchange: populated });
  } catch (error) {
    console.error('Get exchange error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchange' });
  }
});

// ─────────────────────────────────────────────
// 9. UPDATE EXCHANGE STATUS (Done / Cancel)
// ─────────────────────────────────────────────
app.put('/api/exchanges/:id/status', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const { status } = req.body;
    if (status !== 'done' && status !== 'cancel') {
      return res.status(400).json({ success: false, error: 'Status must be "done" or "cancel"' });
    }
    if (!(await checkRateLimit(uid, 'exchange-status', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many updates. Please wait.' });
    }
    const docRef = db.collection('exchanges').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Exchange not found' });
    const data = doc.data();
    let side;
    if (data.userAUid === uid) side = 'A';
    else if (data.userBUid === uid) side = 'B';
    else return res.status(403).json({ success: false, error: 'Not your exchange' });
    if (data.overallStatus === 'completed' || data.overallStatus === 'cancelled') {
      return res.status(400).json({ success: false, error: `Exchange already ${data.overallStatus}` });
    }
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (status === 'done') {
      if (side === 'A') {
        if (data.userAStatus === 'done') return res.status(400).json({ success: false, error: 'Already done' });
        updateData.userAStatus = 'done';
      } else {
        if (data.userBStatus === 'done') return res.status(400).json({ success: false, error: 'Already done' });
        updateData.userBStatus = 'done';
      }
      const newA = side === 'A' ? 'done' : data.userAStatus;
      const newB = side === 'B' ? 'done' : data.userBStatus;
      updateData.overallStatus = (newA === 'done' && newB === 'done') ? 'completed' : 'active';
    } else { // cancel
      if (side === 'A') {
        if (data.userAStatus === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled' });
        updateData.userAStatus = 'cancelled';
      } else {
        if (data.userBStatus === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled' });
        updateData.userBStatus = 'cancelled';
      }
      updateData.overallStatus = 'cancelled';
    }
    await docRef.update(updateData);

    // ── ✅ FIXED: include document ID when populating exchange ──
    const updatedDoc = await docRef.get();
    const populated = await populateExchange({ id: doc.id, ...updatedDoc.data() });

    // ── Update exchange caches in‑place ──
    await updateUserExchangeCache(data.userAUid, (cacheData) => {
      if (!cacheData.exchanges) return null;
      cacheData.exchanges = cacheData.exchanges.map(ex => 
        ex.id === id ? populated : ex
      );
      return cacheData;
    });
    await updateUserExchangeCache(data.userBUid, (cacheData) => {
      if (!cacheData.exchanges) return null;
      cacheData.exchanges = cacheData.exchanges.map(ex => 
        ex.id === id ? populated : ex
      );
      return cacheData;
    });


    // ── Invalidate per‑user exchange caches ──
    await invalidateUserExchanges(data.userAUid);
    await invalidateUserExchanges(data.userBUid);

    res.json({ success: true, exchange: populated });
  } catch (error) {
    console.error('Update exchange error:', error);
    res.status(500).json({ success: false, error: 'Failed to update exchange' });
  }
});

// ─────────────────────────────────────────────
// 10. GET AVAILABLE TASKS (for modal selection)
// ─────────────────────────────────────────────
app.get('/api/social-tasks/available', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'social-task-available', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    const snapshot = await db.collection('socialTasks')
      .where('uid', '==', uid)
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    const tasks = [];
    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Available tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});


// ============================================================
// 22. PRODUCT TREND – Product Hunt Style
// ============================================================

// ── Helper: Fetch user info (cached) ──
async function getProductMakerInfo(uid) {
  if (!uid) return null;
  const cacheKey = `user:info:${uid}`;
  try {
    const cached = await redisGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) { /* ignore */ }
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const result = {
    uid,
    username: data.username || '',
    fullname: data.fullname || '',
    avatar: data.avatar || ''
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return result;
}

// ── Helper: Get product with maker info ──
async function getProductWithMaker(productDoc) {
  const data = productDoc.data();
  const maker = await getProductMakerInfo(data.makerUid);
  return {
    id: productDoc.id,
    ...data,
    maker,
  };
}

// ── Helper: Get user vote status ──
async function getUserVoteStatus(productId, uid, deviceId) {
  if (uid) {
    const doc = await db.collection('productVotes').doc(`${productId}_user_${uid}`).get();
    if (doc.exists) return true;
  }
  if (deviceId) {
    const doc = await db.collection('productVotes').doc(`${productId}_device_${deviceId}`).get();
    if (doc.exists) return true;
  }
  return false;
}

// ── Helper: Invalidate product caches ──
async function invalidateProductCaches(productId, makerUid) {
  await invalidatePattern('productstrend:feed:*');
  await invalidateKey(`productstrend:product:${productId}`);
  if (makerUid) {
    await invalidateKey(`productstrend:my-products:${makerUid}`);
  }
}

// ─────────────────────────────────────────────
// 1. GET PRODUCT FEED (paginated, filtered, cached)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 1. GET PRODUCT FEED (public, global cache)
// ─────────────────────────────────────────────
app.get('/api/productstrend/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const lastId = req.query.lastId || null;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';
    const ip = getClientIp(req);

    // ── Rate limit by IP ──
    if (!(await checkRateLimit(ip, 'product-feed', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    // ── Try to get authenticated user ID (optional) ──
    let uid = null;
    let deviceId = req.headers['x-device-id'] || null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) { /* ignore */ }
    }

    // ── Global cache key (no uid) ──
    const cacheKey = `productstrend:feed:global:${limit}:${lastId || 'null'}:${search}:${category}:${sort}`;

    let result = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) result = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!result) {
      console.log(`📡 Fetching product feed from Firestore (${search || 'all'}, ${category || 'all'})...`);
      
      let query = db.collection('products');
      if (category) {
        query = query.where('category', '==', category);
      }
      let orderField = 'createdAt';
      let orderDirection = 'desc';
      if (sort === 'oldest') {
        orderDirection = 'asc';
      } else if (sort === 'most-upvoted') {
        orderField = 'upvotes';
        orderDirection = 'desc';
      } else if (sort === 'most-commented') {
        orderField = 'commentsCount';
        orderDirection = 'desc';
      }
      query = query.orderBy(orderField, orderDirection).orderBy(admin.firestore.FieldPath.documentId(), orderDirection);
      
      if (lastId) {
        const lastDoc = await db.collection('products').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }
      query = query.limit(limit + 1);

      const snapshot = await query.get();
      const products = [];
      let hasMore = false;
      let lastProductId = null;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i >= limit) {
          hasMore = true;
          break;
        }
        const doc = docs[i];
        const data = doc.data();
        if (data.status === 'rejected') continue;
        if (search) {
          const name = (data.name || '').toLowerCase();
          const tagline = (data.tagline || '').toLowerCase();
          const desc = (data.description || '').toLowerCase();
          const term = search.toLowerCase();
          if (!name.includes(term) && !tagline.includes(term) && !desc.includes(term)) {
            continue;
          }
        }
        const maker = await getProductMakerInfo(data.makerUid);
        products.push({ id: doc.id, ...data, maker });
        lastProductId = doc.id;
      }
      result = { products, hasMore, lastId: lastProductId };
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
      console.log(`💾 Global feed cached: ${cacheKey}`);
    }

    // ── Compute user vote status ──
    let userVotedSet = new Set();
    if (uid) {
      const voteCacheKey = `user:votes:${uid}`;
      try {
        const cachedVotes = await redisGet(voteCacheKey);
        if (cachedVotes) {
          userVotedSet = new Set(JSON.parse(cachedVotes));
        } else {
          // Fetch from Firestore
          const voteSnapshot = await db.collection('productVotes')
            .where('userId', '==', uid)
            .select('productId')
            .get();
          const votedIds = voteSnapshot.docs.map(d => d.data().productId);
          userVotedSet = new Set(votedIds);
          await redis.set(voteCacheKey, JSON.stringify(Array.from(userVotedSet)), 'EX', 300);
        }
      } catch (e) {
        console.warn('Vote cache error:', e);
      }
    } else if (deviceId) {
      // For device-based votes, we could also cache, but we'll compute on the fly
      const voteSnapshot = await db.collection('productVotes')
        .where('deviceId', '==', deviceId)
        .select('productId')
        .get();
      const votedIds = voteSnapshot.docs.map(d => d.data().productId);
      userVotedSet = new Set(votedIds);
    }

    const productsWithVote = result.products.map(product => ({
      ...product,
      userVoted: userVotedSet.has(product.id),
    }));

    res.json({
      success: true,
      products: productsWithVote,
      hasMore: result.hasMore,
      lastId: result.lastId,
    });
  } catch (error) {
    console.error('❌ Product feed error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 2. GET SINGLE PRODUCT
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 2. GET SINGLE PRODUCT (public, global cache)
// ─────────────────────────────────────────────
app.get('/api/productstrend/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'product-detail', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    // ── Optional auth ──
    let uid = null;
    let deviceId = req.headers['x-device-id'] || null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) { /* ignore */ }
    }

    const cacheKey = `productstrend:product:${id}`;
    let product = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) product = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!product) {
      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      const data = doc.data();
      const maker = await getProductMakerInfo(data.makerUid);
      product = { id: doc.id, ...data, maker };
      await redis.set(cacheKey, JSON.stringify(product), 'EX', 300);
    }

    // ── Compute user vote status ──
    let userVoted = false;
    if (uid) {
      const voteCacheKey = `user:votes:${uid}`;
      try {
        const cachedVotes = await redisGet(voteCacheKey);
        if (cachedVotes) {
          const votedIds = JSON.parse(cachedVotes);
          userVoted = votedIds.includes(id);
        } else {
          const voteDoc = await db.collection('productVotes').doc(`${id}_user_${uid}`).get();
          userVoted = voteDoc.exists;
        }
      } catch (e) {
        console.warn('Vote check error:', e);
      }
    } else if (deviceId) {
      const voteDoc = await db.collection('productVotes').doc(`${id}_device_${deviceId}`).get();
      userVoted = voteDoc.exists;
    }
    product.userVoted = userVoted;

    res.json({ success: true, product });
  } catch (error) {
    console.error('❌ Product detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 3. GET MY PRODUCTS (user's own products)
// ─────────────────────────────────────────────
app.get('/api/productstrend/my-products', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'my-products', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `productstrend:my-products:${uid}`;
    let products = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) products = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!products) {
      const snapshot = await db.collection('products')
        .where('makerUid', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
      products = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const maker = await getProductMakerInfo(data.makerUid);
        products.push({ id: doc.id, ...data, maker });
      }
      await redis.set(cacheKey, JSON.stringify(products), 'EX', 300);
    }

    res.json({ success: true, products });
  } catch (error) {
    console.error('❌ My products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 4. CREATE PRODUCT (Launch)
// ─────────────────────────────────────────────
app.post('/api/productstrend/products', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { 
      name, tagline, description, url, imageUrl, category,
      features, pricing, productStatus, targetAudience, demoUrl, twitter, techStack, releaseDate
    } = req.body;

    if (!(await checkRateLimit(uid, 'launch-product', 5, 3600))) {
      return res.status(429).json({ success: false, error: 'Too many product launches. Please wait an hour.' });
    }

    if (!name || name.trim().length < 1 || name.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'Name must be 1-100 characters' });
    }
    if (!tagline || tagline.trim().length < 1 || tagline.trim().length > 200) {
      return res.status(400).json({ success: false, error: 'Tagline must be 1-200 characters' });
    }
    if (description && description.length > 2000) {
      return res.status(400).json({ success: false, error: 'Description must be less than 2000 characters' });
    }
    if (url && !isValidUrl(url.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid URL' });
    }
    if (imageUrl && !validateImageUrl(imageUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
    }
    if (category && typeof category !== 'string') {
      return res.status(400).json({ success: false, error: 'Category must be a string' });
    }

    // ── Validate new fields ──
    if (features !== undefined) {
      if (!Array.isArray(features) || features.some(f => typeof f !== 'string')) {
        return res.status(400).json({ success: false, error: 'Features must be an array of strings' });
      }
    }
    if (pricing !== undefined && typeof pricing !== 'string') {
      return res.status(400).json({ success: false, error: 'Pricing must be a string' });
    }
    if (productStatus !== undefined && typeof productStatus !== 'string') {
      return res.status(400).json({ success: false, error: 'Product status must be a string' });
    }
    if (targetAudience !== undefined && typeof targetAudience !== 'string') {
      return res.status(400).json({ success: false, error: 'Target audience must be a string' });
    }
    if (demoUrl !== undefined && demoUrl && !isValidUrl(demoUrl.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid demo URL' });
    }
    if (twitter !== undefined && typeof twitter !== 'string') {
      return res.status(400).json({ success: false, error: 'Twitter handle must be a string' });
    }
    if (techStack !== undefined) {
      if (!Array.isArray(techStack) || techStack.some(t => typeof t !== 'string')) {
        return res.status(400).json({ success: false, error: 'Tech stack must be an array of strings' });
      }
    }
    if (releaseDate !== undefined && typeof releaseDate !== 'string') {
      return res.status(400).json({ success: false, error: 'Release date must be a string' });
    }

    const productData = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description ? description.trim() : '',
      url: url ? url.trim() : '',
      imageUrl: imageUrl || '',
      category: category || 'Other',
      makerUid: uid,
      status: 'approved',
      upvotes: 0,
      commentsCount: 0,
      // ── New fields ──
      features: features || [],
      pricing: pricing || 'Free',
      productStatus: productStatus || 'Live',
      targetAudience: targetAudience || '',
      demoUrl: demoUrl || '',
      twitter: twitter || '',
      techStack: techStack || [],
      releaseDate: releaseDate || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('products').add(productData);
    const newProduct = { id: docRef.id, ...productData };
    newProduct.maker = await getProductMakerInfo(uid);

    await invalidatePattern('productstrend:feed:*');
    await invalidateKey(`productstrend:my-products:${uid}`);

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 5. UPDATE PRODUCT (maker or admin only)
// ─────────────────────────────────────────────
app.put('/api/productstrend/products/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { 
      name, tagline, description, url, imageUrl, category, status,
      features, pricing, productStatus, targetAudience, demoUrl, twitter, techStack, releaseDate
    } = req.body;

    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const data = doc.data();
    const userIsAdmin = await isAdmin(uid);
    if (data.makerUid !== uid && !userIsAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this product' });
    }

    const updateData = {};
    if (name !== undefined) {
      if (name.trim().length < 1 || name.trim().length > 100) {
        return res.status(400).json({ success: false, error: 'Name must be 1-100 characters' });
      }
      updateData.name = name.trim();
    }
    if (tagline !== undefined) {
      if (tagline.trim().length < 1 || tagline.trim().length > 200) {
        return res.status(400).json({ success: false, error: 'Tagline must be 1-200 characters' });
      }
      updateData.tagline = tagline.trim();
    }
    if (description !== undefined) {
      if (description.length > 2000) {
        return res.status(400).json({ success: false, error: 'Description must be less than 2000 characters' });
      }
      updateData.description = description.trim();
    }
    if (url !== undefined) {
      if (!isValidUrl(url.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid URL' });
      }
      updateData.url = url.trim();
    }
    if (imageUrl !== undefined) {
      if (!validateImageUrl(imageUrl)) {
        return res.status(400).json({ success: false, error: 'Invalid image URL' });
      }
      updateData.imageUrl = imageUrl;
    }
    if (category !== undefined) {
      updateData.category = category;
    }
    if (userIsAdmin && status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      updateData.status = status;
    }

    // ── New fields ──
    if (features !== undefined) {
      if (!Array.isArray(features) || features.some(f => typeof f !== 'string')) {
        return res.status(400).json({ success: false, error: 'Features must be an array of strings' });
      }
      updateData.features = features.map(f => f.trim()).filter(Boolean);
    }
    if (pricing !== undefined) {
      if (typeof pricing !== 'string') {
        return res.status(400).json({ success: false, error: 'Pricing must be a string' });
      }
      updateData.pricing = pricing;
    }
    if (productStatus !== undefined) {
      if (typeof productStatus !== 'string') {
        return res.status(400).json({ success: false, error: 'Product status must be a string' });
      }
      updateData.productStatus = productStatus;
    }
    if (targetAudience !== undefined) {
      if (typeof targetAudience !== 'string') {
        return res.status(400).json({ success: false, error: 'Target audience must be a string' });
      }
      updateData.targetAudience = targetAudience;
    }
    if (demoUrl !== undefined) {
      if (demoUrl && !isValidUrl(demoUrl.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid demo URL' });
      }
      updateData.demoUrl = demoUrl.trim();
    }
    if (twitter !== undefined) {
      if (typeof twitter !== 'string') {
        return res.status(400).json({ success: false, error: 'Twitter handle must be a string' });
      }
      updateData.twitter = twitter.trim();
    }
    if (techStack !== undefined) {
      if (!Array.isArray(techStack) || techStack.some(t => typeof t !== 'string')) {
        return res.status(400).json({ success: false, error: 'Tech stack must be an array of strings' });
      }
      updateData.techStack = techStack.map(t => t.trim()).filter(Boolean);
    }
    if (releaseDate !== undefined) {
      if (typeof releaseDate !== 'string') {
        return res.status(400).json({ success: false, error: 'Release date must be a string' });
      }
      updateData.releaseDate = releaseDate;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updateData);

    await invalidateProductCaches(id, data.makerUid);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    const maker = await getProductMakerInfo(updatedData.makerUid);
    const product = { id: updatedDoc.id, ...updatedData, maker };

    res.json({ success: true, product });
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 6. DELETE PRODUCT (maker or admin only)
// ─────────────────────────────────────────────
app.delete('/api/productstrend/products/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const data = doc.data();
    const userIsAdmin = await isAdmin(uid);
    if (data.makerUid !== uid && !userIsAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this product' });
    }

    await docRef.delete();

    await invalidateProductCaches(id, data.makerUid);
    await invalidatePattern(`productstrend:feed:*`);

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 7. UPVOTE PRODUCT (toggle)
// ─────────────────────────────────────────────
app.post('/api/productstrend/products/:id/upvote', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const deviceId = req.headers['x-device-id'] || null;

    if (!deviceId && !uid) {
      return res.status(400).json({ success: false, error: 'Device ID or user ID required' });
    }

    if (!(await checkRateLimit(uid, 'upvote-product', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many upvotes. Please wait.' });
    }

    const docRef = db.collection('products').doc(id);
    const voteId = uid ? `user_${uid}` : `device_${deviceId}`;
    const voteDocRef = db.collection('productVotes').doc(`${id}_${voteId}`);

    let result;
    await db.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(docRef);
      if (!productDoc.exists) {
        throw new Error('Product not found');
      }
      const productData = productDoc.data();
      const voteDoc = await transaction.get(voteDocRef);
      const isVoted = voteDoc.exists;

      if (isVoted) {
        transaction.delete(voteDocRef);
        transaction.update(docRef, {
          upvotes: productData.upvotes - 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result = { action: 'removed', upvotes: productData.upvotes - 1 };
      } else {
        transaction.set(voteDocRef, {
          productId: id,
          userId: uid || null,
          deviceId: deviceId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(docRef, {
          upvotes: productData.upvotes + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result = { action: 'added', upvotes: productData.upvotes + 1 };
      }
    });

    await invalidateProductCaches(id, null);

    // ── ✅ Invalidate user's vote cache ──
    if (uid) {
      await invalidateKey(`user:votes:${uid}`);
    }

    res.json({
      success: true,
      action: result.action,
      upvotes: result.upvotes,
    });
  } catch (error) {
    console.error('❌ Upvote error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 8. GET PRODUCT COMMENTS
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 8. GET PRODUCT COMMENTS (public)
// ─────────────────────────────────────────────
app.get('/api/productstrend/products/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'product-comments', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `productstrend:comments:${id}`;
    let comments = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) comments = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!comments) {
      const snapshot = await db.collection('productComments')
        .where('productId', '==', id)
        .orderBy('createdAt', 'desc')
        .get();
      comments = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const user = await getProductMakerInfo(data.userId);
        comments.push({
          id: doc.id,
          ...data,
          user,
        });
      }
      await redis.set(cacheKey, JSON.stringify(comments), 'EX', 300);
    }

    res.json({ success: true, comments });
  } catch (error) {
    console.error('❌ Get comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 9. ADD COMMENT TO PRODUCT
// ─────────────────────────────────────────────
app.post('/api/productstrend/products/:id/comments', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { text } = req.body;

    if (!text || text.trim().length < 1 || text.trim().length > 500) {
      return res.status(400).json({ success: false, error: 'Comment must be 1-500 characters' });
    }

    if (!(await checkRateLimit(uid, 'add-comment', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many comments. Please wait.' });
    }

    const commentData = {
      productId: id,
      userId: uid,
      text: text.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('productComments').add(commentData);

    const productRef = db.collection('products').doc(id);
    await productRef.update({
      commentsCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await invalidateKey(`productstrend:comments:${id}`);
    await invalidateKey(`productstrend:product:${id}`);
    await invalidatePattern('productstrend:feed:*');

    const comment = { id: docRef.id, ...commentData };
    comment.user = await getProductMakerInfo(uid);

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({ success: false, error: error.message });
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