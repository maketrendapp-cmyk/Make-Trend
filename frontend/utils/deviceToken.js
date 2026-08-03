// frontend/utils/deviceToken.js
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

let registrationPromise = null;

/**
 * Ensures a device token cookie is set.
 * @param {string} deviceId - The FingerprintJS fingerprint (required).
 * - Calls /api/device/register with the deviceId in the body.
 * - Runs once per session (using a localStorage flag).
 * - Returns a promise that resolves when registration is complete.
 */
export function ensureDeviceToken(deviceId) {
  // Prevent multiple concurrent calls
  if (registrationPromise) return registrationPromise;

  // Skip if already attempted in this session
  if (localStorage.getItem('device_token_attempted') === 'true') {
    return Promise.resolve();
  }

  // Validate deviceId
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 5) {
    console.warn('⚠️ ensureDeviceToken: Invalid deviceId provided.');
    return Promise.reject(new Error('Invalid device ID'));
  }

  registrationPromise = (async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/device/register`, {
        method: 'POST',
        credentials: 'include', // sends and receives cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 Device token registered for device:', data.deviceId);
        localStorage.setItem('device_token_attempted', 'true');
      } else {
        console.warn('⚠️ Device token registration failed:', response.status);
        // Do not set localStorage flag, so we retry on next visit
      }
    } catch (err) {
      console.warn('⚠️ Device token registration error:', err);
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}