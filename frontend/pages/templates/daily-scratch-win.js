// pages/templates/daily-scratch-win.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Daily Scratch & Win – Get $10 Free Every Day!',
  description: 'Scratch the card daily and win $10 instantly. Free to play – no hidden fees! Claim your reward now.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/daily-scratch-win?id={id}',
};

// ── Rewards Data (with real images) ──
const DAILY_REWARDS = [
  { day: 'Today', amount: '$10', icon: '💰', image: 'https://i.etsystatic.com/8474866/r/il/0d68e6/4559099123/il_fullxfull.4559099123_b0gl.jpg', status: 'active' },
  { day: 'Day 2', amount: '$5', icon: '🎁', image: 'https://media.istockphoto.com/id/1414969873/photo/five-dollar-banknote-on-white-background.jpg?s=612x612&w=0&k=20&c=yvVw-CHAQgcpkonGfeMYZhqZY7Yvr2FdW1Cnx_i38CU=', status: 'locked' },
  { day: 'Day 3', amount: '$15', icon: '⭐', image: 'https://www.jurist.org/news/wp-content/uploads/sites/4/2019/07/wage_1563500528.jpg', status: 'locked' },
  { day: 'Day 7', amount: '$50', icon: '🏆', image: 'https://media.istockphoto.com/id/1470067468/photo/fifty-dollar-banknote-on-white-background.jpg?s=612x612&w=0&k=20&c=1xzGogOFhNhk6nESgMRGXh-L1NnvU35leFKvVyGS7Vw=', status: 'locked' },
];

