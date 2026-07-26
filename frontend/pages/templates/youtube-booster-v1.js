// pages/templates/youtube-booster-v1.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
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
  FaInfinity,
} from 'react-icons/fa';

// ── Constants ──
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

  // ── Handlers ──
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

  // ── Render ──
  return (
    <div className="page-wrapper">

      {/* ── WEBVIEW MODAL (overlay) ── */}
      {showWebViewModal && (
        <div className="webview-modal-overlay">
          <div className="webview-modal-card">
            <div className="modal-icon">🌐</div>
            <h2>Open in Browser</h2>
            <p>For the best experience, open this page in your default browser.</p>
            <div className="modal-actions">
              <button
                className="modal-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  setShowWebViewModal(false);
                }}
              >
                📋 Copy Link
              </button>
              <button
                className="modal-btn primary"
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.userAgent.includes('Android')) {
                    window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`;
                  } else {
                    window.open(url, '_system');
                  }
                }}
              >
                🚀 Open in Browser
              </button>
            </div>
            <button
              className="modal-btn ghost"
              onClick={() => setShowWebViewModal(false)}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="header-left">
          <div className="logo-icon">
            <FaYoutube className="text-red-500 text-3xl" />
          </div>
          <div className="logo-text">
            <span className="brand">YouTube<span>Boost</span></span>
            <span className="tagline">Premium Growth Suite</span>
          </div>
        </div>
        <div className="header-right">
          {profileBadgeVisible && (
            <div className="profile-badge">
              <span className="avatar">{username.charAt(0).toUpperCase()}</span>
              <span className="handle">@{username}</span>
            </div>
          )}
          <div className="live-counter">
            <span className="live-dot"></span>
            <span className="count">{liveCount.toLocaleString()}</span>
            <span className="label">Live</span>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTAINER ─── */}
      <main className="main-container">
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step-line ${step > 1 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
        </div>

        {/* Step 1: Enter Channel */}
        {step === 1 && (
          <div className="step-panel">
            <div className="step-header">
              <div className="badge">
                <FaBolt className="icon" /> Instant Growth
              </div>
              <h1>Get YouTube<br /><span>Growth Instantly</span></h1>
              <p>Boost your channel with real engagement</p>
            </div>

            <div className="input-group">
              <span className="at-sign">@</span>
              <input
                type="text"
                placeholder="channel handle"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s/g, '').toLowerCase());
                  setUsernameError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                className={usernameError ? 'error' : ''}
                autoFocus
              />
            </div>
            {usernameError && <p className="error-message">Please enter your channel handle</p>}

            <button className="btn-primary" onClick={handleUsernameSubmit}>
              Continue <FaArrowRight className="arrow" />
            </button>

            <div className="trust-badges">
              <span><FaCheckCircle className="icon" /> Free</span>
              <span><FaShieldAlt className="icon" /> Secure</span>
              <span><FaUserCheck className="icon" /> Guaranteed</span>
            </div>
          </div>
        )}

        {/* Step 2: Choose Package */}
        {step === 2 && (
          <div className="step-panel">
            <button className="back-btn" onClick={() => setStep(1)}>
              <FaArrowLeft /> Back
            </button>

            <h2>Choose Your Growth</h2>
            <p className="sub">Select the type and amount of engagement</p>

            <div className="type-grid">
              {['subscribers', 'views', 'likes'].map((type) => {
                const Icon = TYPE_ICONS[type];
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    className={`type-card ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedType(type);
                      playClick();
                    }}
                  >
                    <Icon className="type-icon" />
                    <span className="type-label">{TYPE_LABELS[type]}</span>
                  </button>
                );
              })}
            </div>

            <div className="amount-section">
              <p className="amount-label">Select amount</p>
              <div className="amount-chips">
                {AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    className={`chip ${selectedAmount === amount ? 'active' : ''}`}
                    onClick={() => setSelectedAmount(amount)}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {(selectedType === 'views' || selectedType === 'likes') && (
              <div className="video-section">
                <label>YouTube Video URL</label>
                <div className={`video-input ${videoError ? 'error' : ''}`}>
                  <FaVideo className="icon" />
                  <input
                    type="url"
                    placeholder="Paste video URL (required)"
                    value={videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      setVideoError(false);
                    }}
                  />
                </div>
                {videoError && <p className="error-message">Please enter a valid YouTube video URL</p>}
              </div>
            )}

            <div className="summary">
              <div>
                <p className="label">Selected Package</p>
                <p className="value">{selectedAmount} {TYPE_LABELS[selectedType]}</p>
              </div>
              <div className="status">
                <p className="label">Status</p>
                <p className="value ready">✓ Ready</p>
              </div>
            </div>

            <button
              className="btn-primary btn-final"
              onClick={handleFinal}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Processing...
                </>
              ) : (
                <>
                  <FaRocket className="icon" /> Start Growing Now
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Trust */}
        <div className="footer-trust">
          <div className="trust-items">
            <span><FaCheckCircle className="icon" /> Instant Delivery</span>
            <span><FaShieldAlt className="icon" /> 100% Safe</span>
            <span><FaUserCheck className="icon" /> Real Engagement</span>
            <span><FaCrown className="icon" /> Premium Quality</span>
          </div>
          <p className="trust-note">
            <FaInfinity className="icon" /> Trusted by 1M+ creators worldwide • Free forever
          </p>
        </div>
      </main>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Reset & Base ── */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #0a0a0a;
          color: #fff;
          line-height: 1.5;
        }
        .page-wrapper {
          min-height: 100vh;
          background: radial-gradient(ellipse at 30% 20%, #1a0a0a 0%, #0a0a0a 70%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 1rem;
        }

        /* ── Header ── */
        .site-header {
          width: 100%;
          max-width: 720px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 2rem;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: #ff0000;
          border-radius: 12px;
          color: #fff;
        }
        .logo-text .brand {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .logo-text .brand span {
          color: #ff0000;
        }
        .logo-text .tagline {
          display: block;
          font-size: 0.65rem;
          color: #888;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .profile-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.05);
          padding: 0.25rem 0.75rem 0.25rem 0.5rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .profile-badge .avatar {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #ff0000, #cc0000);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          color: #fff;
          text-transform: uppercase;
        }
        .profile-badge .handle {
          font-size: 0.8rem;
          font-weight: 500;
          color: #ccc;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .live-counter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,0,0,0.08);
          border: 1px solid rgba(255,0,0,0.2);
          padding: 0.25rem 0.8rem;
          border-radius: 40px;
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #ff0000;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .live-counter .count {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .live-counter .label {
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #888;
        }

        /* ── Main Container ── */
        .main-container {
          width: 100%;
          max-width: 720px;
          flex: 1;
        }

        /* ── Step Indicator ── */
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2.5rem;
        }
        .step-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          color: #666;
          transition: all 0.3s;
        }
        .step-dot.active {
          background: #ff0000;
          border-color: #ff0000;
          color: #fff;
          box-shadow: 0 0 20px rgba(255,0,0,0.3);
        }
        .step-line {
          width: 50px;
          height: 2px;
          background: rgba(255,255,255,0.1);
          transition: background 0.4s;
        }
        .step-line.active {
          background: #ff0000;
        }

        /* ── Step Panels ── */
        .step-panel {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 32px;
          padding: 2rem 1.8rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: fadeUp 0.4s ease-out;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Step 1 */
        .step-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,0,0,0.12);
          border: 1px solid rgba(255,0,0,0.2);
          padding: 0.2rem 1rem;
          border-radius: 40px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #ff4444;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge .icon { font-size: 0.8rem; }
        .step-header h1 {
          font-size: 2.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin: 0.5rem 0 0.25rem;
        }
        .step-header h1 span {
          background: linear-gradient(135deg, #fff 30%, #ff0000 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .step-header p {
          color: #aaa;
          font-size: 1rem;
        }

        .input-group {
          display: flex;
          align-items: center;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 0.2rem 0.2rem 0.2rem 1rem;
          transition: border-color 0.3s;
        }
        .input-group:focus-within {
          border-color: #ff0000;
          box-shadow: 0 0 0 3px rgba(255,0,0,0.15);
        }
        .input-group .at-sign {
          font-size: 1.6rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ff0000, #cc0000);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-right: 0.25rem;
        }
        .input-group input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.9rem 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: #fff;
          outline: none;
        }
        .input-group input::placeholder {
          color: #666;
          font-weight: 400;
        }
        .input-group input.error {
          border-color: #ff4444;
        }
        .input-group.error {
          border-color: #ff4444;
          box-shadow: 0 0 0 3px rgba(255,68,68,0.15);
        }
        .error-message {
          color: #ff4444;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #ff0000, #cc0000);
          border: none;
          padding: 1rem;
          border-radius: 16px;
          font-weight: 700;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255,0,0,0.3);
        }
        .btn-primary .arrow {
          font-size: 0.9rem;
          transition: transform 0.2s;
        }
        .btn-primary:hover .arrow {
          transform: translateX(4px);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.5rem;
          font-size: 0.75rem;
          color: #888;
        }
        .trust-badges span {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .trust-badges .icon {
          font-size: 0.9rem;
        }

        /* Step 2 */
        .back-btn {
          background: none;
          border: none;
          color: #888;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.85rem;
          cursor: pointer;
          margin-bottom: 1rem;
          padding: 0;
        }
        .back-btn:hover {
          color: #fff;
        }
        .step-panel h2 {
          font-size: 1.6rem;
          font-weight: 800;
          text-align: center;
        }
        .step-panel .sub {
          text-align: center;
          color: #aaa;
          margin-bottom: 1.8rem;
        }

        .type-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.8rem;
          margin-bottom: 1.8rem;
        }
        .type-card {
          background: rgba(255,255,255,0.04);
          border: 2px solid transparent;
          border-radius: 16px;
          padding: 0.8rem 0.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .type-card:hover {
          background: rgba(255,255,255,0.08);
        }
        .type-card.active {
          border-color: #ff0000;
          background: rgba(255,0,0,0.08);
          box-shadow: 0 0 20px rgba(255,0,0,0.1);
        }
        .type-card .type-icon {
          font-size: 1.8rem;
          color: #888;
          margin-bottom: 0.2rem;
          transition: color 0.2s;
        }
        .type-card.active .type-icon {
          color: #ff0000;
        }
        .type-card .type-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #ccc;
        }
        .type-card.active .type-label {
          color: #fff;
        }

        .amount-section {
          margin-bottom: 1.8rem;
        }
        .amount-label {
          text-align: center;
          font-size: 0.75rem;
          color: #888;
          margin-bottom: 0.5rem;
        }
        .amount-chips {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
        }
        .chip {
          padding: 0.4rem 1rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #aaa;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip:hover {
          background: rgba(255,255,255,0.08);
        }
        .chip.active {
          background: #ff0000;
          border-color: #ff0000;
          color: #fff;
          box-shadow: 0 0 20px rgba(255,0,0,0.2);
        }

        .video-section {
          margin-bottom: 1.5rem;
        }
        .video-section label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #ddd;
          margin-bottom: 0.3rem;
        }
        .video-input {
          display: flex;
          align-items: center;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0.2rem 0.8rem;
          transition: border-color 0.3s;
        }
        .video-input:focus-within {
          border-color: #ff0000;
        }
        .video-input .icon {
          color: #888;
          font-size: 1.1rem;
          margin-right: 0.5rem;
        }
        .video-input input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.7rem 0;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
        }
        .video-input input::placeholder {
          color: #666;
        }
        .video-input.error {
          border-color: #ff4444;
        }

        .summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.04);
          padding: 0.8rem 1.2rem;
          border-radius: 14px;
          margin-bottom: 1.5rem;
        }
        .summary .label {
          font-size: 0.7rem;
          color: #888;
        }
        .summary .value {
          font-weight: 700;
          font-size: 1rem;
        }
        .summary .value.ready {
          color: #4ade80;
        }

        .btn-final .icon {
          margin-right: 0.3rem;
        }
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer Trust ── */
        .footer-trust {
          margin-top: 2.5rem;
          text-align: center;
        }
        .trust-items {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1.2rem;
          font-size: 0.75rem;
          color: #888;
        }
        .trust-items span {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .trust-items .icon {
          font-size: 0.9rem;
        }
        .trust-note {
          margin-top: 0.8rem;
          font-size: 0.7rem;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .trust-note .icon {
          color: #ff0000;
        }

        /* ── WebView Modal ── */
        .webview-modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .webview-modal-card {
          background: #1a1a1a;
          border-radius: 36px;
          padding: 2.8rem 2rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(255,0,0,0.2);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .webview-modal-card .modal-icon { font-size: 3.2rem; margin-bottom: 0.5rem; }
        .webview-modal-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .webview-modal-card p {
          color: #aaa;
          margin-bottom: 1.8rem;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .modal-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.7rem 1.5rem;
          border-radius: 60px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: 0.2s;
          flex: 1;
          min-width: 120px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.15); }
        .modal-btn.primary {
          background: #ff0000;
          border: none;
          color: #fff;
        }
        .modal-btn.primary:hover { background: #cc0000; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .site-header {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .header-left .logo-text .tagline {
            display: none;
          }
          .header-right .live-counter .label {
            display: none;
          }
          .step-header h1 {
            font-size: 2rem;
          }
          .step-panel {
            padding: 1.5rem 1rem;
          }
          .type-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
          }
          .type-card {
            padding: 0.6rem 0.2rem;
          }
          .type-card .type-icon {
            font-size: 1.4rem;
          }
          .trust-items {
            gap: 0.8rem;
            font-size: 0.7rem;
          }
        }
        @media (max-width: 420px) {
          .header-right .profile-badge .handle {
            max-width: 60px;
          }
          .step-indicator {
            gap: 0.3rem;
          }
          .step-line {
            width: 30px;
          }
          .step-dot {
            width: 30px;
            height: 30px;
            font-size: 0.8rem;
          }
          .amount-chips .chip {
            padding: 0.3rem 0.7rem;
            font-size: 0.7rem;
          }
        }
      `}} />
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
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/youtube-booster-v1?id={id}',
});