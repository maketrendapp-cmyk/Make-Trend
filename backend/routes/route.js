// backend/routes/route.js
// ============================================================
// COMPLETE: AUTH + TEMPLATES + CAMPAIGNS (Root campaigns collection)
// ============================================================

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// ============================================================
// MIDDLEWARE: Verify Firebase ID Token
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

// ============================================================
// HELPER: Check if user is admin
// ============================================================
async function isAdmin(uid) {
  try {
    const user = await admin.auth().getUser(uid);
    return user.customClaims?.admin === true;
  } catch {
    return false;
  }
}

// ============================================================
// HELPERS (Auth)
// ============================================================
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

// ============================================================
// ===================== AUTH ENDPOINTS =====================
// ============================================================

router.get('/auth/check-username', async (req, res) => {
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

router.get('/auth/check-email', async (req, res) => {
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

router.post('/auth/register', async (req, res) => {
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

router.post('/auth/complete-social', verifyToken, async (req, res) => {
  try {
    const { uid, email, fullname, username, avatar, referralCode: referredByCode, deviceFingerprint } = req.body;
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

router.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = doc.data();
    delete userData.deviceFingerprint;
    res.json({ success: true, user: { uid, ...userData } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

router.get('/auth/check-ban', async (req, res) => {
  try {
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

router.post('/auth/record-login', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    await db.collection('users').doc(uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Record login error:', error);
    res.json({ success: true });
  }
});

router.get('/auth/profile', async (req, res) => {
  try {
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

// ============================================================
// UPDATE USER PROFILE (Protected)
// ============================================================
router.put('/auth/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { username, fullname, email, avatar } = req.body;

    // Sanitise
    const cleanUsername = sanitizeUsername(username);
    const cleanFullname = sanitizeFullName(fullname);
    const cleanEmail = email?.trim().toLowerCase();

    // Basic validation
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

    // Fetch current user document
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const currentData = userDoc.data();

    // ── Check username uniqueness ──
    if (cleanUsername !== currentData.username) {
      const existingUsername = await db.collection('users')
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();
      if (!existingUsername.empty) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
    }

    // ── Check email uniqueness ──
    if (cleanEmail !== currentData.email) {
      const existingEmail = await db.collection('users')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();
      if (!existingEmail.empty) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      // Also update Firebase Auth email (requires re‑authentication for sensitive actions)
      // We'll attempt it – if it fails, we'll still update the Firestore doc? Better to fail early.
      try {
        await admin.auth().updateUser(uid, { email: cleanEmail });
      } catch (authError) {
        console.error('Firebase Auth email update error:', authError);
        return res.status(400).json({
          success: false,
          error: 'Failed to update email. You may need to re‑authenticate.'
        });
      }
    }

    // ── Update Firestore ──
    const updateData = {
      username: cleanUsername,
      fullname: cleanFullname,
      email: cleanEmail,
      avatar: avatar || currentData.avatar || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(uid).update(updateData);

    // Fetch updated document
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

// ============================================================
// GET REFERRED USERS (Protected)
// ============================================================
router.get('/auth/referrals', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Get current user's referral code
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userData = userDoc.data();
    const referralCode = userData.referralCode;

    if (!referralCode) {
      return res.json({ success: true, referrals: [], referrer: null });
    }

    // Find users who used this referral code
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

    // Also find who referred the current user (if any)
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



router.post('/auth/set-admin', async (req, res) => {
  try {
    const { email, secret } = req.body;
    if (secret !== 'PANKAJ@123sah') {
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({
      success: true,
      message: `Admin claim set for ${email}`,
      uid: userRecord.uid
    });
  } catch (error) {
    console.error('Set admin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ===================== TEMPLATE ENDPOINTS =====================
// ============================================================

router.get('/templates', async (req, res) => {
  try {
    const { category, platform, highlight, plan, limit = 50 } = req.query;
    let query = db.collection('templates');
    if (category) query = query.where('category', '==', category);
    if (platform) query = query.where('platform', '==', platform);
    if (highlight === 'true') query = query.where('isHighlight', '==', true);
    if (plan) query = query.where('plan', '==', plan);
    try {
      query = query.orderBy('createdAt', 'desc');
    } catch (orderError) {
      console.warn('⚠️ Cannot order by createdAt:', orderError.message);
    }
    query = query.limit(parseInt(limit) || 50);
    const snapshot = await query.get();
    const templates = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive !== false) {
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
      }
    });
    res.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/templates/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const snapshot = await db.collection('templates')
      .where('slug', '==', slug)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    res.json({
      success: true,
      template: { id: doc.id, ...data, plan: data.plan || 'free' }
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

router.get('/templates/filters', async (req, res) => {
  try {
    const snapshot = await db.collection('templates').where('isActive', '==', true).get();
    const categories = new Set();
    const platforms = new Set();
    const plans = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.category) categories.add(data.category);
      if (data.platform) platforms.add(data.platform);
      if (data.plan) plans.add(data.plan);
    });
    res.json({
      success: true,
      categories: Array.from(categories),
      platforms: Array.from(platforms),
      plans: Array.from(plans),
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch filters' });
  }
});

router.post('/templates', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const { title, slug, description, image, thumbnail, category, platform, hashtags, isHighlight, plan = 'free' } = req.body;
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
      isActive: true,
      usageCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('templates').add(templateData);
    res.status(201).json({ success: true, template: { id: docRef.id, ...templateData } });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

router.put('/templates/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
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
    res.json({ success: true, message: 'Template updated' });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    await db.collection('templates').doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Template archived' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

router.post('/templates/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('templates').doc(id).update({
      usageCount: admin.firestore.FieldValue.increment(1)
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Increment usage error:', error);
    res.status(500).json({ success: false, error: 'Failed to increment usage' });
  }
});

// ============================================================
// ===================== CAMPAIGN ENDPOINTS =====================
// ============================================================

// GET USER'S CAMPAIGNS (Protected – shows only own campaigns)
// GET USER'S CAMPAIGNS (Root collection – all campaigns except deleted)
router.get('/campaigns', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const limit = parseInt(req.query.limit) || 50;

    const snapshot = await db.collection('campaigns')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const campaigns = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only exclude documents marked as 'deleted'
      if (data.status !== 'deleted') {
        campaigns.push({ id: doc.id, ...data });
      }
    });

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET CAMPAIGN BY ID (Public)
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const campaignData = doc.data();
    // Increment view count
    await doc.ref.update({
      views: admin.firestore.FieldValue.increment(1)
    }).catch(() => {});
    res.json({
      success: true,
      campaign: { id: doc.id, ...campaignData }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
});

// CREATE CAMPAIGN (Protected)
router.post('/campaigns', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { templateId, shareCount, tasks, finalUrl, features } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }
    const templateRef = db.collection('templates').doc(templateId);
    const templateDoc = await templateRef.get();
    if (!templateDoc.exists) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const { shareCount: scEnabled, tasks: tasksEnabled, finalUrl: fuEnabled } = features || {};
    if (typeof scEnabled !== 'boolean' || typeof tasksEnabled !== 'boolean' || typeof fuEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Features must include shareCount, tasks, finalUrl as booleans'
      });
    }
    if (!scEnabled && !tasksEnabled && !fuEnabled) {
      return res.status(400).json({
        success: false,
        error: 'At least one feature must be enabled'
      });
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

    const templateData = templateDoc.data();

    const campaignData = {
      templateId,
      userId: uid,
      shareCount: finalShareCount,
      tasks: finalTasks,
      finalUrl: finalFinalUrl,
      features: { shareCount: scEnabled, tasks: tasksEnabled, finalUrl: fuEnabled },
      title: templateData.title || 'Untitled Campaign',
      description: templateData.description || '',
      image: templateData.image || '',
      reward: templateData.reward || 'Exclusive Reward',
      status: 'active',
      views: 0,
      completions: 0,
      shares: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Store campaign in root 'campaigns' collection
    const docRef = await db.collection('campaigns').add(campaignData);

    // Also increment template usage
    await templateRef.update({
      usageCount: admin.firestore.FieldValue.increment(1)
    });

    res.status(201).json({
      success: true,
      campaignId: docRef.id,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// UPDATE CAMPAIGN (Protected)
router.put('/campaigns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const data = doc.data();
    if (data.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
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
    res.json({ success: true, message: 'Campaign updated' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

// DELETE CAMPAIGN (Protected)
router.delete('/campaigns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// RECORD SHARE (Public)
// routes/route.js
router.post('/campaigns/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const campaignData = doc.data();
    const targetShareCount = campaignData.shareCount || 0;

    // ✅ Set shares to the target count (not increment)
    await doc.ref.update({
      shares: targetShareCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await doc.ref.get();
    const data = updatedDoc.data();

    res.json({
      success: true,
      shares: data.shares || 0,
      shareCount: data.shareCount || 0,
    });
  } catch (error) {
    console.error('❌ Share error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET CAMPAIGN SHARE COUNT (Public)
router.get('/campaigns/:id/share-count', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    const data = doc.data();
    res.json({
      success: true,
      shares: data.shares || 0,
      shareCount: data.shareCount || 0,
      isComplete: (data.shares || 0) >= (data.shareCount || 0)
    });
  } catch (error) {
    console.error('Error getting share count:', error);
    res.status(500).json({ success: false, error: 'Failed to get share count' });
  }
});

// COMPLETE CAMPAIGN (Public)
router.post('/campaigns/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // ✅ Add 1 completion
    await doc.ref.update({
      completions: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (userId) {
      await doc.ref.collection('completedBy').doc(userId).set({
        userId,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({
      success: true,
      message: 'Campaign completed!',
    });
  } catch (error) {
    console.error('❌ Complete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// routes/route.js
router.post('/campaigns/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // ✅ Add 1 unlock
    await doc.ref.update({
      unlockCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (userId) {
      await doc.ref.collection('unlockedBy').doc(userId).set({
        userId,
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({
      success: true,
      message: 'Campaign unlocked!',
    });
  } catch (error) {
    console.error('❌ Unlock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ===================== EXPORT =====================
// ============================================================
module.exports = router;