
// pages/campaign-created.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

export default function CampaignCreated() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
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

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/${campaign?.templateSlug || 'campaign'}/${campaign?.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setMessage('✅ Link copied!');
    setTimeout(() => {
      setCopied(false);
      setMessage('');
    }, 2500);
  };

  // ── LOADING STATE ──
  if (loading) {
    return (
      <>
        <Meta title="Loading..." />
        <div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          <p className="mt-3 text-gray-500 text-sm font-medium">Loading your campaign...</p>
        </div>
      </>
    );
  }

  // ── NO ID PROVIDED ──
  if (!id) {
    return (
      <>
        <Meta title="Create a Campaign" />
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-purple-50/20">
          <div className="max-w-md w-full text-center p-6 bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="text-5xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Your First Campaign</h1>
            <p className="text-gray-500 text-xs sm:text-sm mb-6">
              You haven't created a campaign yet. Start building your viral campaign now!
            </p>
            <button
              onClick={() => router.push('/create')}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all shadow-md"
            >
              <span>✨</span> Create Campaign
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── ERROR STATE ──
  if (error || !campaign) {
    return (
      <>
        <Meta title="Campaign Not Found" />
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-red-50/20">
          <div className="max-w-md w-full text-center p-6 bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Not Found</h2>
            <p className="text-gray-500 text-xs sm:text-sm mb-6">
              {error || 'The campaign you are looking for does not exist or may have been deleted.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => router.push('/create')}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition shadow-sm"
              >
                Create New
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── SUCCESS STATE ──
  const {
    title,
    description,
    reward,
    shareCount,
    tasks,
    finalUrl,
    features,
    templateSlug,
    id: campaignId,
    image,
  } = campaign;

  const fullUrl = `${window.location.origin}/${templateSlug || 'campaign'}/${campaignId}`;

  return (
    <>
      <Meta title="🎉 Campaign Created!" />
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-purple-50/20 flex flex-col justify-center items-center px-3 sm:px-6">
        <div className="max-w-3xl w-full">

          {/* ── Main Compact Card ── */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                🎉
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">Campaign Created!</h1>
                <p className="text-purple-100 text-xs sm:text-sm truncate">
                  Your campaign is live – start sharing and watch engagement grow!
                </p>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-4 sm:p-6 space-y-4">
              
              {/* ── Campaign Preview Box ── */}
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📋</span> Overview
                </h2>
                <div className="bg-gray-50 rounded-2xl border border-gray-200/80 p-3 sm:p-3.5 flex items-center gap-3.5">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm border border-gray-100">
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-100">
                        🎯
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{title}</h3>
                    {description && (
                      <p className="text-gray-500 text-xs line-clamp-1">{description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {reward && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-amber-200/60">
                          🎁 {reward}
                        </span>
                      )}
                      {features?.shareCount && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-blue-200/60">
                          📢 {shareCount} shares
                        </span>
                      )}
                      {features?.tasks && tasks?.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-purple-200/60">
                          📋 {tasks.length} tasks
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Share Link Section ── */}
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>🔗</span> Share Link
                </h2>
                <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 bg-transparent outline-none text-xs sm:text-sm font-mono text-gray-700 px-2 truncate select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {copied ? '✅ Copied!' : 'Copy Link'}
                  </button>
                </div>
                {message && (
                  <p className="mt-1 text-xs text-green-600 font-medium text-center">{message}</p>
                )}
              </div>

              {/* ── Action Buttons ── */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => router.push(`/${templateSlug || 'campaign'}/${campaignId}`)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-purple-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-purple-700 transition shadow-sm"
                >
                  👁️ <span className="truncate">View</span>
                </button>
                <button
                  onClick={() => router.push('/stats')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  📊 <span className="truncate">Stats</span>
                </button>
                <button
                  onClick={() => router.push('/create')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  ✨ <span className="truncate">New</span>
                </button>
              </div>

            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-gray-400 mt-3">
            🚀 Your campaign is live – start sharing and watch the engagement grow!
          </p>

        </div>
      </div>
    </>
  );
}