function DailyScratchWin({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=scratch, 2=form, 3=claimed
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  const [moneyImage, setMoneyImage] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 23, minutes: 59, seconds: 59 });

  const canvasRef = useRef(null);
  const isDragging = useRef(false);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
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

  // ── Preload money image for canvas ──
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = 'https://i.etsystatic.com/8474866/r/il/0d68e6/4559099123/il_fullxfull.4559099123_b0gl.jpg';
    img.onload = () => setMoneyImage(img);
  }, []);

  // ── Scratch card canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // ── Reward background ──
    if (moneyImage) {
      // Draw the $10 bill image
      ctx.drawImage(moneyImage, 0, 0, w, h);
      // Dark overlay to make text pop
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Fallback gradient
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#f5f3ff');
      gradient.addColorStop(0.5, '#ede9fe');
      gradient.addColorStop(1, '#ddd6fe');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // ── "YOU WON $10!" text ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText('🎉 YOU WON $10!', w / 2, h / 2 + 50);
    ctx.shadowBlur = 0;

    // ── Scratch overlay (dark metallic) ──
    const overlayGradient = ctx.createLinearGradient(0, 0, w, h);
    overlayGradient.addColorStop(0, '#4b5563');
    overlayGradient.addColorStop(0.3, '#9ca3af');
    overlayGradient.addColorStop(0.6, '#6b7280');
    overlayGradient.addColorStop(0.8, '#374151');
    overlayGradient.addColorStop(1, '#4b5563');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, w, h);

    // ── Scratch me text (highly visible) ──
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖐️ Scratch Me', w / 2, h / 2 - 10);
    ctx.shadowBlur = 0;

    // ── Border glow ──
    ctx.shadowColor = 'rgba(139, 92, 246, 0.3)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    ctx.shadowBlur = 0;

    // ── Scratch logic ──
    const scratch = (x, y) => {
      const radius = 30;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Check if enough scratched (10% threshold)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
      }
      const progress = (transparent / (canvas.width * canvas.height)) * 100;

      if (progress > 10 && !isScratched) {
        setIsScratched(true);
        // Reveal full reward instantly
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        setTimeout(() => setStep(2), 400);
      }
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
      return { x, y };
    };

    const onStart = (e) => {
      e.preventDefault();
      isDragging.current = true;
      const { x, y } = getPos(e);
      scratch(x, y);
    };

    const onMove = (e) => {
      e.preventDefault();
      if (!isDragging.current) return;
      const { x, y } = getPos(e);
      scratch(x, y);
    };

    const onEnd = (e) => {
      e.preventDefault();
      isDragging.current = false;
    };

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart);
    canvas.addEventListener('touchmove', onMove);
    canvas.addEventListener('touchend', onEnd);

    return () => {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [moneyImage, isScratched]);

  // ── Validate ──
  const validate = () => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\s/g, ''))) return 'Please enter a valid 10-digit phone number.';
    if (!acceptedTerms) return 'You must accept the terms to continue.';
    return null;
  };

  // ── Claim reward ──
  const handleClaim = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
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
          <span className="logo-icon">🎰</span>
          <span className="logo-text">Daily<span>Scratch</span></span>
        </div>
        <div className="header-badge">🔥 $10 Daily</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🎉 Daily Reward</div>
          <h1>Scratch & Win <span className="highlight">$10</span></h1>
          <p>Scratch the card below to reveal your daily reward.</p>
          <div className="hero-stats">
            <div><span>⏳</span> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left</div>
            <div><span>🎁</span> $10 Reward</div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Scratch Card */}
        {step === 1 && (
          <div className="scratch-card-wrapper">
            <div className="scratch-card">
              <canvas ref={canvasRef} className="scratch-canvas"></canvas>
            </div>
            <p className="scratch-hint">🖐️ Use your finger or mouse to scratch the card</p>
          </div>
        )}

        {/* Step 2: Claim Form */}
        {step === 2 && (
          <div className="claim-card">
            <div className="reward-reveal">
              <div className="reward-badge">
                <div className="reward-image-wrapper">
                  <img
                    src="https://images.unsplash.com/photo-1580519549965-7e0e6a53af9f?w=100&h=100&fit=crop&auto=format"
                    alt="$10 Reward"
                    className="reward-image"
                  />
                </div>
                <div>
                  <span className="reward-amount">$10</span>
                  <span className="reward-label">YOU WON!</span>
                </div>
              </div>
              <p>Enter your details below to claim your reward.</p>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
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
                <label>Phone Number <span className="required">*</span></label>
                <input
                  type="tel"
                  placeholder="e.g. 98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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

              <button className="claim-btn" onClick={handleClaim} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Processing...
                  </>
                ) : (
                  'Claim $10 Reward →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Claimed Success */}
        {step === 3 && (
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h2>Reward Claimed!</h2>
            <p>Your $10 reward has been confirmed.</p>
            <div className="claimed-reward">
              <img
                src="https://i.etsystatic.com/8474866/r/il/0d68e6/4559099123/il_fullxfull.4559099123_b0gl.jpg"
                alt="$10"
                className="claimed-image"
              />
              <span className="claimed-amount">$10</span>
            </div>
            <div className="success-info">
              <p>Check your email for confirmation details.</p>
            </div>
            <button className="btn-primary" onClick={handleContinue} disabled={loading}>
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

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">📋 How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Scratch the Card</h3>
              <p>Use your finger or mouse to scratch the silver layer.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Reveal Your Prize</h3>
              <p>You'll instantly see if you've won $10.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Claim Your Reward</h3>
              <p>Enter your details to receive your $10 reward.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DAILY REWARDS (with real images) ─── */}
      <section className="rewards-section">
        <h2 className="section-title">🎁 Daily Rewards</h2>
        <p className="section-subtitle">Come back every day to claim your reward.</p>
        <div className="rewards-grid">
          {DAILY_REWARDS.map((reward, idx) => (
            <div key={idx} className={`reward-card ${reward.status}`}>
              <div className="reward-day">{reward.day}</div>
              <div className="reward-image-wrapper">
                <img src={reward.image} alt={reward.amount} className="reward-image-small" />
              </div>
              <div className="reward-amount-large">{reward.amount}</div>
              <span className="reward-status">
                {reward.status === 'active' ? '✅ Available Now' : '🔒 Coming Soon'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title">📜 Terms & Conditions</h2>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all users aged 18 years and above.</li>
            <li><strong>One Claim Per Day:</strong> Each user can claim the reward once every 24 hours.</li>
            <li><strong>Reward Amount:</strong> The daily reward is $10 unless otherwise specified.</li>
            <li><strong>Reward Distribution:</strong> Rewards are credited within 24 hours of claiming.</li>
            <li><strong>Fraud Prevention:</strong> Any fraudulent activity will result in disqualification.</li>
            <li><strong>Changes:</strong> The organizers reserve the right to modify or terminate this offer at any time.</li>
          </ul>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">How do I scratch the card?</div>
            <div className="faq-answer">Simply use your finger on mobile or your mouse on desktop to rub the silver layer.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What happens after I scratch?</div>
            <div className="faq-answer">You'll see if you won $10. Then fill in your details to claim it.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Can I claim more than once per day?</div>
            <div className="faq-answer">No, the reward can only be claimed once every 24 hours.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How do I receive my reward?</div>
            <div className="faq-answer">After claiming, you'll receive a confirmation email with further instructions.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Daily Scratch & Win. All rights reserved.</p>
        <p className="footer-contact">Questions? support@scratchwin.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f8fafc;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #8B5CF6; }
        .header-badge {
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(139, 92, 246, 0.2);
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
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          color: #fff;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 40%, rgba(139, 92, 246, 0.08), transparent 70%);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
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
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
        }
        .hero h1 .highlight {
          color: #8B5CF6;
        }
        .hero p {
          font-size: 1.05rem;
          color: #ccc;
          margin-bottom: 1.2rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .hero-stats div {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.06);
          font-weight: 600;
          font-size: 0.85rem;
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Main Content ── */
        .main-content {
          max-width: 500px;
          margin: -2rem auto 2.5rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Scratch Card ── */
        .scratch-card-wrapper {
          background: #fff;
          border-radius: 32px;
          padding: 1.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
          text-align: center;
        }
        .scratch-card {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          aspect-ratio: 4/3;
          background: #f5f3ff;
          cursor: pointer;
        }
        .scratch-canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
          cursor: pointer;
        }
        .scratch-hint {
          margin-top: 1rem;
          color: #6b7280;
          font-size: 0.85rem;
        }

        /* ── Claim Card ── */
        .claim-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
        }
        .reward-reveal {
          text-align: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f5f3ff, #ede9fe);
          border-radius: 20px;
          margin-bottom: 1.5rem;
        }
        .reward-badge {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          background: #fff;
          padding: 0.5rem 1.5rem;
          border-radius: 60px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          margin-bottom: 0.5rem;
        }
        .reward-image-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .reward-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .reward-amount {
          font-size: 1.8rem;
          font-weight: 900;
          color: #8B5CF6;
          margin-right: 0.5rem;
        }
        .reward-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #22C55E;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .reward-reveal p { color: #6b7280; font-size: 0.9rem; }

        .form-section { margin-top: 0.5rem; }
        .form-group {
          margin-bottom: 0.8rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.8rem;
          color: #374151;
          margin-bottom: 0.2rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9rem;
          background: #f9fafb;
          transition: border-color 0.2s;
          outline: none;
        }
        .form-group input:focus {
          border-color: #8B5CF6;
          background: #fff;
        }
        .checkbox-group {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0.8rem 0;
        }
        .checkbox-group input {
          width: 18px; height: 18px;
          margin-top: 2px;
          accent-color: #8B5CF6;
          flex-shrink: 0;
        }
        .checkbox-group label {
          font-size: 0.8rem;
          color: #4b5563;
        }
        .checkbox-group label a {
          color: #8B5CF6;
          text-decoration: none;
        }
        .form-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin: 0.5rem 0;
        }

        .claim-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.3);
        }
        .claim-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Success Card ── */
        .success-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
        }
        .success-icon { font-size: 4rem; margin-bottom: 0.5rem; }
        .success-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1a1a2e;
        }
        .success-card p {
          color: #6b7280;
          margin-bottom: 1.2rem;
        }
        .claimed-reward {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          background: #f5f3ff;
          padding: 0.6rem 1.2rem;
          border-radius: 60px;
          margin: 0 auto 1.2rem;
          max-width: 180px;
        }
        .claimed-image {
          width: 44px;
          height: 44px;
          object-fit: cover;
          border-radius: 10px;
        }
        .claimed-amount {
          font-size: 1.4rem;
          font-weight: 800;
          color: #8B5CF6;
        }
        .success-info { margin-bottom: 1.5rem; }
        .success-info p { color: #6b7280; font-size: 0.9rem; }

        .btn-primary {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border: none;
          border-radius: 60px;
          font-weight: 700;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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
          color: #1a1a2e;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #8B5CF6, #EC4899);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .section-subtitle {
          text-align: center;
          color: #6b7280;
          font-size: 0.95rem;
          margin-bottom: 2rem;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .step {
          background: #fff;
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #eef2f6;
          transition: transform 0.2s;
        }
        .step:hover { transform: translateY(-4px); }
        .step-number {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 auto 0.6rem;
        }
        .step-content h3 { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
        .step-content p { font-size: 0.8rem; color: #6b7280; }

        /* ── Rewards Section ── */
        .rewards-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .reward-card {
          background: #fff;
          border-radius: 20px;
          padding: 1.5rem 1rem;
          text-align: center;
          border: 2px solid #e5e7eb;
          transition: all 0.3s;
        }
        .reward-card.active {
          border-color: #8B5CF6;
          background: #f5f3ff;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
        }
        .reward-card.locked {
          opacity: 0.6;
        }
        .reward-day {
          font-size: 0.65rem;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .reward-image-wrapper {
          width: 60px;
          height: 60px;
          margin: 0.3rem auto;
          border-radius: 12px;
          overflow: hidden;
        }
        .reward-image-small {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .reward-amount-large {
          font-size: 1.2rem;
          font-weight: 900;
          color: #1a1a2e;
        }
        .reward-card.active .reward-amount-large { color: #8B5CF6; }
        .reward-status {
          display: block;
          font-size: 0.6rem;
          font-weight: 700;
          margin-top: 0.3rem;
          color: #9ca3af;
        }
        .reward-card.active .reward-status { color: #22C55E; }

        /* ── Terms Section ── */
        .terms-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content {
          background: #fff;
          padding: 1.8rem;
          border-radius: 20px;
          border: 1px solid #eef2f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.5rem 0 0.5rem 1.8rem;
          position: relative;
          color: #4b5563;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.85rem;
        }
        .terms-content ul li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #8B5CF6;
          font-weight: 700;
        }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong { color: #1a1a2e; }

        /* ── FAQ Section ── */
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
          background: #fff;
          border-radius: 16px;
          padding: 1rem 1.2rem;
          border: 1px solid #eef2f6;
          transition: border-color 0.2s;
        }
        .faq-item:hover { border-color: #8B5CF6; }
        .faq-question {
          font-weight: 700;
          font-size: 0.9rem;
          color: #1a1a2e;
        }
        .faq-answer p {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 0.3rem;
        }

        /* ── Footer ── */
        .site-footer {
          background: #1a1a2e;
          color: #9ca3af;
          padding: 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 1rem;
        }
        .site-footer p {
          font-size: 0.75rem;
          margin-bottom: 0.2rem;
        }
        .footer-contact {
          font-weight: 600;
          color: #e5e7eb;
        }

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
          border: 1px solid rgba(139, 92, 246, 0.15);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .modal-icon { font-size: 3rem; margin-bottom: 0.3rem; }
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
          background: #8B5CF6;
          border: none;
        }
        .modal-btn.primary:hover { background: #7C3AED; }
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
          .steps { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .rewards-grid { grid-template-columns: repeat(2, 1fr); }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.3rem 1rem; }
          .scratch-card { max-width: 340px; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .claim-card { padding: 1.5rem; }
          .success-card { padding: 1.8rem 1.2rem; }
          .scratch-card { max-width: 300px; }
          .hero h1 { font-size: 1.8rem; }
          .rewards-grid { grid-template-columns: 1fr 1fr; }
          .rewards-section { padding: 2rem 1rem; }
          .reward-badge { flex-wrap: wrap; justify-content: center; }
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
export default withCampaignMeta(DailyScratchWin, defaultMeta);