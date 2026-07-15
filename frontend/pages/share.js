// pages/share.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FaWhatsapp,
  FaTelegram,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLink,
  FaCheckCircle,
  FaClock,
  FaShareAlt,
  FaCopy,
  FaRocket,
  FaPaperPlane,
} from 'react-icons/fa';

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
  const [claimCountdown, setClaimCountdown] = useState(5);

  const claimTimerRef = useRef(null);

  // ── Fetch Campaign + Template ──
  useEffect(() => {
    if (id) fetchCampaignAndTemplate();
  }, [id]);

  const fetchCampaignAndTemplate = async () => {
    try {
      setLoading(true);
      // 1) Fetch campaign
      const campaignRes = await fetch(`${API_BASE}/campaigns/${id}`);
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

      // If shareCount is 0, mark as complete immediately
      if (count === 0) {
        setSharesComplete(true);
        setShareAttempt(2);
        // Auto-show claim modal after a short delay
        setTimeout(() => {
          setShowClaimModal(true);
        }, 800);
      } else {
        // Normal logic
        if (currentShares >= count) {
          setSharesComplete(true);
          setShareAttempt(2);
        } else {
          if (currentShares === 0) setShareAttempt(0);
          else if (currentShares < count / 2) setShareAttempt(1);
          else setShareAttempt(2);
        }
      }

      // 2) Fetch template to get slug (with fallback)
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
        } catch (err) {
          console.warn('Template fetch failed, using fallback:', err);
        }
      }
      // Fallback: if still 'campaign', try to use campaign.templateSlug if exists
      if (slug === 'campaign' && camp.templateSlug) {
        slug = camp.templateSlug;
      }
      // Final fallback: generate from title
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

  // ── Handle Share ──
  const handleShare = async (platform, type) => {
    if (isSharing || sharesComplete) return;

    // If shareCount is 0, we shouldn't be here, but just in case
    if (shareCount === 0) return;

    const shouldCount = shareAttempt >= 1;
    setIsSharing(true);

    const shareUrl = `${window.location.origin}/${templateSlug}/${id}`;
    const title = campaign?.title || 'Check this out!';
    const description = campaign?.description || '';
    const fullText = description ? `${title}\n${description}\n\n${shareUrl}` : `${title}\n\n${shareUrl}`;

    // Open share dialog
    if (type === 'forward') {
      const forwardUrls = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(fullText)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
        messenger: `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`,
        instagram: `https://www.instagram.com/`, // Fallback to Instagram app
      };
      window.open(forwardUrls[platform], '_blank');
    } else {
      const postUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(title)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
        copy: shareUrl,
      };
      if (platform === 'copy') {
        await copyLink();
      } else {
        window.open(postUrls[platform], '_blank');
      }
    }

    // Increment shares if this is a counting share
    if (shouldCount) {
      let increment = 0;
      if (shareAttempt === 1) {
        increment = Math.ceil(shareCount / 2);
      } else if (shareAttempt === 2) {
        increment = shareCount - shares;
      }
      if (increment > 0) {
        await incrementShares(increment);
      }
      if (shareAttempt < 2) setShareAttempt(shareAttempt + 1);
    } else {
      setShareAttempt(1);
    }

    setIsSharing(false);
  };

  // ── Increment shares ──
  const incrementShares = async (amount) => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'manual' }),
      });
      const data = await res.json();
      if (data.success) {
        const newShares = Math.min(shares + amount, shareCount);
        setShares(newShares);
        setShareProgress(Math.min((newShares / shareCount) * 100, 100));
        if (newShares >= shareCount) setSharesComplete(true);
      }
    } catch (err) {
      console.error('Error recording share:', err);
    }
  };

  // ── Copy Link ──
  const copyLink = async () => {
    const shareUrl = `${window.location.origin}/${templateSlug}/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  // ── Claim ──
  const handleClaim = () => {
    if (!sharesComplete || isCompleting) return;
    setShowClaimModal(true);
    // Disable scroll on body
    document.body.style.overflow = 'hidden';
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

  // Platforms: forward (message) and post (publish)
  const forwardPlatforms = [
    { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, color: 'bg-green-500 hover:bg-green-600' },
    { id: 'telegram', label: 'Telegram', icon: FaTelegram, color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'messenger', label: 'Messenger', icon: FaFacebook, color: 'bg-indigo-500 hover:bg-indigo-600' },
    { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'bg-pink-500 hover:bg-pink-600' },
  ];

  const postPlatforms = [
    { id: 'facebook', label: 'Facebook', icon: FaFacebook, color: 'bg-blue-700 hover:bg-blue-800' },
    { id: 'twitter', label: 'Twitter', icon: FaTwitter, color: 'bg-sky-500 hover:bg-sky-600' },
  ];

  // ── Skeleton Loader ──
  if (loading) {
    return (
      <>
        <Meta title="Loading" />
        <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-6">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="w-24 h-5 bg-gray-200 rounded mb-4" />
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 sm:h-56 bg-gray-200" />
              <div className="p-6">
                <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded mb-3" />
                <div className="h-6 w-32 bg-gray-200 rounded-full mb-6" />
                <div className="h-3 w-full bg-gray-200 rounded mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-gray-200 rounded-xl" />
                  ))}
                </div>
                <div className="h-14 bg-gray-200 rounded-xl mt-6" />
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

  const shareUrl = `${window.location.origin}/${templateSlug}/${id}`;
  const isComplete = sharesComplete;

  // If shareCount is 0, we already show the modal, so the rest is just a placeholder.
  // But we still render the page; the modal will be open.

  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Share`} />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">

          {/* ── Back Button ── */}
          <button
            onClick={() => isComplete ? router.push('/') : router.back()}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-3 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {isComplete ? 'Back to Home' : 'Back'}
          </button>

          {/* ── Hero Card ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md">
            <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-gray-200">
              {campaign.image ? (
                <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                  📤
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/60">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{campaign.title || 'Campaign'}</h1>
              {campaign.description && (
                <p className="text-gray-500 text-sm sm:text-base mt-1">{campaign.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {campaign.reward && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200">
                    🎁 {campaign.reward}
                  </span>
                )}
                {shareCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200">
                    📤 {shares}/{shareCount} shares
                  </span>
                )}
                {isComplete && (
                  <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium border border-green-200">
                    ✅ Complete
                  </span>
                )}
              </div>

              {shareCount > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
                    <span>complete</span>
                  </span>
                  <span>{shares}/{shareCount} shares</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Share Link with Copy Button (only if shareCount > 0) ── */}
          {shareCount > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <FaLink className="text-purple-500" /> Share Link
              </h2>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-600 truncate"
                />
                <button
                  onClick={copyLink}
                  disabled={isSharing || isComplete}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md active:scale-[0.97]'
                  }`}
                >
                  <FaCopy className="w-3.5 h-3.5" />
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* ── Share Platforms (only if shareCount > 0) ── */}
          {shareCount > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7">
              {/* Forward / Message */}
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FaPaperPlane className="text-purple-500" /> Share via Message
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {forwardPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleShare(platform.id, 'forward')}
                      disabled={isSharing || isComplete}
                      className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium transition-all duration-200 ${platform.color} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]`}
                    >
                      <Icon className="w-5 h-5" />
                      {platform.label}
                    </button>
                  );
                })}
              </div>

              {/* Post / Publish */}
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FaShareAlt className="text-purple-500" /> Post / Publish
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {postPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleShare(platform.id, 'post')}
                      disabled={isSharing || isComplete}
                      className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium transition-all duration-200 ${platform.color} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]`}
                    >
                      <Icon className="w-5 h-5" />
                      {platform.label}
                    </button>
                  );
                })}
              </div>

              {!isComplete && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                  {shareAttempt === 0 && 'Open any share to start (0% counted)'}
                  {shareAttempt === 1 && `Share again to add ${Math.ceil(shareCount/2)} shares (50% progress)`}
                  {shareAttempt === 2 && `One more share to complete!`}
                </p>
              )}
            </div>
          )}

          {/* ── Claim Button ── */}
          <div className="mt-6">
            <button
              onClick={handleClaim}
              disabled={!isComplete || isCompleting}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-2xl transition-all duration-300 shadow-sm ${
                isComplete && !isCompleting
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md hover:scale-[1.01] active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isCompleting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  <FaRocket className="w-5 h-5" />
                  🎁 Claim
                </>
              )}
            </button>

            {/* Helper text below the button */}
            {shareCount > 0 && !isComplete && (
              <p className="mt-2 text-center text-xs text-gray-400">
                {remaining} share{remaining > 1 ? 's' : ''} remaining
              </p>
            )}
            {isComplete && shareCount > 0 && (
              <p className="mt-2 text-center text-xs text-green-600 font-medium">
                ✅ All shares completed – claim your reward!
              </p>
            )}
            {shareCount === 0 && (
              <p className="mt-2 text-center text-xs text-green-600 font-medium">
                No shares required – claim your reward now!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Professional Claim Success Modal ── */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl animate-scaleIn border border-gray-100">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-bounce-in">
              <FaCheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">🎉 Claim Successful!</h2>
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
                  style={{ width: `${((5 - claimCountdown) / 5) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">You will be redirected shortly</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        .animate-bounce-in { animation: bounceIn 0.5s ease-out; }
      `}</style>
    </>
  );
}