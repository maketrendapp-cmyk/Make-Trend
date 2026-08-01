// pages/earncash.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import Meta from '../components/Meta';
import { useAuth } from '../components/AuthScreen';
import { useMtCoins } from '../lib/queries';
import { refreshDeviceId } from '../utils/deviceId';
import {
  FaCoins,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaSpinner,
  FaGift,
  FaPlay,
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ─── AD COMPONENTS ───

// Popunder Ad (opens in new tab)
const PopunderAd = () => {
  return (
    <div className="w-full flex justify-center my-2">
      <Script
        id="popunder-ad-earn"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var s = document.createElement('script');
              s.src = 'https://pl30634061.effectivecpmnetwork.com/8e/bb/ac/8ebbac19d902ee907cd27ffdddc2ac6b.js';
              s.async = true;
              document.head.appendChild(s);
            })();
          `,
        }}
      />
    </div>
  );
};

// Banner Ad
const BannerAd = () => {
  return (
    <div className="w-full flex justify-center my-2">
      <div className="w-full max-w-[728px] min-h-[90px] bg-gray-50/50 rounded-lg overflow-hidden flex items-center justify-center">
        <Script
          id="banner-ad-earn"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              atOptions = {
                'key' : 'bd8fef55bf7ce9cf90e7c6aa9b2a7703',
                'format' : 'iframe',
                'height' : 90,
                'width' : 728,
                'params' : {}
              };
              document.write('<scr' + 'ipt type="text/javascript" src="https://www.highperformanceformat.com/bd8fef55bf7ce9cf90e7c6aa9b2a7703/invoke.js"></scr' + 'ipt>');
            `,
          }}
        />
      </div>
    </div>
  );
};

// Native Ad
const NativeAd = () => {
  return (
    <div className="w-full flex justify-center my-2">
      <div id="container-earn-native" className="w-full max-w-[336px]" />
      <Script
        id="native-ad-earn"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var s = document.createElement('script');
              s.async = true;
              s.setAttribute('data-cfasync', 'false');
              s.src = 'https://pl30634127.effectivecpmnetwork.com/4b3b3334be9dbca33558926aca954fd9/invoke.js';
              document.getElementById('container-earn-native').appendChild(s);
            })();
          `,
        }}
      />
    </div>
  );
};

// Social Bar Ad
const SocialBarAd = () => {
  return (
    <Script
      id="social-bar-earn"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var s = document.createElement('script');
            s.src = 'https://pl30631129.effectivecpmnetwork.com/05/02/b9/0502b976b36284a7767fd6cb4ce00971.js';
            s.async = true;
            document.head.appendChild(s);
          })();
        `,
      }}
    />
  );
};

// ─── MAIN COMPONENT ───

