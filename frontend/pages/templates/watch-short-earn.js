
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
          <div className="modal-icon-container">
            <span className="modal-icon">🌐</span>
          </div>
          <h2>Open in Browser</h2>
          <p>For the best experience and to ensure your rewards track correctly, please open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Link copied! Paste it in Chrome or Safari.');
                setShowWebViewModal(false);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy Link
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              Open Browser
            </button>
          </div>
          <button
            className="modal-btn text-only"
            onClick={() => setShowWebViewModal(false)}
          >
            Continue anyway (Not Recommended)
          </button>
        </div>
      </div>
    );
  };

  // ── Main UI ──
  return (
    <div className="page-wrapper">

      <WebViewModal />

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon-bg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <span className="logo-text">Watch<span>Earn</span></span>
          </div>
          <div className="header-badge">
            <span className="pulse-dot"></span> $10 Reward
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-glow shape-1"></div>
        <div className="hero-glow shape-2"></div>
        <div className="hero-content">
          <div className="hero-badge-wrap">
            <div className="hero-badge">🎬 WATCH & EARN SYSTEM</div>
          </div>
          <h1>Watch Short Videos<br />Earn <span className="text-gradient">$10</span> Instantly</h1>
          <p>Complete a quick video view, finish the verification tasks, and claim your guaranteed reward directly to your account.</p>
          <div className="hero-stats">
            <div className="stat-pill"><span className="stat-icon">⏱️</span> 30 Secs</div>
            <div className="stat-pill"><span className="stat-icon">💎</span> $10 Reward</div>
            <div className="stat-pill"><span className="stat-icon">⚡</span> Instant Payout</div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CARD ─── */}
      <section className="main-section">
        <div className="main-card">
          
          {/* Reward Display */}
          <div className="reward-display">
            <div className="reward-circle">
              <span className="reward-icon">💵</span>
            </div>
            <div className="reward-info">
              <span className="reward-amount">$10.00</span>
              <span className="reward-label">Guaranteed Reward</span>
            </div>
          </div>

          {/* Sleek Video Preview */}
          <div className="video-preview-container">
            <div className="video-player-mock">
              <div className="player-glow"></div>
              <div className="play-button">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div className="player-overlay">
                <div className="player-text">Ready to watch</div>
                <div className="player-time">0:30</div>
              </div>
              <div className="player-progress-bar">
                <div className="player-progress-fill"></div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="features-row">
            <div className="feature-item">
              <span className="feature-icon">⏱️</span>
              <div className="feature-text">
                <span className="feature-title">Duration</span>
                <span className="feature-sub">30 Seconds</span>
              </div>
            </div>
            <div className="feature-divider"></div>
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <div className="feature-text">
                <span className="feature-title">Status</span>
                <span className="feature-sub text-cyan">Verified</span>
              </div>
            </div>
            <div className="feature-divider"></div>
            <div className="feature-item">
              <span className="feature-icon">💰</span>
              <div className="feature-text">
                <span className="feature-title">Payout</span>
                <span className="feature-sub text-purple">$10.00</span>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            className={`continue-btn ${loading ? 'loading' : ''}`}
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> 
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <span>Start Watching & Earn $10</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>

          <p className="secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Connection is encrypted and secure
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three steps to your reward</p>
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-number-wrap">1</div>
            <h3>Watch Video</h3>
            <p>Click start and watch a high-quality sponsored short video for 30 seconds.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">2</div>
            <h3>Complete Tasks</h3>
            <p>Finish a quick human verification step to prove you are a real viewer.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">3</div>
            <h3>Get Paid</h3>
            <p>Claim your $10 reward instantly directly to your preferred payout method.</p>
          </div>
        </div>
      </section>

      {/* ─── WHY WATCH ─── */}
      <section className="why-section">
        <div className="section-header">
          <h2 className="section-title">Why Use WatchEarn?</h2>
        </div>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon-wrap"><span className="why-icon">💵</span></div>
            <h3>Real Money</h3>
            <p>Get paid actual cash, not useless points or tokens.</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap"><span className="why-icon">⚡</span></div>
            <h3>Lightning Fast</h3>
            <p>The whole process takes less than 2 minutes.</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap"><span className="why-icon">🛡️</span></div>
            <h3>100% Secure</h3>
            <p>Your personal data is encrypted and never shared.</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap"><span className="why-icon">📱</span></div>
            <h3>Any Device</h3>
            <p>Works flawlessly on phones, tablets, and PCs.</p>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials-section">
        <div className="section-header">
          <h2 className="section-title">Recent Payouts</h2>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <p>"Honestly thought it was fake but I got my $10 instantly after watching the ad. Amazing!"</p>
            <div className="testimonial-author">
              <div className="author-avatar">S</div>
              <div className="author-details">
                <span className="author-name">Sarah Jenkins</span>
                <span className="author-status text-cyan">Verified User</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <p>"I've done this three times today. Easiest money I've ever made on my lunch break."</p>
            <div className="testimonial-author">
              <div className="author-avatar bg-purple">M</div>
              <div className="author-details">
                <span className="author-name">Mike R.</span>
                <span className="author-status text-cyan">Verified User</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <p>"Super smooth UI, no glitches. Got the notification of my payment exactly when it said I would."</p>
            <div className="testimonial-author">
              <div className="author-avatar bg-cyan">E</div>
              <div className="author-details">
                <span className="author-name">Emily W.</span>
                <span className="author-status text-cyan">Verified User</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">How long is the video?</div>
              <div className="faq-answer">The video is strictly 30 seconds long. You must watch it until the end to get credited.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">How do I receive my $10?</div>
              <div className="faq-answer">After verification, you'll be prompted to enter your preferred payout method (PayPal, CashApp, or Gift Card).</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">Are there hidden fees?</div>
              <div className="faq-answer">Absolutely none. Our advertisers pay us for your attention, and we pass the majority of that directly to you.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="logo footer-logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Watch<span>Earn</span>
          </div>
          <p>© {new Date().getFullYear()} WatchEarn Ecosystem. All rights reserved.</p>
          <p className="footer-contact">Secure & Verified System.</p>
        </div>
      </footer>

      {/* ─── ENHANCED CSS ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --brand-primary: #8b5cf6; /* Violet */
          --brand-primary-light: #a78bfa;
          --brand-primary-dark: #6d28d9;
          --brand-secondary: #06b6d4; /* Cyan */
          --brand-secondary-light: #22d3ee;
          
          --bg-base: #030712;
          --bg-surface: rgba(17, 24, 39, 0.6);
          --bg-surface-solid: #111827;
          --border-color: rgba(255, 255, 255, 0.08);
          --border-highlight: rgba(139, 92, 246, 0.3);
          
          --text-main: #f9fafb;
          --text-muted: #9ca3af;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }
        body { background: var(--bg-base); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(3, 7, 18, 0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-color); padding: 1rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.6rem; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
        .logo-icon-bg { width: 32px; height: 32px; background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
        .logo-text { color: var(--text-main); }
        .logo-text span { color: var(--brand-primary-light); }
        .header-badge {
          background: rgba(139, 92, 246, 0.15); color: var(--brand-primary-light); font-weight: 700; font-size: 0.75rem;
          padding: 0.4rem 0.8rem; border-radius: 40px; display: flex; align-items: center; gap: 6px;
          border: 1px solid var(--border-highlight);
        }
        .pulse-dot { width: 6px; height: 6px; background: #34d399; border-radius: 50%; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); } 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); } }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 40vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 4rem 1.5rem; overflow: hidden;
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.3; z-index: 1; }
        .shape-1 { width: 500px; height: 500px; background: var(--brand-primary); top: -200px; left: -100px; }
        .shape-2 { width: 400px; height: 400px; background: var(--brand-secondary); bottom: -100px; right: -100px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1.2rem; }
        .hero-badge {
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); padding: 0.4rem 1rem;
          border-radius: 40px; font-size: 0.7rem; font-weight: 800; color: var(--text-muted);
          letter-spacing: 1px; backdrop-filter: blur(4px);
        }
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1.2rem; letter-spacing: -1px; }
        .text-gradient { background: linear-gradient(to right, var(--brand-primary-light), var(--brand-secondary-light)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 1.1rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        
        .hero-stats { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
        .stat-pill { background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 40px; border: 1px solid var(--border-color); font-weight: 600; font-size: 0.85rem; color: #d1d5db; display: flex; align-items: center; gap: 6px; }

        /* ── Main Card ── */
        .main-section { padding: 0 1.5rem; max-width: 640px; margin: -2rem auto 3rem; position: relative; z-index: 10; }
        .main-card {
          background: var(--bg-surface); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-radius: 28px; padding: 2.5rem 2rem; border: 1px solid var(--border-color);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        /* Reward Display */
        .reward-display { display: flex; align-items: center; justify-content: center; gap: 1.2rem; margin-bottom: 2rem; }
        .reward-circle {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4); animation: float 4s ease-in-out infinite;
        }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .reward-icon { font-size: 2.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
        .reward-info { display: flex; flex-direction: column; }
        .reward-amount { font-size: 2.5rem; font-weight: 900; line-height: 1; letter-spacing: -1px; background: linear-gradient(to bottom, #fff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .reward-label { font-size: 0.85rem; font-weight: 600; color: var(--brand-primary-light); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }

        /* Sleek Video Player */
        .video-preview-container { margin-bottom: 2rem; }
        .video-player-mock {
          width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 16px; position: relative;
          overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 0 40px rgba(139, 92, 246, 0.1);
        }
        .player-glow { position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(139, 92, 246, 0.2) 0%, transparent 70%); }
        .play-button {
          width: 64px; height: 64px; background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);
          border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff;
          border: 1px solid rgba(255,255,255,0.2); cursor: pointer; z-index: 2; transition: 0.3s;
          box-shadow: 0 0 0 0 rgba(255,255,255,0.2); animation: pulse-play 2s infinite;
        }
        @keyframes pulse-play { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); } 70% { box-shadow: 0 0 0 15px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
        .player-overlay { position: absolute; top: 0; left: 0; width: 100%; padding: 1rem; display: flex; justify-content: space-between; align-items: flex-start; z-index: 2; }
        .player-text { font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 6px; }
        .player-time { font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; }
        .player-progress-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.2); }
        .player-progress-fill { width: 0%; height: 100%; background: var(--brand-primary); }

        /* Features */
        .features-row {
          display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3);
          padding: 1rem; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 2rem;
        }
        .feature-item { display: flex; align-items: center; gap: 10px; flex: 1; justify-content: center; }
        .feature-icon { font-size: 1.2rem; }
        .feature-text { display: flex; flex-direction: column; text-align: left; }
        .feature-title { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .feature-sub { font-size: 0.85rem; font-weight: 700; color: #fff; }
        .text-cyan { color: var(--brand-secondary-light); }
        .text-purple { color: var(--brand-primary-light); }
        .feature-divider { width: 1px; height: 30px; background: var(--border-color); }

        /* Continue Button */
        .continue-btn {
          width: 100%; padding: 1.1rem; background: linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark));
          border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; color: #fff; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.4);
          display: flex; align-items: center; justify-content: center; gap: 10px; position: relative; overflow: hidden;
        }
        .continue-btn::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg); animation: shine 3s infinite;
        }
        @keyframes shine { 0% { left: -100%; } 20% { left: 200%; } 100% { left: 200%; } }
        .continue-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 35px -5px rgba(139, 92, 246, 0.6); }
        .continue-btn:active:not(:disabled) { transform: translateY(0); }
        .continue-btn.loading { opacity: 0.8; cursor: wait; }
        .continue-btn.loading::after { display: none; }
        .spinner { width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .secure-note { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-top: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 6px; }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 2.5rem; }
        .section-title { font-size: 1.8rem; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
        .section-subtitle { font-size: 1rem; color: var(--text-muted); margin-top: 0.3rem; }

        /* ── How It Works ── */
        .how-section { padding: 4rem 1.5rem; max-width: 1000px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .step-card { background: var(--bg-surface-solid); padding: 2rem 1.5rem; border-radius: 24px; text-align: center; border: 1px solid var(--border-color); transition: all 0.3s; }
        .step-card:hover { transform: translateY(-5px); border-color: var(--brand-primary-light); background: rgba(31, 41, 55, 0.8); }
        .step-number-wrap { width: 48px; height: 48px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; color: var(--brand-primary-light); font-weight: 900; font-size: 1.2rem; transform: rotate(-5deg); transition: 0.3s; }
        .step-card:hover .step-number-wrap { transform: rotate(0) scale(1.1); background: var(--brand-primary); color: #fff; }
        .step-card h3 { font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.9rem; color: var(--text-muted); }

        /* ── Why Grid ── */
        .why-section { padding: 4rem 1.5rem; max-width: 1000px; margin: 0 auto; }
        .why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .why-card { background: var(--bg-surface-solid); border-radius: 20px; padding: 1.5rem; text-align: center; border: 1px solid var(--border-color); transition: transform 0.2s; }
        .why-card:hover { transform: translateY(-4px); border-color: rgba(6, 182, 212, 0.4); }
        .why-icon-wrap { width: 50px; height: 50px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .why-icon { font-size: 1.5rem; }
        .why-card h3 { font-size: 1rem; font-weight: 800; color: #fff; margin-bottom: 0.3rem; }
        .why-card p { font-size: 0.85rem; color: var(--text-muted); }

        /* ── Testimonials ── */
        .testimonials-section { padding: 4rem 1.5rem; max-width: 1000px; margin: 0 auto; }
        .testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .testimonial-card { background: var(--bg-surface-solid); border-radius: 20px; padding: 2rem 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; }
        .testimonial-rating { display: flex; gap: 2px; margin-bottom: 1rem; }
        .testimonial-card p { font-size: 0.95rem; color: #e5e7eb; font-style: italic; margin-bottom: 1.5rem; }
        .testimonial-author { display: flex; align-items: center; gap: 12px; }
        .author-avatar { width: 40px; height: 40px; background: var(--brand-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
        .bg-purple { background: var(--brand-primary-dark); }
        .bg-cyan { background: var(--brand-secondary-dark); }
        .author-details { display: flex; flex-direction: column; }
        .author-name { font-weight: 700; font-size: 0.9rem; color: #fff; }
        .author-status { font-size: 0.75rem; font-weight: 600; }

        /* ── FAQ ── */
        .faq-section { padding: 4rem 1.5rem 6rem; max-width: 800px; margin: 0 auto; }
        .faq-list { display: flex; flex-direction: column; gap: 1rem; }
        .faq-item { background: var(--bg-surface-solid); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border-color); display: flex; gap: 1.2rem; transition: all 0.2s; }
        .faq-item:hover { border-color: var(--brand-primary-light); }
        .faq-icon { width: 32px; height: 32px; flex-shrink: 0; background: rgba(139, 92, 246, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--brand-primary-light); }
        .faq-question { font-weight: 800; font-size: 1.05rem; color: #fff; margin-bottom: 0.4rem; }
        .faq-answer { font-size: 0.95rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #000; border-top: 1px solid var(--border-color); padding: 3rem 1.5rem; text-align: center; margin-top: auto; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
        .footer-logo { font-size: 1.1rem; opacity: 0.5; margin-bottom: 0.5rem; justify-content: center; }
        .site-footer p { font-size: 0.85rem; color: var(--text-muted); }
        .footer-contact { font-weight: 600; color: #6b7280; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0, 0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: var(--bg-surface-solid); border-radius: 28px; padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center; border: 1px solid var(--border-highlight); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .modal-icon-container { width: 64px; height: 64px; background: rgba(139, 92, 246, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; border: 1px solid rgba(139, 92, 246, 0.2); }
        .modal-icon { font-size: 2rem; }
        .modal-card h2 { font-size: 1.5rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
        .modal-card p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-btn { padding: 1rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .modal-btn.primary { background: var(--brand-primary); color: #fff; }
        .modal-btn.primary:hover { background: var(--brand-primary-dark); transform: translateY(-2px); }
        .modal-btn.ghost { background: transparent; color: #fff; border: 1px solid var(--border-color); }
        .modal-btn.ghost:hover { background: rgba(255,255,255,0.05); }
        .modal-btn.text-only { background: transparent; color: #6b7280; font-size: 0.8rem; margin-top: 1rem; }
        .modal-btn.text-only:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .steps { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; gap: 1.2rem; }
          .why-grid { grid-template-columns: 1fr 1fr; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .main-section { margin-top: -2.5rem; }
          .main-card { padding: 2rem 1.5rem; }
          .reward-amount { font-size: 2rem; }
          .hero { padding-top: 2rem; min-height: auto; padding-bottom: 5rem; }
          .hero h1 { font-size: 2.2rem; }
          .stat-pill { font-size: 0.75rem; padding: 0.4rem 0.8rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.65rem; padding: 0.3rem 0.6rem; }
          .logo { font-size: 1.1rem; }
          .main-card { border-radius: 20px; padding: 1.5rem 1rem; }
          .why-grid { grid-template-columns: 1fr; }
          .features-row { flex-direction: column; gap: 0.8rem; align-items: stretch; }
          .feature-item { justify-content: flex-start; padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 8px; }
          .feature-divider { display: none; }
          .reward-display { flex-direction: column; text-align: center; }
          .reward-info { text-align: center; }
          .continue-btn { font-size: 1rem; padding: 1rem; }
          .faq-item { padding: 1.2rem; flex-direction: column; gap: 0.8rem; }
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