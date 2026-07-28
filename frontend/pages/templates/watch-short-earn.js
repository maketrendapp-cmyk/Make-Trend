// pages/templates/watch-short-earn.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Watch Short & Earn – Get Paid to Watch Videos',
  description: 'Watch short videos and earn rewards instantly. Complete tasks to unlock your earnings. Start now!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/watch-short-earn',
};

function WatchShortEarn({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Handle continue ──
  const handleContinue = () => {
    setLoading(true);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
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
          <span className="logo-icon">▶️</span>
          <span className="logo-text">Watch<span>Earn</span></span>
        </div>
        <div className="header-badge">💰 $10 Reward</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🎬 WATCH & EARN</div>
          <h1>Watch Short Videos<br />Earn <span>$10</span> Instantly</h1>
          <p>Watch a short video, complete simple tasks, and claim your $10 reward. It's that easy.</p>
          <div className="hero-stats">
            <div><span>⏱️</span> 30 Seconds</div>
            <div><span>💰</span> $10 Reward</div>
            <div><span>✅</span> Instant</div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CARD ─── */}
      <section className="main-section">
        <div className="main-card">

          {/* Reward Display */}
          <div className="reward-display">
            <div className="reward-circle">
              <span className="reward-icon">💰</span>
            </div>
            <div className="reward-info">
              <span className="reward-amount">$10</span>
              <span className="reward-label">Your Reward</span>
            </div>
          </div>

          {/* Video Preview */}
          <div className="video-preview">
            <div className="video-thumbnail">
              <div className="play-icon">▶️</div>
              <div className="video-overlay-text">
                <span>Watch Short Video</span>
                <span className="video-duration">⏱️ 30 sec</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="features-row">
            <div className="feature-item">
              <span className="feature-icon">⏱️</span>
              <span>30 Seconds</span>
            </div>
            <div className="feature-divider"></div>
            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Simple Tasks</span>
            </div>
            <div className="feature-divider"></div>
            <div className="feature-item">
              <span className="feature-icon">💰</span>
              <span>$10 Reward</span>
            </div>
          </div>

          {/* Continue Button */}
          <button
            className="continue-btn"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Redirecting...
              </>
            ) : (
              'Start Earning $10 →'
            )}
          </button>

          <p className="secure-note">🔒 Your earnings are secure and private.</p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">📋 How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Watch Video</h3>
              <p>Watch a 30-second short video.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Complete Tasks</h3>
              <p>Finish a few simple tasks.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get $10</h3>
              <p>Claim your reward instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY WATCH ─── */}
      <section className="why-section">
        <h2 className="section-title">Why Watch & Earn?</h2>
        <div className="why-grid">
          <div className="why-card">
            <span className="why-icon">💵</span>
            <h3>Earn Real Money</h3>
            <p>Get paid $10 for watching a short video.</p>
          </div>
          <div className="why-card">
            <span className="why-icon">⏱️</span>
            <h3>Quick & Easy</h3>
            <p>Only 30 seconds of your time.</p>
          </div>
          <div className="why-card">
            <span className="why-icon">🔒</span>
            <h3>Safe & Secure</h3>
            <p>Your data is fully protected.</p>
          </div>
          <div className="why-card">
            <span className="why-icon">📱</span>
            <h3>Mobile Friendly</h3>
            <p>Watch anywhere, anytime.</p>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials-section">
        <h2 className="section-title">Real People, Real Earnings</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-rating">⭐⭐⭐⭐⭐</div>
            <p>"I earned $10 in just 2 minutes! This is amazing."</p>
            <div className="testimonial-author">
              <span className="author-avatar">👤</span>
              <span className="author-name">Sarah K.</span>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-rating">⭐⭐⭐⭐⭐</div>
            <p>"Simple and fast. I've already earned $50 this week!"</p>
            <div className="testimonial-author">
              <span className="author-avatar">👤</span>
              <span className="author-name">Mike R.</span>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-rating">⭐⭐⭐⭐⭐</div>
            <p>"Best way to earn extra cash. Highly recommended!"</p>
            <div className="testimonial-author">
              <span className="author-avatar">👤</span>
              <span className="author-name">Emily W.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">How long is the video?</div>
            <div className="faq-answer">The video is only 30 seconds long. Watch it completely to earn your reward.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How do I earn $10?</div>
            <div className="faq-answer">Watch the video, complete the tasks, and claim your $10 reward instantly.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Is this really free?</div>
            <div className="faq-answer">Yes! Watch the video and earn $10 completely free. No hidden fees.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What if I have issues?</div>
            <div className="faq-answer">Contact support and we'll help you resolve any issues.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 WatchEarn. All rights reserved.</p>
        <p className="footer-contact">Questions? support@watchearn.com</p>
      </footer>

      {/* ─── STYLES ─── */}
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
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10, 10, 10, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.15);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; color: #8B5CF6; }
        .logo-text { color: #fff; }
        .logo-text span { color: #8B5CF6; }
        .header-badge {
          background: linear-gradient(135deg, #8B5CF6, #06B6D4);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(139, 92, 246, 0.3);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 45vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 70%), #0a0a0a;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B5CF6' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.25);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #8B5CF6;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2.2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
        }
        .hero h1 span {
          color: #8B5CF6;
        }
        .hero p {
          font-size: 1.05rem;
          color: #aaa;
          margin-bottom: 1.2rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .hero-stats div {
          background: rgba(255,255,255,0.04);
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.05);
          font-weight: 600;
          font-size: 0.85rem;
          color: #aaa;
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Main Section ── */
        .main-section {
          padding: 2rem 1.5rem;
          max-width: 600px;
          margin: -2rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .main-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border-radius: 32px;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          text-align: center;
        }

        /* Reward Display */
        .reward-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          margin-bottom: 1.5rem;
        }
        .reward-circle {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #8B5CF6, #06B6D4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25);
        }
        .reward-icon {
          font-size: 2.2rem;
        }
        .reward-info {
          text-align: left;
        }
        .reward-amount {
          display: block;
          font-size: 2.2rem;
          font-weight: 900;
          color: #8B5CF6;
          line-height: 1;
        }
        .reward-label {
          display: block;
          font-size: 0.8rem;
          color: #aaa;
        }

        /* Video Preview */
        .video-preview {
          margin-bottom: 1.5rem;
        }
        .video-thumbnail {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e, #2d2d44);
          border-radius: 20px;
          padding: 2rem 1.5rem;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .play-icon {
          font-size: 3rem;
          color: #8B5CF6;
          margin-bottom: 0.5rem;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        .video-overlay-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
        }
        .video-overlay-text span:first-child {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
        }
        .video-duration {
          font-size: 0.75rem;
          color: #888;
        }

        /* Features Row */
        .features-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 0.8rem;
          background: rgba(255,255,255,0.03);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #ccc;
        }
        .feature-icon {
          font-size: 1rem;
        }
        .feature-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.08);
        }

        /* Continue Button */
        .continue-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #8B5CF6, #06B6D4);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(139, 92, 246, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .continue-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 36px rgba(139, 92, 246, 0.35);
        }
        .continue-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .secure-note {
          font-size: 0.75rem;
          color: #666;
          margin-top: 1rem;
        }

        /* ── How It Works ── */
        .how-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 0.3rem;
          color: #fff;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #8B5CF6, #06B6D4);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .step {
          background: rgba(255,255,255,0.04);
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.2s;
        }
        .step:hover {
          transform: translateY(-4px);
        }
        .step-number {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #8B5CF6, #06B6D4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 auto 0.6rem;
        }
        .step-content h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .step-content p {
          font-size: 0.85rem;
          color: #888;
        }

        /* ── Why Section ── */
        .why-section {
          padding: 3rem 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .why-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.2rem;
          margin-top: 1.5rem;
        }
        .why-card {
          background: rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 1.5rem 1rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.2s;
        }
        .why-card:hover {
          transform: translateY(-4px);
        }
        .why-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.3rem;
        }
        .why-card h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .why-card p {
          font-size: 0.8rem;
          color: #888;
        }

        /* ── Testimonials ── */
        .testimonials-section {
          padding: 3rem 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.2rem;
          margin-top: 1.5rem;
        }
        .testimonial-card {
          background: rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.2s;
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
        }
        .testimonial-rating {
          color: #F59E0B;
          font-size: 0.8rem;
          margin-bottom: 0.3rem;
        }
        .testimonial-card p {
          font-size: 0.85rem;
          color: #ccc;
          margin-bottom: 0.8rem;
        }
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .author-avatar {
          font-size: 1.2rem;
        }
        .author-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: #fff;
        }

        /* ── FAQ ── */
        .faq-section {
          padding: 3rem 1.5rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .faq-item {
          background: rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 1rem 1.2rem;
          border: 1px solid rgba(255,255,255,0.05);
          transition: border-color 0.2s;
        }
        .faq-item:hover {
          border-color: rgba(139, 92, 246, 0.2);
        }
        .faq-question {
          font-weight: 700;
          font-size: 0.9rem;
          color: #fff;
        }
        .faq-answer p {
          font-size: 0.85rem;
          color: #888;
          margin-top: 0.3rem;
        }

        /* ── Footer ── */
        .site-footer {
          background: rgba(0,0,0,0.3);
          color: #666;
          padding: 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: auto;
        }
        .site-footer p {
          font-size: 0.75rem;
          margin-bottom: 0.2rem;
        }
        .footer-contact {
          font-weight: 600;
          color: #888;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
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
          border: 1px solid rgba(139, 92, 246, 0.15);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }
        .modal-icon {
          font-size: 3rem;
          margin-bottom: 0.3rem;
        }
        .modal-card h2 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.3rem;
        }
        .modal-card p {
          color: #aaa;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .modal-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
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
        .modal-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .modal-btn.primary {
          background: #8B5CF6;
          border: none;
        }
        .modal-btn.primary:hover {
          background: #7C3AED;
        }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.7rem;
          margin-top: 0.3rem;
        }
        .modal-btn.ghost:hover {
          color: #fff;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .steps {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }
          .why-grid {
            grid-template-columns: 1fr 1fr;
          }
          .testimonials-grid {
            grid-template-columns: 1fr;
          }
          .hero-stats {
            gap: 0.8rem;
          }
          .hero-stats div {
            font-size: 0.75rem;
            padding: 0.3rem 1rem;
          }
          .main-card {
            padding: 1.8rem 1.2rem;
          }
        }
        @media (max-width: 480px) {
          .header-badge {
            font-size: 0.55rem;
            padding: 0.2rem 0.8rem;
          }
          .hero h1 {
            font-size: 1.8rem;
          }
          .site-header {
            padding: 0.5rem 1rem;
          }
          .main-section {
            padding: 1rem 1rem;
          }
          .main-card {
            padding: 1.5rem 1rem;
          }
          .why-grid {
            grid-template-columns: 1fr;
          }
          .features-row {
            flex-direction: column;
            gap: 0.5rem;
          }
          .feature-divider {
            display: none;
          }
          .reward-display {
            flex-direction: column;
            text-align: center;
          }
          .reward-info {
            text-align: center;
          }
          .continue-btn {
            font-size: 0.95rem;
            padding: 0.8rem;
          }
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
export default withCampaignMeta(WatchShortEarn, defaultMeta);