
// pages/campaign-created.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import { 
  FiCheckCircle, 
  FiCopy, 
  FiExternalLink, 
  FiBarChart2, 
  FiPlus, 
  FiLink, 
  FiAlertCircle, 
  FiGift, 
  FiShare2, 
  FiList, 
  FiImage 
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

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
    // If no id, we show the "no campaign" state without loading
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
    setMessage('Link copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
      setMessage('');
    }, 3000);
  };

  // ── LOADING STATE ──
  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign..." />
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            <FaRocket className="text-indigo-600 w-5 h-5 animate-pulse" />
          </div>
          <p className="mt-5 text-slate-500 font-medium tracking-wide animate-pulse">Setting up your campaign...</p>
        </div>
      </>
    );
  }

  // ── NO ID PROVIDED ──
  if (!id) {
    return (
      <>
        <Meta title="Create a Campaign" />
        <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaRocket className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">Create Your First Campaign</h1>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              You haven't created a campaign yet. Start building your viral reward campaign right now in just a few clicks!
            </p>
            <button
              onClick={() => router.push('/create')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 transition-all duration-200"
            >
              <FiPlus className="w-5 h-5" /> Start Building
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
        <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Campaign Not Found</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {error || 'The campaign you are looking for does not exist or may have been securely removed.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/create')}
                className="w-full px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm hover:shadow-lg hover:shadow-indigo-600/20"
              >
                Create New Campaign
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 hover:text-slate-900 transition"
              >
                Return to Dashboard
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
      <Meta title="🎉 Campaign Live | MakeTrend" />
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-3xl w-full">

          {/* ── Main Success Card ── */}
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            
            {/* Header / Confetti Area */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 px-8 py-10 sm:px-12 sm:py-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center flex-shrink-0 shadow-xl">
                  <FiCheckCircle className="w-10 h-10 text-white" />
                </div>
                <div className="pt-2">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">Campaign is Live!</h1>
                  <p className="text-indigo-100 text-sm sm:text-base font-medium max-w-md">
                    Your custom viral campaign has been successfully generated and is ready to receive traffic.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-10 space-y-8">
              
              {/* ── Share Link Section ── */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiLink className="w-4 h-4" /> Share URL
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 w-full bg-transparent outline-none text-sm font-semibold text-slate-700 truncate px-4 py-2"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all shadow-sm ${
                      copied
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                    }`}
                  >
                    {copied ? (
                      <><FiCheckCircle className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><FiCopy className="w-4 h-4" /> Copy Link</>
                    )}
                  </button>
                </div>
                {message && (
                  <p className="mt-3 text-sm text-emerald-600 font-semibold text-center sm:text-left flex items-center gap-1.5">
                    <FiCheckCircle /> {message}
                  </p>
                )}
              </div>

              {/* ── Campaign Preview ── */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiList className="w-4 h-4" /> Campaign Preview
                </label>
                <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-3 flex flex-col sm:flex-row gap-5 hover:border-indigo-200 transition-colors shadow-sm">
                  {/* Image */}
                  <div className="w-full sm:w-48 aspect-video sm:aspect-square bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50 border border-slate-100">
                        <FiImage className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 py-2 pr-2">
                    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
                    {description && (
                      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                        {description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {reward && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200/60">
                          <FiGift className="w-3.5 h-3.5" /> {reward}
                        </span>
                      )}
                      {features?.shareCount && (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200/60">
                          <FiShare2 className="w-3.5 h-3.5" /> {shareCount} Shares
                        </span>
                      )}
                      {features?.tasks && tasks?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-200/60">
                          <FiList className="w-3.5 h-3.5" /> {tasks.length} Tasks
                        </span>
                      )}
                      {features?.finalUrl && finalUrl && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200/60">
                          <FiLink className="w-3.5 h-3.5" /> Link Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push(`/${templateSlug || 'campaign'}/${campaignId}`)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <FiExternalLink className="w-4 h-4" /> View Campaign
                </button>
                <button
                  onClick={() => router.push('/stats')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <FiBarChart2 className="w-4 h-4" /> View Analytics
                </button>
                <button
                  onClick={() => router.push('/create')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
                >
                  <FiPlus className="w-4 h-4" /> Create Another
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}