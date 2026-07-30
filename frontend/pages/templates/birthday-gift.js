// pages/templates/birthday-gift.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaApple,
  FaGift,
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
} from 'react-icons/fa';

// ── Default Meta (Clean URL without any placeholder) ──
const defaultMeta = {
  title: 'Birthday Gift – Claim Your Free Premium Reward!',
  description: 'Choose a free premium gift to claim. Choose from iPhone, MacBook, Watch, TV, and more!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/birthday-gift',
};

// ── Rewards Data ──
const REWARDS = [
  {
    id: 'iphone',
    name: 'iPhone 15 Pro Max',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop&auto=format',
    color: '#1a1a2e',
    icon: <FaApple className="w-5 h-5" />,
    value: '$1,199',
    tag: 'Bestseller',
  },
  {
    id: 'macbook',
    name: 'MacBook Air M3',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop&auto=format',
    color: '#2d2d44',
    icon: <FaLaptop className="w-5 h-5" />,
    value: '$1,099',
    tag: 'Popular',
  },
  {
    id: 'watch',
    name: 'Apple Watch Series 9',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=300&fit=crop&auto=format',
    color: '#4a4a6a',
    icon: <FaClock className="w-5 h-5" />,
    value: '$399',
    tag: 'Trending',
  },
  {
    id: 'tv',
    name: 'Samsung 55" 4K TV',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=300&h=300&fit=crop&auto=format',
    color: '#1a1a2e',
    icon: <FaTv className="w-5 h-5" />,
    value: '$799',
    tag: 'Limited',
  },
  {
    id: 'airpods',
    name: 'AirPods Pro 2',
    image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=300&h=300&fit=crop&auto=format',
    color: '#4a4a6a',
    icon: <FaHeadphones className="w-5 h-5" />,
    value: '$249',
    tag: 'Hot Deal',
  },
  {
    id: 'ipad',
    name: 'iPad Pro 12.9"',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop&auto=format',
    color: '#2d2d44',
    icon: <FaTablet className="w-5 h-5" />,
    value: '$1,099',
    tag: "Editor's Pick",
  },
];

