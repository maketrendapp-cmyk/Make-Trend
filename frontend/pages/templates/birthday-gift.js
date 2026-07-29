// pages/templates/birthday-gift.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaApple,
  FaGift,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaCopy,
  FaShareAlt,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaLaptop,
  FaTv,
  FaHeadphones,
  FaTablet,
  FaClock,
  FaArrowLeft,
  FaShieldAlt,
  FaLock,
  FaSparkles,
} from 'react-icons/fa';

// ── Default Meta ──
const defaultMeta = {
  title: 'Birthday Gift – Claim Your Free Premium Reward!',
  description: 'Enter your name and birthday to claim a free premium gift. Choose from iPhone, MacBook, Watch, TV, and more!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/birthday-gift',
};

// ── Rewards Data ──
const REWARDS = [
  {
    id: 'iphone',
    name: 'iPhone 15 Pro Max',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=600&fit=crop&auto=format',
    color: '#3b82f6',
    icon: <FaApple className="w-5 h-5" />,
    value: '$1,199',
    tag: 'Bestseller',
  },
  {
    id: 'macbook',
    name: 'MacBook Air M3',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop&auto=format',
    color: '#6366f1',
    icon: <FaLaptop className="w-5 h-5" />,
    value: '$1,099',
    tag: 'Popular',
  },
  {
    id: 'watch',
    name: 'Apple Watch Series 9',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop&auto=format',
    color: '#ec4899',
    icon: <FaClock className="w-5 h-5" />,
    value: '$399',
    tag: 'Trending',
  },
  {
    id: 'tv',
    name: 'Samsung 55" 4K OLED TV',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=600&fit=crop&auto=format',
    color: '#8b5cf6',
    icon: <FaTv className="w-5 h-5" />,
    value: '$799',
    tag: 'Limited',
  },
  {
    id: 'airpods',
    name: 'AirPods Pro 2nd Gen',
    image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=600&h=600&fit=crop&auto=format',
    color: '#10b981',
    icon: <FaHeadphones className="w-5 h-5" />,
    value: '$249',
    tag: 'Hot Deal',
  },
  {
    id: 'ipad',
    name: 'iPad Pro 12.9"',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&auto=format',
    color: '#f59e0b',
    icon: <FaTablet className="w-5 h-5" />,
    value: '$1,099',
    tag: "Editor's Pick",
  },
];