export default function EarnCash() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { refetch: refetchMtCoins } = useMtCoins(isAuthenticated);

  // ── State ──
  const [adSlots, setAdSlots] = useState([
    { id: 1, claimed: false, inProgress: false, reward: 10 },
    { id: 2, claimed: false, inProgress: false, reward: 10 },
    { id: 3, claimed: false, inProgress: false, reward: 10 },
    { id: 4, claimed: false, inProgress: false, reward: 10 },
    { id: 5, claimed: false, inProgress: false, reward: 10 },
  ]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);

  const AD_REWARD = 10;
  const MAX_ADS = 5;
  const COOLDOWN_SECONDS = 20;

  // ── Fetch ad status from backend ──
  const fetchStatus = async () => {
    try {
      const token = await user?.getIdToken?.();
      if (!token) {
        setLoading(false);
        return;
      }

      const deviceId = await refreshDeviceId();
      const res = await fetch(`${API_BASE}/ads/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json();
      if (data.success) {
        const completedAds = data.adsWatched || 0;
        setClaimedCount(completedAds);
        setTotalEarned(completedAds * AD_REWARD);

        setAdSlots((prev) =>
          prev.map((slot, index) => ({
            ...slot,
            claimed: index < completedAds,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Start ad session ──
  const startAdSession = async () => {
    try {
      const token = await user?.getIdToken?.();
      if (!token) throw new Error('Not authenticated');

      const deviceId = await refreshDeviceId();
      const res = await fetch(`${API_BASE}/ads/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to start ad session');
      }
      return true;
    } catch (err) {
      console.error('Start ad session error:', err);
      setError(err.message || 'Failed to start ad session');
      return false;
    }
  };

  // ── Open ad in new tab ──
  const handleOpenAd = async (slotId) => {
    if (isSubmitting) return;
    const slot = adSlots.find((s) => s.id === slotId);
    if (!slot || slot.claimed) return;

    setError('');
    setSuccess('');

    // ── Start ad session on server ──
    const started = await startAdSession();
    if (!started) return;

    // ── Open popunder ad in a new tab ──
    const adWindow = window.open('about:blank', '_blank');
    if (!adWindow) {
      setError('⚠️ Popup blocked. Please allow popups and try again.');
      return;
    }

    adWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Watch Ad</title>
          <meta charset="UTF-8" />
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif; 
              background: #f5f3ff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              max-width: 800px;
              width: 100%;
              background: white;
              border-radius: 20px;
              padding: 30px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              text-align: center;
            }
            .header { font-size: 24px; font-weight: bold; color: #4F46E5; margin-bottom: 10px; }
            .sub { color: #6B7280; font-size: 14px; margin-bottom: 20px; }
            .reward-box { 
              background: #F3F4F6; 
              border-radius: 12px; 
              padding: 15px; 
              margin: 15px 0;
              font-size: 20px;
              font-weight: bold;
              color: #4F46E5;
            }
            .btn {
              background: #4F46E5;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              margin-top: 15px;
            }
            .btn:hover {
              background: #4338CA;
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
            }
            .note {
              font-size: 12px;
              color: #9CA3AF;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">📺 Watch Ad</div>
            <div class="sub">Watch this ad to earn ${AD_REWARD} MT Coins</div>
            <div class="reward-box">🎯 +${AD_REWARD} MT Coins</div>
            
            <!-- Load the popunder ad -->
            <script src="https://pl30634061.effectivecpmnetwork.com/8e/bb/ac/8ebbac19d902ee907cd27ffdddc2ac6b.js" async></script>
            
            <p style="font-size:14px;color:#6B7280;margin:15px 0;">
              ✅ Ad is loading in the background
            </p>
            
            <button class="btn" onclick="window.close()">
              ✕ Close &amp; Claim Reward
            </button>
            <div class="note">Close this tab to claim your reward on the main page</div>
          </div>
        </body>
      </html>
    `);
    adWindow.document.close();

    // ── Update UI ──
    setActiveSlot(slotId);
    setAdSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, inProgress: true } : s
      )
    );
  };

  // ── Claim reward ──
  const handleClaim = async (slotId) => {
    if (isSubmitting) return;
    const slot = adSlots.find((s) => s.id === slotId);
    if (!slot || slot.claimed || !slot.inProgress) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = await user?.getIdToken?.();
      if (!token) {
        setError('Authentication required.');
        setIsSubmitting(false);
        return;
      }

      const deviceId = await refreshDeviceId();
      const res = await fetch(`${API_BASE}/ads/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`✅ Earned ${data.reward || AD_REWARD} MT Coins!`);
        setTotalEarned((prev) => prev + (data.reward || AD_REWARD));
        setClaimedCount((prev) => prev + 1);

        setAdSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, claimed: true, inProgress: false } : s
          )
        );
        setActiveSlot(null);

        refetchMtCoins();
      } else {
        setError(data.error || 'Failed to claim reward.');
        setAdSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, inProgress: false } : s
          )
        );
        setActiveSlot(null);
      }
    } catch (err) {
      console.error('Claim error:', err);
      setError('Network error. Please try again.');
      setAdSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, inProgress: false } : s
        )
      );
      setActiveSlot(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Initial fetch ──
  useEffect(() => {
    if (user) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  // ── Redirect if not authenticated ──
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Earn Cash & MT Coins | Make Trend" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md bg-white rounded-2xl shadow-xl p-8">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to Earn</h2>
            <p className="text-gray-500 text-sm mb-6">Complete offers and earn MT Coins.</p>
            <button
              onClick={() => router.push('/login?redirect=/earncash')}
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition w-full"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  const remaining = MAX_ADS - claimedCount;
  const isDailyLimitReached = remaining <= 0;

  return (
    <>
      <Meta
        title="Earn Cash & MT Coins | Make Trend"
        description="Complete offers and earn MT Coins. Earn up to 5 times per day!"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4 pb-24">
        <div className="max-w-3xl mx-auto">

          {/* ── Header ── */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">💰 Earn Cash &amp; MT Coins</h1>
            <p className="text-gray-500 text-sm mt-1">Complete offers to earn MT Coins</p>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <FaCoins className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Total Earned</p>
              <p className="text-xl font-bold text-gray-900">{totalEarned}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <FaGift className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-xl font-bold text-gray-900">
                {claimedCount}/{MAX_ADS}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <FaClock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-xl font-bold text-gray-900">{remaining}</p>
            </div>
          </div>

          {/* ── Messages ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
              <FaTimesCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
              <FaCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* ── Daily Limit Reached ── */}
          {isDailyLimitReached && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-lg font-bold text-amber-800">Daily Limit Reached!</h3>
              <p className="text-sm text-amber-700 mt-1">
                You've completed all {MAX_ADS} offers for today.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Come back tomorrow for more rewards!
              </p>
            </div>
          )}

          {/* ── Offer List ── */}
          {!isDailyLimitReached && (
            <div className="space-y-3">
              {adSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 transition-all duration-300 ${
                    slot.claimed
                      ? 'border-green-200 bg-green-50/50 opacity-60'
                      : slot.inProgress
                      ? 'border-purple-300 bg-purple-50/50 shadow-md'
                      : 'border-gray-100 hover:border-purple-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                        <span className="text-purple-600 font-bold">
                          {slot.claimed ? '✅' : slot.id}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {slot.claimed
                              ? '✅ Completed'
                              : slot.inProgress
                              ? '⏳ In Progress'
                              : `Offer ${slot.id}`}
                          </p>
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            +{slot.reward} MT
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {slot.claimed
                            ? 'Already claimed'
                            : slot.inProgress
                            ? 'Watch the ad to claim your reward'
                            : 'Click to start this offer'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {slot.claimed ? (
                        <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                          Claimed
                        </span>
                      ) : slot.inProgress ? (
                        <button
                          onClick={() => handleClaim(slot.id)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <FaCheckCircle className="w-4 h-4" />
                              Claim Reward
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAd(slot.id)}
                          disabled={isSubmitting || slot.claimed}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                        >
                          <FaExternalLinkAlt className="w-4 h-4" />
                          Start
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Progress for active slot ── */}
                  {slot.inProgress && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="flex items-center gap-2 text-xs text-purple-600">
                        <div className="animate-pulse">●</div>
                        <span>Ad is open in a new tab. Close it to claim your reward.</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Remaining count ── */}
          {!isDailyLimitReached && !loading && (
            <div className="mt-4 text-center text-xs text-gray-400">
              <p>{remaining} offer{remaining !== 1 ? 's' : ''} remaining today</p>
            </div>
          )}

          {/* ── Info Box ── */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">How It Works</h3>
                <ul className="text-xs text-gray-500 space-y-1 mt-1">
                  <li>✅ Click <strong>"Start"</strong> on any available offer</li>
                  <li>✅ A new tab opens with the ad</li>
                  <li>✅ Close the tab and click <strong>"Claim Reward"</strong></li>
                  <li>✅ Earn <strong>{AD_REWARD} MT Coins</strong> per offer</li>
                  <li>✅ Maximum <strong>{MAX_ADS} offers</strong> per day</li>
                  <li>🛡️ Your earnings are tracked per device for security</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Hidden Ads for Extra Revenue ── */}
          <div className="hidden">
            <BannerAd />
            <NativeAd />
            <SocialBarAd />
          </div>

          {/* ── Visible Banner Ad (Extra Revenue) ── */}
          <div className="mt-6">
            <BannerAd />
          </div>

        </div>
      </div>
    </>
  );
}