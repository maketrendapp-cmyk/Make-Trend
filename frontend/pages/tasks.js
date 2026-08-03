// pages/tasks.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Script from 'next/script';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { withCampaignMeta } from '../lib/withCampaignMeta';
import { fetchCampaign } from '../lib/fetchCampaign';
import { getDeviceId, refreshDeviceId } from '../utils/deviceId';
import {
  FaYoutube,
  FaTwitter,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaLink,
  FaCheckCircle,
  FaClock,
  FaExternalLinkAlt,
  FaTimes
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

// ── Default Meta ──
const defaultMeta = {
  title: 'Complete Tasks – Unlock Your Reward',
  description: 'Complete the required tasks to unlock your reward. Quick and easy steps to claim your prize!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/tasks?id={id}',
};

const campaignQueryKey = (id) => ['campaign', id];

// ─── AD COMPONENTS ───
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

function CampaignTasks({ campaign: initialCampaign }) {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();

  const [completedIndices, setCompletedIndices] = useState([]);
  const [pendingIndex, setPendingIndex] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStickyAd, setShowStickyAd] = useState(true);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const viewTrackedRef = useRef(false); // ── NEW: prevent multiple view calls

  // ── React Query ──
  const { data: campaign, isLoading } = useQuery({
    queryKey: campaignQueryKey(id),
    queryFn: () => fetchCampaign(id),
    initialData: initialCampaign,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    enabled: !!id,
  });

  // ── Track view with 2‑second delay ──
  useEffect(() => {
    if (!campaign?.id || viewTrackedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const deviceId = await refreshDeviceId();
        if (!deviceId) return;
        await fetch(`${BACKEND_URL}/api/campaigns/${campaign.id}/view`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // 👈 sends device token cookie
  body: JSON.stringify({ deviceId }),
});
        viewTrackedRef.current = true;
        console.log(`📊 View recorded for campaign ${campaign.id}`);
      } catch (e) {
        console.warn('View tracking failed:', e);
      }
    }, 2000); // ── 2‑second delay

    return () => clearTimeout(timer);
  }, [campaign]);

  // ── Redirect if no tasks ──
  useEffect(() => {
    if (campaign && (!campaign.tasks || campaign.tasks.length === 0)) {
      router.push(`/share?id=${id}`);
    }
  }, [campaign, id]);

  // ── Refresh fingerprint on mount ──
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

  // ── Cleanup timers ──
  useEffect(() => {
    return () => cleanupTimers();
  }, []);

  const cleanupTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  const startCountdown = (index) => {
    cleanupTimers();
    setPendingIndex(index);
    setCountdown(6);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          completeTask(index);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeTask = (index) => {
    cleanupTimers();
    if (!completedIndices.includes(index)) {
      setCompletedIndices((prev) => [...prev, index]);
    }
    setPendingIndex(null);
    setCountdown(0);
  };

  const handleOpenTask = (index, url) => {
    if (completedIndices.includes(index)) return;
    if (pendingIndex === index) return;
    window.open(url, '_blank');
    startCountdown(index);
  };

  const handleContinueToShare = async () => {
    const tasks = campaign?.tasks || [];
    const allCompleted = completedIndices.length === tasks.length;
    if (!allCompleted) return;

    setIsSubmitting(true);
    try {
      const deviceId = await refreshDeviceId();
      await fetch(`${BACKEND_URL}/api/campaigns/${id}/unlock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // 👈 sends device token cookie
  body: JSON.stringify({ deviceId }),
});
      queryClient.invalidateQueries(campaignQueryKey(id));
    } catch (err) {
      console.error('Unlock error:', err);
    } finally {
      setIsSubmitting(false);
      router.push(`/share?id=${id}`);
    }
  };

  const getPlatformIcon = (url) => {
    if (!url) return <FaLink className="text-gray-400" />;
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return <FaYoutube className="text-red-600" />;
    if (lower.includes('twitter.com') || lower.includes('x.com')) return <FaTwitter className="text-blue-400" />;
    if (lower.includes('instagram.com')) return <FaInstagram className="text-pink-600" />;
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return <FaFacebook className="text-blue-700" />;
    if (lower.includes('tiktok.com')) return <FaTiktok className="text-black" />;
    return <FaLink className="text-gray-400" />;
  };

  if (isLoading && !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
          <p className="text-gray-500">The campaign you're looking for doesn't exist.</p>
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

  const tasks = campaign?.tasks || [];
  const allCompleted = tasks.length > 0 && completedIndices.length === tasks.length;
  const progress = tasks.length > 0 ? (completedIndices.length / tasks.length) * 100 : 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 px-4 sm:py-6 sm:px-6 lg:px-8 pb-32">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-3 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          {/* TOP BANNER */}
          <div className="my-4 w-full overflow-hidden max-w-full">
            <IframeAd adKey="bd8fef55bf7ce9cf90e7c6aa9b2a7703" width={728} height={90} />
          </div>

          {/* Hero Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md">
            <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-gray-200">
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
                  🎯
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
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200">
                  📋 {completedIndices.length}/{tasks.length} tasks
                </span>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>📋</span> Complete Tasks To Claim
              </h2>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {completedIndices.length}/{tasks.length}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tasks to complete.</div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task, index) => {
                  const isCompleted = completedIndices.includes(index);
                  const isPending = pendingIndex === index;

                  return (
                    <React.Fragment key={index}>
                      <div
                        className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                          isCompleted
                            ? 'bg-green-50/80 border-green-200'
                            : isPending
                            ? 'bg-amber-50/80 border-amber-300 shadow-sm shadow-amber-100/50'
                            : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100/60'
                        }`}
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg bg-white shadow-sm border border-gray-200">
                          {isCompleted ? (
                            <FaCheckCircle className="text-green-500 text-xl" />
                          ) : isPending ? (
                            <FaClock className="text-amber-500 text-xl animate-pulse" />
                          ) : (
                            getPlatformIcon(task.url)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-medium transition-all duration-300 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {task.text}
                            </p>
                            {isPending && (
                              <span className="text-[10px] font-medium bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                                ⏳ Verifying {countdown}s
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-[10px] font-medium bg-green-200 text-green-700 px-2 py-0.5 rounded-full">
                                ✅ Done
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                              Completed
                            </span>
                          ) : isPending ? (
                            <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center text-sm font-bold text-amber-600 bg-white animate-pulse">
                              {countdown}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenTask(index, task.url)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm active:scale-[0.97]"
                            >
                              <FaExternalLinkAlt className="w-3 h-3" />
                              Open
                            </button>
                          )}
                        </div>
                      </div>

                      {index === 0 && tasks.length >= 2 && <NativeAd />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            <div className="mt-8">
              <button
                onClick={handleContinueToShare}
                disabled={!allCompleted || isSubmitting}
                className={`w-full inline-flex items-center justify-center px-6 py-3.5 font-semibold rounded-2xl transition-all duration-300 shadow-sm ${
                  allCompleted && !isSubmitting
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md hover:scale-[1.01] active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  '🎁 Claim Reward'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Ad */}
      {showStickyAd && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-2 sm:pb-4">
          <div className="bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-1.5 sm:p-2 rounded-xl pointer-events-auto border border-gray-200/50 relative mx-auto w-[calc(100vw-16px)] sm:w-auto sm:max-w-[760px]">
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

      {/* Global Scripts */}
      <Script
        id="popunder-ad"
        src="https://pl30634061.effectivecpmnetwork.com/8e/bb/ac/8ebbac19d902ee907cd27ffdddc2ac6b.js"
        strategy="afterInteractive"
      />
      <Script
        id="social-bar-ad"
        src="https://pl30631129.effectivecpmnetwork.com/05/02/b9/0502b976b36284a7767fd6cb4ce00971.js"
        strategy="afterInteractive"
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}

export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

export default withCampaignMeta(CampaignTasks, defaultMeta);