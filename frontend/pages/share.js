
// pages/share.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Script from 'next/script';
import { withCampaignMeta } from '../lib/withCampaignMeta';
import { fetchCampaign } from '../lib/fetchCampaign';
import { getDeviceId, refreshDeviceId } from '../utils/deviceId';
import {
  FaShareAlt,
  FaCopy,
  FaCheckCircle,
  FaRocket,
  FaGift,
  FaArrowRight,
  FaFacebookMessenger,
  FaWhatsapp,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Default Meta ──
const defaultMeta = {
  title: 'Share to Unlock – Campaign Rewards',
  description: 'Share this campaign with your friends to unlock rewards. Complete tasks and claim your prize!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/share?id={id}',
};

// ─── AD COMPONENTS ───

// Safely loads document.write() ads without breaking React
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
    <div className="w-full flex justify-center overflow-hidden">
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
const NativeAd = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (containerRef.current.querySelector('script')) return;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl30634127.effectivecpmnetwork.com/4b3b3334be9dbca33558926aca954fd9/invoke.js';
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="flex justify-center w-full my-4">
      <div 
        ref={containerRef} 
        id="container-4b3b3334be9dbca33558926aca954fd9" 
        className="w-full flex justify-center max-w-[336px] transition-all"
      />
    </div>
  );
};

// ─── MAIN COMPONENT ───

