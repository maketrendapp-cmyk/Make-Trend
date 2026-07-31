
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
      if (data && data.success) {
        setCampaign(data.campaign);
      } else {
        setError(data?.error || 'Failed to load campaign');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Could not load campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!campaign) return;
    const templateSlug = campaign.templateSlug || 'campaign';
    const campaignId = campaign.id || id;
    const shareUrl = `${window.location.origin}/${templateSlug}?id=${campaignId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setMessage('Copied!');
    setTimeout(() => {
      setCopied(false);
      setMessage('');
    }, 2500);
  };

  // ── LOADING STATE ──
  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign..." />
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4 overflow-hidden">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            <FaRocket className="text-indigo-600 w-4 h-4 animate-pulse" />
          </div>
          <p className="mt-3 text-slate-500 font-bold text-xs tracking-wide animate-pulse">Finalizing setup...</p>
        </div>
      </>
    );
  }

  // ── NO ID PROVIDED ──
  if (!id) {
    return (
      <>
        <Meta title="Create a Campaign" />
        <div className="h-[100dvh] flex items-center justify-center px-4 bg-slate-50 overflow-hidden">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaRocket className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900 mb-1">Create Your First Campaign</h1>
            <p className="text-slate-500 text-xs mb-6">
              You haven't created a campaign yet. Start building your viral campaign now!
            </p>
            <button
              onClick={() => router.push('/create')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20"
            >
              <FiPlus className="w-4 h-4" /> Start Building
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
        <div className="h-[100dvh] flex items-center justify-center px-4 bg-slate-50 overflow-hidden">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Campaign Not Found</h2>
            <p className="text-slate-500 text-xs mb-6">
              {error || 'This campaign does not exist or may have been securely removed.'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push('/create')}
                className="w-full px-4 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20"
              >
                Create New Campaign
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition"
              >
                Return Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── SUCCESS STATE ──
  const title = campaign?.title || 'Untitled Campaign';
  const description = campaign?.description || '';
  const reward = campaign?.reward || '';
  const shareCount = campaign?.shareCount || 0;
  const tasks = campaign?.tasks || [];
  const templateSlug = campaign?.templateSlug || 'campaign';
  const campaignId = campaign?.id || id;
  const image = campaign?.image || '';

  const fullUrl = `${window.location.origin}/${templateSlug}?id=${campaignId}`;

  return (
    <>
      <Meta title="🎉 Campaign Live | MakeTrend" />
      {/* Container locks viewport height, prevents scrolling */}
      <div className="h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        <div className="max-w-[420px] w-full mx-auto">

          {/* ── Main Compact Viewport-Locked Card ── */}
          <div className="bg-white rounded-[1.5rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 overflow-hidden flex flex-col max-h-[95dvh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 px-5 py-4 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                <FiCheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-white leading-tight truncate">Campaign is Live!</h1>
                <p className="text-indigo-100 text-[11px] font-semibold truncate mt-0.5">Your viral link is ready to share.</p>
              </div>
            </div>

            {/* Body - highly optimized vertical spacing to fit without scrolling */}
            <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
              
              {/* Share URL */}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FiLink className="w-3.5 h-3.5" /> Share URL
                  </label>
                  {message && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md animate-pulse">
                      {message}
                    </span>
                  )}
                </div>
                <div className="flex items-center p-1 bg-slate-50/80 rounded-xl border border-slate-200/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 min-w-0 bg-transparent outline-none text-[13px] font-bold text-slate-700 truncate px-3 py-1.5"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${
                      copied ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                    }`}
                  >
                    {copied ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Exact-Fit "Gallery Style" Image Box + Title/Desc Layout */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <FiList className="w-3.5 h-3.5" /> Preview Widget
                </label>
                <div className="bg-white rounded-[1.25rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  
                  {/* Image Container: Light background prevents ugly black bars. object-contain keeps the image full without cropping */}
                  <div className="w-full h-32 sm:h-36 bg-slate-50/50 border-b border-slate-100 flex items-center justify-center p-1.5">
                    {image ? (
                      <img 
                        src={image} 
                        alt="Campaign Preview" 
                        className="w-full h-full object-contain rounded-lg drop-shadow-sm" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <FiImage className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-semibold">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Compact Details */}
                  <div className="p-3 bg-white">
                    <h3 className="text-[13px] sm:text-sm font-black text-slate-900 truncate mb-0.5">{title}</h3>
                    {description && (
                      <p className="text-[11px] text-slate-500 truncate mb-2">{description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {reward && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-200/50 truncate max-w-[140px]">
                          <FiGift className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{reward}</span>
                        </span>
                      )}
                      {shareCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-200/50">
                          <FiShare2 className="w-3 h-3" /> {shareCount}
                        </span>
                      )}
                      {tasks?.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-purple-200/50">
                          <FiList className="w-3 h-3" /> {tasks.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Action Buttons Grid (Two rows to save vertical space) */}
              <div className="flex flex-col gap-2 pt-1 pb-1">
                <button
                  onClick={() => router.push(`/${templateSlug}?id=${campaignId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-slate-800 transition shadow-md shadow-slate-900/10"
                >
                  <FiExternalLink className="w-4 h-4" /> View Campaign Live
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/stats')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 text-indigo-700 text-[12px] font-bold rounded-xl hover:bg-indigo-100 transition border border-indigo-100/50"
                  >
                    <FiBarChart2 className="w-3.5 h-3.5" /> Analytics
                  </button>
                  <button
                    onClick={() => router.push('/create')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-700 text-[12px] font-bold rounded-xl hover:bg-slate-200 transition"
                  >
                    <FiPlus className="w-3.5 h-3.5" /> New Campaign
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
