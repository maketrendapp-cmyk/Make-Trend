// frontend/utils/deviceId.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'maketrend_device_id';

// ── Generate a fingerprint or fallback ──
async function generateFingerprint() {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (e) {
    console.warn('FingerprintJS failed, using fallback', e);
    return 'fallback-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }
}

// ── Async: returns the persistent device ID (generates if missing) ──
export async function refreshDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = await generateFingerprint();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Synchronous getter (only returns stored ID, never creates) ──
export function getDeviceId() {
  return localStorage.getItem(DEVICE_ID_KEY) || null;
}