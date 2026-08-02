
// pages/earncash.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import Meta from '../components/Meta';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase'; 
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
  FaTimes,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ─── CONFIGURATION ───
const AD_REWARD = 10;
const MAX_ADS = 5;
const BASE_DURATION = 10;
// We will show 3 visual ads in the modal to prevent network blocking (2 banners, 1 native)
const ADS_IN_MODAL = 3; 
const AD_DURATION = BASE_DURATION + (ADS_IN_MODAL * 4);

// ─── AD COMPONENTS (Optimized for React/Next.js) ───

// Safely loads document.write() ads without breaking React using an isolated iframe
const IframeAd = ({ adKey, width, height }) => {
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>body{margin:0;padding:0;overflow:hidden;display:flex;justify-content:center;align-items:center;}</style>
      </head>
      <body>
        <script type="text/javascript">
          atOptions = {
            'key' : '${adKey}',
            'format' : 'iframe',
            'height' : ${height},
            'width' : ${width},
            'params' : {}
          };
        </script>
        <script type="text/javascript" src="https://www.highperformanceformat.com/${adKey}/invoke.js"></script>
      </body>
    </html>
  `;
  return (
    <div className="w-full flex justify-center overflow-hidden my-2">
      <div className="overflow-x-auto no-scrollbar max-w-full">
        <iframe
          title="Banner Ad"
          srcDoc={srcDoc}
          width={width}
          height={height}
          frameBorder="0"
          scrolling="no"
          style={{ display: 'block', margin: '0 auto' }}
        />
      </div>
    </div>
  );
};

// Safely loads Native DOM injection ads
const NativeAd = ({ uniqueId }) => {
  const containerRef = useRef(null);
  const scriptInjected = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptInjected.current) return;
    
    scriptInjected.current = true;
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl30634127.effectivecpmnetwork.com/4b3b3334be9dbca33558926aca954fd9/invoke.js';
    containerRef.current.appendChild(script);
  }, [uniqueId]);

  return (
    <div className="flex justify-center w-full my-3">
      <div 
        ref={containerRef} 
        id={`container-native-${uniqueId}`} 
        className="w-full flex justify-center max-w-[336px] transition-all min-h-[50px]"
      />
    </div>
  );
};

// ─── MAIN COMPONENT ───

export default function EarnCash() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { refetch: refetchMtCoins } = useMtCoins(isAuthenticated);

  // ── State ──
  const [adSlots, setAdSlots] = useState(
    Array.from({ length: MAX_ADS }, (_, i) => ({
      id: i + 1,
      claimed: false,
      inProgress: false,
      reward: AD_REWARD,
    }))
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);

  // ── Modal State ──
  const [showModal, setShowModal] = useState(false);
  const [currentOfferId, setCurrentOfferId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isModalReady, setIsModalReady] = useState(false);
  const [adKey, setAdKey] = useState(0);
  
  // Ad state
  const [showStickyAd, setShowStickyAd] = useState(true);
  
  const timerRef = useRef(null);

  // ── Helper to get token ──
  const getToken = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    return await firebaseUser.getIdToken();
  };

  // ── Fetch ad status ──
  const fetchStatus = async () => {
    try {
      const token = await getToken();
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

  // ── Start offer ──
  const handleStartOffer = async (slotId) => {
    if (isSubmitting) return;
    const slot = adSlots.find((s) => s.id === slotId);
    if (!slot || slot.claimed) return;

    setError('');
    setSuccess('');
    setIsModalReady(false);
    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const deviceId = await refreshDeviceId();

      const startRes = await fetch(`${API_BASE}/ads/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });
      
      const startData = await startRes.json().catch(() => ({}));

      if (!startRes.ok || !startData.success) {
        setError(startData.error || 'Failed to start ad session. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setAdSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, inProgress: true } : s
        )
      );

      setCurrentOfferId(slotId);
      setTimer(AD_DURATION);
      setProgress(0);
      setCanClaim(false);
      setIsClaiming(false);
      setAdKey(prev => prev + 1); // Force remount of ad scripts inside modal
      
      setShowModal(true);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      
      // Delay slightly to let modal animate in before rendering heavy iframes
      setTimeout(() => {
        setIsModalReady(true);
        setIsSubmitting(false);
        
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
      }, 300);

    } catch (err) {
      console.error('Start offer error:', err);
      setError(err.message || 'Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── Claim from modal ──
  const handleClaimFromModal = async () => {
    if (!canClaim || isClaiming || !currentOfferId) return;

    setIsClaiming(true);
    setError('');

    try {
      const token = await getToken();
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
        const slotId = currentOfferId;
        setAdSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, claimed: true, inProgress: false } : s
          )
        );
        setClaimedCount((prev) => prev + 1);
        setTotalEarned((prev) => prev + AD_REWARD);
        refetchMtCoins();

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

  const closeModal = () => {
    setShowModal(false);
    document.body.style.overflow = 'auto';
    setCurrentOfferId(null);
    setTimer(AD_DURATION);
    setProgress(0);
    setCanClaim(false);
    setIsClaiming(false);
    setIsModalReady(false);
    
    // Reset in-progress states if closed prematurely
    setAdSlots((prev) =>
      prev.map((s) =>
        s.inProgress && !s.claimed ? { ...s, inProgress: false } : s
      )
    );
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      if (user && !showModal) fetchStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, showModal]);

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
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition w-full shadow-md hover:shadow-lg"
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
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4 pb-32">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">💰 Earn Cash &amp; MT Coins</h1>
            <p className="text-gray-500 text-sm mt-1">Complete offers to earn MT Coins</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
              <FaCoins className="w-6 h-6 text-yellow-500 mx-auto mb-1.5" />
              <p className="text-xs text-gray-500 font-medium">Total Earned</p>
              <p className="text-xl font-extrabold text-gray-900">{totalEarned}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
              <FaGift className="w-6 h-6 text-purple-500 mx-auto mb-1.5" />
              <p className="text-xs text-gray-500 font-medium">Completed</p>
              <p className="text-xl font-extrabold text-gray-900">
                {claimedCount}/{MAX_ADS}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
              <FaClock className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
              <p className="text-xs text-gray-500 font-medium">Remaining</p>
              <p className="text-xl font-extrabold text-gray-900">{remaining}</p>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2 shadow-sm">
              <FaTimesCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2 shadow-sm">
              <FaCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{success}</span>
            </motion.div>
          )}

          {isDailyLimitReached && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 mb-4 text-center shadow-sm">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-xl font-extrabold text-amber-900">Daily Limit Reached!</h3>
              <p className="text-sm text-amber-700 mt-2 font-medium">
                You've completed all {MAX_ADS} offers for today.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Come back tomorrow for more rewards!
              </p>
            </motion.div>
          )}

          {!isDailyLimitReached && (
            <div className="space-y-3.5">
              {adSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 transition-all duration-300 ${
                    slot.claimed
                      ? 'border-green-200 bg-green-50/40 opacity-70'
                      : slot.inProgress
                      ? 'border-purple-300 bg-purple-50/50 shadow-md ring-2 ring-purple-100'
                      : 'border-gray-100 hover:border-purple-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm border ${slot.claimed ? 'bg-green-100 border-green-200 text-green-600' : 'bg-gradient-to-br from-purple-100 to-indigo-100 border-purple-200 text-purple-700'}`}>
                        <span className="font-bold text-lg">
                          {slot.claimed ? '✓' : slot.id}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                            {slot.claimed
                              ? 'Offer Completed'
                              : slot.inProgress
                              ? '⏳ Offer In Progress'
                              : `Reward Offer ${slot.id}`}
                          </p>
                          <span className="text-[10px] sm:text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
                            +{slot.reward} MT
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {slot.claimed
                            ? 'Reward claimed successfully'
                            : slot.inProgress
                            ? `Watching ${ADS_IN_MODAL} ads...`
                            : 'Click Start to begin earning'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {slot.claimed ? (
                        <span className="text-xs sm:text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-xl border border-green-200">
                          Claimed
                        </span>
                      ) : slot.inProgress ? (
                        <span className="text-xs sm:text-sm font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 animate-pulse">
                          Watching...
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartOffer(slot.id)}
                          disabled={isSubmitting}
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSubmitting && currentOfferId === slot.id ? (
                            <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FaPlay className="w-3.5 h-3.5" />
                          )}
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isDailyLimitReached && !loading && (
            <div className="mt-5 text-center text-xs font-medium text-gray-400">
              <p>{remaining} offer{remaining !== 1 ? 's' : ''} remaining for today</p>
            </div>
          )}

          {/* ── How It Works ── */}
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FaInfoCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">How It Works</h3>
                <ul className="text-sm text-gray-600 space-y-2 mt-3">
                  <li className="flex items-center gap-2"><FaPlay className="w-3 h-3 text-purple-400" /> Click <strong>"Start"</strong> on any available offer</li>
                  <li className="flex items-center gap-2"><FaEye className="w-3 h-3 text-purple-400" /> View <strong>{ADS_IN_MODAL} ads</strong> in the popup window</li>
                  <li className="flex items-center gap-2"><FaClock className="w-3 h-3 text-purple-400" /> Wait <strong>{AD_DURATION} seconds</strong> for the timer</li>
                  <li className="flex items-center gap-2"><FaCoins className="w-3 h-3 text-purple-400" /> Click <strong>"Claim Reward"</strong> to earn MT Coins</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STICKY BOTTOM BANNER AD ─── */}
      {showStickyAd && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-2 sm:pb-4">
          <div className="bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-1.5 sm:p-2 rounded-xl pointer-events-auto border border-gray-200/50 relative mx-auto w-[calc(100vw-16px)] sm:w-auto sm:max-w-[760px]">
            <button 
              onClick={() => setShowStickyAd(false)}
              className="absolute -top-3 -right-2 bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full w-7 h-7 flex items-center justify-center transition shadow-md z-10"
              aria-label="Close Ad"
            >
              <FaTimes className="w-3 h-3" />
            </button>
            <IframeAd adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
          </div>
        </div>
      )}

      {/* ─── GLOBAL NETWORK ADS (POPUNDER & SOCIAL BAR) ─── */}
      <Script id="popunder-ad" src="https://pl30634061.effectivecpmnetwork.com/8e/bb/ac/8ebbac19d902ee907cd27ffdddc2ac6b.js" strategy="afterInteractive" />
      <Script id="social-bar-ad" src="https://pl30631129.effectivecpmnetwork.com/05/02/b9/0502b976b36284a7767fd6cb4ce00971.js" strategy="afterInteractive" />

      {/* ─── MODAL ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 bg-black/70 backdrop-blur-sm overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-gray-50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <FaEye className="text-purple-600 w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">Reward Offer {currentOfferId}</h2>
                    <p className="text-xs text-gray-500 font-medium">Please view the ads below</p>
                  </div>
                </div>
                {canClaim && (
                  <button
                    onClick={closeModal}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition text-gray-500 hover:text-gray-800"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                
                {/* Timer Banner (Sticky inside scroll for visibility) */}
                <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-purple-100 shadow-sm mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FaClock className={`w-4 h-4 ${canClaim ? 'text-green-500' : 'text-purple-600'}`} />
                      <span className="text-sm font-bold text-gray-700">
                        {canClaim ? 'Verification Complete' : 'Time Required'}
                      </span>
                    </div>
                    <span className={`text-xl font-extrabold ${canClaim ? 'text-green-600' : 'text-purple-600'}`}>
                      {timer}s
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${canClaim ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {!isModalReady ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FaSpinner className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-gray-500">Loading sponsor ads...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sponsor Ads</p>
                      </div>
                      
                      {/* 2 Banner Ads (Safe Iframes) */}
                      <IframeAd key={`modal-banner-1-${adKey}`} adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
                      <IframeAd key={`modal-banner-2-${adKey}`} adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
                      
                      {/* 1 Native Ad */}
                      <NativeAd key={`modal-native-${adKey}`} uniqueId={adKey} />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer (Claim Button) */}
              <div className="bg-white px-5 py-4 border-t border-gray-100 flex-shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button
                  onClick={handleClaimFromModal}
                  disabled={!canClaim || isClaiming}
                  className={`w-full py-4 text-base font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
                    canClaim && !isClaiming
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isClaiming ? (
                    <>
                      <FaSpinner className="w-5 h-5 animate-spin" />
                      Claiming Reward...
                    </>
                  ) : canClaim ? (
                    <>
                      <FaCoins className="w-5 h-5" />
                      Claim Reward (+{AD_REWARD} MT)
                    </>
                  ) : (
                    <>
                      <FaClock className="w-5 h-5 opacity-50" />
                      Please wait {timer}s
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}