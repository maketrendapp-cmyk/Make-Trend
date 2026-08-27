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
let redis;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    connectTimeout: 5000,
    commandTimeout: 3000,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 30000);
      console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    keepAlive: 30000,
  });
  redis.on('error', (err) => {
    console.warn('⚠️ Redis error (will retry):', err.message);
  });
  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('ready', () => console.log('✅ Redis ready'));
  redis.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));
} catch (err) {
  console.warn('⚠️ Failed to create Redis client. Continuing without Redis cache.');
  // No‑op dummy client (all methods return null or no‑op)
  redis = {
    get: () => null,
    set: () => {},
    del: () => {},
    scan: () => ['0', []],
    ttl: () => 0,
    incr: () => 0,
    expire: () => {},
    hgetall: () => ({}),
    hset: () => {},
    hincrby: () => {},
    sadd: () => 0,
    zadd: () => {},
    zrem: () => {},
    zrevrange: () => [],
    zrevrank: () => null,
    pipeline: () => ({ exec: () => {} }),
    on: () => {},
  };
}

// ── Redis get with 1s timeout (increased from 500ms) ──
async function redisGet(key) {
  return Promise.race([
    redis.get(key),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
  ]);
}

// ── Get from cache or fetch ──
async function getOrSetCache(key, fetchFn, ttl = null) {
  try {
    const cached = await redisGet(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
    console.log(`📡 Cache MISS: ${key}`);
    const data = await fetchFn();
    if (ttl) {
      await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } else {
      await redis.set(key, JSON.stringify(data));
    }
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

// ── Invalidate all keys matching a pattern (SCAN – production safe) ──
async function invalidatePattern(pattern) {
  try {
    let cursor = '0';
    let deletedCount = 0;
    do {
      const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');
    if (deletedCount > 0) {
      console.log(`🗑️ Invalidated ${deletedCount} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error(`❌ Cache invalidation error for ${pattern}:`, error);
  }
}


// ── Update a specific campaign in all cached user list pages (in‑place) ──
// Used ONLY for counter updates (views, shares, completions, unlocks) to avoid cache invalidation.
async function updateCampaignInUserListCache(ownerId, campaignId, updates) {
  try {
    const pattern = `campaigns:user:${ownerId}:*`;
    let cursor = '0';
    let keys = [];
    do {
      const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      keys = keys.concat(reply[1]);
    } while (cursor !== '0');

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
          const ttlToUse = ttl > 0 ? ttl : 86400;
          await redis.set(key, JSON.stringify(data), 'EX', ttlToUse);
          console.log(`🔄 Updated campaign ${campaignId} in cache ${key}`);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to update campaign ${campaignId} in user list cache:`, error);
  }
}


// ── Update a specific template in all cached template list pages ──
async function updateTemplateInAllCaches(templateId, updates) {
  try {
    const pattern = 'templates:*';
    let cursor = '0';
    let keys = [];
    do {
      const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      keys = keys.concat(reply[1]);
    } while (cursor !== '0');

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
          const ttlToUse = ttl > 0 ? ttl : 86400;
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
// GROW FEED – SORTED SETS (Fanout‑on‑write)
// ─────────────────────────────────────────────

function getFeedKey(platform = null, taskType = null) {
  if (platform && taskType) {
    return `feed:platform:${platform}:tasktype:${taskType}`;
  } else if (platform) {
    return `feed:platform:${platform}`;
  } else if (taskType) {
    return `feed:tasktype:${taskType}`;
  } else {
    return `feed:all`;
  }
}

// Add task ID to all relevant sorted sets
async function addTaskToFeedSets(taskId, platform, taskType, timestamp) {
  const keys = [
    getFeedKey(),             // all
    getFeedKey(platform),     // platform only
    getFeedKey(null, taskType), // taskType only
    getFeedKey(platform, taskType), // both
  ];
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.zadd(key, timestamp, taskId);
  }
  await pipeline.exec();
}

// Remove task ID from all relevant sorted sets
async function removeTaskFromFeedSets(taskId, platform, taskType) {
  const keys = [
    getFeedKey(),
    getFeedKey(platform),
    getFeedKey(null, taskType),
    getFeedKey(platform, taskType),
  ];
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.zrem(key, taskId);
  }
  await pipeline.exec();
}

// Cache task details (full object) with TTL
async function cacheTaskDetails(taskId, taskData) {
  await redis.set(`task:${taskId}`, JSON.stringify(taskData), 'EX', 3600); // 1 hour TTL
}

// Get task details – tries cache, falls back to Firestore
async function getTaskDetails(taskId) {
  const cached = await redis.get(`task:${taskId}`);
  if (cached) return JSON.parse(cached);
  // Fallback to Firestore
  const doc = await db.collection('socialTasks').doc(taskId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const owner = await getUserInfo(data.uid);
  const task = { id: taskId, ...data, owner };
  await cacheTaskDetails(taskId, task);
  return task;
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

// ── Helper: Create notification (internal, used by other endpoints) ──
// Also sends push notifications via FCM to all registered devices.
async function createNotification({ userId, type, title, description, redirectUrl, fromUserId = null }) {
  try {
    // 1. Save to Firestore
    const data = {
      userId,
      type, // 'personal' or 'system'
      title: title.slice(0, 100),
      description: description ? description.slice(0, 300) : '',
      redirectUrl: redirectUrl || null,
      fromUserId: fromUserId || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('notifications').add(data);
    await invalidatePattern(`notifications:user:${userId}:*`);

    // 2. Send push notification via Firebase Cloud Messaging
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const tokens = userDoc.data()?.fcmTokens || [];
      if (tokens.length === 0) return; // no devices registered

      const message = {
        notification: {
          title: title.slice(0, 100),
          body: description ? description.slice(0, 200) : 'You have a new notification',
        },
        data: {
          redirectUrl: redirectUrl || '',
          type: type,
        },
        tokens: tokens, // up to 100 tokens per call
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`📨 Push sent: ${response.successCount} succeeded, ${response.failureCount} failed`);

      // ── Clean up invalid tokens ──
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/invalid-registration-token') {
              invalidTokens.push(tokens[idx]);
            }
          }
        });
        if (invalidTokens.length > 0) {
          const userRef = db.collection('users').doc(userId);
          for (const token of invalidTokens) {
            await userRef.update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
            });
          }
          console.log(`🧹 Removed ${invalidTokens.length} invalid FCM tokens`);
        }
      }
    } catch (pushError) {
      console.error('❌ Push notification error:', pushError);
      // Do not block the main operation if push fails
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}




// ============================================================
// 1. FIREBASE ADMIN SDK
// ============================================================
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.error('❌ Firebase initialization failed:', err.message);
    // Optionally exit or continue if you have a fallback
  }
}
const db = admin.firestore();
console.log('✅ Firebase Admin SDK initialized');

// ============================================================
// 2. CLOUDINARY
// ============================================================
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary initialized');
} catch (err) {
  console.warn('⚠️ Cloudinary initialization failed:', err.message);
}

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
// ── Global error handlers to prevent crashes ──
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  // Do not exit – log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Do not exit
});
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
  let isNewGrant = false;
  
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
      isNewGrant = true;
    }
  } else {
    // No PRO or free plan → start from now
    expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    console.log(`👑 PRO granted for 24h to ${uid}`);
    isNewGrant = true;
  }
  
  // Update the user
  await db.collection('users').doc(uid).update({
    plan: 'pro',
    proExpiry: admin.firestore.Timestamp.fromDate(expiry),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // ── 🆕 Send notification when PRO is granted or extended ──
  if (isNewGrant) {
    try {
      // Get user info for the notification
      const userInfo = await getUserInfo(uid);
      const expiryDate = expiry.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      await createNotification({
        userId: uid,
        type: 'personal',
        title: '🎉 You\'ve claimed PRO for 24 hours!',
        description: `Congratulations! You've earned 24 hours of PRO access. Your PRO status will expire on ${expiryDate}. Enjoy the exclusive features!`,
        fromUserId: uid,
      });
      console.log(`📬 PRO notification sent to ${uid}`);
    } catch (notifError) {
      console.error('Failed to send PRO notification:', notifError);
    }
  }
  
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

// ── Daily limit helper (resets at midnight UTC) ──
async function checkDailyLimit(uid, action, limit) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `daily:${action}:${uid}:${today}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Set expiry to end of day (UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const secondsUntilMidnight = Math.floor((tomorrow - now) / 1000);
    if (secondsUntilMidnight > 0) {
      await redis.expire(key, secondsUntilMidnight);
    }
  }
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

// ── Update post likes in feed (for most-liked sorting) ──
async function updatePostLikesInFeed(postId, category, type, likes) {
  // Remove from all feed sets (to clean up old entries)
  await removePostFromFeedSets(postId, category, type);
  
  // Re‑add with new likes as score for the "most-liked" feeds
  const timestamp = Date.now();
  // 1. Re‑add to the default newest feeds (timestamp based)
  await addPostToFeedSets(postId, category, type, timestamp);
  
  // 2. Update the most-liked sorted sets with likes as score
  const likesKeys = [
    `posts:feed:category:${category || 'all'}:type:${type || 'all'}:sort:likes`,
    `posts:feed:category:${category || 'all'}:type:all:sort:likes`,
    `posts:feed:category:all:type:${type || 'all'}:sort:likes`,
    `posts:feed:category:all:type:all:sort:likes`,
  ];
  const pipeline = redis.pipeline();
  for (const key of likesKeys) {
    pipeline.zadd(key, likes, postId);
  }
  await pipeline.exec();
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
  lastReadSystemAt: 0,        // ✅ NEW
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

              // ── 🆕 Send notification to referrer ──
              try {
                const newUserInfo = await getUserInfo(uid);
                await createNotification({
                  userId: referrerUid,
                  type: 'personal',
                  title: 'Someone used your referral code! 🎉',
                  description: `@${newUserInfo?.username || 'A new user'} signed up using your referral code. You now have ${newReferrals} referral${newReferrals > 1 ? 's' : ''}!`,
                  fromUserId: uid,
                });
                console.log(`📬 Referral notification sent to ${referrerUid}`);
              } catch (notifError) {
                console.error('Failed to send referral notification to referrer:', notifError);
              }

              // ── 🆕 Send notification to new user (welcome + coins) ──
              try {
                const referrerInfo = await getUserInfo(referrerUid);
                await createNotification({
                  userId: uid,
                  type: 'personal',
                  title: 'Welcome! You claimed 100 MT Coins 🎉',
                  description: `You used @${referrerInfo?.username || 'a user'}'s referral code and received 100 MT Coins as a welcome bonus! Start exploring the platform.`,
                  fromUserId: referrerUid,
                });
                console.log(`📬 Welcome notification sent to ${uid}`);
              } catch (notifError) {
                console.error('Failed to send welcome notification to new user:', notifError);
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
  lastReadSystemAt: 0,        // ✅ NEW
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
    const cacheKey = `user:profile:${uid}`;
    const THIRTY_SECONDS = 30;

    // ── Try cache first ──
    let cached = null;
    try {
      const cachedData = await redisGet(cacheKey);
      if (cachedData) {
        cached = JSON.parse(cachedData);
        console.log(`📦 Profile cache HIT: ${uid}`);
        return res.json(cached);
      }
    } catch (error) {
      console.warn(`⚠️ Profile cache miss/error: ${error.message}`);
    }

    // ── Cache miss – fetch from Firestore ──
    console.log(`📡 Fetching profile for user ${uid} from Firestore...`);
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

    const response = { success: true, user: userWithDefaults };

    // ── Store in Redis with 30‑second TTL ──
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', THIRTY_SECONDS);
      console.log(`💾 Profile cached (30s TTL): ${uid}`);
    } catch (err) {
      // ignore cache errors
    }

    res.json(response);
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
    const TWENTY_FOUR_HOURS = 24 * 60 * 60; // 86400 seconds
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
    }, TWENTY_FOUR_HOURS);
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

