// pages/templates/iphone-winner.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaTrophy,
  FaGift,
  FaBoxOpen,
  FaClock,
  FaLock,
  FaEnvelope,
  FaUser,
  FaSpinner,
  FaCopy,
  FaExternalLinkAlt,
  FaGlobe,
  FaShieldAlt,
  FaCheckCircle,
  FaArrowRight,
  FaPhone,
  FaGem,
  FaMedal,
} from 'react-icons/fa';

// ── Default Meta (Clean URL) ──
const defaultMeta = {
  title: 'Congratulations! You Won iPhone 15 Pro Max',
  description: 'You have been selected as the winner of iPhone 15 Pro Max. Claim your prize now!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/iphone-winner', // ✅ Clean base URL
};

function IphoneWinner({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  // ── ✅ CLEAN URL: remove query params if no id ──
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

  // ── Confetti particles ──
  useEffect(() => {
    if (step === 1) {
      const container = document.querySelector('.confetti-container');
      if (!container) return;
      
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8A5C'];
      
      for (let i = 0; i < 50; i++) {
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
  }, [step]);

  // ── Validate ──
  const validate = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address (optional).';
    return null;
  };

  // ── Claim ──
  const handleClaim = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);
    setStep(3);

    setTimeout(() => {
      setLoading(false);
      if (!id) {
        router.push('/create');
      } else {
        router.push(`/tasks?id=${id}`);
      }
    }, 1500);
  };

  // ── Continue to form ──
  const handleContinue = () => {
    setStep(2);
  };

  // ── WebView Modal ──
  const WebViewModal = () => {
    if (!showWebViewModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <FaGlobe className="modal-icon" style={{ fontSize: '3rem', marginBottom: '0.3rem', color: '#D4AF37' }} />
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
              <FaCopy className="icon-inline" /> Copy Link
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
              <FaExternalLinkAlt className="icon-inline" /> Open in Browser
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
    );
  };

  // ── Main UI ──
  return (
    <div className="page-wrapper">

      {/* ─── WEBVIEW MODAL ─── */}
      <WebViewModal />

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <FaTrophy className="logo-icon" />
          <span className="logo-text">Prize<span>Claim</span></span>
        </div>
        <div className="header-badge"><FaGift className="icon-inline" /> Winner</div>
      </header>

      {/* ─── STEP 1: CONGRATULATIONS ─── */}
      {step === 1 && (
        <section className="hero congrats-hero">
          <div className="hero-overlay"></div>
          <div className="confetti-container"></div>
          
          <div className="hero-content">
            <div className="badge-winner"><FaTrophy className="icon-inline" /> GRAND WINNER</div>
            
            <div className="phone-display">
              <div className="phone-glow"></div>
              <img 
                src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop&auto=format" 
                alt="iPhone 15 Pro Max"
                className="phone-image"
              />
              <div className="phone-label"><FaPhone className="icon-inline" /> iPhone 15 Pro Max</div>
            </div>

            <h1>Congratulations!</h1>
            <p className="sub-text">You have been selected as the lucky winner of</p>
            <p className="prize-name"><FaGem className="icon-inline" style={{ color: '#D4AF37' }} /> iPhone 15 Pro Max</p>
            
            <div className="winner-details">
              <div className="detail-item">
                <FaGift className="detail-icon" />
                <span>Prize Value: $1,199</span>
              </div>
              <div className="detail-item">
                <FaBoxOpen className="detail-icon" />
                <span>Brand New • Sealed Box</span>
              </div>
              <div className="detail-item">
                <FaClock className="detail-icon" />
                <span>Claim within 24 hours</span>
              </div>
            </div>

            <button className="claim-btn-primary" onClick={handleContinue}>
              Claim Your Prize <FaArrowRight className="icon-inline" />
            </button>

            <p className="trust-note"><FaLock className="icon-inline" /> Your information is secure and will not be shared.</p>
          </div>
        </section>
      )}

      {/* ─── STEP 2: CLAIM FORM ─── */}
      {step === 2 && (
        <section className="form-hero">
          <div className="form-overlay"></div>
          <div className="form-content">
            <div className="form-badge"><FaMedal className="icon-inline" /> CLAIM YOUR PRIZE</div>
            
            <div className="form-phone-preview">
              <img 
                src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&h=100&fit=crop&auto=format" 
                alt="iPhone 15 Pro Max"
                className="form-phone-image"
              />
              <span><FaPhone className="icon-inline" /> iPhone 15 Pro Max</span>
            </div>

            <h2>Enter Your Details</h2>
            <p className="form-sub">Fill in the information below to claim your prize.</p>

            <div className="form-card">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address <span className="optional">(optional)</span></label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="field-note">We'll send confirmation to this email</span>
              </div>

              {error && <p className="form-error">{error}</p>}

              <button className="claim-btn-form" onClick={handleClaim} disabled={loading}>
                {loading ? (
                  <>
                    <FaSpinner className="spinner" /> Processing...
                  </>
                ) : (
                  <>
                    Claim Now <FaArrowRight className="icon-inline" />
                  </>
                )}
              </button>

              <p className="form-footnote"><FaShieldAlt className="icon-inline" /> Your information is secure and will only be used for prize delivery.</p>
            </div>
          </div>
        </section>
      )}

      {/* ─── STEP 3: REDIRECTING ─── */}
      {step === 3 && (
        <section className="redirect-hero">
          <div className="redirect-overlay"></div>
          <div className="redirect-content">
            <div className="redirect-animation">
              <div className="pulse-circle"></div>
              <div className="pulse-circle delay-1"></div>
              <div className="pulse-circle delay-2"></div>
            </div>
            <h2><FaArrowRight className="icon-inline" /> Processing Your Claim</h2>
            <p>Please wait while we confirm your details...</p>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Prize Claim. All rights reserved.</p>
        <p className="footer-contact">Questions? support@prizeclaim.com</p>
      </footer>

      {/* ─── ENHANCED STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0a0a0a;
          color: #ffffff;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #0a0a0a;
        }

        .icon-inline {
          display: inline-block;
          margin-right: 6px;
          vertical-align: middle;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10, 10, 10, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(212, 175, 55, 0.15);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; color: #D4AF37; }
        .logo-text { color: #fff; }
        .logo-text span { color: #D4AF37; }
        .header-badge {
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          color: #0a0a0a;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(212, 175, 55, 0.3);
        }

        /* ── Step 1: Congratulations ── */
        .congrats-hero {
          position: relative;
          min-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem 1.5rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.08) 0%, transparent 70%), #0a0a0a;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .confetti-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 0;
        }
        .badge-winner {
          display: inline-block;
          background: rgba(212, 175, 55, 0.15);
          border: 1px solid rgba(212, 175, 55, 0.3);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #D4AF37;
          letter-spacing: 1.5px;
          margin-bottom: 1.5rem;
        }

        .phone-display {
          position: relative;
          margin: 0 auto 1.5rem;
          width: 200px;
          height: 200px;
          flex-shrink: 0;
        }
        .phone-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: glowPulse 2s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .phone-image {
          position: relative;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 30px;
          box-shadow: 0 20px 60px rgba(212, 175, 55, 0.2);
          border: 2px solid rgba(212, 175, 55, 0.1);
          transition: transform 0.3s ease;
        }
        .phone-image:hover { transform: scale(1.02); }
        .phone-label {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #D4AF37;
          letter-spacing: 0.5px;
        }

        /* ── FIX: Proper spacing between text elements ── */
        .hero-content h1 {
          font-size: clamp(2.4rem, 7vw, 3.8rem);
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 0.8rem;
          margin-top: 0.2rem;
          background: linear-gradient(135deg, #fff 30%, #D4AF37 70%, #B8860B 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-align: center;
        }
        .sub-text {
          font-size: 1rem;
          color: #888;
          margin-bottom: 0.4rem;
          text-align: center;
        }
        .prize-name {
          font-size: 1.8rem;
          font-weight: 800;
          color: #D4AF37;
          margin-bottom: 1.8rem;
          text-align: center;
          letter-spacing: 0.5px;
        }

        .winner-details {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.04);
          padding: 1rem 1.5rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          border: 1px solid rgba(255,255,255,0.05);
          max-width: 350px;
          margin-left: auto;
          margin-right: auto;
          transition: background 0.3s ease;
        }
        .winner-details:hover {
          background: rgba(255,255,255,0.06);
        }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.85rem;
          color: #ccc;
        }
        .detail-icon { font-size: 1.1rem; color: #D4AF37; }

        .claim-btn-primary {
          display: inline-block;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          border: none;
          padding: 0.9rem 2.8rem;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #0a0a0a;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 30px rgba(212, 175, 55, 0.3);
          margin-bottom: 0.8rem;
        }
        .claim-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 40px rgba(212, 175, 55, 0.5);
        }
        .claim-btn-primary:active { transform: scale(0.98); }
        .trust-note {
          font-size: 0.75rem;
          color: #666;
        }

        /* ── Step 2: Form ── */
        .form-hero {
          position: relative;
          min-height: 85vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem 1.5rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.05) 0%, transparent 70%), #0a0a0a;
        }
        .form-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .form-content {
          position: relative; z-index: 2;
          max-width: 480px;
          width: 100%;
        }
        .form-badge {
          display: inline-block;
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.2);
          padding: 0.2rem 1.2rem;
          border-radius: 40px;
          font-size: 0.6rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #D4AF37;
          letter-spacing: 1px;
          margin-bottom: 1rem;
        }
        .form-phone-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          margin-bottom: 1.2rem;
        }
        .form-phone-image {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.2);
          transition: transform 0.3s ease;
        }
        .form-phone-image:hover { transform: scale(1.05); }
        .form-phone-preview span {
          font-weight: 700;
          font-size: 1.1rem;
          color: #D4AF37;
        }
        .form-content h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.2rem;
        }
        .form-sub {
          font-size: 0.95rem;
          color: #888;
          margin-bottom: 1.5rem;
        }

        .form-card {
          background: rgba(255,255,255,0.04);
          border-radius: 32px;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          text-align: left;
          transition: box-shadow 0.3s ease;
        }
        .form-card:hover {
          box-shadow: 0 32px 80px rgba(0,0,0,0.4);
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #ccc;
          margin-bottom: 0.3rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group .optional { color: #666; font-weight: 400; font-size: 0.75rem; }
        .form-group input {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          font-size: 0.95rem;
          background: rgba(255,255,255,0.03);
          color: #fff;
          transition: all 0.25s ease;
          outline: none;
        }
        .form-group input::placeholder { color: #555; }
        .form-group input:focus {
          border-color: #D4AF37;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.08);
          background: rgba(255,255,255,0.06);
        }
        .field-note {
          display: block;
          font-size: 0.7rem;
          color: #666;
          margin-top: 0.2rem;
        }
        .form-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }

        .claim-btn-form {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #D4AF37, #B8860B);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #0a0a0a;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0.5rem;
        }
        .claim-btn-form:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(212, 175, 55, 0.4);
        }
        .claim-btn-form:active:not(:disabled) { transform: scale(0.98); }
        .claim-btn-form:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid rgba(10,10,10,0.2);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footnote {
          font-size: 0.75rem;
          color: #666;
          text-align: center;
          margin-top: 1rem;
        }

        /* ── Step 3: Redirecting ── */
        .redirect-hero {
          position: relative;
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem 1.5rem;
          background: #0a0a0a;
        }
        .redirect-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.05) 0%, transparent 70%);
        }
        .redirect-content {
          position: relative; z-index: 2;
        }
        .redirect-animation {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .pulse-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #D4AF37;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .pulse-circle.delay-1 { animation-delay: 0.4s; background: #B8860B; }
        .pulse-circle.delay-2 { animation-delay: 0.8s; background: #22C55E; }
        @keyframes pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .redirect-content h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.3rem;
        }
        .redirect-content p {
          color: #888;
          font-size: 1rem;
        }

        /* ── Footer ── */
        .site-footer {
          background: rgba(0,0,0,0.3);
          color: #666;
          padding: 1.5rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .site-footer p { font-size: 0.75rem; margin-bottom: 0.2rem; }
        .footer-contact { font-weight: 600; color: #888; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.92);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-icon { font-size: 3rem; margin-bottom: 0.3rem; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.3rem; }
        .modal-card p { color: #aaa; font-size: 0.85rem; margin-bottom: 1.5rem; }
        .modal-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .modal-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.6rem 1.2rem;
          border-radius: 40px;
          font-weight: 600;
          font-size: 0.75rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.25s ease;
          flex: 1;
          min-width: 100px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-2px); }
        .modal-btn.primary {
          background: #D4AF37;
          border: none;
          color: #0a0a0a;
        }
        .modal-btn.primary:hover { background: #B8860B; box-shadow: 0 4px 16px rgba(212,175,55,0.3); }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.7rem;
          margin-top: 0.3rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .phone-display { width: 140px; height: 140px; }
          .phone-image { border-radius: 20px; }
          .form-card { padding: 1.5rem; }
          .form-content h2 { font-size: 1.5rem; }
          .hero-content h1 { font-size: 2.2rem; }
          .prize-name { font-size: 1.4rem; }
          .winner-details { padding: 0.8rem 1rem; }
          .claim-btn-primary { padding: 0.8rem 2rem; font-size: 0.95rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .phone-display { width: 120px; height: 120px; }
          .hero-content h1 { font-size: 1.8rem; }
          .prize-name { font-size: 1.2rem; }
          .form-phone-image { width: 40px; height: 40px; }
          .form-phone-preview span { font-size: 0.95rem; }
          .hero-content { padding: 0.2rem 0; }
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
export default withCampaignMeta(IphoneWinner, defaultMeta);