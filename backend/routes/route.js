// backend/routes/route.js
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
    req.user = decodedToken; // Attach user data (uid, email, etc.)
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// ============================================================
// HELPER: Sanitization functions
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

// ============================================================
// AUTH ENDPOINTS
// ============================================================

// --- 1. Check Username Availability ---
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

// --- 2. Check Email Availability ---
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
    res.status(500).json({ success: false, error: 'Failed to check email' });
  }
});

// --- 3. Register New User ---
router.post('/auth/register', async (req, res) => {
  try {
    const { uid, username, fullname, email, avatar, referralCode, deviceFingerprint } = req.body;

    // Validation
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

    // Check if username or email already taken
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

    // Create user document in Firestore
    const userData = {
      uid,
      username: cleanUsername,
      fullname: cleanFullname,
      email: cleanEmail,
      avatar: avatar || '',
      referralCode: sanitizeReferralCode(referralCode),
      deviceFingerprint: deviceFingerprint || '',
      completed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
      plan: 'free',
      stats: {
        totalCampaigns: 0,
        totalUnlocks: 0,
        totalViews: 0,
      },
    };

    await db.collection('users').doc(uid).set(userData);

    // Remove sensitive fields before sending response
    delete userData.deviceFingerprint;
    delete userData.referralCode;

    res.status(201).json({ success: true, user: userData });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// --- 4. Get Current User Profile (Protected) ---
router.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = doc.data();
    // Remove sensitive fields
    delete userData.deviceFingerprint;
    delete userData.referralCode;

    res.json({ success: true, user: { uid, ...userData } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// --- 5. Check if User is Banned ---
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

// --- 6. Record Login (Protected) ---
router.post('/auth/record-login', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    await db.collection('users').doc(uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Record login error:', error);
    // Don't fail the request if this fails, just log it
    res.json({ success: true });
  }
});

// --- 7. Get User Profile by UID (for social login completion) ---
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

// --- 8. Complete Social Profile (Protected) ---
router.post('/auth/complete-social', verifyToken, async (req, res) => {
  try {
    const { uid, email, fullname, username, avatar, referralCode, deviceFingerprint } = req.body;

    // Validation
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

    // Update user profile
    await db.collection('users').doc(uid).set({
      uid,
      username: cleanUsername,
      fullname: cleanFullname,
      email: cleanEmail,
      avatar: avatar || '',
      referralCode: sanitizeReferralCode(referralCode),
      deviceFingerprint: deviceFingerprint || '',
      completed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      isBanned: false,
      plan: 'free',
      stats: {
        totalCampaigns: 0,
        totalUnlocks: 0,
        totalViews: 0,
      },
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error('Complete social profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete profile' });
  }
});

// ============================================================
// CAMPAIGN ENDPOINTS
// ============================================================

// --- 9. Get All Public Campaigns (No auth required) ---
router.get('/campaigns', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const snapshot = await db.collection('campaigns')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const campaigns = [];
    snapshot.forEach(doc => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
});

// --- 10. Get Single Campaign (No auth required) ---
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('campaigns').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const data = doc.data();

    // Increment view count (async, don't wait)
    db.collection('campaigns').doc(id).update({
      viewCount: admin.firestore.FieldValue.increment(1),
    }).catch(() => {});

    res.json({ success: true, campaign: { id: doc.id, ...data } });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
});

// --- 11. Create Campaign (Protected) ---
router.post('/campaigns', verifyToken, async (req, res) => {
  try {
    const { title, description, platform, actionType, targetUrl, unlockLink, coverImage, reward } = req.body;
    const uid = req.user.uid;

    // Validation
    if (!title || !description || !platform || !actionType || !targetUrl || !unlockLink) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Get user to validate they exist
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const campaignData = {
      title: title.trim(),
      description: description.trim(),
      platform: platform.trim(),
      actionType: actionType.trim(),
      targetUrl: targetUrl.trim(),
      unlockLink: unlockLink.trim(),
      coverImage: coverImage || '',
      reward: reward || 'Unlock Reward',
      createdBy: uid,
      status: 'active',
      unlockCount: 0,
      viewCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('campaigns').add(campaignData);

    // Update user's total campaigns count
    await db.collection('users').doc(uid).update({
      'stats.totalCampaigns': admin.firestore.FieldValue.increment(1),
    });

    res.status(201).json({
      success: true,
      campaign: { id: docRef.id, ...campaignData },
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// --- 12. Update Campaign (Protected) ---
router.put('/campaigns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    // Get the campaign
    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const data = doc.data();
    if (data.createdBy !== uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    // Allowed fields to update
    const allowedFields = ['title', 'description', 'platform', 'actionType', 'targetUrl', 'unlockLink', 'coverImage', 'reward', 'status'];
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field].trim ? updates[field].trim() : updates[field];
      }
    });
    filteredUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('campaigns').doc(id).update(filteredUpdates);

    res.json({ success: true, message: 'Campaign updated' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

// --- 13. Delete Campaign (Protected) ---
router.delete('/campaigns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const data = doc.data();
    if (data.createdBy !== uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    await db.collection('campaigns').doc(id).delete();

    // Decrement user's campaign count
    await db.collection('users').doc(uid).update({
      'stats.totalCampaigns': admin.firestore.FieldValue.increment(-1),
    });

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// --- 14. Record Unlock (Protected) ---
router.post('/campaigns/:id/unlock', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const doc = await db.collection('campaigns').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const data = doc.data();

    // Check if user already unlocked this campaign (optional: prevent duplicate unlocks)
    // We'll implement a simple check using a sub-collection or a separate collection.
    // For now, we just increment.
    await db.collection('campaigns').doc(id).update({
      unlockCount: admin.firestore.FieldValue.increment(1),
    });

    // Update user stats
    await db.collection('users').doc(uid).update({
      'stats.totalUnlocks': admin.firestore.FieldValue.increment(1),
    });

    res.json({
      success: true,
      unlockLink: data.unlockLink,
      message: 'Campaign unlocked!',
    });
  } catch (error) {
    console.error('Unlock error:', error);
    res.status(500).json({ success: false, error: 'Failed to process unlock' });
  }
});

// ============================================================
// EXPORT
// ============================================================
module.exports = router;