// ── Get user's campaigns with filters (status, search, feature) ──
app.get('/api/campaigns', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { status, search, feature } = req.query;
    let limit = parseInt(req.query.limit) || 25;
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastCreatedAt = req.query.lastCreatedAt ? new Date(parseInt(req.query.lastCreatedAt)) : null;
    const lastId = req.query.lastId || null;

    // Base query: user's campaigns, exclude 'deleted' status
    let query = db.collection('campaigns').where('userId', '==', uid);

    // ── Status filter ──
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    } else {
      // Default: only active and paused (exclude deleted)
      query = query.where('status', 'in', ['active', 'paused']);
    }

    // ── Feature filter (using boolean fields) ──
    if (feature === 'share') {
      query = query.where('hasShare', '==', true);
    } else if (feature === 'tasks') {
      query = query.where('hasTasks', '==', true);
    } else if (feature === 'finalUrl') {
      query = query.where('hasFinalUrl', '==', true);
    }

    // ── Search filter (prefix search on 'searchable' field) ──
    if (search && typeof search === 'string') {
      const term = search.trim().toLowerCase();
      if (term) {
        query = query.where('searchable', '>=', term)
                     .where('searchable', '<=', term + '\uf8ff');
      }
    }

    // ── Ordering & Pagination ──
    query = query.orderBy('createdAt', 'desc')
                 .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
                 .limit(limit + 1);

    if (lastCreatedAt && lastId) {
      const lastDocSnapshot = await db.collection('campaigns').doc(lastId).get();
      if (lastDocSnapshot.exists) {
        // We need a document snapshot to use startAfter with multiple orderBy fields.
        // Actually, we can startAfter with the values directly:
        query = query.startAfter(lastCreatedAt, lastId);
      }
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

    // ── Build cursor for next page ──
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

    // ── Cache (optional) ──
    // Invalidate cache when filters change, but since we have a new query key per filter,
    // we can cache each combination with its own key.
    // We'll use a cache key that includes filters:
    const cacheKey = `campaigns:user:${uid}:status:${status || 'all'}:feature:${feature || 'all'}:search:${search || 'none'}:limit:${limit}:lastCreatedAt:${req.query.lastCreatedAt || 'null'}:lastId:${lastId || 'null'}`;
    try {
      // Cache for 5 minutes to reduce load, but we'll invalidate on any campaign change.
      await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
      console.log(`💾 Campaigns cached: ${cacheKey}`);
    } catch (err) {
      // ignore cache errors
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
        const SIX_HOURS = 6 * 60 * 60; // 21600 seconds
        await redis.set(cacheKey, JSON.stringify(result), 'EX', SIX_HOURS);
        console.log(`💾 Campaign cached (6 hours TTL): ${id}`);
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
    const { templateId, shareCount, tasks, finalUrl, features, title, description, reward, image } = req.body;

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
  image: image || templateData.image || '',
  reward: finalReward,
  templateSlug: templateData.slug || 'campaign',
  status: 'active',
  views: 0,
  completions: 0,
  shares: 0,
  unlockCount: 0,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  // ── NEW FIELDS ──
  hasShare: scEnabled || false,
  hasTasks: tasksEnabled || false,
  hasFinalUrl: fuEnabled || false,
  searchable: (finalTitle + ' ' + finalDescription + ' ' + finalReward).toLowerCase(),
};

    // ── Firestore writes (fast) ──
    const docRef = await db.collection('campaigns').add(campaignData);
    await templateRef.update({ usageCount: admin.firestore.FieldValue.increment(1) });

    const campaignId = docRef.id;

    // ── Invalidate all cached list caches for this user ──
    try {
      // Invalidate all campaign list caches (any filter combination)
      await invalidatePattern(`campaigns:user:${uid}:*`);
      
      // Invalidate single‑campaign cache (if any)
      await invalidateKey(`campaigns:id:${campaignId}`);
      
      // Invalidate user stats
      await invalidateKey(`stats:user:${uid}`);

      // ── Update template usage in cache (only affected template) ──
      const updatedTemplateDoc = await templateRef.get();
      const newUsageCount = updatedTemplateDoc.data().usageCount || 0;
      await updateTemplateInAllCaches(templateId, { usageCount: newUsageCount });

      console.log(`✅ Cache invalidated for campaign ${campaignId}`);
    } catch (err) {
      console.error('❌ Cache invalidation error:', err);
      // Continue even if cache fails – data is already in Firestore
    }

    // ── Send notification to the creator ──
    try {
      await createNotification({
        userId: uid,
        type: 'personal',
        title: 'Campaign Created! 🎉',
        description: `Your campaign "${finalTitle}" is now live. Share it with your audience!`,
        redirectUrl: `/${templateData.slug || 'campaign'}/${campaignId}`,
        fromUserId: uid,
      });
      console.log(`📬 Notification sent to ${uid} for campaign ${campaignId}`);
    } catch (notifError) {
      console.error('Failed to send campaign creation notification:', notifError);
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

    // ── Recompute searchable and feature flags ──
    const finalTitle = updates.title ?? data.title;
    const finalDescription = updates.description ?? data.description;
    const finalReward = updates.reward ?? data.reward;
    const finalFeatures = updates.features ?? data.features;

    updates.searchable = (finalTitle + ' ' + finalDescription + ' ' + finalReward).toLowerCase();
    updates.hasShare = finalFeatures.shareCount || false;
    updates.hasTasks = finalFeatures.tasks || false;
    updates.hasFinalUrl = finalFeatures.finalUrl || false;

    // ── 6. Apply updates ──
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await doc.ref.update(updates);

    // ── 7. Invalidate all caches ──
    await invalidatePattern(`campaigns:user:${uid}:*`);
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

    // ── Invalidate all caches ──
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

      // ── Update stats cache (increment totalShares by shareCount) ──
      try {
        const statsCacheKey = `stats:user:${campaignData.userId}`;
        const statsCached = await redis.get(statsCacheKey);
        if (statsCached) {
          const stats = JSON.parse(statsCached);
          if (stats.stats && typeof stats.stats.totalShares === 'number') {
            stats.stats.totalShares += result.shareCount; // increment by the share count value
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
// 14. USER STATS (cached with 6‑hour TTL)
// ============================================================
app.get('/api/stats', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const cacheKey = `stats:user:${uid}`;
    const SIX_HOURS = 6 * 60 * 60; // 21600 seconds

    // ── Try cache first ──
    let result = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        result = JSON.parse(cached);
        console.log(`📦 Stats cache HIT: ${cacheKey}`);
        return res.json(result);
      }
    } catch (error) {
      console.warn(`⚠️ Stats cache miss/error: ${error.message}`);
    }

    // ── Cache miss – fetch from Firestore ──
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

    result = {
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

    // ── Store in Redis with 6‑hour TTL ──
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', SIX_HOURS);
      console.log(`💾 Stats cached (6 hours TTL): ${cacheKey}`);
    } catch (err) {
      // ignore cache errors
    }

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

    // ── 🆕 9. Milestone notification for views (every multiple of 9) ──
    if (newViews > 0 && newViews % 9 === 0) {
      try {
        const campaignTitle = campaignData.title || 'Untitled Campaign';
        let viewerName = 'Someone';
        if (userId) {
          const viewerInfo = await getUserInfo(userId);
          if (viewerInfo) viewerName = viewerInfo.username || 'Someone';
        }
        await createNotification({
          userId: ownerId,
          type: 'personal',
          title: `👀 Your campaign got ${newViews} views!`,
          description: `"${campaignTitle}" has reached ${newViews} views! ${viewerName} was the ${newViews}th viewer.`,
          fromUserId: userId || null,
        });
        console.log(`📬 Milestone view notification sent for campaign ${id} (${newViews} views)`);
      } catch (notifError) {
        console.error('Failed to send milestone view notification:', notifError);
      }
    }

    // 10. Return success
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

// ── Get tickets ── (authenticated, with ban check + rate limit + pagination)
app.get('/api/support', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await checkRateLimit(uid, 'support-get', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    // ── Pagination parameters ──
    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const lastId = req.query.lastId || null;

    // ── Build cache key with pagination ──
    const cacheKey = `support:user:${uid}:limit:${limit}:lastId:${lastId || 'null'}`;
    const SIX_HOURS = 6 * 60 * 60;

    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching support tickets for user ${uid} (limit=${limit}, lastId=${lastId})...`);

      let query = db.collection('supportTickets')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);

      if (lastId) {
        const lastDoc = await db.collection('supportTickets').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const tickets = [];
      let hasMore = false;
      let nextId = null;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i < limit) {
          const doc = docs[i];
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
          nextId = doc.id;
        } else {
          hasMore = true;
        }
      }

      return {
        success: true,
        tickets,
        hasMore,
        lastId: nextId,
      };
    }, SIX_HOURS);

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
    const SIX_HOURS = 6 * 60 * 60;
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
    }, SIX_HOURS);
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
    let transformation;
    if (folder === 'avatars') {
      transformation = [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }];
    } else if (folder === 'productstrend') {
      transformation = [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }];
    } else if (folder === 'templates') {
      transformation = [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }];
    } else {
      // Default fallback
      transformation = [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }];
    }

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
    if (!Number.isInteger(numCoins) || numCoins !== 10000) {
      return res.status(400).json({ success: false, error: 'Withdrawal must be exactly 10,000 MT Coins ($10)' });
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
        amount: 10.00,
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
      // Count ALL campaigns – including deleted – for MT Coins
      totalViews += data.views || 0;
      totalCompletions += data.completions || 0;
      totalShares += data.shares || 0;
      totalUnlocks += data.unlockCount || 0;
    });

    // ── MT Coins from stats = minimum of all four ──
    const earnedFromStats = Math.min(
      totalViews,
      totalShares,
      totalUnlocks,
      totalCompletions
    );

    // ── 2. Calculate total likes from community posts (including deleted) ──
    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .select('likes')
      .get();

    let totalLikes = 0;
    postsSnapshot.forEach(doc => {
      totalLikes += doc.data().likes || 0;
    });

    // ── 2b. Calculate total upvotes from products ──
    const productsSnapshot = await db.collection('products')
      .where('makerUid', '==', uid)
      .select('upvotes')
      .get();

    let totalUpvotes = 0;
    productsSnapshot.forEach(doc => {
      totalUpvotes += doc.data().upvotes || 0;
    });

    // ── 3. Get user document ──
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const data = userDoc.data();
    let mtCoinsEarned = data.mtCoinsEarned || 0;
    let mtCoinsSpent = data.mtCoinsSpent || 0;
    let statsEarned = data.statsEarned ?? 0;
    let communityLikesEarned = data.communityLikesEarned ?? 0;
    let productUpvotesEarned = data.productUpvotesEarned ?? 0; // 🔥 NEW

    // ── 4. MIGRATION: Initialize if mtCoinsEarned is missing ──
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
      statsEarned = earnedFromStats;
      communityLikesEarned = totalLikes;
      productUpvotesEarned = totalUpvotes; // 🔥 NEW

      await db.collection('users').doc(uid).update({
        mtCoinsEarned,
        mtCoinsSpent,
        statsEarned,
        communityLikesEarned,
        productUpvotesEarned, // 🔥 NEW
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // ── 5. Normal delta update for campaign stats ──
      const deltaStats = earnedFromStats - statsEarned;
      if (deltaStats > 0) {
        mtCoinsEarned += deltaStats;
        statsEarned = earnedFromStats;
        await db.collection('users').doc(uid).update({
          mtCoinsEarned,
          statsEarned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // ── 6. Normal delta update for community likes ──
      const deltaLikes = totalLikes - communityLikesEarned;
      if (deltaLikes > 0) {
        mtCoinsEarned += deltaLikes;
        communityLikesEarned = totalLikes;
        await db.collection('users').doc(uid).update({
          mtCoinsEarned,
          communityLikesEarned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // ── 7. Normal delta update for product upvotes (NEW) ──
      const deltaUpvotes = totalUpvotes - productUpvotesEarned;
      if (deltaUpvotes > 0) {
        mtCoinsEarned += deltaUpvotes;
        productUpvotesEarned = totalUpvotes;
        await db.collection('users').doc(uid).update({
          mtCoinsEarned,
          productUpvotesEarned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const available = mtCoinsEarned - mtCoinsSpent;
    const usdValue = (available / 10000) * 10;

    // ── 8. RESPONSE with earning breakdown ──
    res.json({
      success: true,
      mtCoins: {
        // 💰 Overall balance
        earned: mtCoinsEarned,
        spent: mtCoinsSpent,
        available: available,
        usdValue: parseFloat(usdValue.toFixed(2)),

        // 📊 Breakdown by source
        earnedFromPosts: communityLikesEarned,         // from community post likes
        earnedFromProducts: productUpvotesEarned,      // 🔥 NEW: from product upvotes
        earnedFromCampaigns: statsEarned,              // from campaign stats

        // 📈 Stats for display
        stats: {
          views: totalViews,
          completions: totalCompletions,
          shares: totalShares,
          unlocks: totalUnlocks,
          likes: totalLikes,
          upvotes: totalUpvotes, // 🔥 NEW: total upvotes across all products
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
    let cursor = '0';
    let keys = [];
    do {
      const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      keys = keys.concat(reply[1]);
    } while (cursor !== '0');

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
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment.' });
    }
    // ── Daily limit: max 100 tasks per day ──
    if (!(await checkDailyLimit(uid, 'task-create', 100))) {
      return res.status(429).json({
        success: false,
        error: 'Daily task limit reached (max 100 tasks per day). Come back tomorrow!'
      });
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

    // ── Add task to feed sorted sets and cache details ──
    await addTaskToFeedSets(newTask.id, newTask.platform, newTask.taskType, Date.now());
    await cacheTaskDetails(newTask.id, taskWithOwner);

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
// ────────────────────────────────────────
// ── List user's tasks (paginated, with filters) ──
app.get('/api/social-tasks', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const status = req.query.status; // 'active' or 'inactive' or 'all'
    const platform = req.query.platform || null;
    const taskType = req.query.taskType || null;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const lastId = req.query.lastId || null;

    if (!(await checkRateLimit(uid, 'social-task-list', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `social-tasks:${uid}:${status || 'all'}:${platform || 'all'}:${taskType || 'all'}:${limit}:${lastId || 'null'}`;
    const SIX_HOURS = 6 * 60 * 60;

    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`🔁 Fetching tasks for user ${uid} with filters: status=${status}, platform=${platform}, taskType=${taskType}`);

      let query = db.collection('socialTasks').where('uid', '==', uid);

      // ── Apply filters ──
      if (status === 'active') {
        query = query.where('active', '==', true);
      } else if (status === 'inactive') {
        query = query.where('active', '==', false);
      }
      // If status is 'all' or undefined, don't filter by active status

      if (platform) {
        query = query.where('platform', '==', platform);
      }
      if (taskType) {
        query = query.where('taskType', '==', taskType);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit + 1);

      if (lastId) {
        const lastDoc = await db.collection('socialTasks').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const tasks = [];
      let hasMore = false;
      let nextId = null;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i < limit) {
          const doc = docs[i];
          tasks.push({
            id: doc.id,
            ...doc.data(),
          });
          nextId = doc.id;
        } else {
          hasMore = true;
        }
      }

      console.log(`✅ tasks: ${tasks.length}, hasMore: ${hasMore}, nextId: ${nextId}`);
      return {
        success: true,
        tasks,
        hasMore,
        lastId: nextId,
      };
    }, SIX_HOURS);
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

    // ── Update feed sorted sets if platform/taskType/active changed ──
    const oldData = doc.data(); // already fetched
    const newPlatform = platform !== undefined ? platform.trim() : oldData.platform;
    const newTaskType = taskType !== undefined ? taskType.trim() : oldData.taskType;
    const newActive = active !== undefined ? active : oldData.active;

    // If platform or taskType changed, move the task to new sets
    if (newPlatform !== oldData.platform || newTaskType !== oldData.taskType) {
      await removeTaskFromFeedSets(id, oldData.platform, oldData.taskType);
      if (newActive) {
        await addTaskToFeedSets(id, newPlatform, newTaskType, Date.now());
      }
    } else if (newActive !== oldData.active) {
      // Active status changed
      if (newActive) {
        await addTaskToFeedSets(id, newPlatform, newTaskType, Date.now());
      } else {
        await removeTaskFromFeedSets(id, oldData.platform, oldData.taskType);
      }
    }

    // Update task details cache with new data
    const updatedTaskWithOwner = { id, ...updatedData, owner: await getUserInfo(uid) };
    await cacheTaskDetails(id, updatedTaskWithOwner);

    // ── Invalidate exchange caches for ACTIVE exchanges referencing this task ──
    try {
      // Find only active exchanges (not completed or cancelled)
      const exchangesA = await db.collection('exchanges')
        .where('userATaskId', '==', id)
        .where('overallStatus', '==', 'active')
        .get();
      const exchangesB = await db.collection('exchanges')
        .where('userBTaskId', '==', id)
        .where('overallStatus', '==', 'active')
        .get();

      const affectedUsers = new Set();
      const allExchanges = [...exchangesA.docs, ...exchangesB.docs];

      for (const exchangeDoc of allExchanges) {
        const data = exchangeDoc.data();
        const exchangeId = exchangeDoc.id;
        const userA = data.userAUid;
        const userB = data.userBUid;
        affectedUsers.add(userA);
        affectedUsers.add(userB);

        // Invalidate detail caches for both users
        await invalidateKey(`exchange:${exchangeId}:${userA}`);
        await invalidateKey(`exchange:${exchangeId}:${userB}`);
      }

      // Invalidate list caches for all affected users (who have active exchanges)
      for (const userId of affectedUsers) {
        await invalidatePattern(`exchanges:${userId}:*`);
      }
    } catch (err) {
      console.warn('Failed to invalidate exchange caches on task update:', err);
      // Continue – don't block the response
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

    // ── Remove from all feed sorted sets and delete details cache ──
    await removeTaskFromFeedSets(id, doc.data().platform, doc.data().taskType);
    await redis.del(`task:${id}`);

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
// ── GROW FEED – uses sorted sets and task details cache ──
app.get('/api/grow-feed', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 25;
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const page = parseInt(req.query.page) || 1;
    const platform = req.query.platform || null;
    const taskType = req.query.taskType || null;
    const search = req.query.search || null; // ✅ NEW: search parameter
    const ip = getClientIp(req);

    // Rate limit by IP (public)
    if (!(await checkRateLimit(ip, 'grow-feed', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }

    // Try to get authenticated user ID (optional)
    let uid = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) { /* ignore – treat as guest */ }
    }

    // ── ✅ NEW: Handle search by @username ──
    let targetUserId = null;
    if (search && search.startsWith('@')) {
      const username = search.slice(1).toLowerCase().trim();
      if (username) {
        const userSnapshot = await db.collection('users')
          .where('username', '==', username)
          .limit(1)
          .get();
        if (!userSnapshot.empty) {
          targetUserId = userSnapshot.docs[0].id;
        } else {
          // User not found – return empty results
          return res.json({
            success: true,
            tasks: [],
            hasMore: false,
            page,
            limit,
          });
        }
      }
    }

    // ── Determine if we need to use Redis (no search) or Firestore (search) ──
    let tasks = [];
    let hasMore = false;

    if (targetUserId) {
      // ── SEARCH: Fetch tasks from Firestore by userId ──
      console.log(`🔍 Searching tasks for user: ${targetUserId}`);
      let query = db.collection('socialTasks')
        .where('uid', '==', targetUserId)
        .where('active', '==', true)
        .orderBy('createdAt', 'desc');

      if (platform) {
        query = query.where('platform', '==', platform);
      }
      if (taskType) {
        query = query.where('taskType', '==', taskType);
      }

      // Fetch one extra to check for more pages
      const fetchLimit = limit + 1;
      query = query.limit(fetchLimit);

      const snapshot = await query.get();
      const docs = snapshot.docs;

      // Build tasks from Firestore
      for (let i = 0; i < docs.length && i < limit; i++) {
        const doc = docs[i];
        const data = doc.data();
        const owner = await getUserInfo(data.uid);
        tasks.push({
          id: doc.id,
          ...data,
          owner,
        });
      }

      hasMore = docs.length > limit;
    } else {
      // ── NORMAL: Use Redis sorted sets ──
      const feedKey = getFeedKey(platform, taskType);
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      // 1. Get task IDs from sorted set (newest first)
      const taskIds = await redis.zrevrange(feedKey, start, end);

      // 2. Check if there are more tasks
      if (taskIds.length === limit) {
        const nextId = await redis.zrevrange(feedKey, start + limit, start + limit);
        if (nextId.length > 0) hasMore = true;
      }

      // 3. Fetch task details in parallel
      if (taskIds.length > 0) {
        const taskDetails = await Promise.all(taskIds.map(id => getTaskDetails(id)));
        // Filter out nulls (deleted tasks)
        for (const task of taskDetails) {
          if (task) tasks.push(task);
        }
      }
    }

    // 4. Compute per‑user flags (if authenticated)
    if (uid) {
      const exchangedIds = await getUserExchangedTaskIds(uid);
      tasks.forEach(task => {
        task.isOwn = task.uid === uid;
        task.hasExchange = exchangedIds.includes(task.id);
      });
    } else {
      tasks.forEach(task => {
        task.isOwn = false;
        task.hasExchange = false;
      });
    }

    res.json({
      success: true,
      tasks,
      hasMore,
      page,
      limit,
    });
  } catch (error) {
    console.error('Grow feed error:', error);
    res.status(500).json({ success: false, error: 'Failed to load feed' });
  }
});

// ─────────────────────────────────────────────
// 6. CREATE EXCHANGE (with 1 MT Coin cost + balance check)
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
    // ── Daily limit: max 1000 exchanges per day ──
    if (!(await checkDailyLimit(uid, 'exchange-create', 1000))) {
      return res.status(429).json({
        success: false,
        error: 'Daily exchange limit reached (max 1000 exchanges per day). Come back tomorrow!'
      });
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

    // ── 🔥 NEW: Check MT Coin balance and deduct 1 coin (atomic transaction) ──
    const EXCHANGE_COST = 1;
    let exchangeRef;
    let populatedNewExchange;
    let newExchangeData;

    await db.runTransaction(async (transaction) => {
      // 1. Get user document
      const userRef = db.collection('users').doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const userData = userDoc.data();

      // 2. Calculate available balance
      const earned = userData.mtCoinsEarned || 0;
      const spent = userData.mtCoinsSpent || 0;
      const available = earned - spent;

      // 3. Check if user has enough coins
      if (available < EXCHANGE_COST) {
        throw new Error(`Insufficient MT Coins. You need ${EXCHANGE_COST} coin(s) to create an exchange. You have ${available} coins.`);
      }

      // 4. Deduct 1 coin by incrementing spent
      transaction.update(userRef, {
        mtCoinsSpent: admin.firestore.FieldValue.increment(EXCHANGE_COST),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5. Create exchange document
      const exchangeData = {
        userAUid: uid,
        userBUid: targetTask.uid,
        userATaskId: yourTaskId,
        userBTaskId: targetTaskId,
        userAStatus: 'waiting',
        userBStatus: 'waiting',
        overallStatus: 'active',
        coinCost: EXCHANGE_COST, // record the cost for transparency
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      exchangeRef = db.collection('exchanges').doc();
      transaction.set(exchangeRef, exchangeData);

      // Store for later use
      newExchangeData = { id: exchangeRef.id, ...exchangeData };
    });

    // ── Populate exchange (outside transaction) ──
    populatedNewExchange = await populateExchange(newExchangeData);

    // ── Update exchange caches in‑place ──
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

    // ── Invalidate MT Coins cache ──
    await invalidateKey(`mtcoins:user:${uid}`);

    // ── Send notifications with improved descriptions ──
    try {
      const [initiatorInfo, targetUserInfo] = await Promise.all([
        getUserInfo(uid),
        getUserInfo(targetTask.uid),
      ]);
      const taskTitle = yourTask.title || 'your task';
      await createNotification({
        userId: targetTask.uid,
        type: 'personal',
        title: 'New Exchange Request! 🤝',
        description: `@${initiatorInfo.username || 'A user'} wants to exchange "${taskTitle}" with you.`,
        redirectUrl: `/groweachother/exchange/${exchangeRef.id}`,
        fromUserId: uid,
      });
      await createNotification({
        userId: uid,
        type: 'personal',
        title: 'Exchange Initiated! 🚀',
        description: `You started an exchange for "${taskTitle}" with @${targetUserInfo.username || targetTask.uid}. (Cost: 1 MT Coin)`,
        redirectUrl: `/groweachother/exchange/${exchangeRef.id}`,
        fromUserId: uid,
      });
      console.log(`📬 Exchange notifications sent for ${exchangeRef.id}`);
    } catch (notifError) {
      console.error('❌ Failed to send exchange notifications:', notifError);
    }

    res.status(201).json({
      success: true,
      exchange: populatedNewExchange,
      coinCost: EXCHANGE_COST,
      message: `Exchange created successfully. 1 MT Coin was deducted from your balance.`,
    });
  } catch (error) {
    console.error('Create exchange error:', error);
    if (error.message && error.message.includes('Insufficient MT Coins')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to create exchange' });
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
    const SIX_HOURS = 6 * 60 * 60;
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
    }, SIX_HOURS);
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
// ─────────────────────────────────────────// ── Update exchange status (Done / Cancel) with 2 MT Coin reward on completion ──
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

    // Authorisation
    let side;
    if (data.userAUid === uid) side = 'A';
    else if (data.userBUid === uid) side = 'B';
    else return res.status(403).json({ success: false, error: 'Not your exchange' });

    // Check if already finalised
    if (data.overallStatus === 'completed' || data.overallStatus === 'cancelled') {
      return res.status(400).json({ success: false, error: `Exchange already ${data.overallStatus}` });
    }

    // ── Check if tasks exist ──
    const [taskADoc, taskBDoc] = await Promise.all([
      db.collection('socialTasks').doc(data.userATaskId).get(),
      db.collection('socialTasks').doc(data.userBTaskId).get(),
    ]);
    if (!taskADoc.exists || !taskBDoc.exists) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update status because one of the tasks has been deleted.'
      });
    }

    // ── Determine new statuses ──
    let newUserAStatus = data.userAStatus;
    let newUserBStatus = data.userBStatus;
    let newOverallStatus = data.overallStatus;
    let willBeCompleted = false;
    let isUserADone = false;
    let isUserBDone = false;

    if (status === 'done') {
      if (side === 'A') {
        if (data.userAStatus === 'done') return res.status(400).json({ success: false, error: 'Already done' });
        newUserAStatus = 'done';
        isUserADone = true;
      } else {
        if (data.userBStatus === 'done') return res.status(400).json({ success: false, error: 'Already done' });
        newUserBStatus = 'done';
        isUserBDone = true;
      }
      // Check if both are now done
      willBeCompleted = (newUserAStatus === 'done' && newUserBStatus === 'done');
      newOverallStatus = willBeCompleted ? 'completed' : 'active';
    } else {
      // cancel
      if (side === 'A') {
        if (data.userAStatus === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled' });
        newUserAStatus = 'cancelled';
      } else {
        if (data.userBStatus === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled' });
        newUserBStatus = 'cancelled';
      }
      newOverallStatus = 'cancelled';
    }

    // ── Execute atomic transaction ──
    await db.runTransaction(async (transaction) => {
      // 1. Get the exchange document (already have data, but we need to update it)
      // We'll update directly using transaction.update(docRef, {...})
      // 2. If willBeCompleted and reward not yet given, award coins to both users
      if (willBeCompleted && !data.rewardGiven) {
        // Read user documents
        const userARef = db.collection('users').doc(data.userAUid);
        const userBRef = db.collection('users').doc(data.userBUid);
        const [userADoc, userBDoc] = await Promise.all([
          transaction.get(userARef),
          transaction.get(userBRef),
        ]);
        if (!userADoc.exists) throw new Error('User A not found');
        if (!userBDoc.exists) throw new Error('User B not found');

        // Award 2 MT Coins to each
        transaction.update(userARef, {
          mtCoinsEarned: admin.firestore.FieldValue.increment(2),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(userBRef, {
          mtCoinsEarned: admin.firestore.FieldValue.increment(2),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark reward as given on exchange
        transaction.update(docRef, {
          rewardGiven: true,
          userAStatus: newUserAStatus,
          userBStatus: newUserBStatus,
          overallStatus: newOverallStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Just update statuses (no reward)
        transaction.update(docRef, {
          userAStatus: newUserAStatus,
          userBStatus: newUserBStatus,
          overallStatus: newOverallStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    // ── Invalidate caches for both users ──
    await invalidateKey(`exchange:${id}:${data.userAUid}`);
    await invalidateKey(`exchange:${id}:${data.userBUid}`);
    await invalidateUserExchanges(data.userAUid);
    await invalidateUserExchanges(data.userBUid);

    // If reward was given, invalidate MT coin caches
    if (willBeCompleted && !data.rewardGiven) {
      await invalidateKey(`mtcoins:user:${data.userAUid}`);
      await invalidateKey(`mtcoins:user:${data.userBUid}`);
    }

    // ── Populate for response ──
    const updatedDoc = await docRef.get();
    const populated = await populateExchange({ id: doc.id, ...updatedDoc.data() });

    // ── 🆕 Send notifications based on exchange status ──
    try {
      const userAInfo = populated.userA;
      const userBInfo = populated.userB;
      const userAStatus = populated.userAStatus;
      const userBStatus = populated.userBStatus;
      const overallStatus = populated.overallStatus;

      // Case 1: Both users completed the exchange
      if (overallStatus === 'completed' && populated.rewardGiven) {
        // Notify User A
        await createNotification({
          userId: populated.userAUid,
          type: 'personal',
          title: '🎉 Exchange Completed! +2 MT Coins',
          description: `Your exchange with @${userBInfo?.username || 'the other user'} is complete! You both earned 2 MT Coins each. 🎉`,
          fromUserId: populated.userBUid,
        });
        // Notify User B
        await createNotification({
          userId: populated.userBUid,
          type: 'personal',
          title: '🎉 Exchange Completed! +2 MT Coins',
          description: `Your exchange with @${userAInfo?.username || 'the other user'} is complete! You both earned 2 MT Coins each. 🎉`,
          fromUserId: populated.userAUid,
        });
        console.log(`📬 Exchange completion notifications sent for ${id}`);
      }
      // Case 2: User A marked done, User B is waiting
      else if (userAStatus === 'done' && userBStatus === 'waiting') {
        await createNotification({
          userId: populated.userBUid,
          type: 'personal',
          title: '✅ Your turn to complete the exchange!',
          description: `@${userAInfo?.username || 'The other user'} has completed their task. Please complete your task to finish the exchange and earn 2 MT Coins!`,
          fromUserId: populated.userAUid,
        });
        console.log(`📬 Reminder notification sent to user B for exchange ${id}`);
      }
      // Case 3: User B marked done, User A is waiting
      else if (userBStatus === 'done' && userAStatus === 'waiting') {
        await createNotification({
          userId: populated.userAUid,
          type: 'personal',
          title: '✅ Your turn to complete the exchange!',
          description: `@${userBInfo?.username || 'The other user'} has completed their task. Please complete your task to finish the exchange and earn 2 MT Coins!`,
          fromUserId: populated.userBUid,
        });
        console.log(`📬 Reminder notification sent to user A for exchange ${id}`);
      }
      // Case 4: Cancelled
      else if (overallStatus === 'cancelled') {
        const canceller = side === 'A' ? userAInfo : userBInfo;
        const otherUser = side === 'A' ? userBInfo : userAInfo;
        const otherUserId = side === 'A' ? populated.userBUid : populated.userAUid;
        
        await createNotification({
          userId: otherUserId,
          type: 'personal',
          title: '⚠️ Exchange Cancelled',
          description: `@${canceller?.username || 'The other user'} has cancelled the exchange.`,
          fromUserId: uid,
        });
        console.log(`📬 Cancellation notification sent for exchange ${id}`);
      }
    } catch (notifError) {
      console.error('Failed to send exchange notifications:', notifError);
    }

    // ── Invalidate exchange caches in‑place ──
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

    res.json({
      success: true,
      exchange: populated,
      rewardGiven: willBeCompleted && !data.rewardGiven,
    });
  } catch (error) {
    console.error('Update exchange error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update exchange' });
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

// ─────────────────────────────────────────────
// PRODUCT TREND – SORTED SETS (Fanout‑on‑write)
// ─────────────────────────────────────────────

function getProductFeedKey(category = null, sort = 'newest') {
  const cat = category || 'all';
  return `products:feed:category:${cat}:sort:${sort}`;
}

async function addProductToFeedSets(productId, category, timestamp, upvotes = 0, commentsCount = 0) {
  const sortConfigs = [
    { sort: 'newest', score: timestamp },
    { sort: 'oldest', score: timestamp },
    { sort: 'most-upvoted', score: upvotes },
    { sort: 'most-commented', score: commentsCount },
  ];
  const keys = [];
  for (const config of sortConfigs) {
    keys.push({ key: getProductFeedKey(null, config.sort), score: config.score });
    keys.push({ key: getProductFeedKey(category, config.sort), score: config.score });
  }
  const pipeline = redis.pipeline();
  for (const entry of keys) {
    pipeline.zadd(entry.key, entry.score, productId);
  }
  await pipeline.exec();
}

// ── Update product upvotes in feed (remove + re‑add with new score) ──
async function updateProductUpvotesInFeed(productId, category, upvotes) {
  // Remove from all feed sets
  await removeProductFromFeedSets(productId, category);
  
  // Re‑add with updated score
  const timestamp = Date.now();
  const sorts = ['newest', 'most-upvoted', 'most-commented'];
  const keys = [];
  for (const s of sorts) {
    keys.push(getProductFeedKey(null, s));
    keys.push(getProductFeedKey(category, s));
  }
  
  const pipeline = redis.pipeline();
  for (const key of keys) {
    if (key.includes('most-upvoted')) {
      pipeline.zadd(key, upvotes, productId);
    } else {
      pipeline.zadd(key, timestamp, productId);
    }
  }
  await pipeline.exec();
}

// ── Update product comments in feed (for most-commented sorting) ──
async function updateProductCommentsInFeed(productId, category, comments) {
  const commentKeys = [
    getProductFeedKey(null, 'most-commented'),
    getProductFeedKey(category, 'most-commented'),
  ];
  const pipeline = redis.pipeline();
  for (const key of commentKeys) {
    pipeline.zadd(key, comments, productId);
  }
  await pipeline.exec();
}

async function removeProductFromFeedSets(productId, category) {
  const sorts = ['newest', 'oldest', 'most-upvoted', 'most-commented'];   // ✅ 'oldest' added
  const keys = [];
  for (const s of sorts) {
    keys.push(getProductFeedKey(null, s));
    keys.push(getProductFeedKey(category, s));
  }
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.zrem(key, productId);
  }
  await pipeline.exec();
}

async function cacheProductDetails(productId, productData) {
  await redis.set(`product:${productId}`, JSON.stringify(productData), 'EX', 3600);
}

async function getProductDetails(productId) {
  const cached = await redis.get(`product:${productId}`);
  if (cached) return JSON.parse(cached);
  const doc = await db.collection('products').doc(productId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const maker = await getProductMakerInfo(data.makerUid);
  const product = { id: productId, ...data, maker };
  await cacheProductDetails(productId, product);
  return product;
}

// ── Update product upvotes in feed (remove + re‑add with new score) ──
async function updateProductUpvotesInFeed(productId, category, upvotes) {
  // Remove from all feed sets
  await removeProductFromFeedSets(productId, category);
  
  // Re‑add with updated score
  const timestamp = Date.now();
  const sorts = ['newest', 'most-upvoted', 'most-commented'];
  const keys = [];
  for (const s of sorts) {
    keys.push(getProductFeedKey(null, s));
    keys.push(getProductFeedKey(category, s));
  }
  
  const pipeline = redis.pipeline();
  for (const key of keys) {
    if (key.includes('most-upvoted')) {
      pipeline.zadd(key, upvotes, productId);
    } else {
      pipeline.zadd(key, timestamp, productId);
    }
  }
  await pipeline.exec();
}

// ─────────────────────────────────────────────
// COMMUNITY POSTS – SORTED SETS (Fanout‑on‑write)
// ─────────────────────────────────────────────

function getPostFeedKey(category = null, type = null) {
  const cat = category || 'all';
  const typ = type || 'all';
  return `posts:feed:category:${cat}:type:${typ}`;
}

async function addPostToFeedSets(postId, category, type, timestamp) {
  const keys = [
    getPostFeedKey(null, null),           // all
    getPostFeedKey(category, null),       // category only
    getPostFeedKey(null, type),           // type only
    getPostFeedKey(category, type),       // category + type
  ];
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.zadd(key, timestamp, postId);
  }
  await pipeline.exec();
}

// Remove task ID from all relevant sorted sets (including most-liked)
async function removePostFromFeedSets(postId, category, type) {
  const keys = [
    getPostFeedKey(null, null),
    getPostFeedKey(category, null),
    getPostFeedKey(null, type),
    getPostFeedKey(category, type),
  ];
  
  // Also remove from most-liked sorted sets
  const likesKeys = [
    `posts:feed:category:${category || 'all'}:type:${type || 'all'}:sort:likes`,
    `posts:feed:category:${category || 'all'}:type:all:sort:likes`,
    `posts:feed:category:all:type:${type || 'all'}:sort:likes`,
    `posts:feed:category:all:type:all:sort:likes`,
  ];
  
  const allKeys = [...keys, ...likesKeys];
  const pipeline = redis.pipeline();
  for (const key of allKeys) {
    pipeline.zrem(key, postId);
  }
  await pipeline.exec();
}

async function cachePostDetails(postId, postData) {
  await redis.set(`post:${postId}`, JSON.stringify(postData), 'EX', 3600);
}

async function getPostDetails(postId) {
  const cached = await redis.get(`post:${postId}`);
  if (cached) return JSON.parse(cached);
  const doc = await db.collection('posts').doc(postId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const user = await getUserInfo(data.userId);
  const post = { id: postId, ...data, user };
  await cachePostDetails(postId, post);
  return post;
}

// ─────────────────────────────────────────────
// 1. GET PRODUCT FEED (public, global cache)
// ─────────────────────────────────────────────
app.get('/api/productstrend/feed', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastId = req.query.lastId || null;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'product-feed', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

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

    // ── If search provided ──
    if (search) {
      const cacheKey = `productstrend:feed:search:${search}:category:${category || 'all'}:sort:${sort}:limit:${limit}:lastId:${lastId || 'null'}`;
      const result = await getOrSetCache(cacheKey, async () => {
        console.log(`📡 Fetching product feed with search="${search}"`);

        // ── ✅ NEW: Check if search is @username ──
        let targetUserId = null;
        let searchTerm = search;
        if (search.startsWith('@')) {
          const username = search.slice(1).toLowerCase().trim();
          if (username) {
            const userSnapshot = await db.collection('users')
              .where('username', '==', username)
              .limit(1)
              .get();
            if (!userSnapshot.empty) {
              targetUserId = userSnapshot.docs[0].id;
            } else {
              return { products: [], hasMore: false, lastId: null };
            }
          }
        }

        // ── Build query ──
        let query = db.collection('products').where('status', '==', 'approved');
        if (category) query = query.where('category', '==', category);

        // ── 🔥 NEW: Filter by makerUid if username search ──
        if (targetUserId) {
          query = query.where('makerUid', '==', targetUserId);
        } else if (searchTerm) {
          const term = searchTerm.toLowerCase().trim();
          query = query.where('searchable', '>=', term)
                       .where('searchable', '<=', term + '\uf8ff');
        }

        const fetchLimit = Math.min(limit + 10, 100);
        query = query.orderBy('createdAt', 'desc').limit(fetchLimit);
        if (lastId) {
          const lastDoc = await db.collection('products').doc(lastId).get();
          if (lastDoc.exists) query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        const products = [];
        let hasMore = false;
        let lastProductId = null;
        const docs = snapshot.docs;
        let count = 0;

        for (const doc of docs) {
          if (count >= limit) {
            hasMore = true;
            break;
          }
          const data = doc.data();
          if (data.status === 'rejected') continue;

          // In‑memory filter for safety (already filtered via query)
          if (!targetUserId && searchTerm) {
            const term = searchTerm.toLowerCase();
            const searchable = (data.searchable || '').toLowerCase();
            if (!searchable.includes(term)) continue;
          }

          const maker = await getProductMakerInfo(data.makerUid);
          const totalRatings = data.totalRatings || 0;
          const sumRatings = data.sumRatings || 0;
          const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
          products.push({ id: doc.id, ...data, maker, avgRating: parseFloat(avgRating.toFixed(2)) });
          lastProductId = doc.id;
          count++;
        }

        hasMore = snapshot.docs.length >= fetchLimit;
        return { products, hasMore, lastId: lastProductId };
      }, 120);

      // ── Compute user voted status ──
      let userVotedSet = new Set();
      if (uid) {
        const voteCacheKey = `user:votes:${uid}`;
        try {
          const cachedVotes = await redisGet(voteCacheKey);
          if (cachedVotes) {
            userVotedSet = new Set(JSON.parse(cachedVotes));
          } else {
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

      return res.json({ success: true, products: productsWithVote, hasMore: result.hasMore, lastId: result.lastId });
    }

    // ── Non‑search feed (Redis sorted sets) ──
    const feedKey = getProductFeedKey(category || null, sort);
    const isAscending = sort === 'oldest';

    let offset = 0;
    if (lastId) {
      if (isAscending) {
        const rank = await redis.zrank(feedKey, lastId);
        if (rank !== null) offset = rank + 1;
      } else {
        const rank = await redis.zrevrank(feedKey, lastId);
        if (rank !== null) offset = rank + 1;
      }
    }

    const end = offset + limit - 1;
    let productIds;
    if (isAscending) {
      productIds = await redis.zrange(feedKey, offset, end);
    } else {
      productIds = await redis.zrevrange(feedKey, offset, end);
    }

    let hasMore = false;
    if (productIds.length === limit) {
      let next;
      if (isAscending) {
        next = await redis.zrange(feedKey, offset + limit, offset + limit);
      } else {
        next = await redis.zrevrange(feedKey, offset + limit, offset + limit);
      }
      if (next.length > 0) hasMore = true;
    }

    const products = [];
    if (productIds.length > 0) {
      const details = await Promise.all(productIds.map(id => getProductDetails(id)));
      for (const product of details) {
        if (product) {
          const totalRatings = product.totalRatings || 0;
          const sumRatings = product.sumRatings || 0;
          const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
          product.avgRating = parseFloat(avgRating.toFixed(2));
          products.push(product);
        }
      }
    }

    let userVotedSet = new Set();
    if (uid) {
      const voteCacheKey = `user:votes:${uid}`;
      try {
        const cachedVotes = await redisGet(voteCacheKey);
        if (cachedVotes) {
          userVotedSet = new Set(JSON.parse(cachedVotes));
        } else {
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
      const voteSnapshot = await db.collection('productVotes')
        .where('deviceId', '==', deviceId)
        .select('productId')
        .get();
      const votedIds = voteSnapshot.docs.map(d => d.data().productId);
      userVotedSet = new Set(votedIds);
    }

    const productsWithVote = products.map(product => ({
      ...product,
      userVoted: userVotedSet.has(product.id),
    }));

    const lastProductId = productsWithVote.length > 0 ? productsWithVote[productsWithVote.length - 1].id : null;

    res.json({
      success: true,
      products: productsWithVote,
      hasMore,
      lastId: lastProductId,
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
    let userRating = null;

    // Try cache first
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        product = JSON.parse(cached);
        // If cached, fetch user rating if authenticated (it changes per user)
        if (uid) {
          const ratingDoc = await db.collection('productRatings').doc(`${id}_${uid}`).get();
          if (ratingDoc.exists) {
            userRating = ratingDoc.data().rating;
          }
        }
        // Compute user vote status
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
        return res.json({ success: true, product: { ...product, userVoted, userRating } });
      }
    } catch (e) { /* ignore */ }

    // Cache miss – fetch from Firestore
    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const data = doc.data();
    const maker = await getProductMakerInfo(data.makerUid);

    const totalRatings = data.totalRatings || 0;
    const sumRatings = data.sumRatings || 0;
    const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    product = {
      id: doc.id,
      ...data,
      maker,
      avgRating: parseFloat(avgRating.toFixed(2)),
      totalRatings,
    };

    // Fetch user rating if authenticated
    if (uid) {
      const ratingDoc = await db.collection('productRatings').doc(`${id}_${uid}`).get();
      if (ratingDoc.exists) {
        userRating = ratingDoc.data().rating;
      }
    }

    // Compute user vote status
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

    // Cache product details (without userRating, as it's user-specific)
    const productToCache = { ...product };
    await redis.set(cacheKey, JSON.stringify(productToCache), 'EX', 300);

    res.json({ success: true, product: { ...product, userVoted, userRating } });
  } catch (error) {
    console.error('❌ Product detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Get product rating (average, total, user's own) ──
app.get('/api/productstrend/products/:id/rating', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'product-rating-get', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const productData = productDoc.data();

    let userRating = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const userId = decoded.uid;
        const ratingDoc = await db.collection('productRatings').doc(`${id}_${userId}`).get();
        if (ratingDoc.exists) {
          userRating = ratingDoc.data().rating;
        }
      } catch (e) { /* ignore */ }
    }

    const totalRatings = productData.totalRatings || 0;
    const sumRatings = productData.sumRatings || 0;
    const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    res.json({
      success: true,
      avgRating: parseFloat(avgRating.toFixed(2)),
      totalRatings,
      userRating,
    });
  } catch (error) {
    console.error('❌ Get rating error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Rate a product (set/update rating) ──
app.post('/api/productstrend/products/:id/rate', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { rating } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5' });
    }

    if (!(await checkRateLimit(uid, 'rate-product', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many rating attempts. Please wait.' });
    }

    const productRef = db.collection('products').doc(id);
    const ratingDocId = `${id}_${uid}`;
    const ratingRef = db.collection('productRatings').doc(ratingDocId);

    let result;
    await db.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists) {
        throw new Error('Product not found');
      }
      const productData = productDoc.data();
      if (productData.status === 'deleted') {
        throw new Error('Product is not available');
      }

      const ratingDoc = await transaction.get(ratingRef);
      let oldRating = null;
      if (ratingDoc.exists) {
        oldRating = ratingDoc.data().rating;
      }

      let totalRatings = productData.totalRatings || 0;
      let sumRatings = productData.sumRatings || 0;

      if (oldRating !== null) {
        sumRatings = sumRatings - oldRating + rating;
        // totalRatings stays the same
      } else {
        totalRatings += 1;
        sumRatings += rating;
      }

      transaction.update(productRef, {
        totalRatings,
        sumRatings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Build the rating document – only include createdAt for new ratings
      const ratingDoc = {
        productId: id,
        userId: uid,
        rating,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (oldRating === null) {
        ratingDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }
      transaction.set(ratingRef, ratingDoc, { merge: true });

      result = { totalRatings, sumRatings };
    });

    const avgRating = result.totalRatings > 0 ? result.sumRatings / result.totalRatings : 0;

    // Invalidate product detail cache
    await invalidateKey(`productstrend:product:${id}`);

    res.json({
      success: true,
      avgRating: parseFloat(avgRating.toFixed(2)),
      totalRatings: result.totalRatings,
      userRating: rating,
    });
  } catch (error) {
    console.error('❌ Rate product error:', error);
    if (error.message === 'Product not found' || error.message === 'Product is not available') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 3. GET MY PRODUCTS (user's own products)
// ─────────────────────────────────────────────
// ── 3. GET MY PRODUCTS (user's own products, with pagination + filters) ──
app.get('/api/productstrend/my-products', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    // ── Pagination & filters ──
    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const status = req.query.status || null;
    const category = req.query.category || null;
    const search = req.query.search || null;
    const lastId = req.query.lastId || null;

    if (!(await checkRateLimit(uid, 'my-products', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    // ── Build cache key ──
    const cacheKey = `productstrend:my-products:${uid}:status:${status || 'all'}:category:${category || 'all'}:search:${search || 'none'}:limit:${limit}:lastId:${lastId || 'null'}`;

    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching my products for user ${uid} (status=${status}, category=${category}, search=${search})...`);

      let query = db.collection('products').where('makerUid', '==', uid);

      // ── Status filter ──
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      } else {
        query = query.where('status', '!=', 'deleted');
      }

      if (category) {
        query = query.where('category', '==', category);
      }

      // ── Search filter (text search on searchable field) ──
      if (search) {
        const term = search.toLowerCase().trim();
        query = query.where('searchable', '>=', term)
                     .where('searchable', '<=', term + '\uf8ff');
      }

      query = query.orderBy('createdAt', 'desc').limit(limit + 1);

      if (lastId) {
        const lastDoc = await db.collection('products').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

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
        const maker = await getProductMakerInfo(data.makerUid);
        products.push({ id: doc.id, ...data, maker });
        lastProductId = doc.id;
      }

      return { products, hasMore, lastId: lastProductId };
    }, 300);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ My products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 4. CREATE PRODUCT (Launch) – UPDATED
// ─────────────────────────────────────────────
app.post('/api/productstrend/products', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { 
      name, tagline, description, url, imageUrl, category,
      features, pricing, productStatus, targetAudience, demoUrl, twitter, techStack, releaseDate,
      logo, thumbnail, socialLinks, referralCode,
      websiteTitle, websiteDescription, websiteImage
    } = req.body;

    // ── Rate limits ──
    if (!(await checkRateLimit(uid, 'product-launch', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many launch attempts. Please wait a moment.' });
    }
    if (!(await checkDailyLimit(uid, 'product-launch', 5))) {
      return res.status(429).json({
        success: false,
        error: 'Daily product launch limit reached (max 5 per day). Come back tomorrow!'
      });
    }

    // ── Existing validations (copied from your original) ──
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
const ALLOWED_CATEGORIES = [
  'Tech', 'Design', 'AI', 'Productivity', 'Education',
  'Health', 'Fitness', 'Gaming', 'Social', 'Marketing',
  'SaaS', 'Developer Tools', 'Other'
];
if (category && !ALLOWED_CATEGORIES.includes(category)) {
  return res.status(400).json({ success: false, error: 'Invalid category' });
}
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
    if (logo !== undefined && logo && !validateImageUrl(logo)) {
      return res.status(400).json({ success: false, error: 'Invalid logo URL' });
    }
    if (thumbnail !== undefined && thumbnail && !validateImageUrl(thumbnail)) {
      return res.status(400).json({ success: false, error: 'Invalid thumbnail URL' });
    }
    if (websiteTitle !== undefined) {
      if (typeof websiteTitle !== 'string') {
        return res.status(400).json({ success: false, error: 'Website title must be a string' });
      }
      if (websiteTitle.length > 200) {
        return res.status(400).json({ success: false, error: 'Website title must be less than 200 characters' });
      }
    }
    if (websiteDescription !== undefined) {
      if (typeof websiteDescription !== 'string') {
        return res.status(400).json({ success: false, error: 'Website description must be a string' });
      }
      if (websiteDescription.length > 500) {
        return res.status(400).json({ success: false, error: 'Website description must be less than 500 characters' });
      }
    }
    if (websiteImage !== undefined && websiteImage && !validateImageUrl(websiteImage)) {
      return res.status(400).json({ success: false, error: 'Invalid website image URL' });
    }
    if (referralCode !== undefined) {
      if (typeof referralCode !== 'string') {
        return res.status(400).json({ success: false, error: 'Referral code must be a string' });
      }
      if (referralCode.length > 50) {
        return res.status(400).json({ success: false, error: 'Referral code must be less than 50 characters' });
      }
    }
    if (socialLinks !== undefined) {
      if (!Array.isArray(socialLinks)) {
        return res.status(400).json({ success: false, error: 'Social links must be an array' });
      }
      if (socialLinks.length > 20) {
        return res.status(400).json({ success: false, error: 'Maximum 20 social links allowed' });
      }
      for (let i = 0; i < socialLinks.length; i++) {
        const link = socialLinks[i];
        if (!link || typeof link !== 'object') {
          return res.status(400).json({ success: false, error: `Social link at index ${i} is invalid` });
        }
        if (!link.platform || typeof link.platform !== 'string' || link.platform.trim().length === 0 || link.platform.trim().length > 50) {
          return res.status(400).json({ success: false, error: `Social link ${i}: platform is required and must be 1-50 chars` });
        }
        if (!link.url || typeof link.url !== 'string' || !isValidUrl(link.url.trim())) {
          return res.status(400).json({ success: false, error: `Social link ${i}: URL is invalid` });
        }
      }
    }

    // ── Build product data ──
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
      totalRatings: 0,
      sumRatings: 0,
      features: features || [],
      pricing: pricing || 'Free',
      productStatus: productStatus || 'Live',
      targetAudience: targetAudience || '',
      demoUrl: demoUrl || '',
      twitter: twitter || '',
      techStack: techStack || [],
      releaseDate: releaseDate || '',
      logo: logo || '',
      thumbnail: thumbnail || '',
      socialLinks: socialLinks || [],
      referralCode: referralCode || '',
      websiteTitle: websiteTitle || '',
      websiteDescription: websiteDescription || '',
      websiteImage: websiteImage || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // ── ✅ ADD: compute searchable field ──
    const makerInfo = await getUserInfo(uid);
    const makerUsername = makerInfo?.username || '';
    productData.searchable = (
      productData.name + ' ' +
      productData.tagline + ' ' +
      productData.description + ' ' +
      makerUsername
    ).toLowerCase();

    const docRef = await db.collection('products').add(productData);
    const newProduct = { id: docRef.id, ...productData };
    newProduct.maker = await getProductMakerInfo(uid);

// ── Add to feed sorted sets with correct scores ──
const timestamp = Date.now();
await addProductToFeedSets(newProduct.id, newProduct.category, timestamp, 0, 0);

    // ── Cache details ──
    await cacheProductDetails(newProduct.id, newProduct);

    // ── Invalidate all user's own products list caches ──
    await invalidatePattern(`productstrend:my-products:${uid}:*`);

    // ── 🆕 Send notification to the product creator ──
    try {
      const userInfo = await getUserInfo(uid);
      const categoryEmojiMap = {
        'Tech': '💻',
        'Design': '🎨',
        'AI': '🤖',
        'Productivity': '⚡',
        'Education': '📚',
        'Health': '💪',
        'Fitness': '🏋️',
        'Gaming': '🎮',
        'Other': '📌',
      };
      const emoji = categoryEmojiMap[productData.category] || '🚀';
      
      await createNotification({
        userId: uid,
        type: 'personal',
        title: `${emoji} Product Launched!`,
        description: `Your product "${productData.name}" has been successfully launched and is now live on Product Trend!`,
        fromUserId: uid,
      });
      console.log(`📬 Product launch notification sent to ${uid}`);
    } catch (notifError) {
      console.error('Failed to send product launch notification:', notifError);
    }

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 5. UPDATE PRODUCT (maker or admin only) – UPDATED
// ─────────────────────────────────────────────
app.put('/api/productstrend/products/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { 
      name, tagline, description, url, imageUrl, category, status,
      features, pricing, productStatus, targetAudience, demoUrl, twitter, techStack, releaseDate,
      logo, thumbnail, socialLinks, referralCode,
      websiteTitle, websiteDescription, websiteImage
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

    // ── Helper: skip validation if unchanged or empty ──
    const validateAndSetUrl = (field, value, existingValue, validator, errorMsg) => {
      if (value === undefined) return null;
      const trimmed = value.trim();
      if (trimmed !== existingValue) {
        if (trimmed !== '' && !validator(trimmed)) {
          return errorMsg;
        }
      }
      updateData[field] = trimmed;
      return null;
    };

    const validateAndSetImage = (field, value, existingValue, validator, errorMsg) => {
      if (value === undefined) return null;
      const trimmed = value.trim();
      if (trimmed !== existingValue) {
        if (trimmed !== '' && !validator(trimmed)) {
          return errorMsg;
        }
      }
      updateData[field] = trimmed;
      return null;
    };

    let error = null;

    // ── Validate simple fields ──
    if (name !== undefined) {
      if (name.trim().length < 1 || name.trim().length > 100) {
        error = 'Name must be 1-100 characters';
      } else {
        updateData.name = name.trim();
      }
    }
    if (error) return res.status(400).json({ success: false, error });

    if (tagline !== undefined) {
      if (tagline.trim().length < 1 || tagline.trim().length > 200) {
        error = 'Tagline must be 1-200 characters';
      } else {
        updateData.tagline = tagline.trim();
      }
    }
    if (error) return res.status(400).json({ success: false, error });

    if (description !== undefined) {
      if (description.length > 2000) {
        error = 'Description must be less than 2000 characters';
      } else {
        updateData.description = description.trim();
      }
    }
    if (error) return res.status(400).json({ success: false, error });

    // ── URL fields (skip validation if unchanged or empty) ──
    const urlResult = validateAndSetUrl('url', url, data.url || '', isValidUrl, 'Invalid URL');
    if (urlResult) return res.status(400).json({ success: false, error: urlResult });

    const imageResult = validateAndSetImage('imageUrl', imageUrl, data.imageUrl || '', validateImageUrl, 'Invalid image URL');
    if (imageResult) return res.status(400).json({ success: false, error: imageResult });

    const logoResult = validateAndSetImage('logo', logo, data.logo || '', validateImageUrl, 'Invalid logo URL');
    if (logoResult) return res.status(400).json({ success: false, error: logoResult });

    const thumbnailResult = validateAndSetImage('thumbnail', thumbnail, data.thumbnail || '', validateImageUrl, 'Invalid thumbnail URL');
    if (thumbnailResult) return res.status(400).json({ success: false, error: thumbnailResult });

    const demoResult = validateAndSetUrl('demoUrl', demoUrl, data.demoUrl || '', isValidUrl, 'Invalid demo URL');
    if (demoResult) return res.status(400).json({ success: false, error: demoResult });

    const websiteImageResult = validateAndSetImage('websiteImage', websiteImage, data.websiteImage || '', validateImageUrl, 'Invalid website image URL');
    if (websiteImageResult) return res.status(400).json({ success: false, error: websiteImageResult });

    // ── Category with validation ──
    const ALLOWED_CATEGORIES = [
      'Tech', 'Design', 'AI', 'Productivity', 'Education',
      'Health', 'Fitness', 'Gaming', 'Social', 'Marketing',
      'SaaS', 'Developer Tools', 'Other'
    ];
    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }
      updateData.category = category;
    }

    // ── Status (admin only) ──
    if (userIsAdmin && status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      updateData.status = status;
    }

    // ── Other fields (unchanged) ──
    if (features !== undefined) {
      if (!Array.isArray(features) || features.some(f => typeof f !== 'string')) {
        return res.status(400).json({ success: false, error: 'Features must be an array of strings' });
      }
      updateData.features = features.map(f => f.trim()).filter(Boolean);
    }
    if (pricing !== undefined) {
      if (typeof pricing !== 'string') return res.status(400).json({ success: false, error: 'Pricing must be a string' });
      updateData.pricing = pricing;
    }
    if (productStatus !== undefined) {
      if (typeof productStatus !== 'string') return res.status(400).json({ success: false, error: 'Product status must be a string' });
      updateData.productStatus = productStatus;
    }
    if (targetAudience !== undefined) {
      if (typeof targetAudience !== 'string') return res.status(400).json({ success: false, error: 'Target audience must be a string' });
      updateData.targetAudience = targetAudience;
    }
    if (twitter !== undefined) {
      if (typeof twitter !== 'string') return res.status(400).json({ success: false, error: 'Twitter handle must be a string' });
      updateData.twitter = twitter.trim();
    }
    if (techStack !== undefined) {
      if (!Array.isArray(techStack) || techStack.some(t => typeof t !== 'string')) {
        return res.status(400).json({ success: false, error: 'Tech stack must be an array of strings' });
      }
      updateData.techStack = techStack.map(t => t.trim()).filter(Boolean);
    }
    if (releaseDate !== undefined) {
      if (typeof releaseDate !== 'string') return res.status(400).json({ success: false, error: 'Release date must be a string' });
      updateData.releaseDate = releaseDate;
    }
    if (websiteTitle !== undefined) {
      if (typeof websiteTitle !== 'string') return res.status(400).json({ success: false, error: 'Website title must be a string' });
      if (websiteTitle.length > 200) return res.status(400).json({ success: false, error: 'Website title must be less than 200 characters' });
      updateData.websiteTitle = websiteTitle || '';
    }
    if (websiteDescription !== undefined) {
      if (typeof websiteDescription !== 'string') return res.status(400).json({ success: false, error: 'Website description must be a string' });
      if (websiteDescription.length > 500) return res.status(400).json({ success: false, error: 'Website description must be less than 500 characters' });
      updateData.websiteDescription = websiteDescription || '';
    }
    if (referralCode !== undefined) {
      if (typeof referralCode !== 'string') return res.status(400).json({ success: false, error: 'Referral code must be a string' });
      if (referralCode.length > 50) return res.status(400).json({ success: false, error: 'Referral code must be less than 50 characters' });
      updateData.referralCode = referralCode || '';
    }
    if (socialLinks !== undefined) {
      if (!Array.isArray(socialLinks)) {
        return res.status(400).json({ success: false, error: 'Social links must be an array' });
      }
      if (socialLinks.length > 20) {
        return res.status(400).json({ success: false, error: 'Maximum 20 social links allowed' });
      }
      for (let i = 0; i < socialLinks.length; i++) {
        const link = socialLinks[i];
        if (!link || typeof link !== 'object') {
          return res.status(400).json({ success: false, error: `Social link at index ${i} is invalid` });
        }
        if (!link.platform || typeof link.platform !== 'string' || link.platform.trim().length === 0 || link.platform.trim().length > 50) {
          return res.status(400).json({ success: false, error: `Social link ${i}: platform is required and must be 1-50 chars` });
        }
        if (!link.url || typeof link.url !== 'string' || !isValidUrl(link.url.trim())) {
          return res.status(400).json({ success: false, error: `Social link ${i}: URL is invalid` });
        }
      }
      updateData.socialLinks = socialLinks;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // ── Ensure searchable is updated ──
    const makerInfo = await getUserInfo(data.makerUid);
    const makerUsername = makerInfo?.username || '';
    const finalName = name !== undefined ? name.trim() : data.name;
    const finalTagline = tagline !== undefined ? tagline.trim() : data.tagline;
    const finalDescription = description !== undefined ? description.trim() : data.description;
    updateData.searchable = (
      finalName + ' ' +
      finalTagline + ' ' +
      finalDescription + ' ' +
      makerUsername
    ).toLowerCase();

    await docRef.update(updateData);

    // ── If category changed, move between sorted sets ──
    const oldCategory = data.category || 'Other';
    const newCategory = category || oldCategory;
    if (newCategory !== oldCategory) {
      await removeProductFromFeedSets(id, oldCategory);
      const timestamp = data.createdAt ? (data.createdAt.seconds || 0) * 1000 : Date.now();
      const updatedDoc = await docRef.get();
      const updatedData = updatedDoc.data();
      await addProductToFeedSets(id, newCategory, timestamp, updatedData.upvotes || 0, updatedData.commentsCount || 0);
    }

    // ── Update details cache ──
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    const maker = await getProductMakerInfo(updatedData.makerUid);
    const product = { id: updatedDoc.id, ...updatedData, maker };
    await cacheProductDetails(id, product);

    // ── Invalidate all user's own products list caches ──
    await invalidatePattern(`productstrend:my-products:${uid}:*`);

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

    // ── Remove from feed sorted sets ──
    const category = data.category || 'Other';
    await removeProductFromFeedSets(id, category);

    // ── Delete details cache ──
    await redis.del(`product:${id}`);

    // ── Soft delete: mark as deleted ──
    await docRef.update({
      status: 'deleted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Invalidate all user's own products list caches (with filters) ──
    await invalidatePattern(`productstrend:my-products:${uid}:*`);

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 7. UPVOTE PRODUCT (toggle)
// ─────────────────────────────────────────────
// ── 7. UPVOTE PRODUCT (toggle) ──
app.post('/api/productstrend/products/:id/upvote', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const deviceId = req.headers['x-device-id'] || null;

    if (!deviceId && !uid) {
      return res.status(400).json({ success: false, error: 'Device ID or user ID required' });
    }

    // ── Per‑minute rate limit: 20 upvotes per minute ──
    if (!(await checkRateLimit(uid, 'upvote-product', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many upvotes. Please wait.' });
    }

    // ── Daily limit: max 100 upvotes per day ──
    if (!(await checkDailyLimit(uid, 'upvote-product', 100))) {
      return res.status(429).json({
        success: false,
        error: 'Daily upvote limit reached (max 100 upvotes per day). Come back tomorrow!'
      });
    }

    const docRef = db.collection('products').doc(id);
    const voteId = uid ? `user_${uid}` : `device_${deviceId}`;
    const voteDocRef = db.collection('productVotes').doc(`${id}_${voteId}`);

    let result;
    let productOwnerId, productName, newUpvotes;
    await db.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(docRef);
      if (!productDoc.exists) {
        throw new Error('Product not found');
      }
      const productData = productDoc.data();
      productOwnerId = productData.makerUid;
      productName = productData.name || 'Untitled';

      const voteDoc = await transaction.get(voteDocRef);
      const isVoted = voteDoc.exists;

      if (isVoted) {
        transaction.delete(voteDocRef);
        newUpvotes = productData.upvotes - 1;
        transaction.update(docRef, {
          upvotes: newUpvotes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result = { action: 'removed', upvotes: newUpvotes };
      } else {
        transaction.set(voteDocRef, {
          productId: id,
          userId: uid || null,
          deviceId: deviceId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        newUpvotes = productData.upvotes + 1;
        transaction.update(docRef, {
          upvotes: newUpvotes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result = { action: 'added', upvotes: newUpvotes };
      }
    });

    // ── Update product details cache ──
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    const maker = await getProductMakerInfo(updatedData.makerUid);
    const product = { id: updatedDoc.id, ...updatedData, maker };
    await cacheProductDetails(id, product);

    // ── 🔥 Update feed sorted sets (most‑upvoted) ──
    const category = updatedData.category || 'Other';
    await updateProductUpvotesInFeed(id, category, product.upvotes);

    // ── Invalidate user's vote cache ──
    if (uid) {
      await invalidateKey(`user:votes:${uid}`);
    }

    // ── 🆕 Milestone notification for upvotes (every multiple of 9) ──
    if (result.action === 'added' && newUpvotes > 0 && newUpvotes % 9 === 0) {
      try {
        const upvoterInfo = await getUserInfo(uid);
        await createNotification({
          userId: productOwnerId,
          type: 'personal',
          title: `⬆️ Your product got ${newUpvotes} upvotes!`,
          description: `"${productName}" has reached ${newUpvotes} upvotes! ${upvoterInfo?.username || 'Someone'} was the ${newUpvotes}th person to upvote it.`,
          fromUserId: uid,
        });
        console.log(`📬 Milestone upvote notification sent for product ${id} (${newUpvotes} upvotes)`);
      } catch (notifError) {
        console.error('Failed to send milestone upvote notification:', notifError);
      }
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
// 8. GET PRODUCT COMMENTS (public)
// ─────────────────────────────────────────────
// ── 8. GET PRODUCT COMMENTS (public, paginated) ──
app.get('/api/productstrend/products/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'product-comments', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastId = req.query.lastId || null;

    const cacheKey = `productstrend:comments:${id}:limit:${limit}:lastId:${lastId || 'null'}`;

    const result = await getOrSetCache(cacheKey, async () => {
      let query = db.collection('productComments')
        .where('productId', '==', id)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);

      if (lastId) {
        const lastDoc = await db.collection('productComments').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const comments = [];
      let hasMore = false;
      let lastCommentId = null;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i >= limit) {
          hasMore = true;
          break;
        }
        const doc = docs[i];
        const data = doc.data();
        const user = await getProductMakerInfo(data.userId);
        comments.push({
          id: doc.id,
          ...data,
          user,
        });
        lastCommentId = doc.id;
      }

      return { comments, hasMore, lastId: lastCommentId };
    }, 300); // 5 min TTL

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Get comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 9. ADD COMMENT TO PRODUCT
// ─────────────────────────────────────────────
// ── 9. ADD COMMENT TO PRODUCT ──
app.post('/api/productstrend/products/:id/comments', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { text } = req.body;

    if (!text || text.trim().length < 1 || text.trim().length > 500) {
      return res.status(400).json({ success: false, error: 'Comment must be 1-500 characters' });
    }

    // ── Per‑minute rate limit: 10 comments per minute ──
    if (!(await checkRateLimit(uid, 'add-comment', 10, 60))) {
      return res.status(429).json({ success: false, error: 'Too many comments. Please wait.' });
    }

    // ── Per‑product daily limit: 10 comments per product per day ──
    if (!(await checkDailyLimit(uid, `comment:${id}`, 10))) {
      return res.status(429).json({
        success: false,
        error: 'Daily comment limit reached for this product (max 10 comments per day). Come back tomorrow!'
      });
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

    // ── Invalidate comments cache ──
    await invalidateKey(`productstrend:comments:${id}`);

    // ── Update product details cache ──
    const productDoc = await productRef.get();
    let productOwnerId, productName, newCommentsCount;
    if (productDoc.exists) {
      const data = productDoc.data();
      productOwnerId = data.makerUid;
      productName = data.name || 'Untitled';
      newCommentsCount = data.commentsCount || 0;
      const maker = await getProductMakerInfo(data.makerUid);
      const product = { id: productDoc.id, ...data, maker };
      await cacheProductDetails(id, product);
    }

    const comment = { id: docRef.id, ...commentData };
    comment.user = await getProductMakerInfo(uid);

    // ── 🆕 Milestone notification for comments (every multiple of 9) ──
    if (newCommentsCount > 0 && newCommentsCount % 9 === 0) {
      try {
        const commenterInfo = await getUserInfo(uid);
        await createNotification({
          userId: productOwnerId,
          type: 'personal',
          title: `💬 Your product got ${newCommentsCount} comments!`,
          description: `"${productName}" has reached ${newCommentsCount} comments! ${commenterInfo?.username || 'Someone'} left the ${newCommentsCount}th comment.`,
          fromUserId: uid,
        });
        console.log(`📬 Milestone comment notification sent for product ${id} (${newCommentsCount} comments)`);
      } catch (notifError) {
        console.error('Failed to send milestone comment notification:', notifError);
      }
    }

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 10. BUY UPVOTES FOR PRODUCT (MT Coins)
// ─────────────────────────────────────────────
app.post('/api/productstrend/products/:id/buy-upvote', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { amount } = req.body;

    // ── Validate amount ──
    if (!amount || !Number.isInteger(amount) || amount < 1 || amount > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be between 1 and 1000 upvotes.'
      });
    }

    // ── Rate limit: 3 purchases per minute ──
    if (!(await checkRateLimit(uid, 'buy-upvote', 3, 60))) {
      return res.status(429).json({
        success: false,
        error: 'Too many purchase attempts. Please wait a moment.'
      });
    }

    // ── Daily limit: max 500 upvotes per day ──
    if (!(await checkDailyLimit(uid, 'buy-upvote', 500))) {
      return res.status(429).json({
        success: false,
        error: 'Daily upvote purchase limit reached (max 500 per day). Come back tomorrow!'
      });
    }

    // ── 1. Fetch product ──
    const productRef = db.collection('products').doc(id);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const productData = productDoc.data();

    // ── 2. Verify ownership ──
    if (productData.makerUid !== uid) {
      return res.status(403).json({ success: false, error: 'You do not own this product' });
    }
    if (productData.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Product is not approved' });
    }

    // ── 3. Check MT Coins balance ──
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const earned = userData.mtCoinsEarned || 0;
    const spent = userData.mtCoinsSpent || 0;
    const available = earned - spent;
    const cost = amount * 5; // 5 MT Coins per upvote

    if (available < cost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient MT Coins. You need ${cost} coins, have ${available}`
      });
    }

    // ── 4. Atomic transaction ──
    let newUpvotes;
    await db.runTransaction(async (transaction) => {
      // First, read the product to get current upvotes (READ before any writes)
      const productRef2 = db.collection('products').doc(id);
      const productSnap = await transaction.get(productRef2);
      if (!productSnap.exists) throw new Error('Product not found');
      const currentUpvotes = productSnap.data().upvotes || 0;
      newUpvotes = currentUpvotes + amount;

      // 4a. Deduct coins from user (increase spent)
      const userRef = db.collection('users').doc(uid);
      transaction.update(userRef, {
        mtCoinsSpent: admin.firestore.FieldValue.increment(cost),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4b. Update product with new upvotes (WRITE)
      transaction.update(productRef2, {
        upvotes: newUpvotes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4c. Log transaction (WRITE)
      const txRef = db.collection('productUpvotePurchases').doc();
      transaction.set(txRef, {
        productId: id,
        userId: uid,
        amount: amount,
        cost: cost,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // ── 5. Update product details cache ──
    const updatedDoc = await productRef.get();
    const updatedData = updatedDoc.data();
    const maker = await getProductMakerInfo(uid);
    const product = { id: updatedDoc.id, ...updatedData, maker };
    await cacheProductDetails(id, product);

    // ── 6. Update feed caches (remove + re‑add with new score) ──
    await updateProductUpvotesInFeed(id, productData.category || 'Other', newUpvotes);

    // ── 7. Invalidate user's own products list ──
    await invalidatePattern(`productstrend:my-products:${uid}:*`);

    // ── 8. Invalidate MT Coins cache ──
    await invalidateKey(`mtcoins:user:${uid}`);

    // ── 9. Send notification ──
    await createNotification({
      userId: uid,
      type: 'personal',
      title: '🚀 Product Boosted!',
      description: `You purchased ${amount} upvotes for "${productData.name}". Total upvotes: ${newUpvotes}`,
      redirectUrl: `/productstrend/${id}`,
      fromUserId: uid
    });

    // ── 10. Response ──
    res.json({
      success: true,
      message: `Added ${amount} upvotes to product!`,
      newUpvotes: newUpvotes || productData.upvotes + amount,
      coinsSpent: cost,
      remainingCoins: available - cost
    });

  } catch (error) {
    console.error('❌ Buy upvote error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to purchase upvotes' });
  }
});


// ============================================================
// 23. NOTIFICATIONS
// ============================================================

// ── Get user's notifications (paginated, cached) ──
app.get('/api/notifications', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const lastId = req.query.lastId || null;

    // ── Build cache key ──
    const cacheKey = `notifications:user:${uid}:${limit}:${lastId || 'null'}`;
    let result = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) result = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!result) {
      let query = db.collection('notifications')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);

      if (lastId) {
        const lastDoc = await db.collection('notifications').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const notifications = [];
      let hasMore = false;
      let lastNotificationId = null;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i >= limit) {
          hasMore = true;
          break;
        }
        const doc = docs[i];
        const data = doc.data();
        // ── If personal, fetch sender info ──
        let sender = null;
        if (data.type === 'personal' && data.fromUserId) {
          const senderDoc = await db.collection('users').doc(data.fromUserId).get();
          if (senderDoc.exists) {
            const sData = senderDoc.data();
            sender = {
              uid: data.fromUserId,
              username: sData.username || '',
              fullname: sData.fullname || '',
              avatar: sData.avatar || '',
            };
          }
        }
        notifications.push({
          id: doc.id,
          ...data,
          sender,
        });
        lastNotificationId = doc.id;
      }

      result = { notifications, hasMore, lastId: lastNotificationId };
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 60); // 1 min TTL
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Mark single notification as read ──
app.put('/api/notifications/:id/read', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    // ── Check ownership ──
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    const data = doc.data();
    if (data.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Not your notification' });
    }

    await docRef.update({
      read: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Invalidate user's notification cache ──
    await invalidatePattern(`notifications:user:${uid}:*`);

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('❌ Mark read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Mark all notifications as read ──
app.put('/api/notifications/read-all', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db.collection('notifications')
      .where('userId', '==', uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { read: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();

    // ── Invalidate cache ──
    await invalidatePattern(`notifications:user:${uid}:*`);

    res.json({ success: true, message: `Marked ${snapshot.size} notifications as read` });
  } catch (error) {
    console.error('❌ Mark all read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── SYSTEM NOTIFICATIONS (global, per-user last-read timestamp) ──

// GET system notifications (unread only)
app.get('/api/notifications/system', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    // ── Get user's last read timestamp ──
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const lastRead = userData.lastReadSystemAt || 0; // numeric timestamp (seconds)

    // ── Query system notifications newer than lastRead ──
    let query = db.collection('systemNotifications')
      .orderBy('createdAt', 'desc')
      .limit(50);

    if (lastRead > 0) {
      const lastReadDate = new Date(lastRead * 1000);
      query = query.where('createdAt', '>', lastReadDate);
    }

    const snapshot = await query.get();
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        redirectUrl: data.redirectUrl || null,
        createdAt: data.createdAt || null,
      });
    });

    const unreadCount = notifications.length;

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('❌ Get system notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark all system notifications as read
app.post('/api/notifications/system/read', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    await db.collection('users').doc(uid).update({
      lastReadSystemAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'All system notifications marked as read' });
  } catch (error) {
    console.error('❌ Mark system read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Create system notification
app.post('/api/admin/system-notifications', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { title, description, redirectUrl } = req.body;

    if (!title || title.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ success: false, error: 'Description must be less than 500 characters' });
    }

    const data = {
      title: title.trim().slice(0, 100),
      description: description ? description.trim().slice(0, 300) : '',
      redirectUrl: redirectUrl || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('systemNotifications').add(data);

    res.status(201).json({
      success: true,
      message: 'System notification broadcasted successfully',
      notification: { id: docRef.id, ...data },
    });
  } catch (error) {
    console.error('❌ Create system notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: Send Custom Notification to Users (with redirectUrl) ──
app.post('/api/admin/send-notification', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    // ── Check admin ──
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    // ── Rate limit: 10 requests per hour ──
    if (!(await checkRateLimit(uid, 'admin-send-notification', 10, 3600))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const { title, description, userIds, type = 'personal', sendToAll = false, redirectUrl } = req.body;

    // ── Validate required fields ──
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }
    if (redirectUrl && typeof redirectUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Redirect URL must be a string' });
    }

    let targetUsers = [];

    if (sendToAll) {
      // ── Send to all active users (logged in within last 30 days) ──
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshot = await db.collection('users')
        .where('lastLogin', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .select('uid')
        .get();

      snapshot.forEach(doc => targetUsers.push(doc.id));
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // ── Send to specific users ──
      targetUsers = userIds;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either userIds array or set sendToAll to true'
      });
    }

    if (targetUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No users found to send notification.',
        sent: 0
      });
    }

    // ── Send notification to each user ──
    let successCount = 0;
    let failCount = 0;

    for (const userId of targetUsers) {
      try {
        await createNotification({
          userId: userId,
          type: type,
          title: title.trim(),
          description: description.trim(),
          redirectUrl: redirectUrl || null, // ✅ Added redirectUrl
          fromUserId: uid,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to send notification to ${userId}:`, err);
        failCount++;
      }

      // ── Small delay to avoid rate limiting ──
      if (targetUsers.length > 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    res.json({
      success: true,
      message: `Notification sent to ${successCount} users. Failed: ${failCount}`,
      total: targetUsers.length,
      successCount,
      failCount,
    });

  } catch (error) {
    console.error('❌ Admin send notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 24. COMMUNITY – POSTS, COMMENTS, LIKES, PROFILES
// ============================================================

// ── GET POSTS FEED – supports: category, type, search, userId, and sort ──
app.get('/api/posts', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 100; // increased to 100 for most-liked
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastId = req.query.lastId || null;
    const category = req.query.category || null;
    const type = req.query.type || null;
    const search = req.query.search || null;
    const userId = req.query.userId || null;
    const sort = req.query.sort || 'newest'; // 'newest' or 'most-liked'
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'posts-get', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    let uid = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) { /* ignore */ }
    }

// ── If search is provided (text or @username) ──
if (search) {
  const cacheKey = `posts:search:${search}:category:${category || 'all'}:type:${type || 'all'}:limit:${limit}:lastId:${lastId || 'null'}`;
  const result = await getOrSetCache(cacheKey, async () => {
    console.log(`📡 Fetching posts with search="${search}"`);

    let targetUserId = null;
    let searchTerm = search;
    // Fetch a bit more than limit to allow in‑memory filtering (for text search)
    let fetchLimit = Math.min(limit + 20, 100);

    // ── Check if search is a username (@handle) ──
    if (search.startsWith('@')) {
      const username = search.slice(1).toLowerCase();
      const userSnapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      if (!userSnapshot.empty) {
        targetUserId = userSnapshot.docs[0].id;
      }
      // If user not found, return empty results quickly
      if (!targetUserId) {
        return { posts: [], hasMore: false, lastId: null };
      }
    }

    let query = db.collection('posts')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc');

    if (targetUserId) {
      // Filter by user
      query = query.where('userId', '==', targetUserId);
      // For username search, we can limit to the same fetchLimit
      query = query.limit(fetchLimit);
    } else {
      // Text search: limit to fetchLimit, we'll filter in memory later
      query = query.limit(fetchLimit);
    }

    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
    }

    // ── Pagination (lastId) – works for both cases ──
    if (lastId) {
      const lastDoc = await db.collection('posts').doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const posts = [];
    let hasMore = false;
    let lastPostId = null;
    let count = 0;

    const docs = snapshot.docs;
    const term = search.toLowerCase();

    for (const doc of docs) {
      if (count >= limit) {
        hasMore = true;
        break;
      }
      const data = doc.data();
      if (data.status === 'deleted') continue;

      // For text search (not user filter), filter by keyword
      if (!targetUserId) {
        const title = (data.title || '').toLowerCase();
        const desc = (data.description || '').toLowerCase();
        if (!title.includes(term) && !desc.includes(term)) continue;
      }

      const user = await getUserInfo(data.userId);
      posts.push({
        id: doc.id,
        ...data,
        user,
      });
      lastPostId = doc.id;
      count++;
    }

    // ── Determine hasMore ──
    // If we fetched fetchLimit documents and we hit the limit, there might be more.
    // For text search, we may have filtered out some, so we check if snapshot length == fetchLimit.
    // For username search, we also check snapshot length == fetchLimit.
    if (snapshot.docs.length === fetchLimit) {
      // There could be more documents beyond fetchLimit.
      // Set hasMore true as a best-effort indicator.
      hasMore = true;
    }

    return { posts, hasMore, lastId: lastPostId };
  }, 120); // 2 minute TTL

  // ── Compute userLiked flag (unchanged) ──
  if (uid) {
    const likeCacheKey = `user:likes:${uid}`;
    let likedSet = new Set();
    try {
      const cached = await redis.get(likeCacheKey);
      if (cached) {
        likedSet = new Set(JSON.parse(cached));
      } else {
        const snapshot = await db.collection('postLikes')
          .where('userId', '==', uid)
          .select('postId')
          .get();
        const likedIds = snapshot.docs.map(d => d.data().postId);
        likedSet = new Set(likedIds);
        await redis.set(likeCacheKey, JSON.stringify(Array.from(likedSet)), 'EX', 300);
      }
    } catch (e) {
      console.warn('Like cache error:', e);
    }
    result.posts.forEach(post => {
      post.userLiked = likedSet.has(post.id);
    });
  }

  return res.json({ success: true, ...result });
}

    // ── If userId is provided (public user posts) ──
    if (userId) {
      const cacheKey = `posts:user:${userId}:category:${category || 'all'}:type:${type || 'all'}:limit:${limit}:lastId:${lastId || 'null'}`;
      const result = await getOrSetCache(cacheKey, async () => {
        console.log(`📡 Fetching posts for user ${userId}`);
        let query = db.collection('posts')
          .where('status', '==', 'active')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(limit + 1);

        if (category && category !== 'all') {
          query = query.where('category', '==', category);
        }
        if (type && type !== 'all') {
          query = query.where('type', '==', type);
        }
        if (lastId) {
          const lastDoc = await db.collection('posts').doc(lastId).get();
          if (lastDoc.exists) query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        const posts = [];
        let hasMore = false;
        let lastPostId = null;

        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i++) {
          if (i >= limit) {
            hasMore = true;
            break;
          }
          const doc = docs[i];
          const data = doc.data();
          const user = await getUserInfo(data.userId);
          posts.push({
            id: doc.id,
            ...data,
            user,
          });
          lastPostId = doc.id;
        }

        return { posts, hasMore, lastId: lastPostId };
      }, 300); // 5 min TTL

      // ── userLiked flag ──
      if (uid) {
        const likeCacheKey = `user:likes:${uid}`;
        let likedSet = new Set();
        try {
          const cached = await redis.get(likeCacheKey);
          if (cached) {
            likedSet = new Set(JSON.parse(cached));
          } else {
            const snapshot = await db.collection('postLikes')
              .where('userId', '==', uid)
              .select('postId')
              .get();
            const likedIds = snapshot.docs.map(d => d.data().postId);
            likedSet = new Set(likedIds);
            await redis.set(likeCacheKey, JSON.stringify(Array.from(likedSet)), 'EX', 300);
          }
        } catch (e) {
          console.warn('Like cache error:', e);
        }
        result.posts.forEach(post => {
          post.userLiked = likedSet.has(post.id);
        });
      }

      return res.json({ success: true, ...result });
    }

    // ── Normal feed: use sorted sets ──
    // Determine which sorted set to use based on sort parameter
    let feedKey;
    if (sort === 'most-liked') {
      // Use the most-liked sorted set (likes as score)
      feedKey = `posts:feed:category:${category || 'all'}:type:${type || 'all'}:sort:likes`;
    } else {
      // Default: newest (timestamp based)
      feedKey = getPostFeedKey(category || null, type || null);
    }
    
    let offset = 0;
    if (lastId) {
      const rank = await redis.zrevrank(feedKey, lastId);
      if (rank !== null) offset = rank + 1;
    }
    const end = offset + limit - 1;
    const postIds = await redis.zrevrange(feedKey, offset, end);

    let hasMore = false;
    if (postIds.length === limit) {
      const next = await redis.zrevrange(feedKey, offset + limit, offset + limit);
      if (next.length > 0) hasMore = true;
    }

    const posts = [];
    if (postIds.length > 0) {
      const details = await Promise.all(postIds.map(id => getPostDetails(id)));
      for (const post of details) {
        if (post) posts.push(post);
      }
    }

    // ── userLiked flag ──
    if (uid) {
      const likeCacheKey = `user:likes:${uid}`;
      let likedSet = new Set();
      try {
        const cached = await redis.get(likeCacheKey);
        if (cached) {
          likedSet = new Set(JSON.parse(cached));
        } else {
          const snapshot = await db.collection('postLikes')
            .where('userId', '==', uid)
            .select('postId')
            .get();
          const likedIds = snapshot.docs.map(d => d.data().postId);
          likedSet = new Set(likedIds);
          await redis.set(likeCacheKey, JSON.stringify(Array.from(likedSet)), 'EX', 300);
        }
      } catch (e) {
        console.warn('Like cache error:', e);
      }
      posts.forEach(post => {
        post.userLiked = likedSet.has(post.id);
      });
    }

    const lastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;
    res.json({
      success: true,
      posts,
      hasMore,
      lastId: lastPostId,
    });
  } catch (error) {
    console.error('❌ Get posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 2. GET SINGLE POST (public, with caching) ──
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, 'post-get', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `post:${id}`;
    let post = null;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) post = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!post) {
      const doc = await db.collection('posts').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      const data = doc.data();
      if (data.status === 'deleted') {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      const user = await getUserInfo(data.userId);
      post = { id: doc.id, ...data, user };
      await redis.set(cacheKey, JSON.stringify(post), 'EX', 60);
    }

    // Check if authenticated user liked this post
    let userLiked = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const likeDoc = await db.collection('postLikes')
          .doc(`${id}_user_${decoded.uid}`)
          .get();
        userLiked = likeDoc.exists;
      } catch (e) { /* ignore */ }
    }
    post.userLiked = userLiked;

    res.json({ success: true, post });
  } catch (error) {
    console.error('❌ Get post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 3. CREATE POST (authenticated) ──
// ── CREATE POST – with sorted set fanout, daily limit ──
app.post('/api/posts', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;

    // ── Rate limits: per‑minute and daily ──
    if (!(await checkRateLimit(uid, 'create-post', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many posts. Please wait a moment.' });
    }
    if (!(await checkDailyLimit(uid, 'create-post', 10))) {
      return res.status(429).json({
        success: false,
        error: 'Daily post limit reached (max 10 posts per day). Come back tomorrow!'
      });
    }

    const { type, title, description, category, imageUrl, videoUrl, ctaText, ctaUrl } = req.body;

    // ── Validation ──
    const validTypes = ['general', 'launch', 'update', 'job', 'question', 'event', 'promotional'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid post type' });
    }
    if (!title || title.trim().length < 1 || title.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'Title must be 1-100 characters' });
    }
    if (!description || description.trim().length < 1 || description.trim().length > 500) {
      return res.status(400).json({ success: false, error: 'Description must be 1-500 characters' });
    }
    const validCategories = ['general', 'web-dev', 'design', 'ai', 'gaming', 'content', 'startup', 'social', 'coding', 'marketing', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    if (videoUrl && !isValidUrl(videoUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid video URL' });
    }
    if (imageUrl && !validateImageUrl(imageUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
    }
    if (ctaText && ctaText.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'CTA text must be less than 50 characters' });
    }
    if (ctaUrl && !isValidUrl(ctaUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid CTA URL' });
    }

    const postData = {
      userId: uid,
      type: type,
      title: title.trim(),
      description: description.trim(),
      category: category || 'general',
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      ctaText: ctaText || '',
      ctaUrl: ctaUrl || '',
      likes: 0,
      commentsCount: 0,
      views: 0,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('posts').add(postData);
    const newPost = { id: docRef.id, ...postData };
    newPost.user = await getUserInfo(uid);

    // ── Add to feed sorted sets ──
    const timestamp = Date.now();
    await addPostToFeedSets(newPost.id, newPost.category, newPost.type, timestamp);

    // ── Cache details ──
    await cachePostDetails(newPost.id, newPost);

    // ── Invalidate all user's own posts cache ──
    await invalidatePattern(`my-posts:${uid}:*`);

    // ── 🆕 Send notification to the post creator ──
    try {
      const userInfo = await getUserInfo(uid);
      const postTypeMap = {
        'general': '📌',
        'launch': '🚀',
        'update': '📢',
        'job': '💼',
        'question': '❓',
        'event': '📅',
        'promotional': '💎',
      };
      const emoji = postTypeMap[type] || '📝';
      
      await createNotification({
        userId: uid,
        type: 'personal',
        title: `${emoji} Post Published!`,
        description: `Your post "${title}" has been published successfully. It's now live in the community feed.`,
        fromUserId: uid,
      });
      console.log(`📬 Post notification sent to ${uid}`);
    } catch (notifError) {
      console.error('Failed to send post notification:', notifError);
    }

    res.status(201).json({
      success: true,
      postId: docRef.id,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('❌ Create post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 4. UPDATE POST (authenticated, owner only) ──
// ── UPDATE POST – with sorted set updates ──
app.put('/api/posts/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    if (!(await checkRateLimit(uid, 'edit-post', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many edits. Please wait.' });
    }

    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Not your post' });
    }

    const { type, title, description, category, imageUrl, videoUrl, ctaText, ctaUrl } = req.body;
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    // ── Validation ── (same as create)
    const validTypes = ['general', 'launch', 'update', 'job', 'question', 'event', 'promotional'];
    if (type !== undefined && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid post type' });
    }
    if (title !== undefined) {
      if (title.trim().length < 1 || title.trim().length > 100) {
        return res.status(400).json({ success: false, error: 'Title must be 1-100 characters' });
      }
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      if (description.trim().length < 1 || description.trim().length > 500) {
        return res.status(400).json({ success: false, error: 'Description must be 1-500 characters' });
      }
      updateData.description = description.trim();
    }
    const validCategories = ['general', 'web-dev', 'design', 'ai', 'gaming', 'content', 'startup', 'social', 'coding', 'marketing', 'other'];
    if (category !== undefined && !validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    if (videoUrl !== undefined && videoUrl && !isValidUrl(videoUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid video URL' });
    }
    if (imageUrl !== undefined && imageUrl && !validateImageUrl(imageUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid image URL' });
    }
    if (ctaText !== undefined && ctaText.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'CTA text must be less than 50 characters' });
    }
    if (ctaUrl !== undefined && ctaUrl && !isValidUrl(ctaUrl)) {
      return res.status(400).json({ success: false, error: 'Invalid CTA URL' });
    }

    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || '';
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl || '';
    if (ctaText !== undefined) updateData.ctaText = ctaText || '';
    if (ctaUrl !== undefined) updateData.ctaUrl = ctaUrl || '';

    await postRef.update(updateData);

    // ── If category or type changed, move between sorted sets ──
    const oldCategory = postData.category || 'general';
    const oldType = postData.type || 'general';
    const newCategory = category || oldCategory;
    const newType = type || oldType;

    if (newCategory !== oldCategory || newType !== oldType) {
      await removePostFromFeedSets(id, oldCategory, oldType);
      const timestamp = postData.createdAt ? (postData.createdAt.seconds || 0) * 1000 : Date.now();
      await addPostToFeedSets(id, newCategory, newType, timestamp);
    }

    // ── Update details cache ──
    const updatedDoc = await postRef.get();
    const updatedData = updatedDoc.data();
    const user = await getUserInfo(uid);
    const updatedPost = { id: updatedDoc.id, ...updatedData, user };
    await cachePostDetails(id, updatedPost);

    // ── Invalidate all user's own posts cache ──
await invalidatePattern(`my-posts:${uid}:*`);

    res.json({ success: true, message: 'Post updated successfully' });
  } catch (error) {
    console.error('❌ Edit post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 5. DELETE POST (soft-delete, authenticated, owner only) ──
// ── DELETE POST (soft‑delete) ──
app.delete('/api/posts/:id', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    if (!(await checkRateLimit(uid, 'delete-post', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many deletions. Please wait.' });
    }

    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Not your post' });
    }

    // ── Soft‑delete ──
    await postRef.update({
      status: 'deleted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Remove from feed sorted sets ──
    await removePostFromFeedSets(id, postData.category || 'general', postData.type || 'general');

    // ── Delete details cache ──
    await redis.del(`post:${id}`);

   // ── Invalidate all user's own posts cache ──
await invalidatePattern(`my-posts:${uid}:*`);

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('❌ Delete post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── TOGGLE LIKE ON POST ──
app.post('/api/posts/:id/like', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    if (!(await checkRateLimit(uid, 'like-post', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many likes. Please wait.' });
    }

    // ── Daily limit: max 50 likes per post per day ──
    if (!(await checkDailyLimit(uid, `like:post:${id}`, 50))) {
      return res.status(429).json({
        success: false,
        error: 'Daily like limit reached for this post (max 50 likes per day). Come back tomorrow!'
      });
    }

    const postRef = db.collection('posts').doc(id);
    const likeRef = db.collection('postLikes').doc(`${id}_user_${uid}`);

    let result;
    let category, type, newLikes, postOwnerId, postTitle;
    await db.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) throw new Error('Post not found');

      const postData = postDoc.data();
      category = postData.category || 'general';
      type = postData.type || 'general';
      postOwnerId = postData.userId;
      postTitle = postData.title || 'Untitled';

      const likeDoc = await transaction.get(likeRef);
      const isLiked = likeDoc.exists;

      if (isLiked) {
        transaction.delete(likeRef);
        newLikes = postData.likes - 1;
        transaction.update(postRef, {
          likes: newLikes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result = { action: 'removed', likes: newLikes };
      } else {
        transaction.set(likeRef, {
          postId: id,
          userId: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        newLikes = postData.likes + 1;
        transaction.update(postRef, {
          likes: newLikes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result = { action: 'added', likes: newLikes };
      }
    });

    // ── 🔥 Update the most‑liked Redis sorted set ──
    await updatePostLikesInFeed(id, category, type, newLikes);

    // ── Update post detail cache ──
    const updatedDoc = await postRef.get();
    if (updatedDoc.exists) {
      const data = updatedDoc.data();
      const user = await getUserInfo(data.userId);
      const post = { id: updatedDoc.id, ...data, user };
      await redis.set(`post:${id}`, JSON.stringify(post), 'EX', 3600);
    }

    // ── 🆕 Milestone notification for likes (every multiple of 9) ──
    if (result.action === 'added' && newLikes > 0 && newLikes % 9 === 0) {
      try {
        // Get liker info
        const likerInfo = await getUserInfo(uid);
        await createNotification({
          userId: postOwnerId,
          type: 'personal',
          title: `❤️ Your post got ${newLikes} likes!`,
          description: `"${postTitle}" has reached ${newLikes} likes! ${likerInfo?.username || 'Someone'} was the ${newLikes}th person to like it.`,
          fromUserId: uid,
        });
        console.log(`📬 Milestone like notification sent for post ${id} (${newLikes} likes)`);
      } catch (notifError) {
        console.error('Failed to send milestone like notification:', notifError);
      }
    }

    res.json({ success: true, action: result.action, likes: result.likes });
  } catch (error) {
    console.error('❌ Like error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 7. ADD COMMENT (authenticated) ──
// ── ADD COMMENT TO POST (with rate limits) ──
app.post('/api/posts/:id/comments', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { content } = req.body;

    if (!content || content.trim().length < 1 || content.trim().length > 300) {
      return res.status(400).json({ success: false, error: 'Comment must be 1-300 characters' });
    }

    // ── Per‑minute rate limit: 5 comments per minute ──
    if (!(await checkRateLimit(uid, 'add-comment', 5, 60))) {
      return res.status(429).json({ success: false, error: 'Too many comments. Please wait a moment.' });
    }

    // ── Per‑post daily limit: 10 comments per post per day ──
    if (!(await checkDailyLimit(uid, `comment:${id}`, 10))) {
      return res.status(429).json({
        success: false,
        error: 'Daily comment limit reached for this post (max 10 comments per day). Come back tomorrow!'
      });
    }

    const commentData = {
      postId: id,
      userId: uid,
      content: content.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('postComments').add(commentData);

    // ── Update post comments count ──
    const postRef = db.collection('posts').doc(id);
    await postRef.update({
      commentsCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Invalidate comment caches for this post ──
    await invalidatePattern(`post:comments:${id}:*`);

    // ── Update post detail cache ──
    const postDoc = await postRef.get();
    let postOwnerId, postTitle, newCommentsCount;
    if (postDoc.exists) {
      const data = postDoc.data();
      postOwnerId = data.userId;
      postTitle = data.title || 'Untitled';
      newCommentsCount = data.commentsCount || 0;
      const user = await getUserInfo(data.userId);
      const post = { id: postDoc.id, ...data, user };
      await redis.set(`post:${id}`, JSON.stringify(post), 'EX', 3600);
    }

    const user = await getUserInfo(uid);
    const comment = {
      id: docRef.id,
      ...commentData,
      user,
    };

    // ── 🆕 Milestone notification for comments (every multiple of 9) ──
    if (newCommentsCount > 0 && newCommentsCount % 9 === 0) {
      try {
        const commenterInfo = await getUserInfo(uid);
        await createNotification({
          userId: postOwnerId,
          type: 'personal',
          title: `💬 Your post got ${newCommentsCount} comments!`,
          description: `"${postTitle}" has reached ${newCommentsCount} comments! ${commenterInfo?.username || 'Someone'} left the ${newCommentsCount}th comment.`,
          fromUserId: uid,
        });
        console.log(`📬 Milestone comment notification sent for post ${id} (${newCommentsCount} comments)`);
      } catch (notifError) {
        console.error('Failed to send milestone comment notification:', notifError);
      }
    }

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 8. GET COMMENTS (public, paginated, cached) ──
// ── GET POST COMMENTS (paginated, with hard cap) ──
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = getClientIp(req);

    if (!(await checkRateLimit(ip, 'post-comments-get', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastId = req.query.lastId || null;

    const cacheKey = `post:comments:${id}:limit:${limit}:lastId:${lastId || 'null'}`;

    const result = await getOrSetCache(cacheKey, async () => {
      let query = db.collection('postComments')
        .where('postId', '==', id)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);

      if (lastId) {
        const lastDoc = await db.collection('postComments').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const comments = [];
      let hasMore = false;
      let lastCommentId = null;

      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i++) {
        if (i >= limit) {
          hasMore = true;
          break;
        }
        const doc = docs[i];
        const data = doc.data();
        const user = await getUserInfo(data.userId);
        comments.push({
          id: doc.id,
          content: data.content,
          userId: data.userId,
          user,
          createdAt: data.createdAt || null,
        });
        lastCommentId = doc.id;
      }

      return { comments, hasMore, lastId: lastCommentId };
    }, 300); // 5 min TTL

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Get post comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Get current user's posts (authenticated, optimized for "My Posts" page) ──
// ── Get current user's posts (authenticated, paginated, with filters) ──
app.get('/api/my-posts', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    let limit = parseInt(req.query.limit) || 20;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const lastId = req.query.lastId || null;
    const category = req.query.category || null;
    const type = req.query.type || null;
    const search = req.query.search || null;

    if (!(await checkRateLimit(uid, 'my-posts', 20, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    // ── Build cache key with all filters ──
    const cacheKey = `my-posts:${uid}:category:${category || 'all'}:type:${type || 'all'}:search:${search || 'null'}:limit:${limit}:lastId:${lastId || 'null'}`;

    const result = await getOrSetCache(cacheKey, async () => {
      console.log(`📡 Fetching my posts for user ${uid} with filters: category=${category}, type=${type}, search=${search}`);

      let query = db.collection('posts')
        .where('userId', '==', uid)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);

      if (category && category !== 'all') {
        query = query.where('category', '==', category);
      }
      if (type && type !== 'all') {
        query = query.where('type', '==', type);
      }

      if (lastId) {
        const lastDoc = await db.collection('posts').doc(lastId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const posts = [];
      let hasMore = false;
      let lastPostId = null;
      const docs = snapshot.docs;

      // For search, we filter in memory after fetching
      for (let i = 0; i < docs.length; i++) {
        if (i >= limit) {
          hasMore = true;
          break;
        }
        const doc = docs[i];
        const data = doc.data();
        if (data.status === 'deleted') continue;

        // ── Apply search filter (if provided) ──
        if (search) {
          const term = search.toLowerCase();
          const title = (data.title || '').toLowerCase();
          const desc = (data.description || '').toLowerCase();
          if (!title.includes(term) && !desc.includes(term)) continue;
        }

        const user = await getUserInfo(data.userId);
        posts.push({
          id: doc.id,
          ...data,
          user,
        });
        lastPostId = doc.id;
      }

      return { posts, hasMore, lastId: lastPostId };
    }, 300); // 5 min TTL

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Get my posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// 11. BUY LIKES FOR POST (MT Coins)
// ─────────────────────────────────────────────
app.post('/api/posts/:id/buy-like', verifyToken, checkBanned, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { amount } = req.body;

    // ── Validate amount ──
    if (!amount || !Number.isInteger(amount) || amount < 1 || amount > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be between 1 and 1000 likes.'
      });
    }

    // ── Rate limit: 3 purchases per minute ──
    if (!(await checkRateLimit(uid, 'buy-post-like', 3, 60))) {
      return res.status(429).json({
        success: false,
        error: 'Too many purchase attempts. Please wait a moment.'
      });
    }

    // ── Daily limit: max 500 likes per day ──
    if (!(await checkDailyLimit(uid, 'buy-post-like', 500))) {
      return res.status(429).json({
        success: false,
        error: 'Daily like purchase limit reached (max 500 per day). Come back tomorrow!'
      });
    }

    // ── 1. Fetch post ──
    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Post is not active' });
    }

    // ── 2. Verify ownership ──
    if (postData.userId !== uid) {
      return res.status(403).json({ success: false, error: 'You do not own this post' });
    }

    // ── 3. Check MT Coins balance ──
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const earned = userData.mtCoinsEarned || 0;
    const spent = userData.mtCoinsSpent || 0;
    const available = earned - spent;
    const cost = amount * 5; // 5 MT Coins per like

    if (available < cost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient MT Coins. You need ${cost} coins, have ${available}`
      });
    }

    // ── 4. Atomic transaction ──
    let newLikes;
    await db.runTransaction(async (transaction) => {
      // Read current post (READ before writes)
      const postSnap = await transaction.get(postRef);
      if (!postSnap.exists) throw new Error('Post not found');
      const currentLikes = postSnap.data().likes || 0;
      newLikes = currentLikes + amount;

      // Deduct coins
      const userRef = db.collection('users').doc(uid);
      transaction.update(userRef, {
        mtCoinsSpent: admin.firestore.FieldValue.increment(cost),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update post likes
      transaction.update(postRef, {
        likes: newLikes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log transaction
      const txRef = db.collection('postLikePurchases').doc();
      transaction.set(txRef, {
        postId: id,
        userId: uid,
        amount: amount,
        cost: cost,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // ── 5. Update post detail cache ──
    const updatedDoc = await postRef.get();
    const updatedData = updatedDoc.data();
    const user = await getUserInfo(uid);
    const post = { id: updatedDoc.id, ...updatedData, user };
    await cachePostDetails(id, post);

    // ── 6. Update feed caches (remove + re‑add with new likes score) ──
    await updatePostLikesInFeed(id, postData.category || 'general', postData.type || 'general', newLikes);

    // ── 7. Invalidate user's own posts list ──
    await invalidatePattern(`my-posts:${uid}:*`);

    // ── 8. Invalidate MT Coins cache ──
    await invalidateKey(`mtcoins:user:${uid}`);

    // ── 9. Send notification ──
    await createNotification({
      userId: uid,
      type: 'personal',
      title: '📈 Post Boosted!',
      description: `You purchased ${amount} likes for "${postData.title}". Total likes: ${newLikes}`,
      redirectUrl: `/community/post/${id}`,
      fromUserId: uid
    });

    // ── 10. Response ──
    res.json({
      success: true,
      message: `Added ${amount} likes to your post!`,
      newLikes: newLikes || postData.likes + amount,
      coinsSpent: cost,
      remainingCoins: available - cost
    });

  } catch (error) {
    console.error('❌ Buy like error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to purchase likes' });
  }
});

// ── GET public user profile ──
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const ip = getClientIp(req);

    // Rate limit: 30 requests per minute per IP
    if (!(await checkRateLimit(ip, 'public-profile', 30, 60))) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait.' });
    }

    const cacheKey = `public-user:${uid}`;
    let result;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) result = JSON.parse(cached);
    } catch (e) { /* ignore */ }

    if (!result) {
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const data = doc.data();

      // Only public fields – safe to share
      const publicProfile = {
        uid: doc.id,
        username: data.username || '',
        fullname: data.fullname || '',
        avatar: data.avatar || '',
        bio: data.bio || '',
        country: data.country || '',
        gender: data.gender || '',
        skills: Array.isArray(data.skills) ? data.skills : [],
        socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
        websites: Array.isArray(data.websites) ? data.websites : [],
        createdAt: data.createdAt || null,
      };

      result = { success: true, user: publicProfile };
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); // 5 min cache
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Public profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ============================================================
// 18. GLOBAL ERROR HANDLER (renumbered from 18 to 24)
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


// ── Save FCM Token (authenticated) ──
app.post('/api/auth/fcm-token', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    await db.collection('users').doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Save FCM token error:', error);
    res.status(500).json({ success: false, error: 'Failed to save token' });
  }
});

// ── Remove FCM Token (on logout) ──
app.delete('/api/auth/fcm-token', verifyToken, checkBanned, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    await db.collection('users').doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Remove FCM token error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove token' });
  }
});

// ============================================================
// 19. START SERVER (or export for Vercel)
// ============================================================
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  // ── Serverless: export the app as the handler ──
  module.exports = app;
} else {
  // ── Local / custom server: listen on a port ──
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
    console.log(`🔒 Allowed origins:`, allowedOrigins);
    console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`✅ Security: Helmet, CORS, Rate Limiting, XSS Protection`);
    console.log(`📦 Redis: INDEFINITE CACHE with smart invalidation`);
  });
}