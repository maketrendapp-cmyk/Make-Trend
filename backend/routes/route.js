// backend/routes/route.js
// ============================================================
// AUTH ONLY: Login, Register, Profile – No Campaigns, No Stats
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
// HELPERS
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
// 1. CHECK USERNAME AVAILABILITY
// ============================================================
router.get('/auth/check-username', async (req, res) => {
  try {
    const username = sanitizeUsername(req.query.username);
    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
    }

    const snapshot = await db.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    const available = snapshot.empty;
    res.json({ success: true, available });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ success: false, error: 'Failed to check username' });
  }
});

// ============================================================
// 2. CHECK EMAIL AVAILABILITY
// ============================================================
router.get('/auth/check-email', async (req, res) => {
  try {
    const email = req.query.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }

    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    const exists = !snapshot.empty;
    res.json({ success: true, exists });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================
// 3. REGISTER NEW USER (Email/Password)
// ============================================================
router.post('/auth/register', async (req, res) => {
  try {
    const { uid, username, fullname, email, avatar, referralCode: referredByCode, deviceFingerprint } = req.body;

    // Validate
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

    // Check duplicates
    const existingUser = await db.collection('users')
      .where('username', '==', cleanUsername)
      .get();
    if (!existingUser.empty) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    const existingEmail = await db.collection('users')
      .where('email', '==', cleanEmail)
      .get();
    if (!existingEmail.empty) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Generate unique referral code for the new user
    const newReferralCode = await generateUniqueReferralCode();
    const cleanReferredBy = sanitizeReferralCode(referredByCode);

    // User document (no stats, plan: 'free' kept)
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
      plan: 'free',                       // kept for future payment logic
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
    };

    await db.collection('users').doc(uid).set(userData);

    // Remove sensitive fields
    delete userData.deviceFingerprint;

    res.status(201).json({ success: true, user: userData });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ============================================================
// 4. COMPLETE SOCIAL PROFILE (Google / Facebook)
// ============================================================
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

    // Check if username is taken by another user
    const existing = await db.collection('users')
      .where('username', '==', cleanUsername)
      .get();
    if (!existing.empty && existing.docs[0].id !== uid) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    // Generate referral code for the new social user
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

// ============================================================
// 5. GET USER PROFILE (Protected)
// ============================================================
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

// ============================================================
// 6. CHECK BAN STATUS
// ============================================================
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

// ============================================================
// 7. RECORD LOGIN (Protected)
// ============================================================
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

// ============================================================
// 8. CHECK PROFILE COMPLETION STATUS
// ============================================================
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

//PROFILE DONE LOGIN DONE REGISTERED DONE ✅ ✅//

// ============================================================
// TEMPLATE ENDPOINTS (with admin check)
// ============================================================

// Helper: check if user has admin claim
async function isAdmin(uid) {
  try {
    const user = await admin.auth().getUser(uid);
    return user.customClaims?.admin === true;
  } catch {
    return false;
  }
}

// 1. GET ALL TEMPLATES (Public) – with filters
// routes/route.js – GET /templates (Robust Version)

router.get('/templates', async (req, res) => {
  try {
    const { category, platform, highlight, limit = 50 } = req.query;
    
    console.log('📡 Fetching templates with filters:', { category, platform, highlight, limit });
    
    // Start with a simple query – don't filter by isActive to avoid missing field issues
    let query = db.collection('templates');
    
    // Apply filters only if they exist
    if (category) {
      console.log('🔍 Filtering by category:', category);
      query = query.where('category', '==', category);
    }
    if (platform) {
      console.log('🔍 Filtering by platform:', platform);
      query = query.where('platform', '==', platform);
    }
    if (highlight === 'true') {
      console.log('🔍 Filtering by highlight:', true);
      query = query.where('isHighlight', '==', true);
    }
    
    // Order by createdAt if it exists, otherwise just limit
    // We'll try to order, but if the field doesn't exist, we'll handle gracefully
    try {
      query = query.orderBy('createdAt', 'desc');
    } catch (orderError) {
      console.warn('⚠️ Cannot order by createdAt (field may not exist in all docs):', orderError.message);
      // Continue without ordering
    }
    
    query = query.limit(parseInt(limit) || 50);
    
    const snapshot = await query.get();
    console.log('📊 Documents found:', snapshot.size);
    
    const templates = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only include if not explicitly inactive
      if (data.isActive !== false) {
        templates.push({ 
          id: doc.id, 
          ...data,
          // Ensure these fields exist to prevent frontend errors
          title: data.title || 'Untitled',
          slug: data.slug || doc.id,
          description: data.description || '',
          image: data.image || '',
          category: data.category || '',
          platform: data.platform || 'all',
          hashtags: data.hashtags || [],
          isHighlight: data.isHighlight || false,
          usageCount: data.usageCount || 0,
        });
      }
    });
    
    console.log('✅ Returning', templates.length, 'templates');
    res.json({ success: true, templates });
    
  } catch (error) {
    console.error('❌ Get templates error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Send a detailed error message for debugging
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack,
      message: 'Failed to fetch templates. Please check Firestore configuration.'
    });
  }
});

// 2. GET SINGLE TEMPLATE BY SLUG (Public)
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
    res.json({ success: true, template: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

// 3. GET FILTERS (categories, platforms) – from active templates
router.get('/templates/filters', async (req, res) => {
  try {
    const snapshot = await db.collection('templates')
      .where('isActive', '==', true)
      .get();
    
    const categories = new Set();
    const platforms = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.category) categories.add(data.category);
      if (data.platform) platforms.add(data.platform);
    });
    
    res.json({
      success: true,
      categories: Array.from(categories),
      platforms: Array.from(platforms)
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch filters' });
  }
});

// 4. CREATE TEMPLATE (Admin only)
router.post('/templates', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // Check admin claim
    if (!(await isAdmin(uid))) {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }
    
    const { 
      title, slug, description, image, thumbnail, 
      category, platform, hashtags, isHighlight 
    } = req.body;
    
    // Validate
    if (!title || !slug) {
      return res.status(400).json({ success: false, error: 'Title and slug are required' });
    }
    
    // Slug uniqueness
    const existing = await db.collection('templates')
      .where('slug', '==', slug)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ success: false, error: 'Slug already exists' });
    }
    
    const templateData = {
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: description || '',
      image: image || '',
      thumbnail: thumbnail || image || '',
      category: category || 'other',
      platform: platform || 'all',
      hashtags: hashtags || [],
      isHighlight: isHighlight || false,
      isActive: true,
      usageCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await db.collection('templates').add(templateData);
    
    res.status(201).json({ 
      success: true, 
      template: { id: docRef.id, ...templateData } 
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// 5. UPDATE TEMPLATE (Admin only)
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
    
    // If slug is updated, check uniqueness
    if (updates.slug) {
      updates.slug = updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const existing = await db.collection('templates')
        .where('slug', '==', updates.slug)
        .get();
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

// 6. DELETE TEMPLATE (soft delete – Admin only)
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

// 7. INCREMENT USAGE (Public – called when a campaign is created)
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
// ADMIN SETUP ENDPOINT (One‑time use, with secret key)
// ============================================================
router.post('/auth/set-admin', async (req, res) => {
  try {
    const { email, secret } = req.body;
    
    // Verify secret key
    if (secret !== 'PANKAJ@123sah') {
      return res.status(403).json({ success: false, error: 'Invalid secret key' });
    }
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    // 1. Get user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ success: false, error: 'User not found. Please create an account first.' });
      }
      throw error;
    }
    
    // 2. Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    
    // 3. Also store role in Firestore for easy querying
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




module.exports = router;