function CampaignShare({ campaign: initialCampaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(initialCampaign);
  const [templateSlug, setTemplateSlug] = useState('campaign');
  const [loading, setLoading] = useState(!initialCampaign);
  const [error, setError] = useState('');
  
  const [shares, setShares] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharesComplete, setSharesComplete] = useState(false);
  const [isClaimReady, setIsClaimReady] = useState(false); // Controls the 2s API gap
  
  const [shareProgress, setShareProgress] = useState(0);
  const [shareAttempt, setShareAttempt] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimCountdown, setClaimCountdown] = useState(2);
  const [verifying, setVerifying] = useState(false);
  const [verifyingType, setVerifyingType] = useState('');
  const [verifyingCountdown, setVerifyingCountdown] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  
  // Ad state
  const [showStickyAd, setShowStickyAd] = useState(true);

  const claimTimerRef = useRef(null);
  const isFinishingRef = useRef(false);
  const shareApiCalledRef = useRef(false);

  // ── Fetch campaign if not provided ──
  useEffect(() => {
    if (!initialCampaign && id) {
      fetchCampaignData();
    } else if (initialCampaign) {
      initializeCampaign(initialCampaign);
      setLoading(false);
    }
  }, [id, initialCampaign]);

  // ── Force refresh fingerprint on page load ──
  useEffect(() => {
    const refreshFingerprint = async () => {
      try {
        await refreshDeviceId();
      } catch (e) {
        console.warn('Fingerprint refresh failed');
      }
    };
    refreshFingerprint();
  }, []);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const camp = await fetchCampaign(id);
      if (!camp) {
        setError('Campaign not found');
        setLoading(false);
        return;
      }
      setCampaign(camp);
      initializeCampaign(camp);
    } catch (err) {
      console.error('Error fetching:', err);
      setError('Could not load campaign. Please try again.');
      setLoading(false);
    }
  };

  const initializeCampaign = (camp) => {
    const count = camp.shareCount || 0;
    setShareCount(count);
    const currentShares = camp.shares || 0;
    setShares(currentShares);
    setShareProgress(Math.min((currentShares / (count || 1)) * 100, 100));

    if (count === 0) {
      setSharesComplete(true);
      setIsClaimReady(true);
      setShareAttempt(3);
      setTimeout(() => setShowClaimModal(true), 800);
    } else if (currentShares >= count) {
      setSharesComplete(true);
      setIsClaimReady(true);
      setShareAttempt(3);
    } else {
      const ratio = currentShares / count;
      if (ratio === 0) setShareAttempt(0);
      else if (ratio < 0.25) setShareAttempt(1);
      else if (ratio < 0.75) setShareAttempt(2);
      else setShareAttempt(3);
    }

    let slug = 'campaign';
    if (camp.templateSlug) slug = camp.templateSlug;
    else if (camp.title) {
      slug = camp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    setTemplateSlug(slug);
    setLoading(false);
  };

  // ── Claim modal countdown ──
  useEffect(() => {
    if (showClaimModal && claimCountdown > 0) {
      claimTimerRef.current = setInterval(() => {
        setClaimCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(claimTimerRef.current);
            handleRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(claimTimerRef.current);
  }, [showClaimModal, claimCountdown]);

  // ── Verification timer ──
  useEffect(() => {
    if (!verifying || verifyingCountdown <= 0) return;

    const timer = setTimeout(() => {
      if (verifyingCountdown <= 1) {
        finishVerification();
      } else {
        setVerifyingCountdown((prev) => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [verifying, verifyingCountdown]);

  const getShareUrl = () => `${window.location.origin}/${templateSlug}/${id}`;

  const buildFullContent = () => {
    const title = campaign?.title || 'Check out this campaign!';
    const description = campaign?.description || 'Share to unlock rewards!';
    const link = getShareUrl();
    return `${title}\n\n${description}\n\nOpen The Link:\n${link}`;
  };

  // ── Native Share (Text + Link context) ──
  const handleNativeShare = async () => {
    if (isSharing || verifying) return;
    if (shareCount === 0) return;

    const shareData = { text: buildFullContent() };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        startVerification('share', 6);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setToastMessage('Share cancelled or failed.');
          setTimeout(() => setToastMessage(''), 3000);
        }
      }
    } else {
      copyFullContent();
    }
  };

  // ── Messenger share ──
  const handleMessengerShare = () => {
    if (isSharing || verifying || shareCount === 0) return;
    window.open(`fb-messenger://share/?link=${encodeURIComponent(getShareUrl())}`, '_blank');
    startVerification('share', 6);
  };

  // ── WhatsApp share ──
  const handleWhatsAppShare = () => {
    if (isSharing || verifying || shareCount === 0) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareUrl())}`, '_blank');
    startVerification('share', 6);
  };

  // ── Copy full content ──
  const copyFullContent = () => {
    const fullText = buildFullContent();
    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        setIsCopied(true);
        setToastMessage('📋 Full details copied!');
        setTimeout(() => { setIsCopied(false); setToastMessage(''); }, 3000);
      })
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = fullText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setIsCopied(true);
        setToastMessage('📋 Full details copied!');
        setTimeout(() => { setIsCopied(false); setToastMessage(''); }, 3000);
      });
  };

  const startVerification = (type, duration) => {
    setVerifying(true);
    setVerifyingType(type);
    setVerifyingCountdown(duration);
  };

  const finishVerification = () => {
    if (!verifying || isFinishingRef.current) return;
    isFinishingRef.current = true;

    setVerifying(false);
    setVerifyingType('');
    setVerifyingCountdown(0);

    if (verifyingType === 'share') {
      if (sharesComplete) {
        isFinishingRef.current = false;
        return;
      }

      let increment = 0;
      if (shareAttempt === 0) {
        increment = 0;
        setShareAttempt(1);
      } else if (shareAttempt === 1) {
        increment = Math.ceil(shareCount * 0.25);
        setShareAttempt(2);
      } else if (shareAttempt === 2) {
        increment = Math.ceil(shareCount * 0.5);
        setShareAttempt(3);
      } else if (shareAttempt === 3) {
        increment = shareCount - shares;
        if (increment > 0) setShareAttempt(3);
      }

      const remaining = shareCount - shares;
      if (increment > remaining) increment = remaining;

      if (increment > 0) {
        const newShares = Math.min(shares + increment, shareCount);
        setShares(newShares);
        setShareProgress(Math.min((newShares / shareCount) * 100, 100));

        // ── FINAL SHARE LOGIC: Fire API & Enforce 2s Gap ──
        if (newShares >= shareCount && !shareApiCalledRef.current) {
          shareApiCalledRef.current = true;
          callShareAPI(shareCount); // Fire share API immediately
          setSharesComplete(true);
          setShareAttempt(3);
          
          setIsClaimReady(false); // Lock the claim button
          // EXACTLY 2 SECOND GAP BEFORE UNLOCKING COMPLETE API
          setTimeout(() => {
            setIsClaimReady(true);
          }, 2000);
        }
      }
    }

    setTimeout(() => {
      isFinishingRef.current = false;
    }, 500);
  };

  const callShareAPI = async (totalShares) => {
    try {
      const deviceId = await refreshDeviceId();
      await fetch(`${API_BASE}/campaigns/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'native', deviceId, shares: totalShares }),
      });
    } catch (err) {
      console.error('Error recording share completion:', err);
    }
  };

  // ── This is ONLY clickable when isClaimReady === true ──
  const handleClaim = async () => {
    if (!sharesComplete || !isClaimReady || isCompleting) return;
    setIsCompleting(true);
    try {
      const deviceId = await refreshDeviceId(); 
      await fetch(`${API_BASE}/campaigns/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
    } catch (err) {
      console.error('Completion error:', err);
    } finally {
      setIsCompleting(false);
      setShowClaimModal(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const handleRedirect = () => {
    setShowClaimModal(false);
    document.body.style.overflow = 'auto';
    if (campaign?.finalUrl) {
      window.location.href = campaign.finalUrl;
    } else {
      router.push('/');
    }
  };

  const progress = shareCount > 0 ? Math.min((shares / shareCount) * 100, 100) : 100;
  const remaining = Math.max(shareCount - shares, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 py-8 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
          <p className="text-gray-500">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isComplete = sharesComplete;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-4 px-4 sm:py-6 sm:px-6 lg:px-8 pb-32">
      <div className="max-w-3xl mx-auto">

        {/* ── Back Button ── */}
        <button
          onClick={() => (isComplete ? router.push('/') : router.back())}
          className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-3 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {isComplete ? 'Back to Home' : 'Back'}
        </button>

        {/* ─── 1. TOP BANNER AD (High Visibility) ─── */}
        <div className="my-4 w-full overflow-hidden max-w-full">
          <IframeAd adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
        </div>

        {/* ── Hero Card ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 overflow-hidden mb-5 transition-all hover:shadow-2xl">
          <div className="relative aspect-video w-full bg-gray-200 overflow-hidden">
            {campaign.image ? (
              <Image
                src={campaign.image}
                alt={campaign.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                📤
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/80">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{campaign.title || 'Campaign'}</h1>
            {campaign.description && (
              <p className="text-gray-500 text-sm sm:text-base mt-1">{campaign.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {campaign.reward && (
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200">
                  <FaGift className="w-3.5 h-3.5" />
                  {campaign.reward}
                </span>
              )}
              {shareCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200">
                  📤 {shares}/{shareCount} shares
                </span>
              )}
              {isComplete && (
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium border border-green-200">
                  <FaCheckCircle className="w-3.5 h-3.5" />
                  Complete
                </span>
              )}
            </div>

            {shareCount > 0 && !isComplete && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
                  <span>complete</span>
                </div>
                <span>{shares}/{shareCount} shares</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── 2. NATIVE IN-FEED AD ─── */}
        {!isComplete && (
          <NativeAd />
        )}

        {/* ── Share Section ── */}
        {shareCount > 0 && !isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-7 text-center relative overflow-hidden mt-4"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-100/20 rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl mb-4 shadow-md">
                <FaRocket className="w-8 h-8 text-purple-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                {remaining === 1 ? 'Almost There!' : `Share ${remaining} More Time${remaining > 1 ? 's' : ''}`}
              </h2>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                {remaining === 1
                  ? 'One more share unlocks your reward!'
                  : `Share this campaign with your friends to unlock "${campaign.reward || 'your reward'}"`}
              </p>
            </div>

            {/* ── Messenger & WhatsApp (URL only) ── */}
            <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleMessengerShare}
                disabled={verifying || isSharing}
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm disabled:opacity-50"
              >
                <FaFacebookMessenger className="w-4 h-4" />
                Messenger
              </button>
              <button
                onClick={handleWhatsAppShare}
                disabled={verifying || isSharing}
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm disabled:opacity-50"
              >
                <FaWhatsapp className="w-4 h-4" />
                WhatsApp
              </button>
            </div>

            {/* ── Main Native Share Button (Pulsing to encourage clicks) ── */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              onClick={handleNativeShare}
              disabled={verifying || isSharing}
              className={`
                relative z-10 mt-4 w-full inline-flex items-center justify-center gap-3 px-6 py-4 
                bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-2xl 
                shadow-lg hover:shadow-xl transition-all duration-200 
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isHovering ? 'shadow-purple-200/50' : 'animate-[pulse_2s_ease-in-out_infinite]'}
              `}
            >
              <FaShareAlt className={`w-5 h-5 ${isHovering ? 'animate-bounce' : ''}`} />
              {verifying ? `Verifying (${verifyingCountdown}s)` : 'Share Now & Claim ✨'}
              <FaArrowRight className="w-4 h-4" />
            </motion.button>

            {/* ── Copy Full Details ── */}
            <div className="relative z-10 mt-3 flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-400">or</span>
              <button
                onClick={copyFullContent}
                className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-800 transition-colors font-medium"
              >
                <FaCopy className="w-3.5 h-3.5" />
                {isCopied ? 'Copied!' : 'Copy Full Details'}
              </button>
            </div>

            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 text-sm font-medium"
              >
                {toastMessage}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Claim Button ── */}
        {!isComplete && shareCount === 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
            <p className="text-amber-700 font-medium">
              No shares required – you can claim your reward directly!
            </p>
            <button
              onClick={handleClaim}
              className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition"
            >
              <FaGift className="w-4 h-4" />
              Claim Now
            </button>
          </div>
        )}

        {isComplete && (
          <div className="mt-6">
            {/* 2-SECOND DELAY / VERIFYING STATE */}
            {!isClaimReady ? (
               <button
                 disabled
                 className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gray-200 text-gray-500 font-bold text-lg rounded-2xl cursor-not-allowed transition-all"
               >
                 <FaSpinner className="w-5 h-5 animate-spin" />
                 Verifying final steps...
               </button>
            ) : (
               <button
                 onClick={handleClaim}
                 disabled={isCompleting}
                 className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98]"
               >
                 {isCompleting ? (
                   <FaSpinner className="w-5 h-5 animate-spin" />
                 ) : (
                   <FaGift className="w-5 h-5" />
                 )}
                 {isCompleting ? 'Processing...' : 'Claim Your Reward'}
                 {!isCompleting && <FaArrowRight className="w-4 h-4" />}
               </button>
            )}
          </div>
        )}

        {!isComplete && shareCount > 0 && (
          <div className="mt-5 text-center text-xs text-gray-400 font-medium">
            <p>
              {remaining === 1
                ? '🔒 One more share required to unlock the reward!'
                : `🔒 ${remaining} more share${remaining > 1 ? 's' : ''} needed to unlock`}
            </p>
          </div>
        )}
      </div>

      {/* ── Claim Success Modal ── */}
      <AnimatePresence>
        {showClaimModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-gray-100 my-8"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <FaCheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">🎉 Reward Unlocked!</h2>
              <p className="text-gray-500 mt-2">
                {campaign?.reward ? `You've claimed: ${campaign.reward}` : 'Your reward has been claimed successfully!'}
              </p>
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 font-medium">
                  Redirecting in <strong className="text-purple-600">{claimCountdown}s</strong>
                </p>
                <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 rounded-full"
                    style={{ width: `${((2 - claimCountdown) / 2) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 3. STICKY BOTTOM BANNER AD (FIXED SCROLL ISSUE) ─── */}
      {showStickyAd && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-2 sm:pb-4">
          {/* Strictly capped width using calc(100vw-16px) so it never overflows the viewport */}
          <div className="bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-1.5 sm:p-2 rounded-xl pointer-events-auto border border-gray-200/50 relative mx-auto w-[calc(100vw-16px)] sm:w-auto sm:max-w-[760px]">
            
            {/* Close Button */}
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

      {/* ─── 4. GLOBAL NETWORK ADS (POPUNDER & SOCIAL BAR) ─── */}
      {/* Popunder */}
      <Script
        id="popunder-ad"
        src="https://pl30634061.effectivecpmnetwork.com/8e/bb/ac/8ebbac19d902ee907cd27ffdddc2ac6b.js"
        strategy="afterInteractive"
      />

      {/* Social Bar */}
      <Script
        id="social-bar-ad"
        src="https://pl30631129.effectivecpmnetwork.com/05/02/b9/0502b976b36284a7767fd6cb4ce00971.js"
        strategy="afterInteractive"
      />

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce {
          animation: bounce 0.6s infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// ── Server‑side props ──
export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

// ── Wrap with Meta ──
export default withCampaignMeta(CampaignShare, defaultMeta);