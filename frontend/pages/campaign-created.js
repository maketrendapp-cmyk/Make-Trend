
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
    setMessage('Copied successfully!');
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
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            <FaRocket className="text-indigo-600 w-4 h-4 animate-pulse" />
          </div>
          <p className="mt-4 text-slate-500 font-medium text-sm animate-pulse">Finalizing campaign...</p>
        </div>
      </>
    );
  }

  // ── NO ID PROVIDED ──
  if (!id) {
    return (
      <>
        <Meta title="Create a Campaign" />
        <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-slate-50 py-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <FaRocket className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">Create Your First Campaign</h1>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              You haven't created a campaign yet. Start building your viral reward campaign right now!
            </p>
            <button
              onClick={() => router.push('/create')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all duration-200"
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
        <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-slate-50 py-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <FiAlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Campaign Not Found</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {error || 'This campaign does not exist or may have been securely removed.'}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => router.push('/create')}
                className="w-full px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
              >
                Create New Campaign
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Return Home
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
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-3 sm:p-6">
        <div className="max-w-xl w-full">

          {/* ── Main Compact Success Card ── */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col">
            
            {/* ── Sleek Horizontal Header ── */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner relative z-10">
                <FiCheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="relative z-10">
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">Campaign is Live!</h1>
                <p className="text-indigo-100 text-xs sm:text-sm font-medium mt-0.5">
                  Your viral campaign is ready to launch.
                </p>
              </div>
            </div>

            {/* ── Card Body (Tightly Spaced) ── */}
            <div className="p-5 sm:p-6 space-y-5">
              
              {/* ── Share URL ── */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FiLink className="w-3.5 h-3.5" /> Share URL
                  </label>
                  {message && (
                    <span className="text-[11px] font-bold text-emerald-500 animate-pulse">{message}</span>
                  )}
                </div>
                <div className="flex items-center p-1.5 bg-slate-50 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 w-full min-w-0 bg-transparent outline-none text-sm font-semibold text-slate-700 truncate px-3"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm whitespace-nowrap ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {copied ? <FiCheckCircle className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
                    <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* ── Compact Horizontal Preview ── */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <FiList className="w-3.5 h-3.5" /> Preview
                </label>
                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  {/* Image Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                    {image ? (
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <FiImage className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate mb-1.5">{title}</h3>
                    
                    {/* Compact Badges Row */}
                    <div className="flex flex-wrap gap-1.5">
                      {reward && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border border-amber-200/50 truncate max-w-full">
                          <FiGift className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{reward}</span>
                        </span>
                      )}
                      {features?.shareCount && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border border-blue-200/50 whitespace-nowrap">
                          <FiShare2 className="w-3 h-3" /> {shareCount}
                        </span>
                      )}
                      {features?.tasks && tasks?.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border border-purple-200/50 whitespace-nowrap">
                          <FiList className="w-3 h-3" /> {tasks.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Smart Action Grid ── */}
              <div className="pt-2 flex flex-col gap-2.5">
                {/* Primary Button (Full Width) */}
                <button
                  onClick={() => router.push(`/${templateSlug || 'campaign'}/${campaignId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
                >
                  <FiExternalLink className="w-4 h-4" /> View Campaign Live
                </button>
                
                {/* Secondary Buttons (Side-by-side) */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => router.push('/stats')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100/50"
                  >
                    <FiBarChart2 className="w-4 h-4" /> Analytics
                  </button>
                  <button
                    onClick={() => router.push('/create')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" /> New
                  </button>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
