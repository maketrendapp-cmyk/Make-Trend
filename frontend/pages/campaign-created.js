// pages/campaign-created.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FaRocket,
  FaCheckCircle,
  FaLink,
  FaEye,
  FaChartBar,
  FaPlus,
  FaCopy,
  FaGift,
  FaShareAlt,
  FaClipboardList,
  FaExternalLinkAlt,
  FaArrowRight,
  FaSpinner,
  FaExclamationTriangle,
  FaArrowLeft,
} from 'react-icons/fa';

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
    }, 3000);
  };

  // ── LOADING STATE ──
  if (loading) {
    return (
      <>
        <Meta title="Loading..." />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50/30 px-4">
          <FaSpinner className="animate-spin text-4xl text-purple-600" />
          <p className="mt-4 text-gray-500 text-sm">Loading your campaign...</p>
        </div>
      </>
    );
  }

  // ── NO ID PROVIDED ──
  if (!id) {
    return (
      <>
        <Meta title="Create a Campaign" />
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Your First Campaign</h1>
            <p className="text-gray-500 text-sm mb-6">
              You haven't created a campaign yet. Start building your viral campaign now!
            </p>
            <button
              onClick={() => router.push('/create')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5"
            >
              <FaRocket className="text-sm" /> Create Campaign
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
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-red-50/30">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Campaign Not Found</h2>
            <p className="text-gray-500 text-sm mb-6">
              {error || 'The campaign you are looking for does not exist or may have been deleted.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/create')}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition shadow-sm"
              >
                <FaRocket className="inline mr-2 text-sm" /> Create New
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
              >
                <FaArrowLeft className="inline mr-2 text-sm" /> Go Home
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">

          {/* ── Main Card ── */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100/80 overflow-hidden">

            {/* ── Header ── Compact */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                  <FaRocket className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Campaign Created!</h1>
                  <p className="text-purple-100 text-xs">
                    Your campaign is live – start sharing!
                  </p>
                </div>
              </div>
            </div>

            {/* ── Body ── Compact spacing */}
            <div className="p-5 sm:p-6 space-y-4">

              {/* ── Campaign Preview ── */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaClipboardList className="text-purple-500" /> Campaign Preview
                </h2>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="sm:w-44 h-36 sm:h-auto bg-gray-200 flex-shrink-0 overflow-hidden">
                      {image ? (
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 bg-gray-100">
                          🎯
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 p-3 space-y-1.5">
                      <h3 className="text-base font-bold text-gray-900 truncate">{title}</h3>
                      {description && (
                        <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {reward && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200">
                            <FaGift className="text-amber-500 text-[10px]" /> {reward}
                          </span>
                        )}
                        {features?.shareCount && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-200">
                            <FaShareAlt className="text-blue-500 text-[10px]" /> {shareCount} shares
                          </span>
                        )}
                        {features?.tasks && tasks?.length > 0 && (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium border border-purple-200">
                            <FaClipboardList className="text-purple-500 text-[10px]" /> {tasks.length} tasks
                          </span>
                        )}
                        {features?.finalUrl && finalUrl && (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium border border-green-200">
                            <FaExternalLinkAlt className="text-green-500 text-[10px]" /> Redirect
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Share Link ── */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaLink className="text-purple-500" /> Share Link
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 w-full bg-transparent outline-none text-xs font-mono text-gray-600 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 shadow-sm ${
                      copied
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'
                    }`}
                  >
                    {copied ? (
                      <><FaCheckCircle className="inline mr-1.5 text-xs" /> Copied!</>
                    ) : (
                      <><FaCopy className="inline mr-1.5 text-xs" /> Copy Link</>
                    )}
                  </button>
                </div>
                {message && (
                  <p className="mt-1.5 text-sm text-green-600 text-center">{message}</p>
                )}
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-gray-200">
                <button
                  onClick={() => router.push(`/${templateSlug || 'campaign'}/${campaignId}`)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <FaEye className="text-xs" /> View
                </button>
                <button
                  onClick={() => router.push('/stats')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
                >
                  <FaChartBar className="text-xs" /> Stats
                </button>
                <button
                  onClick={() => router.push('/create')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
                >
                  <FaPlus className="text-xs" /> New
                </button>
              </div>
            </div>
          </div>

          {/* ── Footer note ── */}
          <p className="text-center text-xs text-gray-400 mt-4">
            <FaRocket className="inline mr-1.5 text-[10px]" /> Your campaign is live – start sharing and watch the engagement grow!
          </p>
        </div>
      </div>
    </>
  );
}