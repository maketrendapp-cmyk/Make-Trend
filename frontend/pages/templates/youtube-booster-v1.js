// pages/templates/youtube-booster-v1.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaYoutube,
  FaCheckCircle,
  FaShieldAlt,
  FaUserCheck,
  FaVideo,
  FaThumbsUp,
  FaUsers,
  FaEye,
  FaRocket,
  FaArrowRight,
  FaArrowLeft,
  FaCrown,
  FaBolt,
  FaStar,
  FaFire,
  FaGem,
} from 'react-icons/fa';

const TYPE_ICONS = {
  subscribers: FaUsers,
  views: FaEye,
  likes: FaThumbsUp,
};

const TYPE_LABELS = {
  subscribers: 'Subscribers',
  views: 'Video Views',
  likes: 'Likes',
};

const TYPE_DESCRIPTIONS = {
  subscribers: 'Grow your audience with real subscribers',
  views: 'Boost your video reach with real views',
  likes: 'Increase engagement with real likes',
};

const AMOUNTS = ['1K', '10K', '20K', '35K', '50K', '100K'];

function YoutubeBoosterV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

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
  const [usernameError, setUsernameError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const audioCtx = useRef(null);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (ua.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Live counter ──
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + Math.floor(Math.random() * 45) + 15);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // ── Load saved data ──
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

  // ── Step 1: handle username ──
  const handleUsernameSubmit = () => {
    const clean = username.trim().replace(/^@/, '').toLowerCase();
    if (!clean) {
      setUsernameError(true);
      return;
    }
    setUsernameError(false);
    localStorage.setItem('youtube_username', clean);
    setProfileBadgeVisible(true);
    setStep(2);
  };

  // ── Final: redirect ──
  const handleFinal = () => {
    if (selectedType !== 'subscribers' && !videoUrl) {
      setVideoError(true);
      return;
    }
    setVideoError(false);
    setLoading(true);
    localStorage.setItem('youtube_type', selectedType);
    localStorage.setItem('youtube_amount', selectedAmount);
    if (videoUrl) localStorage.setItem('youtube_video_url', videoUrl);

    if (!id) {
      router.push('/create');
      return;
    }
    router.push(`/tasks?id=${id}`);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#120000] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Premium Background Effects ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-red-500/30 to-blue-400/20 animate-float"
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 15 + 10 + 's',
              animationDelay: Math.random() * 12 + 's',
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl shadow-red-500/20"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-400 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-red-500/30">
                🌐
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Open in Browser</h2>
              <p className="text-gray-400 text-sm mb-6">For the best experience, open this page in your default browser.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setShowWebViewModal(false);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-xl transition border border-white/10"
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
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-red-500/30"
                >
                  🚀 Open in Browser
                </button>
                <button
                  onClick={() => setShowWebViewModal(false)}
                  className="text-gray-500 text-sm hover:text-white transition"
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

        {/* ── Premium Header ── */}
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 rounded-2xl blur-xl opacity-50" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-red-600 to-red-400 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <FaYoutube className="text-white text-2xl" />
              </div>
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">
                YouTube<span className="bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">Boost</span>
              </div>
              <div className="text-xs text-gray-500">Premium Growth Suite</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {profileBadgeVisible && (
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-400 flex items-center justify-center text-white text-xs font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium text-sm">@{username}</span>
              </div>
            )}
            <div className="bg-gradient-to-r from-red-600/20 to-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-white font-bold text-sm">{liveCount.toLocaleString()}</span>
              <span className="text-gray-400 text-xs">Live</span>
            </div>
          </motion.div>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div className={`w-12 h-0.5 rounded-full transition-all ${
                  step > s ? 'bg-gradient-to-r from-red-600 to-red-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl shadow-black/50"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/20 rounded-full px-4 py-1.5 text-xs font-medium text-red-400 mb-4">
                <FaBolt className="text-red-400" /> Instant Growth
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                <span className="text-white">Get YouTube</span>
                <br />
                <span className="bg-gradient-to-r from-white via-red-400 to-red-500 bg-clip-text text-transparent">Growth Instantly</span>
              </h1>
              <p className="text-gray-400 text-lg mt-3 font-medium">Boost your channel with real engagement</p>
            </div>

            <div className={`flex items-center bg-black/40 border rounded-2xl p-1 transition-all ${
              usernameError ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/10 focus-within:ring-2 focus-within:ring-red-500'
            }`}>
              <span className="pl-4 text-2xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s/g, '').toLowerCase());
                  setUsernameError(false);
                }}
                placeholder="channel handle"
                className="w-full bg-transparent border-none outline-none text-white text-lg font-medium p-4 placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                autoFocus
              />
            </div>
            {usernameError && (
              <p className="text-red-400 text-sm mt-2">Please enter your channel handle</p>
            )}

            <button
              onClick={handleUsernameSubmit}
              className="mt-6 w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 group"
            >
              Continue
              <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-6 flex justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500 text-sm" /> Free</div>
              <div className="flex items-center gap-1.5"><FaShieldAlt className="text-blue-400 text-sm" /> Secure</div>
              <div className="flex items-center gap-1.5"><FaUserCheck className="text-green-400 text-sm" /> Guaranteed</div>
            </div>
          </motion.div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl shadow-black/50"
          >
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm mb-4"
            >
              <FaArrowLeft className="text-xs" /> Back
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Choose Your Growth</h2>
              <p className="text-gray-400 text-sm">Select the type and amount of engagement</p>
            </div>

            {/* ── Type Selector ── */}
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
                    className={`p-4 rounded-2xl border-2 transition-all group ${
                      isActive
                        ? 'border-red-500 bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-lg shadow-red-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`text-3xl mx-auto mb-2 ${isActive ? 'text-red-500' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    <span className={`font-semibold capitalize text-sm block ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                      {TYPE_LABELS[type]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Amount Chips ── */}
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-3 text-center">Select amount</p>
              <div className="flex flex-wrap justify-center gap-2">
                {AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`px-5 py-2 rounded-full border-2 transition-all font-bold text-sm ${
                      selectedAmount === amount
                        ? 'border-red-500 bg-red-500/20 text-white shadow-lg shadow-red-500/20'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Video URL ── */}
            {(selectedType === 'views' || selectedType === 'likes') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Video URL</label>
                <div className={`flex items-center bg-black/40 border rounded-2xl p-1 transition-all ${
                  videoError ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/10 focus-within:ring-2 focus-within:ring-blue-400'
                }`}>
                  <FaVideo className={`ml-3 text-xl ${videoError ? 'text-red-400' : 'text-blue-400'}`} />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      setVideoError(false);
                    }}
                    placeholder="Paste video URL (required)"
                    className="w-full bg-transparent border-none outline-none text-white text-sm p-3 placeholder-gray-500"
                  />
                </div>
                {videoError && (
                  <p className="text-red-400 text-sm mt-1">Please enter a valid YouTube video URL</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Required for Views & Likes</p>
              </div>
            )}

            {/* ── Summary ── */}
            <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/5">
              <div>
                <p className="text-xs text-gray-400">Selected Package</p>
                <p className="text-white font-semibold">
                  {selectedAmount} {TYPE_LABELS[selectedType]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-green-400 font-semibold text-sm">✓ Ready</p>
              </div>
            </div>

            <button
              onClick={handleFinal}
              disabled={loading}
              className={`w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              } group`}
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
                  <FaRocket className="text-lg group-hover:scale-110 transition-transform" />
                  Start Growing Now
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ── Trust Footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="flex flex-wrap justify-center gap-6 text-gray-500 text-xs">
            <div className="flex items-center gap-2"><FaCheckCircle className="text-green-500 text-sm" /> Instant Delivery</div>
            <div className="flex items-center gap-2"><FaShieldAlt className="text-blue-400 text-sm" /> 100% Safe</div>
            <div className="flex items-center gap-2"><FaUserCheck className="text-green-400 text-sm" /> Real Engagement</div>
            <div className="flex items-center gap-2"><FaCrown className="text-yellow-500 text-sm" /> Premium Quality</div>
          </div>
          <div className="text-xs text-gray-600 mt-3">⭐ Trusted by 1M+ creators worldwide • Free forever</div>
        </motion.div>
      </div>

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

export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

export default withCampaignMeta(YoutubeBoosterV1, {
  title: 'YouTube Booster – Free Subscribers, Views & Likes',
  description: 'Instantly grow your YouTube channel with free subscribers, views, and likes. Safe, fast, and 100% guaranteed.',
  image: 'https://maketrend.vercel.app/og-youtube-booster.jpg',
  url: 'https://maketrend.vercel.app/youtube-booster-v1?id={id}',
});