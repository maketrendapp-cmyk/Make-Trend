// lib/fetchCampaign.js
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export async function fetchCampaign(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${BACKEND}/api/campaigns/${id}`);
    const data = await res.json();
    return data.success ? data.campaign : null;
  } catch {
    return null;
  }
}