function BirthdayGift({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=rewards, 2=gift-reveal, 3=redirect
  const [selectedReward, setSelectedReward] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // ── Clean URL if no id parameter is present ──
  useEffect(() => {
    if (!router.isReady) return;
    if (!id && router.asPath.includes('?')) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router.isReady, id, router]);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Confetti effect ──
  useEffect(() => {
    if (confettiActive) {
      const container = document.querySelector('.confetti-container');
      if (!container) return;
      const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B', '#FF8A5C', '#A29BFE', '#FD79A8'];
      for (let i = 0; i < 80; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '-10px';
        particle.style.width = (Math.random() * 8 + 4) + 'px';
        particle.style.height = (Math.random() * 8 + 4) + 'px';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        particle.style.animationDuration = (Math.random() * 2 + 2) + 's';
        particle.style.animationDelay = (Math.random() * 2) + 's';
        particle.style.position = 'absolute';
        particle.style.pointerEvents = 'none';
        particle.style.animation = `confettiFall ${Math.random() * 2 + 2}s linear forwards`;
        container.appendChild(particle);
      }
    }
  }, [confettiActive]);

  // ── Select and Proceed to Reveal ──
  const handleSelectReward = () => {
    if (!selectedReward) return;
    setStep(2);
    setConfettiActive(true);
  };

  // ── Continue to tasks ──
  const handleContinue = () => {
    setLoading(true);
    setStep(3);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── Share handlers ──
  const handleShare = (platform) => {
    const url = id ? `${window.location.origin}/birthday-gift?id=${id}` : `${window.location.origin}/birthday-gift`;
    const text = `🎂 Get your free ${selectedReward?.name || 'gift'} here:`;
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
        navigator.clipboard?.writeText(url);
        alert('Link copied!');
    }
  };

  // ── WebView Modal ──
  const WebViewModal = () => {
    if (!showWebViewModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-card">
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
          <button className="modal-btn ghost" onClick={() => setShowWebViewModal(false)}>
            Continue Anyway
          </button>
        </div>
      </div>
    );
  };

  // ── Render ──
  return (
    <div className="page-wrapper">

      {/* ─── WEBVIEW MODAL ─── */}
      <WebViewModal />

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <div className="logo-icon"><FaApple className="w-5 h-5 text-white" /></div>
          <span className="logo-text">Gift<span>Zone</span></span>
        </div>
        <div className="header-badge">
          <FaGift className="w-3 h-3" /> Special Reward
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge"><FaGift className="w-3.5 h-3.5" /> 🎁 GIVEAWAY EVENT</div>
              <h1>Choose Your <span>Free Gift</span></h1>
              <p>Pick your favorite reward below to claim it instantly.</p>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge"><FaGift className="w-3.5 h-3.5" /> 🎉 CONGRATULATIONS</div>
              <h1>You've Unlocked a <span>{selectedReward?.name}!</span></h1>
              <p>Your gift has been successfully reserved.</p>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}

      {/* Step 1: Rewards Selection */}
      {step === 1 && (
        <section className="rewards-section">
          <h2 className="section-title">Select Your Gift</h2>
          <p className="section-subtitle">Choose one premium reward to claim</p>
          <div className="rewards-grid">
            {REWARDS.map((reward) => (
              <div
                key={reward.id}
                className={`reward-card ${selectedReward?.id === reward.id ? 'selected' : ''}`}
                onClick={() => setSelectedReward(reward)}
                style={{
                  borderColor: selectedReward?.id === reward.id ? reward.color : '#e2e8f0',
                  boxShadow: selectedReward?.id === reward.id ? `0 10px 30px ${reward.color}30` : '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div className="reward-image-wrapper">
                  <img src={reward.image} alt={reward.name} className="reward-image" />
                  <span className="reward-tag" style={{ background: reward.color }}>{reward.tag}</span>
                </div>
                <div className="reward-info">
                  <div className="reward-icon" style={{ color: reward.color, background: `${reward.color}15` }}>{reward.icon}</div>
                  <div className="reward-text-group">
                    <h3>{reward.name}</h3>
                    <p className="reward-value">Value: <strong>{reward.value}</strong></p>
                  </div>
                </div>
                {selectedReward?.id === reward.id && (
                  <div className="reward-check">
                    <FaCheckCircle className="w-5 h-5 text-amber-500 drop-shadow-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            className={`select-btn ${!selectedReward ? 'disabled' : ''}`}
            onClick={handleSelectReward}
            disabled={!selectedReward}
          >
            {selectedReward ? `Continue with ${selectedReward.name} →` : 'Select a gift first'}
          </button>
        </section>
      )}

      {/* Step 2: Gift Reveal */}
      {step === 2 && (
        <section className="gift-section">
          <div className="confetti-container"></div>
          <div className="gift-card">
            <div className="gift-icon-badge"><FaGift className="w-8 h-8 text-amber-600" /></div>
            <h2>🎉 Reward Unlocked!</h2>
            <p>You've successfully claimed a <strong>{selectedReward?.name}</strong>!</p>

            <div className="gift-image">
              <img
                src={selectedReward?.image}
                alt={selectedReward?.name}
                className="gift-img"
              />
            </div>

            <div className="gift-details">
              <div className="gift-detail">
                <span className="detail-label">Product</span>
                <span className="detail-value">{selectedReward?.name}</span>
              </div>
              <div className="gift-detail">
                <span className="detail-label">Value</span>
                <span className="detail-value text-amber-600 font-extrabold">{selectedReward?.value}</span>
              </div>
              <div className="gift-detail">
                <span className="detail-label">Status</span>
                <span className="detail-value text-emerald-600 font-extrabold">✓ Claimable</span>
              </div>
            </div>

            <div className="brand-message">
              <p>Presented by <strong>GiftZone Partner Program</strong></p>
              <p className="small-text">Terms & Conditions apply. Limited stock available.</p>
            </div>

            <div className="gift-actions">
              <button className="continue-btn" onClick={handleContinue} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Processing...
                  </>
                ) : (
                  'Continue to Claim →'
                )}
              </button>
              <div className="share-row">
                <span>Share this joy:</span>
                <button onClick={() => handleShare('whatsapp')}><FaWhatsapp className="w-5 h-5 text-emerald-500 hover:scale-110 transition" /></button>
                <button onClick={() => handleShare('facebook')}><FaFacebook className="w-5 h-5 text-blue-600 hover:scale-110 transition" /></button>
                <button onClick={() => handleShare('twitter')}><FaTwitter className="w-5 h-5 text-sky-400 hover:scale-110 transition" /></button>
                <button onClick={() => handleShare('copy')}><FaCopy className="w-5 h-5 text-slate-600 hover:scale-110 transition" /></button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Redirecting */}
      {step === 3 && (
        <section className="redirect-section">
          <div className="redirect-card">
            <div className="spinner-large"></div>
            <h2>🚀 Redirecting...</h2>
            <p>Please wait while we complete your request.</p>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 GiftZone. All rights reserved.</p>
        <p className="footer-contact">Questions? support@giftzone.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f8fafc;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding: 0.75rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex;
          align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.25rem;
        }
        .logo-icon {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .logo-text { color: #0f172a; }
        .logo-text span { color: #D4AF37; }
        .header-badge {
          display: flex;
          align-items: center; gap: 0.4rem;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.35rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 35vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, #fefce8, #fef08a33);
          color: #0f172a;
          overflow: hidden;
          border-bottom: 1px solid #fef08a66;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center; gap: 0.4rem;
          background: rgba(212, 175, 55, 0.15);
          border: 1px solid rgba(212, 175, 55, 0.3);
          padding: 0.35rem 1.25rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 800;
          color: #b45309;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 0.4rem;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .hero h1 span {
          background: linear-gradient(135deg, #D4AF37, #92400e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero p {
          font-size: 1.05rem;
          color: #475569;
          margin-bottom: 1rem;
        }

        /* ── Rewards Section ── */
        .rewards-section {
          padding: 2.5rem 1.5rem;
          max-width: 1050px;
          margin: -2.5rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .section-title {
          font-size: 1.8rem;
          font-weight: 900;
          text-align: center;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .section-subtitle {
          text-align: center;
          color: #64748b;
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }
        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .reward-card {
          background: #fff;
          border-radius: 24px;
          padding: 1.2rem;
          border: 2px solid #e2e8f0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .reward-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }
        .reward-card.selected {
          background: #fffdf5;
          border-color: #D4AF37;
        }
        .reward-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
          border-radius: 16px;
          overflow: hidden;
          background: #f1f5f9;
          margin-bottom: 0.8rem;
        }
        .reward-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .reward-card:hover .reward-image {
          transform: scale(1.05);
        }
        .reward-tag {
          position: absolute;
          top: 10px;
          right: 10px;
          color: #fff;
          font-size: 0.6rem;
          font-weight: 800;
          padding: 0.25rem 0.7rem;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #0f172a;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .reward-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-top: 0.2rem;
        }
        .reward-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .reward-text-group h3 {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }
        .reward-value {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          margin-top: 2px;
        }
        .reward-check {
          position: absolute;
          top: 16px;
          left: 16px;
          background: #fff;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .select-btn {
          width: 100%;
          padding: 1.05rem;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 2rem;
        }
        .select-btn:hover:not(.disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(212, 175, 55, 0.45); }
        .select-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #cbd5e1; box-shadow: none; color: #64748b; }

        /* ── Gift Section ── */
        .gift-section {
          padding: 2.5rem 1.5rem;
          max-width: 620px;
          margin: -2rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .gift-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .confetti-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          border-radius: 32px;
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
        .gift-icon-badge {
          width: 64px; height: 64px;
          background: #fef3c7;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          border: 1px solid #fde68a;
          box-shadow: 0 8px 20px rgba(212, 175, 55, 0.15);
        }
        .gift-card h2 {
          font-size: 1.8rem;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 0.3rem;
          letter-spacing: -0.5px;
        }
        .gift-card p {
          color: #64748b;
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }
        .gift-card p strong { color: #D4AF37; }
        .gift-image {
          width: 200px;
          height: 200px;
          margin: 0 auto 1.5rem;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          background: #f1f5f9;
        }
        .gift-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gift-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          background: #f8fafc;
          padding: 1rem;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
        }
        .gift-detail {
          text-align: center;
        }
        .detail-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-value {
          display: block;
          font-weight: 800;
          font-size: 0.95rem;
          color: #0f172a;
          margin-top: 2px;
        }
        .brand-message {
          margin: 1.2rem 0 1.5rem;
        }
        .brand-message p { font-size: 0.85rem; color: #64748b; margin-bottom: 0.2rem; }
        .brand-message .small-text { font-size: 0.75rem; color: #94a3b8; }
        .gift-actions .continue-btn {
          width: 100%;
          padding: 1.1rem;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .gift-actions .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(16, 185, 129, 0.45); }
        .gift-actions .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .share-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.2rem;
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
        }
        .share-row button {
          background: none;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .share-row button:hover { transform: scale(1.1); }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .spinner-large {
          width: 52px;
          height: 52px;
          border: 4px solid rgba(212, 175, 55, 0.2);
          border-top-color: #D4AF37;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1.2rem;
        }

        /* ── Redirect Section ── */
        .redirect-section {
          padding: 4rem 1.5rem;
          max-width: 560px;
          margin: 0 auto;
        }
        .redirect-card {
          background: #fff;
          border-radius: 32px;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
        }
        .redirect-card h2 { font-size: 1.6rem; font-weight: 900; color: #0f172a; margin-bottom: 0.4rem; }
        .redirect-card p { color: #64748b; }

        /* ── Footer ── */
        .site-footer {
          background: #0f172a;
          color: #94a3b8;
          padding: 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: auto;
        }
        .site-footer p { font-size: 0.75rem; margin-bottom: 0.2rem; }
        .footer-contact { font-weight: 600; color: #cbd5e1; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-card {
          background: #1e293b;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(212, 175, 55, 0.2);
          box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .modal-icon { font-size: 3rem; margin-bottom: 0.4rem; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 900; color: #fff; margin-bottom: 0.4rem; }
        .modal-card p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.8rem; line-height: 1.5; }
        .modal-actions {
          display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
        }
        .modal-btn {
          display: flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.7rem 1.2rem;
          border-radius: 40px;
          font-weight: 700;
          font-size: 0.8rem;
          color: #fff;
          cursor: pointer;
          transition: 0.2s;
          flex: 1;
          min-width: 110px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.12); }
        .modal-btn.primary {
          background: #D4AF37;
          border: none;
          color: #0f172a;
        }
        .modal-btn.primary:hover { background: #B8860B; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.75rem;
          margin-top: 0.4rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .rewards-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .rewards-section { margin-top: -2rem; }
          .gift-section { margin-top: -2rem; }
          .gift-details { grid-template-columns: 1fr; gap: 0.6rem; }
          .gift-image { width: 160px; height: 160px; }
          .gift-card { padding: 1.8rem 1.5rem; }
        }
        @media (max-width: 480px) {
          .rewards-grid { grid-template-columns: 1fr; }
          .header-badge { font-size: 0.55rem; padding: 0.25rem 0.8rem; }
          .hero h1 { font-size: 1.8rem; }
          .site-header { padding: 0.6rem 1rem; }
          .gift-image { width: 130px; height: 130px; }
          .share-row { flex-wrap: wrap; }
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