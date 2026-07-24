// lib/fetchCampaign.js
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

export async function fetchCampaign(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/campaigns/${id}`);
    const data = await res.json();
    return data.success ? data.campaign : null;
  } catch {
    return null;
  }
}