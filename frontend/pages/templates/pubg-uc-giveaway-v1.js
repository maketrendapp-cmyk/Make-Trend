// pages/templates/pubg-uc-giveaway-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta (fallback) ──
const defaultMeta = {
  title: 'Free PUBG UC Giveaway',
  description: 'Claim free UC for PUBG Mobile by completing tasks. Limited time offer!',
  image: 'https://maketrend.vercel.app/og-pubg-uc.jpg', // replace with your image
  url: 'https://maketrend.vercel.app/pubg-uc-giveaway-v1?id={id}',
};

function PubgUcGiveawayV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [uid, setUid] = useState('');
  const [server, setServer] = useState('asia');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Validate UID (8-12 digits, only numbers) ──
  const isValidUid = (val) => /^\d{8,12}$/.test(val);

  // ── Step 1: Submit UID ──
  const handleUidSubmit = () => {
    if (!isValidUid(uid)) {
      setError('Please enter a valid 8-12 digit UID.');
      return;
    }
    setError('');
    setStep(2);
  };

  // ── Final: Redirect to tasks ──
  const handleContinue = () => {
    if (!id) {
      router.push('/create');
      return;
    }
    setLoading(true);
    // Optionally, you could POST the UID/server to your backend here
    // e.g., await apiClient.post(`/campaigns/${id}/register`, { uid, server });
    router.push(`/tasks?id=${id}`);
  };

  // ── WebView Modal ──
  if (showWebViewModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-5xl mb-4">🌐</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Open in Browser</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            This page works best in a full browser. Please open it in your default browser.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                setShowWebViewModal(false);
              }}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2.5 px-4 rounded-xl transition"
            >
              📋 Copy Link
            </button>
            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.userAgent.includes('Android')) {
                  window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`;
                } else {
                  window.open(url, '_system');
                }
              }}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-indigo-500/30"
            >
              🚀 Open in Browser
            </button>
            <button
              onClick={() => setShowWebViewModal(false)}
              className="text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎮</div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            PUBG UC Giveaway
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Enter your details to claim free UC
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
            step >= 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}>1</div>
          <div className={`w-12 h-0.5 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
            step >= 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}>2</div>
        </div>

        {/* Step 1: UID & Server */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                PUBG UID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="12"
                placeholder="e.g., 123456789"
                value={uid}
                onChange={(e) => {
                  setUid(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Server
              </label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              >
                <option value="asia">Asia</option>
                <option value="europe">Europe</option>
                <option value="north-america">North America</option>
                <option value="south-america">South America</option>
                <option value="middle-east">Middle East</option>
              </select>
            </div>

            <button
              onClick={handleUidSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              Continue <span className="text-lg">→</span>
            </button>

            <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span className="flex items-center gap-1"><span className="text-green-500">✓</span> Free</span>
              <span className="flex items-center gap-1"><span className="text-blue-500">✓</span> Secure</span>
              <span className="flex items-center gap-1"><span className="text-yellow-500">✓</span> Limited</span>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation & Redirect */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="text-3xl mb-2">✅</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ready to Claim!</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                UID: <strong>{uid}</strong> &nbsp;|&nbsp; Server: <strong>{server.toUpperCase()}</strong>
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                You will be redirected to complete a few tasks to unlock your UC.
              </p>
            </div>

            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  🎁 Claim UC Now
                </>
              )}
            </button>

            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              ← Go back and edit
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2026 PUBG UC Giveaway • Limited time offer • One claim per player
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Server‑side data fetching ──
export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

// ── Wrap with Meta HOC ──
export default withCampaignMeta(PubgUcGiveawayV1, defaultMeta);