function BirthdayGift({ campaign }) {
  const router = useRouter();
  const { id } = router.query;
  const confettiContainerRef = useRef(null);

  // ── State ──
  const [step, setStep] = useState(1);
  const [selectedReward, setSelectedReward] = useState(null);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Confetti effect (FIXED: uses ref and proper checks) ──
  useEffect(() => {
    if (!confettiActive || typeof window === 'undefined') return;

    const container = confettiContainerRef.current;
    if (!container) return;

    // Clear existing confetti
    container.innerHTML = '';

    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#6366f1', '#fbbf24', '#f43f5e', '#8b5cf6'];

    for (let i = 0; i < 90; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 10 + 5;
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = Math.random() * 2.5 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isCircle = Math.random() > 0.5;

      particle.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: -10px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${isCircle ? '50%' : '3px'};
        pointer-events: none;
        opacity: 1;
        animation: confettiFall ${duration}s ${delay}s linear forwards;
        transform: rotate(${Math.random() * 360}deg);
      `;

      container.appendChild(particle);
    }

    // Cleanup after animation
    const cleanupTimeout = setTimeout(() => {
      if (container) {
        container.innerHTML = '';
      }
    }, 5000);

    return () => {
      clearTimeout(cleanupTimeout);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [confettiActive]);

  // ── Validate ──
  const validate = () => {
    if (!selectedReward) return 'Please select a gift.';
    if (!name.trim()) return 'Please enter your full name.';
    if (!birthday) return 'Please select your birthday.';
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13) return 'You must be at least 13 years old.';
    if (age > 100) return 'Please enter a valid birthday.';
    return null;
  };

  // ── Submit form ──
  const handleSubmit = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(3);
    setConfettiActive(true);
  };

  // ── Continue to tasks ──
  const handleContinue = () => {
    setLoading(true);
    setStep(4);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── Share handlers (with fallback for clipboard) ──
  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const handleShare = (platform) => {
    const url = `${window.location.origin}/birthday-gift?id=${id || 'demo'}`;
    const text = `🎂 Happy Birthday! I just claimed my free ${selectedReward?.name || 'gift'}:`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      default:
        const copyText = `${text} ${url}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(copyText).catch(() => fallbackCopy(copyText));
        } else {
          fallbackCopy(copyText);
        }
        alert('🔗 Referral link copied to clipboard!');
    }
  };

  const goBack = () => {
    setStep(1);
    setConfettiActive(false);
  };

  // ── WebView Modal ──
  const WebViewModal = () => {
    if (!showWebViewModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-icon-container">
            <span className="modal-icon">🌐</span>
          </div>
          <h2>Open in Browser</h2>
          <p>For the best experience and to secure your birthday reward, please open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                const copyText = window.location.href;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(copyText).catch(() => fallbackCopy(copyText));
                } else {
                  fallbackCopy(copyText);
                }
                setShowWebViewModal(false);
              }}
            >
              <FaCopy className="w-4 h-4" /> Copy Link
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
              <FaShareAlt className="w-4 h-4" /> Open in Browser
            </button>
          </div>
          <button className="modal-btn text-only" onClick={() => setShowWebViewModal(false)}>
            Continue anyway (Not Recommended)
          </button>
        </div>
      </div>
    );
  };

  // ── Render ──
  return (
    <div className="page-wrapper">

      <WebViewModal />

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon-bg">
              <FaGift className="w-4 h-4 text-white" />
            </div>
            <span className="logo-text">Gift<span>Zone</span></span>
          </div>
          <div className="header-badge">
            <FaSparkles className="w-3 h-3 text-amber-400" /> Birthday Special
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-glow shape-1"></div>
        <div className="hero-glow shape-2"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge-wrap">
                <div className="hero-badge">🎉 ANNUAL BIRTHDAY GIVEAWAY</div>
              </div>
              <h1>Select Your Premium <br /><span className="text-gradient">Birthday Gift</span></h1>
              <p>Pick your favorite tech reward below to claim it instantly for your special day.</p>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge-wrap">
                <div className="hero-badge">🎁 GIFT SELECTED</div>
              </div>
              <h1>Claim Your <span className="text-gradient">{selectedReward?.name}</span></h1>
              <p>Verify your birthday details to lock in your free gift delivery.</p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="hero-badge-wrap">
                <div className="hero-badge">✨ REWARD UNLOCKED</div>
              </div>
              <h1>Happy Birthday, <span className="text-gradient">{name}!</span></h1>
              <p>Your <strong>{selectedReward?.name}</strong> has been successfully reserved!</p>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}

      {/* Step 1: Rewards Selection */}
      {step === 1 && (
        <section className="rewards-section">
          <div className="section-header">
            <h2 className="section-title">Available Rewards</h2>
            <p className="section-subtitle">Select one item to claim your gift</p>
          </div>
          <div className="rewards-grid">
            {REWARDS.map((reward) => (
              <div
                key={reward.id}
                className={`reward-card ${selectedReward?.id === reward.id ? 'selected' : ''}`}
                onClick={() => setSelectedReward(reward)}
              >
                <div className="reward-image-wrapper">
                  <img src={reward.image} alt={reward.name} className="reward-image" />
                  <span className="reward-tag" style={{ background: reward.color }}>{reward.tag}</span>
                  {selectedReward?.id === reward.id && (
                    <div className="reward-check-overlay">
                      <FaCheckCircle className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
                <div className="reward-info-wrap">
                  <div className="reward-info">
                    <div className="reward-icon-box" style={{ color: reward.color, background: `${reward.color}15` }}>
                      {reward.icon}
                    </div>
                    <div>
                      <h3>{reward.name}</h3>
                      <p className="reward-value">Retail: <strong>{reward.value}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="action-container">
            <button
              className={`select-btn ${!selectedReward ? 'disabled' : ''}`}
              onClick={() => selectedReward && setStep(2)}
              disabled={!selectedReward}
            >
              {selectedReward ? `Continue with ${selectedReward.name} →` : 'Please select a gift above'}
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Form */}
      {step === 2 && (
        <section className="form-section">
          <button className="back-btn" onClick={goBack}>
            <FaArrowLeft className="w-4 h-4" /> Back to gifts
          </button>
          <div className="form-card">
            <div className="selected-preview">
              <img src={selectedReward?.image} alt={selectedReward?.name} className="preview-img" />
              <div>
                <span className="preview-label">Selected Reward</span>
                <span className="preview-name">{selectedReward?.name}</span>
              </div>
            </div>
            <h2>Recipient Information</h2>
            <p>Enter your details for verification and gift shipping.</p>

            <div className="form-group">
              <label><FaUser className="w-4 h-4 text-amber-500" /> Full Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><FaCalendarAlt className="w-4 h-4 text-amber-500" /> Date of Birth <span className="required">*</span></label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button className="submit-btn" onClick={handleSubmit}>
              Verify & Claim Gift →
            </button>

            <div className="trust-badges">
              <span><FaCheckCircle className="text-emerald-500" /> Verified Event</span>
              <span><FaShieldAlt className="text-blue-500" /> 256-bit Secure</span>
              <span><FaLock className="text-amber-500" /> Privacy Protected</span>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Gift Reveal */}
      {step === 3 && (
        <section className="gift-section">
          <div className="gift-card">
            <div className="confetti-container" ref={confettiContainerRef}></div>
            <div className="gift-success-badge">
              <FaSparkles className="text-amber-400" /> Verified Winner
            </div>
            <h2>Happy Birthday, {name}!</h2>
            <p>Your reward has been successfully locked in.</p>

            <div className="gift-image-container">
              <img
                src={selectedReward?.image}
                alt={selectedReward?.name}
                className="gift-img"
              />
            </div>

            <div className="gift-details">
              <div className="gift-detail">
                <span className="detail-label">Reward Item</span>
                <span className="detail-value">{selectedReward?.name}</span>
              </div>
              <div className="gift-detail">
                <span className="detail-label">Estimated Value</span>
                <span className="detail-value text-amber-400">{selectedReward?.value}</span>
              </div>
              <div className="gift-detail">
                <span className="detail-label">Delivery Status</span>
                <span className="detail-value text-emerald-400">Ready to Ship</span>
              </div>
            </div>

            <div className="brand-message">
              <p>GiftZone Partner Rewards Program • Limited Stock Allocation</p>
            </div>

            <div className="gift-actions">
              <button className="continue-btn" onClick={handleContinue} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Finalizing...
                  </>
                ) : (
                  'Proceed to Secure Claim →'
                )}
              </button>
              <div className="share-row">
                <span>Share with friends:</span>
                <button onClick={() => handleShare('whatsapp')}><FaWhatsapp className="w-5 h-5 text-emerald-400 hover:scale-110 transition" /></button>
                <button onClick={() => handleShare('facebook')}><FaFacebook className="w-5 h-5 text-blue-500 hover:scale-110 transition" /></button>
                <button onClick={() => handleShare('twitter')}><FaTwitter className="w-5 h-5 text-sky-400 hover:scale-110 transition" /></button>
                <button onClick={() => handleShare('copy')}><FaCopy className="w-5 h-5 text-slate-400 hover:scale-110 transition" /></button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 4: Redirecting */}
      {step === 4 && (
        <section className="redirect-section">
          <div className="redirect-card">
            <div className="spinner-large"></div>
            <h2>Connecting Securely...</h2>
            <p>Please wait while we route you to the final verification step.</p>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} GiftZone Ecosystem. All rights reserved.</p>
          <p className="footer-contact">Secure Promotional Verification Platform.</p>
        </div>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --brand-gold: #d4af37;
          --brand-dark: #0f172a;
          --bg-base: #f8fafc;
          --card-bg: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        body { background: var(--bg-base); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.05); padding: 1rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.6rem; font-weight: 800; font-size: 1.25rem; }
        .logo-icon-bg { width: 34px; height: 34px; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .logo-text { color: var(--text-main); }
        .logo-text span { color: var(--brand-gold); }
        .header-badge {
          background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.75rem;
          padding: 0.4rem 0.9rem; border-radius: 40px; display: flex; align-items: center; gap: 6px;
          border: 1px solid #fde68a;
        }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 36vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 4rem 1.5rem; overflow: hidden; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #fff;
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: var(--brand-gold); top: -150px; left: -100px; }
        .shape-2 { width: 350px; height: 350px; background: #6366f1; bottom: -100px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1.2rem; }
        .hero-badge {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 0.4rem 1.1rem;
          border-radius: 40px; font-size: 0.7rem; font-weight: 700; color: #fde047;
          letter-spacing: 1px; backdrop-filter: blur(4px);
        }
        .hero h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; line-height: 1.1; margin-bottom: 1rem; letter-spacing: -1px; }
        .text-gradient { background: linear-gradient(to right, #fde047, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 1.1rem; color: #cbd5e1; max-width: 600px; margin: 0 auto; }

        /* ── Rewards Section ── */
        .rewards-section { padding: 0 1.5rem 4rem; max-width: 1100px; margin: -3.5rem auto 2rem; position: relative; z-index: 10; }
        .section-header { text-align: center; margin-bottom: 2rem; }
        .section-title { font-size: 1.8rem; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
        .section-subtitle { font-size: 1rem; color: #cbd5e1; margin-top: 0.3rem; }
        .rewards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .reward-card {
          background: var(--card-bg); border-radius: 24px; padding: 1.2rem; border: 2px solid #e2e8f0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; position: relative;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
        }
        .reward-card:hover { transform: translateY(-6px); box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1); border-color: #cbd5e1; }
        .reward-card.selected { border-color: var(--brand-gold); background: #fffdf5; box-shadow: 0 0 0 4px rgba(212,175,55,0.15); }
        .reward-image-wrapper { position: relative; width: 100%; aspect-ratio: 1/1; border-radius: 16px; overflow: hidden; background: #f8fafc; margin-bottom: 1rem; }
        .reward-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
        .reward-card:hover .reward-image { transform: scale(1.05); }
        .reward-tag { position: absolute; top: 10px; right: 10px; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 0.3rem 0.8rem; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        .reward-check-overlay { position: absolute; inset: 0; background: rgba(212,175,55,0.3); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; }
        .reward-info-wrap { padding: 0.2rem; }
        .reward-info { display: flex; align-items: center; gap: 12px; }
        .reward-icon-box { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .reward-info h3 { font-size: 1rem; font-weight: 800; color: var(--text-main); line-height: 1.2; margin-bottom: 2px; }
        .reward-value { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        .action-container { margin-top: 2.5rem; display: flex; justify-content: center; }
        .select-btn {
          width: 100%; max-width: 450px; padding: 1.1rem; background: linear-gradient(135deg, #d4af37, #b8860b);
          border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; color: #fff; cursor: pointer;
          transition: all 0.3s; box-shadow: 0 10px 25px -5px rgba(212,175,55,0.4);
        }
        .select-btn:hover:not(.disabled) { transform: translateY(-3px); box-shadow: 0 15px 35px -5px rgba(212,175,55,0.6); }
        .select-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #cbd5e1; box-shadow: none; color: #64748b; }

        /* ── Form Section ── */
        .form-section { padding: 0 1.5rem 4rem; max-width: 600px; margin: -3.5rem auto 2rem; position: relative; z-index: 10; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: #cbd5e1; font-weight: 600; font-size: 0.9rem; cursor: pointer; margin-bottom: 1rem; transition: color 0.2s; }
        .back-btn:hover { color: #fff; }
        .form-card { background: var(--card-bg); border-radius: 28px; padding: 2.5rem 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; }
        .selected-preview { display: flex; align-items: center; gap: 1rem; background: #f8fafc; padding: 0.8rem 1.2rem; border-radius: 16px; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; }
        .preview-img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; }
        .preview-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; }
        .preview-name { font-weight: 800; font-size: 1.05rem; color: var(--text-main); display: block; }
        .form-card h2 { font-size: 1.6rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.3rem; letter-spacing: -0.5px; }
        .form-card > p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; color: #334155; margin-bottom: 0.5rem; }
        .form-group .required { color: #ef4444; }
        .form-group input {
          width: 100%; padding: 0.9rem 1rem; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1rem;
          background: #f8fafc; transition: all 0.2s; outline: none; font-family: inherit; color: var(--text-main);
        }
        .form-group input:focus { border-color: var(--brand-gold); background: #fff; box-shadow: 0 0 0 4px rgba(212,175,55,0.1); }
        .form-error { background: #fef2f2; color: #dc2626; padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600; margin-bottom: 1.2rem; border: 1px solid #fee2e2; }
        .submit-btn {
          width: 100%; padding: 1.1rem; background: linear-gradient(135deg, #d4af37, #b8860b);
          border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; color: #fff; cursor: pointer;
          transition: all 0.3s; box-shadow: 0 10px 25px -5px rgba(212,175,55,0.4);
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 35px -5px rgba(212,175,55,0.6); }
        .trust-badges { display: flex; justify-content: center; gap: 1.5rem; margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        .trust-badges span { display: flex; align-items: center; gap: 5px; }

        /* ── Gift Section ── */
        .gift-section { padding: 0 1.5rem 4rem; max-width: 640px; margin: -3.5rem auto 2rem; position: relative; z-index: 10; }
        .gift-card {
          background: var(--card-bg); border-radius: 28px; padding: 2.5rem 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
          border: 1px solid #e2e8f0; text-align: center; position: relative; overflow: hidden;
        }
        .confetti-container { position: absolute; inset: 0; pointer-events: none; border-radius: 28px; overflow: hidden; }
        .gift-success-badge { display: inline-flex; align-items: center; gap: 6px; background: #fef3c7; color: #b45309; padding: 0.4rem 1rem; border-radius: 30px; font-weight: 800; font-size: 0.75rem; margin-bottom: 1rem; border: 1px solid #fde68a; }
        .gift-card h2 { font-size: 1.8rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.3rem; }
        .gift-card > p { color: var(--text-muted); margin-bottom: 1.5rem; font-size: 1rem; }
        .gift-image-container { width: 220px; height: 220px; margin: 0 auto 1.5rem; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1); background: #f8fafc; }
        .gift-img { width: 100%; height: 100%; object-fit: cover; }
        .gift-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 16px; border: 1px solid #e2e8f0; }
        .detail-label { display: block; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { display: block; font-weight: 800; font-size: 0.95rem; color: var(--text-main); margin-top: 2px; }
        .text-amber-400 { color: #d97706; }
        .text-emerald-400 { color: #059669; }
        .brand-message { margin-bottom: 1.5rem; }
        .brand-message p { font-size: 0.85rem; color: var(--text-muted); }
        .continue-btn {
          width: 100%; padding: 1.1rem; background: linear-gradient(135deg, #10b981, #059669);
          border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; color: #fff; cursor: pointer;
          transition: all 0.3s; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.4);
        }
        .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px -5px rgba(16,185,129,0.6); }
        .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .share-row { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.2rem; font-size: 0.9rem; color: var(--text-muted); font-weight: 600; }
        .share-row button { background: none; border: none; cursor: pointer; }
        .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }

        /* ── Redirect Section ── */
        .redirect-section { padding: 4rem 1.5rem; max-width: 560px; margin: 0 auto; }
        .redirect-card { background: var(--card-bg); border-radius: 28px; padding: 3rem 2rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; }
        .spinner-large { width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top-color: var(--brand-gold); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
        .redirect-card h2 { font-size: 1.6rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.4rem; }
        .redirect-card p { color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #0f172a; color: #94a3b8; padding: 2.5rem 1.5rem; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); margin-top: auto; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .site-footer p { font-size: 0.8rem; }
        .footer-contact { font-weight: 600; color: #cbd5e1; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 28px; padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .modal-icon-container { width: 64px; height: 64px; background: #fef3c7; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; }
        .modal-icon { font-size: 2rem; }
        .modal-card h2 { font-size: 1.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.5rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-btn { padding: 1rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .modal-btn.primary { background: var(--brand-dark); color: #fff; box-shadow: 0 4px 12px rgba(15,23,42,0.3); }
        .modal-btn.primary:hover { background: #1e293b; transform: translateY(-2px); }
        .modal-btn.ghost { background: #f1f5f9; color: var(--text-main); border: 1px solid #e2e8f0; }
        .modal-btn.ghost:hover { background: #e2e8f0; }
        .modal-btn.text-only { background: transparent; color: #94a3b8; font-size: 0.8rem; margin-top: 1rem; }
        .modal-btn.text-only:hover { color: var(--text-main); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .rewards-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .rewards-section { margin-top: -2.5rem; }
          .form-section { margin-top: -2.5rem; }
          .gift-section { margin-top: -2.5rem; }
          .gift-details { grid-template-columns: 1fr; gap: 0.6rem; }
          .gift-image-container { width: 160px; height: 160px; }
          .form-card { padding: 1.8rem 1.5rem; }
          .gift-card { padding: 1.8rem 1.5rem; }
        }
        @media (max-width: 480px) {
          .rewards-grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 2.2rem; }
          .trust-badges { flex-direction: column; gap: 0.5rem; align-items: center; }
          .form-card { padding: 1.5rem 1rem; }
          .gift-card { padding: 1.5rem 1rem; }
          .gift-image-container { width: 140px; height: 140px; }
          .header-badge { font-size: 0.6rem; padding: 0.2rem 0.6rem; }
        }
      `}} />
    </div>
  );
}

// ── Server‑side props ──
export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

// ── Wrap with Meta ──
export default withCampaignMeta(BirthdayGift, defaultMeta);