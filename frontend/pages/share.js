// pages/share.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import { getDeviceId } from '../utils/deviceId';
import {
  FaShareAlt,
  FaCopy,
  FaCheckCircle,
  FaRocket,
  FaGift,
  FaArrowRight,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CampaignShare() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [templateSlug, setTemplateSlug] = useState('campaign');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharesComplete, setSharesComplete] = useState(false);
  const [shareProgress, setShareProgress] = useState(0);
  const [shareAttempt, setShareAttempt] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimCountdown, setClaimCountdown] = useState(2);
  const [verifying, setVerifying] = useState(false);
  const [verifyingType, setVerifyingType] = useState('');
  const [verifyingCountdown, setVerifyingCountdown] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [isHovering, setIsHovering] = useState(false);

  const timerRef = useRef(null);
  const claimTimerRef = useRef(null);
  const isFinishingRef = useRef(false);

  useEffect(() => {
    if (id) fetchCampaignAndTemplate();
  }, [id]);

  const fetchCampaignAndTemplate = async () => {
    try {
      setLoading(true);
      const campaignRes = await fetch(`${API_BASE}/campaigns/${id}`, {
        headers: {
          'x-device-id': getDeviceId(),
        },
      });
      if (!campaignRes.ok) {
        if (campaignRes.status === 404) {
          setError('Campaign not found');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch campaign');
      }
      const campaignData = await campaignRes.json();
      if (!campaignData.success) {
        setError(campaignData.error || 'Failed to load campaign');
        setLoading(false);
        return;
      }

      const camp = campaignData.campaign;
      setCampaign(camp);
      const count = camp.shareCount || 0;
      setShareCount(count);
      const currentShares = camp.shares || 0;
      setShares(currentShares);
      setShareProgress(Math.min((currentShares / (count || 1)) * 100, 100));

      if (count === 0) {
        setSharesComplete(true);
        setShareAttempt(3);
        setTimeout(() => setShowClaimModal(true), 800);
      } else {
        if (currentShares >= count) {
          setSharesComplete(true);
          setShareAttempt(3);
        } else {
          const ratio = currentShares / count;
          if (ratio === 0) setShareAttempt(0);
          else if (ratio < 0.25) setShareAttempt(1);
          else if (ratio < 0.75) setShareAttempt(2);
          else setShareAttempt(3);
        }
      }

      let slug = 'campaign';
      if (camp.templateId) {
        try {
          const templateRes = await fetch(`${API_BASE}/templates/${camp.templateId}`);
          if (templateRes.ok) {
            const templateData = await templateRes.json();
            if (templateData.success && templateData.template) {
              slug = templateData.template.slug || 'campaign';
            }
          }
        } catch (err) { console.warn('Template fetch failed'); }
      }
      if (slug === 'campaign' && camp.templateSlug) slug = camp.templateSlug;
      if (slug === 'campaign' && camp.title) {
        slug = camp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      setTemplateSlug(slug);
    } catch (err) {
      console.error('Error fetching:', err);
      setError('Could not load campaign. Please try again.');
    } finally {
      setLoading(false);
    }
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

  // ── Verification timer (recursive setTimeout) ──
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

  // ── Helper: open a URL and wait to see if the app opened ──
  const tryOpenApp = (url, timeout = 2000) => {
    return new Promise((resolve) => {
      // Open the URL
      const win = window.open(url, '_blank');

      // If window.open returns null (popup blocked), treat as failure immediately
      if (!win) {
        resolve(false);
        return;
      }

      let resolved = false;

      // Listen for visibility change
      const handler = () => {
        if (document.hidden && !resolved) {
          resolved = true;
          document.removeEventListener('visibilitychange', handler);
          resolve(true);
        }
      };
      document.addEventListener('visibilitychange', handler);

      // Also check if window is closed (some browsers)
      const checkClosed = setInterval(() => {
        if (win.closed && !resolved) {
          resolved = true;
          document.removeEventListener('visibilitychange', handler);
          clearInterval(checkClosed);
          resolve(false); // closed without opening? treat as fail
        }
      }, 300);

      // Timeout: if no visibility change within `timeout`, treat as failure
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.removeEventListener('visibilitychange', handler);
          clearInterval(checkClosed);
          resolve(false);
        }
      }, timeout);
    });
  };

  // ── Custom Share Flow: Messenger → WhatsApp → Native Share ──
  const handleNativeShare = async () => {
    if (isSharing || verifying) return;
    if (shareCount === 0) return;

    const shareUrl = `${window.location.origin}/${templateSlug}/${id}`;
    const title = campaign?.title || 'Check this out!';
    const description = campaign?.description || '';
    const fullMessage = description ? `${title}\n${description}` : title;

    // ── Step 1: Try Messenger (with message) ──
    const messengerUrl = `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}&message=${encodeURIComponent(fullMessage)}`;
    const messengerOpened = await tryOpenApp(messengerUrl, 2500);

    if (messengerOpened) {
      startVerification('share', 6);
      return;
    }

    // ── Step 2: Messenger failed, try WhatsApp (only link) ──
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`;
    const whatsappOpened = await tryOpenApp(whatsappUrl, 2000);

    if (whatsappOpened) {
      startVerification('share', 6);
      return;
    }

    // ── Step 3: Both failed, fallback to Native Share API ──
    if (navigator.share) {
      try {
        await navigator.share({
          text: fullMessage,
          url: shareUrl,
        });
        startVerification('share', 6);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setToastMessage('Share cancelled or failed.');
          setTimeout(() => setToastMessage(''), 3000);
        }
      }
    } else {
      // ── Final fallback: copy link ──
      copyLinkOnly(shareUrl);
      setToastMessage('📋 Link copied! (Native share not supported)');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const copyLinkOnly = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/${templateSlug}/${id}`;
    copyLinkOnly(shareUrl);
    setToastMessage('📋 Link copied!');
    setTimeout(() => setToastMessage(''), 3000);
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
        if (increment > 0) {
          setShareAttempt(3);
        }
      }

      const remaining = shareCount - shares;
      if (increment > remaining) increment = remaining;

      if (increment > 0) {
        incrementShares(increment);
      }
    }

    setTimeout(() => {
      isFinishingRef.current = false;
    }, 500);
  };

  const incrementShares = async (amount) => {
    try {
      const deviceId = getDeviceId();
      const res = await fetch(`${API_BASE}/campaigns/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'native', deviceId }),
      });
      const data = await res.json();
      if (data.success) {
        const newShares = Math.min(shares + amount, shareCount);
        setShares(newShares);
        setShareProgress(Math.min((newShares / shareCount) * 100, 100));
        if (newShares >= shareCount) {
          setSharesComplete(true);
          setShareAttempt(3);
        }
      }
    } catch (err) {
      console.error('Error recording share:', err);
    }
  };

  const handleClaim = async () => {
    if (!sharesComplete || isCompleting) return;
    setIsCompleting(true);
    try {
      const deviceId = getDeviceId();
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
      <>
        <Meta title="Loading" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="w-24 h-5 bg-gray-200 rounded mb-4" />
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 overflow-hidden">
              <div className="aspect-video bg-gray-200" />
              <div className="p-6">
                <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded mb-3" />
                <div className="h-6 w-32 bg-gray-200 rounded-full mb-6" />
                <div className="h-3 w-full bg-gray-200 rounded mb-4" />
                <div className="h-14 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !campaign) {
    return (
      <>
        <Meta title="Not Found" />
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
      </>
    );
  }

  const isComplete = sharesComplete;

  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Share to Unlock`} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
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

          {/* ── Hero Card ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 overflow-hidden mb-5 transition-all hover:shadow-2xl">
            <div className="relative aspect-video w-full bg-gray-200 overflow-hidden">
              {campaign.image ? (
                <img
                  src={campaign.image}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                  📤
                </div>
              )}
              {/* Progress bar */}
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

              {isComplete && (
                <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 text-green-700 text-sm flex items-center gap-2">
                  <FaCheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">All shares completed! 🎉</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Share Section ── */}
          {shareCount > 0 && !isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-7 text-center relative overflow-hidden"
            >
              {/* Background sparkles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-100/20 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl mb-4 shadow-md">
                  <FaRocket className="w-8 h-8 text-purple-600" />
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

              {/* Share Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setIsHovering(true)}
                onHoverEnd={() => setIsHovering(false)}
                onClick={handleNativeShare}
                disabled={verifying || isSharing}
                className={`
                  relative z-10 mt-5 w-full inline-flex items-center justify-center gap-3 px-6 py-4 
                  bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-2xl 
                  shadow-lg hover:shadow-xl transition-all duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isHovering ? 'shadow-purple-200/50' : ''}
                `}
              >
                <FaShareAlt className={`w-5 h-5 ${isHovering ? 'animate-bounce' : ''}`} />
                {verifying ? `Verifying (${verifyingCountdown}s)` : 'Share Now & Claim✨'}
                <FaArrowRight className="w-4 h-4" />
              </motion.button>

              {/* Copy link fallback */}
              <div className="relative z-10 mt-4 flex items-center justify-center gap-2 text-sm">
                <span className="text-gray-400">or</span>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-800 transition-colors font-medium"
                >
                  <FaCopy className="w-3.5 h-3.5" />
                  {isCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 text-sm"
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
              <button
                onClick={handleClaim}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <FaGift className="w-5 h-5" />
                Claim Your Reward
                <FaArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {!isComplete && shareCount > 0 && (
            <div className="mt-5 text-center text-xs text-gray-400">
              <p>
                {remaining === 1
                  ? '🔒 One more share required to unlock the reward!'
                  : `🔒 ${remaining} more share${remaining > 1 ? 's' : ''} needed to unlock`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Claim Success Modal ── */}
      <AnimatePresence>
        {showClaimModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
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
                <p className="text-sm text-gray-500">
                  Redirecting in <strong className="text-purple-600">{claimCountdown}s</strong>
                </p>
                <div className="mt-3 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 rounded-full"
                    style={{ width: `${((2 - claimCountdown) / 2) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">You will be redirected shortly</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce {
          animation: bounce 0.6s infinite;
        }
      `}</style>
    </>
  );
}