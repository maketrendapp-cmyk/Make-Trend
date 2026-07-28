// pages/templates/get-1k-subscribers.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Get 1K Subscribers – YouTube Growth Challenge',
  description: 'Reach your first 1,000 subscribers with our proven growth system. Join thousands of creators who hit the milestone.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/get-1k-subscribers?id={id}',
};

function Get1KSubscribers({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1);
  const [channelUrl, setChannelUrl] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [liveSubCount, setLiveSubCount] = useState(987);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 23, minutes: 59, seconds: 59 });

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Live subscriber counter ──
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSubCount(prev => {
        const increase = Math.floor(Math.random() * 3) + 1;
        return Math.min(prev + increase, 1250);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Countdown timer ──
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Validate ──
  const validate = () => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    if (!channelUrl.trim()) return 'Please enter your YouTube channel URL.';
    if (!acceptedTerms) return 'You must accept the terms to continue.';
    return null;
  };

  // ── Submit ──
  const handleSubmit = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  // ── Continue to tasks ──
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
          <span className="logo-icon">▶</span>
          <span className="logo-text">Tube<span>Growth</span></span>
        </div>
        <div className="header-badge">🔥 1K Challenge</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🎯 SUBSCRIBER CHALLENGE</div>
          <h1>Get Your First <span>1,000</span> Subscribers</h1>
          <p>Join thousands of creators who hit the milestone. Start your growth journey today.</p>
          <div className="hero-stats">
            <div><span>👥</span> {liveSubCount.toLocaleString()} Active Creators</div>
            <div><span>⏳</span> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left</div>
            <div><span>🏆</span> 5,000+ Graduates</div>
          </div>
        </div>
      </section>

      {/* ─── PROGRESS SECTION ─── */}
      <section className="progress-section">
        <div className="progress-container">
          <div className="progress-header">
            <span className="progress-label">Community Progress</span>
            <span className="progress-value">{liveSubCount.toLocaleString()} / 1,000</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min((liveSubCount / 1000) * 100, 100)}%` }}></div>
          </div>
          <p className="progress-sub">Creators are reaching 1K subscribers every day. Join them now!</p>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Register */}
        {step === 1 && (
          <div className="register-card">
            <h2>Start Your Growth</h2>
            <p>Enter your details to get started.</p>

            <div className="form-group">
              <label>Your Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>YouTube Channel URL <span className="required">*</span></label>
              <input
                type="url"
                placeholder="https://youtube.com/@yourchannel"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
              />
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms">I agree to the <a href="#terms">Terms &amp; Conditions</a></label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Processing...
                </>
              ) : (
                'Start Growth →'
              )}
            </button>

            <div className="trust-badges">
              <span><span className="badge-icon">✅</span> Verified</span>
              <span><span className="badge-icon">🔒</span> Secure</span>
              <span><span className="badge-icon">📹</span> YouTube Official</span>
            </div>
          </div>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h2>You're On The List!</h2>
            <p>Your channel is being analyzed. You'll receive your personalized growth plan shortly.</p>
            <div className="channel-preview">
              <div className="channel-info">
                <span className="channel-icon">📺</span>
                <div>
                  <span className="channel-name">{name || 'Your Channel'}</span>
                  <span className="channel-url">{channelUrl || 'youtube.com/yourchannel'}</span>
                </div>
              </div>
            </div>
            <div className="next-steps">
              <h3>What's Next?</h3>
              <div className="step-list">
                <div className="step-item">
                  <span className="step-num">1</span>
                  <span>Check your email for the growth guide</span>
                </div>
                <div className="step-item">
                  <span className="step-num">2</span>
                  <span>Complete the verification tasks</span>
                </div>
                <div className="step-item">
                  <span className="step-num">3</span>
                  <span>Watch your subscriber count grow</span>
                </div>
              </div>
            </div>
            <button className="continue-btn" onClick={handleContinue} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Redirecting...
                </>
              ) : (
                'Continue →'
              )}
            </button>
          </div>
        )}

      </main>

      {/* ─── FEATURES ─── */}
      <section className="features-section">
        <h2 className="section-title">Why Creators Love This</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🚀</span>
            <h3>Proven System</h3>
            <p>Step-by-step framework that has helped 5,000+ creators reach 1K.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>Real Analytics</h3>
            <p>Track your growth with real-time subscriber monitoring.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>Personalized Plan</h3>
            <p>Get a customized growth plan based on your channel.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🆓</span>
            <h3>Free Forever</h3>
            <p>No hidden fees. Join thousands of successful creators.</p>
          </div>
        </div>
      </section>

      {/* ─── COMMUNITY TESTIMONIALS ─── */}
      <section className="testimonials-section">
        <h2 className="section-title">Real Creators, Real Results</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-rating">⭐⭐⭐⭐⭐</div>
            <p>"I went from 200 to 1,200 subscribers in 30 days. This system really works!"</p>
            <div className="testimonial-author">
              <span className="author-avatar">📹</span>
              <div>
                <span className="author-name">Sarah K.</span>
                <span className="author-channel">Tech Girl</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-rating">⭐⭐⭐⭐⭐</div>
            <p>"Finally hit 1K after struggling for months. This is the best investment I've made."</p>
            <div className="testimonial-author">
              <span className="author-avatar">📹</span>
              <div>
                <span className="author-name">Mike R.</span>
                <span className="author-channel">Gamer Zone</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-rating">⭐⭐⭐⭐⭐</div>
            <p>"Simple steps, clear guidance. I recommend this to every new YouTuber."</p>
            <div className="testimonial-author">
              <span className="author-avatar">📹</span>
              <div>
                <span className="author-name">Emily W.</span>
                <span className="author-channel">Beauty Vlog</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">📋 How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Enter Your Channel</h3>
              <p>Provide your YouTube channel URL and details.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Get Your Plan</h3>
              <p>Receive a personalized growth strategy.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Watch It Grow</h3>
              <p>See your subscriber count climb to 1K.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title">📜 Terms & Conditions</h2>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all YouTube creators worldwide.</li>
            <li><strong>One Entry:</strong> Each channel can participate once.</li>
            <li><strong>Legitimate Growth:</strong> Only organic growth methods are allowed.</li>
            <li><strong>Data Privacy:</strong> Your information will only be used for growth services.</li>
            <li><strong>Changes:</strong> The organizers reserve the right to modify this program.</li>
          </ul>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">Is this really free?</div>
            <div className="faq-answer">Yes! The program is completely free. No hidden fees.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How long does it take?</div>
            <div className="faq-answer">Most creators reach 1K within 30-45 days of following the plan.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Do I need a certain number of subscribers?</div>
            <div className="faq-answer">No! This program is designed for channels of all sizes.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What if I already have 1K+ subscribers?</div>
            <div className="faq-answer">You can still join! We'll help you grow to 5K.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 TubeGrowth. All rights reserved.</p>
        <p className="footer-contact">Questions? support@tubegrowth.com</p>
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
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10, 10, 10, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 0, 0, 0.1);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; color: #FF0000; }
        .logo-text { color: #fff; }
        .logo-text span { color: #FF0000; }
        .header-badge {
          background: linear-gradient(135deg, #FF0000, #CC0000);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(255, 0, 0, 0.3);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 40vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(255, 0, 0, 0.05) 0%, transparent 70%), #0a0a0a;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FF0000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(255, 0, 0, 0.12);
          border: 1px solid rgba(255, 0, 0, 0.25);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #FF0000;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
        }
        .hero h1 span {
          color: #FF0000;
        }
        .hero p {
          font-size: 1.05rem;
          color: #999;
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

        /* ── Progress Section ── */
        .progress-section {
          padding: 1.5rem 1.5rem 0;
          max-width: 800px;
          margin: 0 auto;
        }
        .progress-container {
          background: rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .progress-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .progress-value {
          font-size: 0.8rem;
          font-weight: 800;
          color: #FF0000;
        }
        .progress-bar {
          height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF0000, #FF4444);
          border-radius: 99px;
          transition: width 0.5s ease;
        }
        .progress-sub {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #666;
          text-align: center;
        }

        /* ── Main Content ── */
        .main-content {
          max-width: 560px;
          margin: 1.5rem auto 2.5rem;
          padding: 0 1.5rem;
        }

        /* ── Register Card ── */
        .register-card {
          background: rgba(255,255,255,0.04);
          border-radius: 32px;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
        }
        .register-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          text-align: center;
          color: #fff;
        }
        .register-card > p {
          text-align: center;
          color: #888;
          margin-bottom: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.8rem;
          color: #ccc;
          margin-bottom: 0.2rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          font-size: 0.9rem;
          background: rgba(255,255,255,0.03);
          color: #fff;
          transition: border-color 0.2s;
          outline: none;
        }
        .form-group input::placeholder { color: #555; }
        .form-group input:focus {
          border-color: #FF0000;
          box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.08);
        }

        .checkbox-group {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 1rem 0;
        }
        .checkbox-group input {
          width: 18px; height: 18px;
          margin-top: 2px;
          accent-color: #FF0000;
          flex-shrink: 0;
        }
        .checkbox-group label {
          font-size: 0.8rem;
          color: #aaa;
        }
        .checkbox-group label a {
          color: #FF0000;
          text-decoration: none;
        }
        .form-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin: 0.5rem 0;
        }

        .submit-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #FF0000, #CC0000);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(255, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255, 0, 0, 0.3);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.2rem;
          font-size: 0.7rem;
          color: #888;
        }
        .trust-badges span {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .badge-icon { font-size: 0.8rem; }

        /* ── Success Card ── */
        .success-card {
          background: rgba(255,255,255,0.04);
          border-radius: 32px;
          padding: 2rem;
          border: 1px solid rgba(34, 197, 94, 0.15);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          text-align: center;
        }
        .success-icon { font-size: 3.5rem; margin-bottom: 0.3rem; }
        .success-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
        }
        .success-card > p {
          color: #888;
          margin-bottom: 1.2rem;
        }
        .channel-preview {
          background: rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        .channel-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        .channel-icon { font-size: 2rem; }
        .channel-name {
          display: block;
          font-weight: 700;
          color: #fff;
        }
        .channel-url {
          display: block;
          font-size: 0.75rem;
          color: #666;
        }

        .next-steps { text-align: left; }
        .next-steps h3 {
          font-size: 0.9rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .step-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-size: 0.85rem;
          color: #aaa;
        }
        .step-num {
          width: 28px;
          height: 28px;
          background: rgba(255, 0, 0, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.7rem;
          color: #FF0000;
          flex-shrink: 0;
        }

        .continue-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 1.2rem;
        }
        .continue-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
        }
        .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Features Section ── */
        .features-section {
          padding: 3rem 1.5rem;
          max-width: 1000px;
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
          background: linear-gradient(90deg, #FF0000, #FF4444);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.2rem;
          margin-top: 1.5rem;
        }
        .feature-card {
          background: rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 1.5rem 1rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.2s;
        }
        .feature-card:hover { transform: translateY(-4px); }
        .feature-icon { font-size: 2rem; display: block; margin-bottom: 0.3rem; }
        .feature-card h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .feature-card p {
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
        .testimonial-card:hover { transform: translateY(-4px); }
        .testimonial-rating {
          color: #f5a623;
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
        .author-avatar { font-size: 1.4rem; }
        .author-name {
          display: block;
          font-weight: 700;
          font-size: 0.85rem;
          color: #fff;
        }
        .author-channel {
          display: block;
          font-size: 0.7rem;
          color: #888;
        }

        /* ── How It Works ── */
        .how-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .step {
          background: rgba(255,255,255,0.04);
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.2s;
        }
        .step:hover { transform: translateY(-4px); }
        .step-number {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #FF0000, #CC0000);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 auto 0.6rem;
        }
        .step-content h3 { font-size: 0.95rem; font-weight: 700; color: #fff; }
        .step-content p { font-size: 0.8rem; color: #888; }

        /* ── Terms Section ── */
        .terms-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content {
          background: rgba(255,255,255,0.04);
          padding: 1.8rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.5rem 0 0.5rem 1.8rem;
          position: relative;
          color: #aaa;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.85rem;
        }
        .terms-content ul li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #FF0000;
          font-weight: 700;
        }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong { color: #fff; }

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
        .faq-item:hover { border-color: rgba(255, 0, 0, 0.2); }
        .faq-question { font-weight: 700; font-size: 0.9rem; color: #fff; }
        .faq-answer p { font-size: 0.85rem; color: #888; margin-top: 0.3rem; }

        /* ── Footer ── */
        .site-footer {
          background: rgba(0,0,0,0.3);
          color: #666;
          padding: 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 1rem;
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
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 36px;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(255, 0, 0, 0.15);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
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
          transition: 0.2s;
          flex: 1;
          min-width: 100px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.12); }
        .modal-btn.primary {
          background: #FF0000;
          border: none;
        }
        .modal-btn.primary:hover { background: #CC0000; }
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
          .features-grid { grid-template-columns: 1fr 1fr; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .steps { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.3rem 1rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .register-card { padding: 1.5rem; }
          .success-card { padding: 1.5rem; }
          .features-grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 1.8rem; }
          .trust-badges { flex-wrap: wrap; gap: 0.8rem; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .section-title { font-size: 1.4rem; }
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
export default withCampaignMeta(Get1KSubscribers, defaultMeta);