
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
  FaHandPointer,
  FaArrowDown,
  FaFire
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ─── CONFIGURATION ───
const AD_REWARD = 10;
const MAX_ADS = 5;
const BASE_DURATION = 10;
const AD_DURATION = BASE_DURATION + 10;

// ─── AD COMPONENTS (Optimized for React/Next.js) ───

const IframeAd = ({ adKey, width, height }) => {
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>body{margin:0;padding:0;overflow:hidden;display:flex;justify-content:center;align-items:center;background:transparent;}</style>
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
    <div className="w-full flex justify-center overflow-hidden my-3">
      <div className="overflow-x-auto no-scrollbar max-w-full rounded-2xl shadow-sm border border-gray-200/60 bg-white p-1">
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
    <div className="flex justify-center w-full my-4">
      <div 
        ref={containerRef} 
        id={`container-native-${uniqueId}`} 
        className="w-full flex justify-center max-w-[336px] transition-all min-h-[50px] rounded-2xl overflow-hidden shadow-sm border border-gray-200/60 bg-white p-2"
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

  // ── Modal & Engagement State ──
  const [showModal, setShowModal] = useState(false);
  const [currentOfferId, setCurrentOfferId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isModalReady, setIsModalReady] = useState(false);
  const [adKey, setAdKey] = useState(0);
  
  const hasScrolledRef = useRef(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const [showStickyAd, setShowStickyAd] = useState(true);
  
  const timerRef = useRef(null);
  const scrollContainerRef = useRef(null); // Ref for modal scrolling bug fix

  // Fix for auto-scroll bug: Force scroll to top when modal opens
  useEffect(() => {
    if (showModal && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      window.scrollTo(0, 0); // Failsafe for main page body
    }
  }, [showModal]);

  // Wait for auth to be ready before getting token
  const getToken = async () => {
    await auth.authStateReady(); 
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    return await firebaseUser.getIdToken();
  };

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
        setClaimedCount(prev => Math.max(prev, completedAds));
        setTotalEarned(prev => Math.max(prev, completedAds * AD_REWARD));
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

  const handleStartOffer = async (slotId) => {
    if (isSubmitting) return;
    const slot = adSlots.find((s) => s.id === slotId);
    if (!slot || slot.claimed) return;

    setError('');
    setSuccess('');
    setIsModalReady(false);
    setIsSubmitting(true);
    hasScrolledRef.current = false;
    setUserInteracted(false);

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
      setAdKey(prev => prev + 1);
      
      setShowModal(true);
      document.body.style.overflow = 'hidden';
      
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

  const handleModalScroll = (e) => {
    if (!hasScrolledRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollTop > 50 || (scrollTop + clientHeight >= scrollHeight - 30)) {
        hasScrolledRef.current = true;
        setUserInteracted(true);
      }
    }
  };

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

        fetchStatus();
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

  // Wait for auth to be ready before initial fetch
  useEffect(() => {
    const loadStatus = async () => {
      await auth.authStateReady();
      if (user) {
        fetchStatus();
      } else {
        setLoading(false);
      }
    };
    loadStatus();
  }, [user]);

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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-gray-50 to-white flex items-center justify-center px-4">
          <div className="text-center max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to Earn</h2>
            <p className="text-gray-500 text-sm mb-6">Complete high-yield offers and earn MT Coins.</p>
            <button
              onClick={() => router.push('/login?redirect=/earncash')}
              className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all w-full shadow-md hover:shadow-lg active:scale-[0.98]"
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
      
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-gray-50 to-white py-8 px-4 pb-32">
        <div className="max-w-3xl mx-auto">

          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">💰 Earn Cash &amp; MT Coins</h1>
            <p className="text-gray-500 text-sm sm:text-base mt-2">Complete daily sponsored offers to stack your coins</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-200/60 p-4 sm:p-5 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                <FaCoins className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide">Total Earned</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{totalEarned}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-200/60 p-4 sm:p-5 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <FaGift className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide">Completed</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                {claimedCount}<span className="text-gray-400 text-lg">/{MAX_ADS}</span>
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-200/60 p-4 sm:p-5 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-2">
                <FaClock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide">Remaining</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{remaining}</p>
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-5 text-sm flex items-start gap-3 shadow-sm">
                  <FaTimesCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{error}</span>
                </div>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-2xl mb-5 text-sm flex items-start gap-3 shadow-sm">
                  <FaCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{success}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isDailyLimitReached && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-8 mb-6 text-center shadow-sm">
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center text-4xl shadow-sm mb-4">🎉</div>
              <h3 className="text-2xl font-black text-amber-900">Daily Limit Reached!</h3>
              <p className="text-base text-amber-700 mt-2 font-medium">
                You've completed all {MAX_ADS} offers for today.
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Come back tomorrow to earn even more rewards.
              </p>
            </motion.div>
          )}

          {/* TOP BANNER AD PLACEMENT */}
          <div className="my-6">
            <IframeAd adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
          </div>

          {/* Offers List */}
          {!isDailyLimitReached && (
            <div className="space-y-4">
              {adSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`bg-white rounded-3xl shadow-sm border p-5 sm:p-6 transition-all duration-300 ${
                    slot.claimed
                      ? 'border-green-200 bg-green-50/30 opacity-70 grayscale-[30%]'
                      : slot.inProgress
                      ? 'border-purple-300 bg-purple-50/50 shadow-md ring-4 ring-purple-50'
                      : 'border-gray-200/60 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border ${slot.claimed ? 'bg-green-100 border-green-200 text-green-600' : 'bg-gradient-to-br from-purple-100 to-indigo-100 border-purple-200 text-purple-700'}`}>
                        <span className="font-extrabold text-xl">
                          {slot.claimed ? '✓' : slot.id}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                            {slot.claimed ? 'Offer Completed' : `High-Yield Offer ${slot.id}`}
                          </h3>
                          {!slot.claimed && (
                            <span className="text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 rounded-full flex-shrink-0 shadow-sm">
                              +{slot.reward} MT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate font-medium">
                          {slot.claimed ? 'Reward added to your balance' : 'Complete this quick sponsor feed to unlock'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-full sm:w-auto">
                      {slot.claimed ? (
                        <div className="w-full sm:w-auto text-center text-sm font-bold text-green-700 bg-green-100 px-5 py-3 rounded-xl border border-green-200">
                          Claimed
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartOffer(slot.id)}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {isSubmitting && currentOfferId === slot.id ? (
                            <FaSpinner className="w-4 h-4 animate-spin" />
                          ) : (
                            <FaPlay className="w-4 h-4" />
                          )}
                          Start Offer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── STICKY BOTTOM BANNER AD ─── */}
      {showStickyAd && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-2 sm:pb-4">
          <div className="bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-1.5 sm:p-2 rounded-2xl pointer-events-auto border border-gray-200/50 relative mx-auto w-[calc(100vw-16px)] sm:w-auto sm:max-w-[760px]">
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
      <Script id="global-popunder" src="https://pl30634061.effectivecpmnetwork.com/8e/bb/ac/8ebbac19d902ee907cd27ffdddc2ac6b.js" strategy="afterInteractive" />
      <Script id="global-social" src="https://pl30631129.effectivecpmnetwork.com/05/02/b9/0502b976b36284a7767fd6cb4ce00971.js" strategy="afterInteractive" />

      {/* ─── MODAL WITH HIGH-CONVERTING AD FEED & STRATEGIC OVERLAY ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 sm:py-8 bg-gray-900/80 backdrop-blur-sm overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="bg-gray-50 rounded-[2rem] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden border border-white/20"
            >

              {/* Modal Header */}
              <div className="bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center">
                    <FaFire className="text-purple-600 w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight">Sponsored Feed ({currentOfferId})</h2>
                    <p className="text-[11px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Explore to unlock</p>
                  </div>
                </div>
                {canClaim && (
                  <button
                    onClick={closeModal}
                    className="p-2.5 bg-gray-50 hover:bg-red-50 rounded-full transition-colors text-gray-400 hover:text-red-500 border border-transparent hover:border-red-100"
                  >
                    <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>

              {/* Scrollable Body with Ref for fixing Auto-Scroll Bug */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleModalScroll}
                className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 relative bg-[#f8fafc]"
              >
                
                {/* Timer & Engagement Bar */}
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaClock className={`w-4 h-4 ${canClaim ? 'text-green-500' : 'text-purple-600'}`} />
                      <span className="text-sm font-bold text-gray-800 tracking-tight">
                        {canClaim ? 'Verification Complete' : 'Time Required'}
                      </span>
                    </div>
                    <span className={`text-xl font-black ${canClaim ? 'text-green-600' : 'text-purple-600'}`}>
                      {timer}s
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100/80 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${canClaim ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {!isModalReady ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FaSpinner className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                    <p className="text-sm font-semibold text-gray-500">Loading sponsor feed...</p>
                  </div>
                ) : (
                  <>
                    {/* INSTRUCTIONS BOX (Premium UI) */}
                    <div className="bg-blue-50/80 border border-blue-200/60 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-blue-900 flex items-center gap-2 text-sm mb-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <FaInfoCircle className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        Action Required to Unlock
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-2.5 font-medium ml-1">
                        <li className="flex items-start gap-2.5">
                          <FaArrowDown className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          <span><strong>Scroll down</strong> to browse through all sponsored offers below.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <FaHandPointer className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0 animate-pulse" />
                          <span><strong>Click or tap</strong> on any ad banner to confirm engagement.</span>
                        </li>
                      </ul>
                    </div>

                    {/* AD FEED PLACEMENTS */}
                    <div className="space-y-4 pb-6">
                      <div className="flex items-center justify-center gap-2 px-1 mb-2">
                        <span className="h-[1px] w-12 bg-gray-200 rounded-full" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sponsored Content</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <span className="h-[1px] w-12 bg-gray-200 rounded-full" />
                      </div>

                      <IframeAd key={`ad-1-${adKey}`} adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
                      <NativeAd key={`ad-2-${adKey}`} uniqueId={`${adKey}-feed-1`} />
                      
                      <IframeAd key={`ad-3-${adKey}`} adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
                      <NativeAd key={`ad-4-${adKey}`} uniqueId={`${adKey}-feed-2`} />

                      <IframeAd key={`ad-5-${adKey}`} adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
                      <NativeAd key={`ad-6-${adKey}`} uniqueId={`${adKey}-feed-3`} />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer with High-Conversion Strategic Layer */}
              <div className="bg-white px-5 py-5 border-t border-gray-100 flex-shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative pb-[env(safe-area-inset-bottom,1.25rem)]">
                
                {/* STRATEGIC OVERLAY AREA */}
                <div className="mb-4">
                  <IframeAd key={`footer-banner-${adKey}`} adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
                </div>

                <button
                  onClick={handleClaimFromModal}
                  disabled={!canClaim || isClaiming}
                  className={`w-full py-4 text-base sm:text-lg font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-sm ${
                    canClaim && !isClaiming
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:-translate-y-1 active:scale-95 border border-green-400/50'
                      : 'bg-gray-100/80 text-gray-400 cursor-not-allowed border border-gray-200/50'
                  }`}
                >
                  {isClaiming ? (
                    <>
                      <FaSpinner className="w-5 h-5 animate-spin" />
                      Claiming Reward...
                    </>
                  ) : canClaim ? (
                    <>
                      <FaCoins className="w-6 h-6" />
                      Claim Reward (+{AD_REWARD} MT)
                    </>
                  ) : (
                    <>
                      <FaClock className="w-5 h-5 opacity-50" />
                      Please wait {timer}s & interact
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
