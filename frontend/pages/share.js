// pages/share.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CampaignShare() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharesComplete, setSharesComplete] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Campaign not found');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch campaign');
      }
      const data = await res.json();
      if (data.success) {
        setCampaign(data.campaign);
        const count = data.campaign.shareCount || 0;
        setShareCount(count);
        const current = data.campaign.shares || 0;
        setShares(current);
        if (count > 0 && current >= count) {
          setSharesComplete(true);
        }
      } else {
        setError(data.error || 'Failed to load campaign');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Could not load campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ===== SHARE API CALL (simple increment) =====
  const handleShare = async (platform) => {
    if (isSharing || sharesComplete) return;
    setIsSharing(true);

    // Open share dialog
    const url = `${window.location.origin}/tasks?id=${id}`;
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check this out! ${url}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    };
    window.open(shareUrls[platform], '_blank');

    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.success) {
        setShares(data.currentShares || shares + 1);
        if (data.isComplete) {
          setSharesComplete(true);
        }
      }
    } catch (err) {
      console.error('Error sharing:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/tasks?id=${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      await handleShare('copy');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      await handleShare('copy');
    }
  };

  // ===== COMPLETE API CALL =====
  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'anonymous' }),
      });
      const data = await res.json();
      if (data.success) {
        if (campaign?.finalUrl) {
          window.location.href = campaign.finalUrl;
        } else {
          alert('🎉 Campaign completed successfully!');
          router.push('/');
        }
      } else {
        alert(data.error || 'Failed to complete campaign');
      }
    } catch (err) {
      console.error('Error completing campaign:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const progress = shareCount > 0 ? Math.min((shares / shareCount) * 100, 100) : 100;
  const canComplete = shareCount === 0 || sharesComplete;

  // ===== SKELETON LOADING =====
  if (loading) {
    return (
      <>
        <Meta title="Loading" />
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto animate-pulse">
            <div className="w-24 h-5 bg-gray-200 rounded mb-6" />
            <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
              <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-4 w-32 bg-gray-200 rounded mx-auto mb-6" />
              <div className="h-3 w-full bg-gray-200 rounded mb-4" />
              <div className="h-12 w-full bg-gray-200 rounded mb-4" />
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-20 bg-gray-200 rounded-lg" />
                ))}
              </div>
              <div className="h-12 w-full bg-gray-200 rounded mt-6" />
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
          <div className="text-center max-w-md animate-fadeIn">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
            <p className="text-gray-500">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Share`} />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-6"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </button>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sm:p-8 text-center transition-all hover:shadow-md">
            <div className="text-6xl mb-4 animate-bounce-in">📤</div>
            <h1 className="text-2xl font-bold text-gray-900">Share Campaign</h1>
            <p className="text-gray-500 mt-2">{campaign.title || 'Campaign'}</p>

            {/* Share Progress */}
            {shareCount > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Share Progress</span>
                  <span>{shares} / {shareCount}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-700 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {sharesComplete && (
                  <p className="mt-2 text-sm text-green-600 font-medium animate-slideIn">
                    ✅ Shares completed!
                  </p>
                )}
              </div>
            )}

            {/* Share Link */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-border flex items-center gap-3 transition-all hover:border-primary/30">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/tasks?id=${id}`}
                readOnly
                className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-600 truncate"
              />
              <button
                onClick={handleCopyLink}
                disabled={isSharing || sharesComplete}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm whitespace-nowrap ${
                  isCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
                }`}
              >
                {isCopied ? '✅ Copied!' : 'Copy'}
              </button>
            </div>

            {/* Share Buttons */}
            {shareCount > 0 && (
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600' },
                  { id: 'telegram', label: 'Telegram', color: 'bg-blue-500 hover:bg-blue-600' },
                  { id: 'facebook', label: 'Facebook', color: 'bg-blue-700 hover:bg-blue-800' },
                  { id: 'twitter', label: 'Twitter', color: 'bg-sky-500 hover:bg-sky-600' },
                ].map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleShare(platform.id)}
                    disabled={isSharing || sharesComplete}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 disabled:opacity-50 ${platform.color}`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            )}

            {/* Complete Campaign Button */}
            <button
              onClick={handleComplete}
              disabled={isCompleting || (shareCount > 0 && !sharesComplete)}
              className={`mt-6 w-full inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transition-all duration-300 shadow-sm ${
                isCompleting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : canComplete
                  ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCompleting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : canComplete ? (
                '🎉 Complete Campaign'
              ) : (
                `Share ${shareCount - shares} more time${shareCount - shares > 1 ? 's' : ''}`
              )}
            </button>

            {shareCount === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                No shares required – click Complete Campaign to finish.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== ANIMATIONS ===== */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-bounce-in { animation: bounceIn 0.5s ease-out; }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
    </>
  );
}