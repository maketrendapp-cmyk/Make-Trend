// pages/templates/iphone-freebie.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'iPhone Freebie – Get iPhone 15 Pro Max for Free!',
  description: 'Invite friends, cut the price, and get iPhone 15 Pro Max for free. Limited time offer!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/iphone-freebie',
};

// ── Static Winner Data ──
const WINNERS = [
  { name: 'sahraj***', product: 'Privilege Bold Deodorant' },
  { name: 'Grishm***', product: 'Combo Pack Chocolate' },
  { name: 'reshma***', product: 'TWS Airpods Premium' },
  { name: 'subedi***', product: 'Uttam Special Tea' },
  { name: 'Rohit ***', product: 'Uttam Special Tea' },
];

function IphoneFreebie({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [claimedCount, setClaimedCount] = useState(3200);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Simulate claim count updates ──
  useEffect(() => {
    const interval = setInterval(() => {
      setClaimedCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Continue to tasks ──
  const handleContinue = () => {
    setLoading(true);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── Share button handlers (just visual) ──
  const handleShare = (platform) => {
    // Visual feedback only – no actual share logic
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
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
          <span className="logo-icon">📱</span>
          <span className="logo-text">Free<span>bie</span></span>
        </div>
        <div className="header-badge">🔥 iPhone Giveaway</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🎁 FREE IPHONE</div>
          <h1>Get iPhone 15 Pro Max <span>for Free</span></h1>
          <p>Invite friends to cut the price. Reach ₹0 and claim your iPhone!</p>
        </div>
      </section>

      {/* ─── MAIN CARD ─── */}
      <section className="main-section">
        <div className="main-card">

          {/* Product Header */}
          <div className="product-header">
            <div className="product-image">
              <span className="product-icon">📱</span>
            </div>
            <div className="product-info">
              <h2>iPhone 15 Pro Max</h2>
              <p className="product-meta">128GB • Deep Purple</p>
              <div className="claimed-badge">
                <span>👥</span>
                <span>{claimedCount.toLocaleString()}+ people claimed it for FREE</span>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="price-row">
              <span className="price-label">You Have Cut</span>
              <span className="price-value cut">₹800.81</span>
            </div>
            <div className="price-row">
              <span className="price-label">Left</span>
              <span className="price-value remaining">₹157.19</span>
            </div>
            <div className="price-row">
              <span className="price-label">FREE</span>
              <span className="price-value free">83.59%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-wrapper">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '83.59%' }}></div>
            </div>
            <div className="progress-labels">
              <span>₹157.19 Left</span>
              <span>83.59% FREE</span>
            </div>
          </div>

          {/* Timer */}
          <div className="timer-section">
            <span className="timer-icon">⏳</span>
            <span className="timer-text">Expires In</span>
            <span className="timer-value">23:55:38</span>
          </div>

          {/* Share Buttons */}
          <div className="share-section">
            <div className="share-title">Invite Friends To Cut More Price</div>
            <div className="share-buttons">
              <button className="share-btn whatsapp" onClick={() => handleShare('whatsapp')}>📱 WhatsApp</button>
              <button className="share-btn facebook" onClick={() => handleShare('facebook')}>📘 Facebook</button>
              <button className="share-btn instagram" onClick={() => handleShare('instagram')}>📸 Instagram</button>
              <button className="share-btn twitter" onClick={() => handleShare('twitter')}>🐦 Twitter</button>
              <button className="share-btn telegram" onClick={() => handleShare('telegram')}>✈️ Telegram</button>
            </div>
            <div className="share-actions">
              <button className="share-action" onClick={() => handleShare('copy')}>📋 Copy Info</button>
              <button className="share-action" onClick={() => handleShare('sms')}>📨 Send SMS</button>
              <button className="share-action" onClick={() => handleShare('more')}>📤 More</button>
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
                <span className="spinner"></span> Processing...
              </>
            ) : (
              'Continue to Claim →'
            )}
          </button>
        </div>
      </section>

      {/* ─── RECENT WINS ─── */}
      <section className="wins-section">
        <div className="wins-header">
          <h2>🏆 Recent Wins</h2>
          <span className="wins-badge">Live</span>
        </div>
        <div className="wins-list">
          {WINNERS.map((winner, idx) => (
            <div key={idx} className="win-item">
              <span className="win-avatar">👤</span>
              <div className="win-info">
                <span className="win-name">{winner.name}</span>
                <span className="win-product">has won FREE {winner.product}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW TO WIN ─── */}
      <section className="how-section">
        <h2 className="section-title">How to Win</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Share Link to Friends</h3>
              <p>Share your invite link with friends and family.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Friends Cut the Price</h3>
              <p>Each friend who clicks cuts the price randomly.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get It Free</h3>
              <p>Once the price reaches ₹0, claim your iPhone!</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">What is iPhone Freebie?</div>
            <div className="faq-answer">A referral-based program where you invite friends to cut the price of an iPhone. When it reaches ₹0, you get it for free.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How do I invite friends?</div>
            <div className="faq-answer">Tap the share buttons above and share your link via WhatsApp, Facebook, or other platforms.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How much price is cut per referral?</div>
            <div className="faq-answer">The cut amount is random, from ₹0.01 to higher amounts. New users cut more!</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What if the voucher expires?</div>
            <div className="faq-answer">Vouchers cannot be reissued after expiry. Use them before the time runs out.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 iPhone Freebie. All rights reserved.</p>
        <p className="footer-contact">Questions? support@iphonefreebie.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
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
          border-bottom: 1px solid rgba(255, 107, 53, 0.15);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; color: #FF6B35; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #FF6B35; }
        .header-badge {
          background: linear-gradient(135deg, #FF6B35, #E5532D);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(255, 107, 53, 0.2);
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
          background: linear-gradient(135deg, #fff5f0, #ffede6);
          color: #1a1a2e;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FF6B35' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(255, 107, 53, 0.12);
          border: 1px solid rgba(255, 107, 53, 0.2);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #FF6B35;
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
          color: #FF6B35;
        }
        .hero p {
          font-size: 1.05rem;
          color: #555;
          margin-bottom: 1.2rem;
        }

        /* ── Main Section ── */
        .main-section {
          padding: 2rem 1.5rem;
          max-width: 600px;
          margin: -2rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .main-card {
          background: #fff;
          border-radius: 28px;
          padding: 1.8rem 1.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
        }

        /* Product Header */
        .product-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .product-image {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #f5f3ff, #ede9fe);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .product-icon { font-size: 2.5rem; }
        .product-info h2 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1a1a2e;
        }
        .product-meta {
          font-size: 0.75rem;
          color: #888;
        }
        .claimed-badge {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.7rem;
          color: #FF6B35;
          background: #fff5f0;
          padding: 0.2rem 0.6rem;
          border-radius: 40px;
          margin-top: 0.2rem;
        }

        /* Price Section */
        .price-section {
          background: #f8fafc;
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.2rem 0;
        }
        .price-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #888;
        }
        .price-value {
          font-weight: 700;
          font-size: 0.95rem;
        }
        .price-value.cut { color: #22C55E; }
        .price-value.remaining { color: #EF4444; }
        .price-value.free { color: #FF6B35; font-size: 1.1rem; }

        /* Progress Bar */
        .progress-wrapper {
          margin-bottom: 1rem;
        }
        .progress-bar {
          height: 10px;
          background: #e5e7eb;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B35, #FF8C5A);
          border-radius: 99px;
        }
        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: #888;
          margin-top: 0.3rem;
        }

        /* Timer */
        .timer-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          background: #fef3f0;
          padding: 0.6rem 1rem;
          border-radius: 60px;
          margin-bottom: 1.2rem;
          border: 1px solid rgba(255, 107, 53, 0.1);
        }
        .timer-icon { font-size: 1.2rem; }
        .timer-text {
          font-size: 0.75rem;
          font-weight: 600;
          color: #888;
        }
        .timer-value {
          font-weight: 800;
          color: #FF6B35;
          font-size: 1rem;
          font-family: monospace;
        }

        /* Share Section */
        .share-section {
          margin-bottom: 1.2rem;
        }
        .share-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 0.6rem;
          text-align: center;
        }
        .share-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 0.6rem;
        }
        .share-btn {
          padding: 0.4rem 0.8rem;
          border-radius: 40px;
          border: none;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .share-btn:hover { transform: scale(1.05); }
        .share-btn.whatsapp { background: #25D366; color: #fff; }
        .share-btn.facebook { background: #1877F2; color: #fff; }
        .share-btn.instagram { background: #E4405F; color: #fff; }
        .share-btn.twitter { background: #1DA1F2; color: #fff; }
        .share-btn.telegram { background: #0088CC; color: #fff; }

        .share-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .share-action {
          padding: 0.3rem 0.8rem;
          border-radius: 40px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 0.65rem;
          font-weight: 600;
          color: #555;
          cursor: pointer;
          transition: background 0.2s;
        }
        .share-action:hover { background: #f3f4f6; }

        /* Continue Button */
        .continue-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #FF6B35, #E5532D);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(255, 107, 53, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .continue-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255, 107, 53, 0.35);
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

        /* ── Recent Wins ── */
        .wins-section {
          padding: 1.5rem 1.5rem;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }
        .wins-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.8rem;
        }
        .wins-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .wins-badge {
          font-size: 0.6rem;
          font-weight: 700;
          background: #22C55E;
          color: #fff;
          padding: 0.2rem 0.8rem;
          border-radius: 40px;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .wins-list {
          background: #fff;
          border-radius: 20px;
          padding: 0.8rem 1rem;
          border: 1px solid #eef2f6;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }
        .win-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .win-item:last-child { border-bottom: none; }
        .win-avatar { font-size: 1.2rem; }
        .win-info {
          display: flex;
          flex-wrap: wrap;
          gap: 0.2rem 0.4rem;
        }
        .win-name {
          font-weight: 600;
          font-size: 0.8rem;
          color: #1a1a2e;
        }
        .win-product {
          font-size: 0.75rem;
          color: #888;
        }

        /* ── How It Works ── */
        .how-section {
          padding: 2rem 1.5rem;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }
        .section-title {
          font-size: 1.4rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 1.5rem;
          color: #1a1a2e;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 50px;
          height: 3px;
          background: linear-gradient(90deg, #FF6B35, #FF8C5A);
          margin: 0.4rem auto 0;
          border-radius: 4px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .step {
          background: #fff;
          padding: 1.2rem 0.8rem;
          border-radius: 16px;
          text-align: center;
          border: 1px solid #eef2f6;
          transition: transform 0.2s;
        }
        .step:hover { transform: translateY(-4px); }
        .step-number {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #FF6B35, #E5532D);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1rem;
          color: #fff;
          margin: 0 auto 0.4rem;
        }
        .step-content h3 {
          font-size: 0.8rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .step-content p {
          font-size: 0.7rem;
          color: #888;
        }

        /* ── FAQ ── */
        .faq-section {
          padding: 2rem 1.5rem;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .faq-item {
          background: #fff;
          border-radius: 16px;
          padding: 0.8rem 1rem;
          border: 1px solid #eef2f6;
          transition: border-color 0.2s;
        }
        .faq-item:hover { border-color: #FF6B35; }
        .faq-question {
          font-weight: 700;
          font-size: 0.85rem;
          color: #1a1a2e;
        }
        .faq-answer p {
          font-size: 0.8rem;
          color: #888;
          margin-top: 0.2rem;
        }

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
          border: 1px solid rgba(255, 107, 53, 0.15);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
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
        .modal-btn:hover { background: rgba(255, 255, 255, 0.12); }
        .modal-btn.primary {
          background: #FF6B35;
          border: none;
        }
        .modal-btn.primary:hover { background: #E5532D; }
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
          .steps { grid-template-columns: 1fr; }
          .share-buttons { flex-wrap: wrap; justify-content: center; }
          .share-btn { font-size: 0.65rem; padding: 0.3rem 0.6rem; }
          .product-header { flex-direction: column; text-align: center; }
          .claimed-badge { justify-content: center; }
          .main-card { padding: 1.5rem 1rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .hero h1 { font-size: 1.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .main-section { padding: 1rem 1rem; }
          .price-section { padding: 0.8rem; }
          .price-value { font-size: 0.85rem; }
          .wins-header h2 { font-size: 0.95rem; }
          .win-item { flex-wrap: wrap; }
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
export default withCampaignMeta(IphoneFreebie, defaultMeta);