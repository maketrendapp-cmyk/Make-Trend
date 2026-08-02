// lib/fetchCampaign.js
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

// ── Simple in‑memory cache (shared across all requests) ──
const campaignCache = new Map();
const CACHE_TTL = 60 * 1000; // 30 seconds (adjust as needed)

/**
 * Fetch a campaign by ID with caching.
 * - Returns cached data if still fresh.
 * - Otherwise fetches from API and stores result.
 */
export async function fetchCampaign(id) {
  if (!id) return null;

  // ── 1. Check cache ──
  const cached = campaignCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // ── 2. Fetch fresh data ──
  try {
    const res = await fetch(`${BACKEND_URL}/api/campaigns/${id}`);
    const data = await res.json();
    const result = data.success ? data.campaign : null;

    // ── 3. Store in cache (only if valid) ──
    if (result) {
      campaignCache.set(id, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return null;
  }
}

/**
 * Manually invalidate a campaign from the cache.
 * Use this after updating a campaign (e.g., after share/unlock).
 */
export function invalidateCampaignCache(id) {
  if (id) {
    campaignCache.delete(id);
  } else {
    campaignCache.clear();
  }
}

/**
 * Get cache stats (useful for debugging).
 */
export function getCacheStats() {
  return {
    size: campaignCache.size,
    keys: Array.from(campaignCache.keys()),
    ttl: CACHE_TTL,
  };
}