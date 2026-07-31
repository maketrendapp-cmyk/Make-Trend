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
  FaCrown,
  FaUsers,
  FaClock,
  FaInfinity,
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

  // ── SKELETON LOADING ──
  if (loading) {
    return (
      <>
        <Meta title="Loading..." />
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50/30 p-0">
          <div className="w-full max-w-2xl mx-auto animate-pulse">
            {/* Banner Skeleton - Centered */}
            <div className="flex justify-center mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-200 rounded-xl" />
                <div>
                  <div className="h-4 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-200 rounded w-20 mt-1" />
                </div>
              </div>
            </div>

            {/* Card Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
              <div className="w-full aspect-video bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="flex gap-2">
                  <div className="h-5 bg-slate-200 rounded w-16" />
                  <div className="h-5 bg-slate-200 rounded w-20" />
                  <div className="h-5 bg-slate-200 rounded w-14" />
                </div>
                <div className="grid grid-cols-3 gap-px bg-slate-100 rounded-lg overflow-hidden mt-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white px-3 py-1.5 text-center">
                      <div className="h-2 bg-slate-200 rounded w-10 mx-auto" />
                      <div className="h-3 bg-slate-200 rounded w-14 mx-auto mt-0.5" />
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-slate-200 rounded w-20" />
                  <div className="h-10 bg-slate-200 rounded-xl mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-11 bg-slate-200 rounded-xl" />
                  ))}
                </div>
                <div className="h-14 bg-slate-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── NO ID PROVIDED ──
  if (!id) {
    return (
      <>
        <Meta title="Create a Campaign" />
        <div className="h-screen w-screen flex items-center justify-center p-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/40">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mb-5">
              <FaRocket className="text-purple-600 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create Your First Campaign</h1>
            <p className="text-slate-500 text-sm mb-7">
              You haven't created a campaign yet. Start building your viral campaign now!
            </p>
            <button
              onClick={() => router.push('/create')}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-200 shadow-md hover:-translate-y-0.5 hover:shadow-purple-200"
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
        <div className="h-screen w-screen flex items-center justify-center p-0 bg-gradient-to-br from-slate-50 via-white to-red-50/40">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto bg-red-50 rounded-2xl flex items-center justify-center text-3xl mb-5">
              <FaExclamationTriangle className="text-red-500 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Campaign Not Found</h2>
            <p className="text-slate-500 text-sm mb-7">
              {error || 'The campaign you are looking for does not exist or may have been deleted.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/create')}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition shadow-sm hover:shadow-md"
              >
                <FaRocket className="inline mr-2 text-sm" /> Create New
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
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
      <div className="h-screen w-screen flex items-center justify-center p-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        <div className="w-full max-w-2xl mx-auto">

          {/* ── Success Banner ── CENTERED ── */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                <FaCheckCircle className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Campaign Published</h1>
                <p className="text-slate-500 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                  Your campaign is now live
                </p>
              </div>
            </div>
          </div>

          {/* ── Main Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/30 overflow-hidden">

            {/* ── Campaign Image ── */}
            <div className="w-full aspect-video bg-slate-100 overflow-hidden">
              {image ? (
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-slate-300">
                  🎯
                </div>
              )}
            </div>

            {/* ── Campaign Details ── */}
            <div className="p-4 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 truncate">{title}</h2>
                {description && (
                  <p className="text-slate-500 text-sm line-clamp-2 mt-0.5">{description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {reward && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-200">
                      <FaGift className="text-amber-500 text-[10px]" /> {reward}
                    </span>
                  )}
                  {features?.shareCount && (
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200">
                      <FaShareAlt className="text-blue-500 text-[10px]" /> {shareCount} shares
                    </span>
                  )}
                  {features?.tasks && tasks?.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-purple-200">
                      <FaClipboardList className="text-purple-500 text-[10px]" /> {tasks.length} tasks
                    </span>
                  )}
                  {features?.finalUrl && finalUrl && (
                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-green-200">
                      <FaExternalLinkAlt className="text-green-500 text-[10px]" /> Redirect
                    </span>
                  )}
                </div>
              </div>

              {/* ── Stats Row ── TIGHT SPACING ── */}
              <div className="grid grid-cols-3 gap-px bg-slate-100 rounded-lg overflow-hidden">
                <div className="bg-white px-3 py-1.5 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Active
                  </p>
                </div>
                <div className="bg-white px-3 py-1.5 text-center border-x border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Created</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white px-3 py-1.5 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5 capitalize">{templateSlug || 'Campaign'}</p>
                </div>
              </div>

              {/* ── Share Link ── */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FaLink className="text-purple-500" /> Share Link
                </label>
                <div className="mt-1.5 flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-300 transition-colors">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 w-full bg-transparent outline-none text-sm font-mono text-slate-600 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 w-full sm:w-auto px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      copied
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'
                    }`}
                  >
                    {copied ? (
                      <><FaCheckCircle className="inline mr-2 text-xs" /> Copied</>
                    ) : (
                      <><FaCopy className="inline mr-2 text-xs" /> Copy Link</>
                    )}
                  </button>
                </div>
                {message && (
                  <p className="mt-1 text-sm text-emerald-600 text-center">{message}</p>
                )}
              </div>

              {/* ── Quick Actions ── */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FaCrown className="text-amber-500" /> Quick Actions
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => router.push(`/${templateSlug || 'campaign'}/${campaignId}`)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-100 transition border border-purple-200 hover:border-purple-300 min-h-[44px]"
                  >
                    <FaEye className="text-sm" /> View
                  </button>
                  <button
                    onClick={() => router.push('/stats')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition border border-slate-200 hover:border-slate-300 min-h-[44px]"
                  >
                    <FaChartBar className="text-sm" /> Stats
                  </button>
                  <button
                    onClick={() => router.push('/create')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition border border-slate-200 hover:border-slate-300 min-h-[44px]"
                  >
                    <FaPlus className="text-sm" /> New
                  </button>
                </div>
              </div>

              {/* ── Share Tips ── */}
              <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-xl p-3 border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-2">
                  <FaRocket className="text-purple-500" /> Pro Tip
                </p>
                <p className="text-sm text-purple-700/80 mt-0.5">
                  Share your campaign link on social media, WhatsApp, and email to maximize reach!
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-xs text-slate-400 mt-3">
            <FaInfinity className="inline mr-1.5 text-[10px]" /> Your campaign is live – start sharing now
          </p>
        </div>
      </div>
    </>
  );
}