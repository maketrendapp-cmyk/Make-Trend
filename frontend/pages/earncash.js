// pages/earncash.js
import { useState, useEffect, useRef } from 'react';
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
  FaSpinner,
  FaGift,
  FaPlay,
  FaEye,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ─── AD COMPONENTS (for the modal) ───

// Popunder Ad (loads in background)
const PopunderAd = () => {
  return (
    <div className="w-full flex justify-center my-2">
      <Script
        id="popunder-ad-modal"
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

// Banner Ad (728×90)
const BannerAd = () => {
  return (
    <div className="w-full flex justify-center my-3">
      <div className="w-full max-w-[728px] min-h-[90px] bg-gray-50/50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
        <Script
          id="banner-ad-modal"
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

// Native Ad (336×280)
const NativeAd = () => {
  return (
    <div className="w-full flex justify-center my-3">
      <div id="container-native-modal" className="w-full max-w-[336px] min-h-[280px] bg-gray-50/50 rounded-lg border border-gray-200 flex items-center justify-center" />
      <Script
        id="native-ad-modal"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var s = document.createElement('script');
              s.async = true;
              s.setAttribute('data-cfasync', 'false');
              s.src = 'https://pl30634127.effectivecpmnetwork.com/4b3b3334be9dbca33558926aca954fd9/invoke.js';
              document.getElementById('container-native-modal').appendChild(s);
            })();
          `,
        }}
      />
    </div>
  );
};

// Social Bar Ad (sticky bottom)
const SocialBarAd = () => {
  return (
    <Script
      id="social-bar-modal"
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);

  // ── Modal State ──
  const [showModal, setShowModal] = useState(false);
  const [currentOfferId, setCurrentOfferId] = useState(null);
  const [timer, setTimer] = useState(30);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const AD_REWARD = 10;
  const MAX_ADS = 5;
  const AD_DURATION = 30;

  // ── Fetch ad status ──
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

  // ── Start offer (open modal) ──
  const handleStartOffer = async (slotId) => {
    if (isSubmitting) return;
    const slot = adSlots.find((s) => s.id === slotId);
    if (!slot || slot.claimed) return;

    setError('');
    setSuccess('');

    try {
      const token = await user?.getIdToken?.();
      if (!token) {
        setError('Authentication required.');
        return;
      }

      const deviceId = await refreshDeviceId();

      // ── Start session on server ──
      const startRes = await fetch(`${API_BASE}/ads/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });
      const startData = await startRes.json();
      if (!startData.success) {
        setError(startData.error || 'Failed to start ad session');
        return;
      }

      // ── Mark as in progress ──
      setAdSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, inProgress: true } : s
        )
      );

      // ── Open modal ──
      setCurrentOfferId(slotId);
      setTimer(AD_DURATION);
      setProgress(0);
      setCanClaim(false);
      setIsClaiming(false);
      setShowModal(true);

      // ── Start countdown ──
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          const newTimer = prev - 1;
          setProgress(((AD_DURATION - newTimer) / AD_DURATION) * 100);
          if (newTimer <= 0) {
            clearInterval(timerRef.current);
            setCanClaim(true);
            return 0;
          }
          return newTimer;
        });
      }, 1000);

    } catch (err) {
      console.error('Start offer error:', err);
      setError('Network error. Please try again.');
    }
  };

  // ── Claim from modal ──
  const handleClaimFromModal = async () => {
    if (!canClaim || isClaiming || !currentOfferId) return;

    setIsClaiming(true);
    setError('');

    try {
      const token = await user?.getIdToken?.();
      if (!token) {
        setError('Authentication required.');
        setIsClaiming(false);
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
        // ── Update main page ──
        const slotId = currentOfferId;
        setAdSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, claimed: true, inProgress: false } : s
          )
        );
        setClaimedCount((prev) => prev + 1);
        setTotalEarned((prev) => prev + AD_REWARD);
        refetchMtCoins();

        // ── Close modal ──
        closeModal();
        setSuccess(`✅ Earned ${AD_REWARD} MT Coins!`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to claim reward.');
      }
    } catch (err) {
      console.error('Claim error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  // ── Close modal ──
  const closeModal = () => {
    setShowModal(false);
    setCurrentOfferId(null);
    setTimer(AD_DURATION);
    setProgress(0);
    setCanClaim(false);
    setIsClaiming(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Initial fetch ──
  useEffect(() => {
    if (user) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  // ── Poll for status when window gets focus ──
  useEffect(() => {
    const handleFocus = () => {
      if (user && !showModal) fetchStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, showModal]);

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
                            ? 'Watching ads...'
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
                        <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full animate-pulse">
                          ⏳ Watching...
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartOffer(slot.id)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                        >
                          <FaPlay className="w-3 h-3" />
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
                        <span>Ad viewer is open. Complete the ads to claim your reward.</span>
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
                  <li>✅ Watch the ads in the popup window</li>
                  <li>✅ Wait <strong>{AD_DURATION} seconds</strong> for the timer to finish</li>
                  <li>✅ Click <strong>"Claim Reward"</strong> to earn <strong>{AD_REWARD} MT Coins</strong></li>
                  <li>✅ Maximum <strong>{MAX_ADS} offers</strong> per day</li>
                  <li>🛡️ Your earnings are tracked per device for security</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL / OVERLAY ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* ── Modal Header ── */}
              <div className="sticky top-0 bg-white z-10 rounded-t-3xl border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <FaEye className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Watch Ads to Earn</h2>
                    <p className="text-xs text-gray-500">Complete all ads to claim your reward</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>

              {/* ── Modal Content ── */}
              <div className="p-6 space-y-4">
                {/* ── Timer & Progress ── */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FaClock className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-700">Time remaining:</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{timer}s</span>
                  </div>
                  <div className="mt-2 w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {canClaim ? '✅ Ready to claim!' : '⏳ Please wait for the timer to finish...'}
                  </p>
                </div>

                {/* ── BANNER AD ── */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-400 mb-2">📢 Banner Ad</p>
                  <BannerAd />
                </div>

                {/* ── NATIVE AD ── */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-400 mb-2">📱 Native Ad</p>
                  <NativeAd />
                </div>

                {/* ── POPUNDER AD (hidden, loads in background) ── */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-400 mb-2">🔄 Popunder Ad (loading...)</p>
                  <PopunderAd />
                  <p className="text-xs text-gray-400 mt-1">✅ Ad loaded in background</p>
                </div>

                {/* ── SOCIAL BAR AD ── */}
                <SocialBarAd />

                {/* ── Claim Button ── */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleClaimFromModal}
                    disabled={!canClaim || isClaiming}
                    className={`w-full py-4 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                      canClaim && !isClaiming
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:scale-[1.01] active:scale-[0.98]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isClaiming ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Claiming...
                      </>
                    ) : canClaim ? (
                      <>
                        <FaCoins className="w-5 h-5" />
                        Claim Reward (+{AD_REWARD} MT)
                      </>
                    ) : (
                      <>
                        <FaClock className="w-5 h-5" />
                        {timer}s remaining...
                      </>
                    )}
                  </button>
                  {!canClaim && (
                    <p className="text-xs text-center text-gray-400 mt-2">
                      ⏳ Please wait {timer} seconds for the timer to finish
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}