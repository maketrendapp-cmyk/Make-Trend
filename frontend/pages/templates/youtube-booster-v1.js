// pages/templates/youtube-booster-v1.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import { FaYoutube, FaCheckCircle, FaShieldAlt, FaUserCheck, FaVideo, FaThumbsUp, FaUsers, FaEye, FaRocket, FaArrowRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICONS = {
  subscribers: FaUsers,
  views: FaEye,
  likes: FaThumbsUp,
};

const AMOUNTS = ['1K', '10K', '20K', '35K', '50K', '100K'];

function YoutubeBoosterV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query; // campaign ID (may be undefined)

  // ── State ──
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [selectedType, setSelectedType] = useState('subscribers');
  const [selectedAmount, setSelectedAmount] = useState('1K');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [liveCount, setLiveCount] = useState(9999);
  const [profileBadgeVisible, setProfileBadgeVisible] = useState(false);

  const audioCtx = useRef(null);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (ua.indexOf('wv') > -1);
    if (isWebView) {
      setShowWebViewModal(true);
    }
  }, []);

  // ── Live counter ──
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + Math.floor(Math.random() * 45) + 15);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // ── Load saved data from localStorage ──
  useEffect(() => {
    const savedUsername = localStorage.getItem('youtube_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setProfileBadgeVisible(true);
      setStep(2);
    }
    const savedType = localStorage.getItem('youtube_type');
    if (savedType) setSelectedType(savedType);
    const savedAmount = localStorage.getItem('youtube_amount');
    if (savedAmount) setSelectedAmount(savedAmount);
    const savedUrl = localStorage.getItem('youtube_video_url');
    if (savedUrl) setVideoUrl(savedUrl);
  }, []);

  // ── Step 1: handle username submission ──
  const handleUsernameSubmit = () => {
    const clean = username.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return; // validation feedback handled in UI
    localStorage.setItem('youtube_username', clean);
    setProfileBadgeVisible(true);
    setStep(2);
  };

  // ── Final: redirect to tasks (if id exists) or to /create (if no id) ──
  const handleFinal = async () => {
    if (selectedType !== 'subscribers' && !videoUrl) {
      // validation feedback handled in UI
      return;
    }
    setLoading(true);
    localStorage.setItem('youtube_type', selectedType);
    localStorage.setItem('youtube_amount', selectedAmount);
    if (videoUrl) localStorage.setItem('youtube_video_url', videoUrl);

    // ── If no campaign id, go to /create (SPA) ──
    if (!id) {
      router.push('/create');
      return;
    }
    // Otherwise go to tasks
    router.push(`/tasks?id=${id}`);
  };

  // ── Helper: play sound on step transition ──
  const playClick = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      osc.type = 'sine';
      osc.frequency.value = 560;
      gain.gain.value = 0.08;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + 0.2);
      osc.stop(audioCtx.current.currentTime + 0.25);
    } catch (e) {}
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0000] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Background particles ── */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-red-600 to-blue-400 opacity-0 animate-float"
            style={{
              width: Math.random() * 8 + 4 + 'px',
              height: Math.random() * 8 + 4 + 'px',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 12 + 8 + 's',
              animationDelay: Math.random() * 10 + 's',
              top: '100%',
            }}
          />
        ))}
      </div>

      {/* ── WebView Modal ── */}
      <AnimatePresence>
        {showWebViewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border border-red-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="text-5xl mb-4">🌐</div>
              <h2 className="text-2xl font-bold text-white mb-2">Open in Browser</h2>
              <p className="text-gray-400 text-sm mb-6">This page works best in a full browser. Please open it in your default browser.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setShowWebViewModal(false);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition"
                >
                  📋 Copy Link
                </button>
                <button
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.userAgent.includes('Android')) {
                      window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`;
                    } else {
                      window.open(url, '_system');
                    }
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg"
                >
                  🚀 Open in Browser
                </button>
                <button
                  onClick={() => setShowWebViewModal(false)}
                  className="text-gray-400 text-sm hover:text-white transition"
                >
                  Continue Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Container ── */}
      <div className="relative z-10 w-full max-w-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
              <FaYoutube className="text-white text-3xl" />
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">YouTube<span className="text-red-500">Boost</span></div>
              <div className="text-xs text-gray-400">Grow your channel</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profileBadgeVisible && (
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium text-sm">@{username}</span>
              </div>
            )}
            <div className="bg-red-600/20 backdrop-blur-sm border border-red-500/30 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-white font-bold text-sm">{liveCount.toLocaleString()}</span>
              <span className="text-gray-400 text-xs">Active</span>
            </div>
          </div>
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-red-400 to-blue-400 bg-clip-text text-transparent leading-tight">
                Get YouTube Growth<br />Instantly
              </h1>
              <p className="text-gray-400 text-lg mt-2 font-medium">Boost your channel with real engagement</p>
            </div>
            <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-red-500 transition">
              <span className="pl-4 text-2xl font-bold text-red-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                placeholder="channel handle"
                className="w-full bg-transparent border-none outline-none text-white text-lg font-medium p-4 placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                autoFocus
              />
            </div>
            <button
              onClick={handleUsernameSubmit}
              className="mt-6 w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
            >
              Continue <FaArrowRight className="text-sm" />
            </button>
          </motion.div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-center text-white mb-6">Choose Your Growth</h2>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {['subscribers', 'views', 'likes'].map((type) => {
                const Icon = TYPE_ICONS[type];
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      playClick();
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      isActive
                        ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`text-3xl ${isActive ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`font-semibold capitalize ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {type}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Amount chips */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`px-5 py-2 rounded-full border-2 transition-all font-bold ${
                    selectedAmount === amount
                      ? 'border-red-500 bg-red-500/20 text-white shadow-lg shadow-red-500/20'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Video URL (only for views/likes) */}
            {(selectedType === 'views' || selectedType === 'likes') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Video URL</label>
                <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-blue-400 transition">
                  <FaVideo className="text-blue-400 ml-3 text-xl" />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste video URL (required)"
                    className="w-full bg-transparent border-none outline-none text-white text-sm p-3 placeholder-gray-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Required for Views & Likes</p>
              </div>
            )}

            <button
              onClick={handleFinal}
              disabled={loading}
              className={`w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <FaRocket className="text-lg" /> Start Growing
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ── Footer features ── */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-gray-400 text-sm">
          <div className="flex items-center gap-2"><FaCheckCircle className="text-red-500" /> Fast delivery</div>
          <div className="flex items-center gap-2"><FaShieldAlt className="text-blue-400" /> Safe & secure</div>
          <div className="flex items-center gap-2"><FaUserCheck className="text-green-400" /> 100% Guarantee</div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-4">Million Of Users • Free Forever</div>
      </div>

      {/* Tailwind custom animations (if not already defined) */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(100%) scale(0); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.5); opacity: 0; }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}

// ── Server‑Side Props ──
export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

// ── Wrap with Meta ──
export default withCampaignMeta(YoutubeBoosterV1, {
  title: 'YouTube Booster – Free Subscribers, Views & Likes',
  description: 'Instantly grow your YouTube channel with free subscribers, views, and likes. Safe, fast, and 100% guaranteed.',
  image: 'https://maketrend.vercel.app/og-youtube-booster.jpg',
  url: 'https://maketrend.vercel.app/youtube-booster-v1?id={id}',
});