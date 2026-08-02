// frontend/utils/deviceId.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'maketrend_device_id';

async function generateFingerprint() {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (e) {
    console.warn('⚠️ FingerprintJS failed – returning null (views will not be counted)', e);
    return null;
  }
}

export async function refreshDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = await generateFingerprint();
    if (id) {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } else {
      // Don't store null – next call retries
      return null;
    }
  }
  return id;
}

export function getDeviceId() {
  return localStorage.getItem(DEVICE_ID_KEY) || null;
}