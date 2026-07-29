// pages/templates/birthday-iphone-gift.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaGift,
  FaApple,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaConfetti,
  FaArrowRight,
  FaCopy,
  FaShareAlt,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
} from 'react-icons/fa';

// ── Default Meta ──
const defaultMeta = {
  title: 'Birthday Gift – Claim Your Free iPhone!',
  description: 'Enter your name and birthday to claim a free iPhone 15 Pro Max. Limited time offer!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/birthday-iphone-gift',
};

function BirthdayIphoneGift({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=form, 2=gift-reveal, 3=redirect
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

  // ── Validate ──
  const validate = () => {
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
    const url = `${window.location.origin}/birthday-iphone-gift?id=${id || 'demo'}`;
    const text = `🎂 Happy Birthday! Get your free iPhone here:`;
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
          <FaGift className="w-3 h-3" /> Birthday Special
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge"><FaGift className="w-3.5 h-3.5" /> 🎂 BIRTHDAY GIVEAWAY</div>
              <h1>Get a Free iPhone <span>on Your Birthday</span></h1>
              <p>Enter your name and birthday to claim your gift from our partner brands.</p>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge"><FaGift className="w-3.5 h-3.5" /> 🎉 CONGRATULATIONS</div>
              <h1>Happy Birthday, <span>{name}!</span></h1>
              <p>You've been selected to receive a free iPhone 15 Pro Max.</p>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}

      {/* Step 1: Form */}
      {step === 1 && (
        <section className="form-section">
          <div className="form-card">
            <h2>Enter Your Details</h2>
            <p>We’ll verify your birthday and send you the gift.</p>

            <div className="form-group">
              <label><FaUser className="w-4 h-4" /> Full Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><FaCalendarAlt className="w-4 h-4" /> Date of Birth <span className="required">*</span></label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="submit-btn" onClick={handleSubmit}>
              Claim Your Gift →
            </button>

            <div className="trust-badges">
              <span><FaCheckCircle className="w-3.5 h-3.5" /> Verified</span>
              <span><FaCheckCircle className="w-3.5 h-3.5" /> Secure</span>
              <span><FaCheckCircle className="w-3.5 h-3.5" /> Trusted Partner</span>
            </div>
          </div>
        </section>
      )}

      {/* Step 2: Gift Reveal */}
      {step === 2 && (
        <section className="gift-section">
          <div className="confetti-container"></div>
          <div className="gift-card">
            <div className="gift-icon"><FaGift className="w-12 h-12 text-amber-500" /></div>
            <h2>🎉 Happy Birthday, {name}!</h2>
            <p>You've won a <strong>iPhone 15 Pro Max</strong></p>

            <div className="gift-image">
              <img
                src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop&auto=format"
                alt="iPhone 15 Pro Max"
                className="gift-img"
              />
            </div>

            <div className="gift-details">
              <div className="gift-detail">
                <span className="detail-label">Model</span>
                <span className="detail-value">iPhone 15 Pro Max</span>
              </div>
              <div className="gift-detail">
                <span className="detail-label">Color</span>
                <span className="detail-value">Deep Purple</span>
              </div>
              <div className="gift-detail">
                <span className="detail-label">Storage</span>
                <span className="detail-value">128GB</span>
              </div>
            </div>

            <div className="brand-message">
              <p>Presented by <strong>Apple Partner Program</strong></p>
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
                <button onClick={() => handleShare('whatsapp')}><FaWhatsapp className="w-5 h-5 text-green-500" /></button>
                <button onClick={() => handleShare('facebook')}><FaFacebook className="w-5 h-5 text-blue-600" /></button>
                <button onClick={() => handleShare('twitter')}><FaTwitter className="w-5 h-5 text-blue-400" /></button>
                <button onClick={() => handleShare('copy')}><FaCopy className="w-5 h-5 text-gray-600" /></button>
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
          background: #f0f4f8;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f0f4f8;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(212, 175, 55, 0.15);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex;
          align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #1a1a2e, #2d2d44);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #D4AF37; }
        .header-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(212, 175, 55, 0.2);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 35vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: linear-gradient(135deg, #fef9e7, #fdf2d0);
          color: #1a1a2e;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.2);
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #B8860B;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
          color: #1a1a2e;
        }
        .hero h1 span {
          color: #D4AF37;
        }
        .hero p {
          font-size: 1.05rem;
          color: #555;
          margin-bottom: 1.2rem;
        }

        /* ── Form Section ── */
        .form-section {
          padding: 2rem 1.5rem;
          max-width: 560px;
          margin: -2rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .form-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
        }
        .form-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          text-align: center;
          color: #1a1a2e;
        }
        .form-card > p {
          text-align: center;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: #374151;
          margin-bottom: 0.3rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          font-size: 0.95rem;
          background: #f9fafb;
          transition: all 0.2s;
          outline: none;
          font-family: inherit;
        }
        .form-group input:focus {
          border-color: #D4AF37;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.08);
        }
        .form-group input[type="date"] {
          color-scheme: light;
        }
        .form-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }
        .submit-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0.5rem;
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(212, 175, 55, 0.35); }
        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.2rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .trust-badges span {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* ── Gift Section ── */
        .gift-section {
          padding: 2rem 1.5rem;
          max-width: 640px;
          margin: -2rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .gift-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
          text-align: center;
          position: relative;
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
        .gift-icon { margin: 0 auto 0.5rem; }
        .gift-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 0.3rem;
        }
        .gift-card p {
          color: #6b7280;
          margin-bottom: 1.2rem;
        }
        .gift-card p strong { color: #D4AF37; }
        .gift-image {
          width: 200px;
          height: 200px;
          margin: 0 auto 1.2rem;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .gift-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gift-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.8rem;
          margin-bottom: 1.2rem;
          background: #f8fafc;
          padding: 0.8rem;
          border-radius: 16px;
          border: 1px solid #eef2f6;
        }
        .gift-detail {
          text-align: center;
        }
        .detail-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-value {
          display: block;
          font-weight: 700;
          font-size: 0.85rem;
          color: #1a1a2e;
        }
        .brand-message {
          margin: 1rem 0 1.2rem;
        }
        .brand-message p { font-size: 0.9rem; color: #555; }
        .brand-message .small-text { font-size: 0.7rem; color: #888; }
        .gift-actions .continue-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .gift-actions .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(34, 197, 94, 0.35); }
        .gift-actions .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .share-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          color: #6b7280;
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
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .spinner-large {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(212, 175, 55, 0.15);
          border-top-color: #D4AF37;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }

        /* ── Redirect Section ── */
        .redirect-section {
          padding: 4rem 1.5rem;
          max-width: 560px;
          margin: -2rem auto 2rem;
        }
        .redirect-card {
          background: #fff;
          border-radius: 32px;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
        }
        .redirect-card h2 { font-size: 1.6rem; font-weight: 800; color: #1a1a2e; margin-bottom: 0.3rem; }
        .redirect-card p { color: #6b7280; }

        /* ── Footer ── */
        .site-footer {
          background: #1a1a2e;
          color: #9ca3af;
          padding: 1.5rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: auto;
        }
        .site-footer p { font-size: 0.7rem; margin-bottom: 0.2rem; }
        .footer-contact { font-weight: 600; color: #e5e7eb; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 36px;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(212, 175, 55, 0.15);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .modal-icon { font-size: 3rem; margin-bottom: 0.3rem; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.3rem; }
        .modal-card p { color: #aaa; font-size: 0.85rem; margin-bottom: 1.5rem; }
        .modal-actions {
          display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
        }
        .modal-btn {
          display: flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.6rem 1.2rem;
          border-radius: 40px;
          font-weight: 600;
          font-size: 0.75rem;
          color: #fff;
          cursor: pointer;
          transition: 0.2s;
          flex: 1;
          min-width: 100px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.12); }
        .modal-btn.primary {
          background: #D4AF37;
          border: none;
          color: #0a0a0a;
        }
        .modal-btn.primary:hover { background: #B8860B; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.7rem;
          margin-top: 0.3rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .gift-details { grid-template-columns: 1fr; }
          .gift-image { width: 150px; height: 150px; }
          .form-card { padding: 1.5rem; }
          .gift-card { padding: 1.5rem; }
          .trust-badges { flex-wrap: wrap; gap: 0.8rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .hero h1 { font-size: 1.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .gift-image { width: 120px; height: 120px; }
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
export default withCampaignMeta(BirthdayIphoneGift, defaultMeta);