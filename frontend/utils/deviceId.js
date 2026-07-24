// frontend/utils/deviceId.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'deviceId';

// ── Generate a real fingerprint asynchronously ──
async function generateFingerprint() {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (e) {
    console.warn('FingerprintJS failed, using fallback', e);
    let fallbackId = localStorage.getItem('maketrend_device_fingerprint');
    if (!fallbackId) {
      fallbackId = 'fp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('maketrend_device_fingerprint', fallbackId);
    }
    return fallbackId;
  }
}

// ── Ensure a device ID exists (sync) ──
function getOrCreateFallbackId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Upgrade the stored device ID to a real fingerprint (async, non‑blocking) ──
async function upgradeToFingerprint() {
  try {
    const fingerprint = await generateFingerprint();
    const current = localStorage.getItem(DEVICE_ID_KEY);
    if (current !== fingerprint) {
      localStorage.setItem(DEVICE_ID_KEY, fingerprint);
      console.log('🔄 Device ID upgraded to fingerprint:', fingerprint);
    }
  } catch (e) {
    // ignore – keep fallback
  }
}

// ── Exported function: returns current device ID synchronously ──
export function getDeviceId() {
  // Ensure we have at least a fallback ID
  const id = getOrCreateFallbackId();

  // Trigger upgrade to a real fingerprint once per session
  if (!window._fingerprintUpgradeAttempted) {
    window._fingerprintUpgradeAttempted = true;
    // Run upgrade asynchronously, don't block
    setTimeout(() => {
      upgradeToFingerprint();
    }, 100);
  }

  return localStorage.getItem(DEVICE_ID_KEY) || id;
}

// ── Optional: force upgrade immediately (e.g., after login) ──
export async function refreshDeviceId() {
  const fingerprint = await generateFingerprint();
  localStorage.setItem(DEVICE_ID_KEY, fingerprint);
  return fingerprint;
}