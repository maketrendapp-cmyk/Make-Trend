// frontend/utils/deviceId.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'maketrend_device_id';
let deviceIdPromise = null;

// ── Generate a real fingerprint (or fallback) ──
async function generateFingerprint() {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (e) {
    console.warn('⚠️ FingerprintJS failed, using fallback');
    return 'fallback-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }
}

// ── Get or create the device ID (cached promise) ──
export function getDeviceIdPromise() {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (id) {
        console.log('📦 Using stored device ID:', id);
        return id;
      }
      console.log('🆕 Generating new device fingerprint...');
      id = await generateFingerprint();
      localStorage.setItem(DEVICE_ID_KEY, id);
      console.log('✅ New device ID generated:', id);
      return id;
    })();
  }
  return deviceIdPromise;
}

// ── Async getter (returns the ID, waits if needed) ──
export async function refreshDeviceId() {
  return getDeviceIdPromise();
}

// ── Synchronous getter (returns stored ID or null) ──
export function getDeviceId() {
  return localStorage.getItem(DEVICE_ID_KEY) || null;
}