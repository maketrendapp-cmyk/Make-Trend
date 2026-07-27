// pages/templates/lucky-draw-premium-prizes-v1.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Premium Lucky Draw – Win Smartphones, Laptops & Cash!',
  description: 'Spin the wheel and win amazing prizes like iPhone, MacBook, TV, and real cash. Enter now – it’s free!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/lucky-draw-premium-prizes-v1?id={id}',
};

// ── Prize Segments ──
const PRIZES = [
  {
    label: 'iPhone 15 Pro',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=150&h=150&fit=crop&auto=format',
    color: '#1a1a2e',
    icon: '📱',
  },
  {
    label: 'MacBook Air',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&h=150&fit=crop&auto=format',
    color: '#2d4059',
    icon: '💻',
  },
  {
    label: 'Samsung TV 55"',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150&h=150&fit=crop&auto=format',
    color: '#e94560',
    icon: '📺',
  },
  {
    label: 'Gaming PC',
    image: 'https://images.unsplash.com/photo-1587202372775-38e1f3e188e8?w=150&h=150&fit=crop&auto=format',
    color: '#0f3460',
    icon: '🖥️',
  },
  {
    label: '$500 Cash',
    image: 'https://images.unsplash.com/photo-1580518324672-31d444ab9ec7?w=150&h=150&fit=crop&auto=format',
    color: '#f5a623',
    icon: '💰',
  },
  {
    label: 'iPad Pro',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150&h=150&fit=crop&auto=format',
    color: '#16213e',
    icon: '📱',
  },
  {
    label: 'Smart Watch',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=150&h=150&fit=crop&auto=format',
    color: '#533483',
    icon: '⌚',
  },
  {
    label: '$200 Cash',
    image: 'https://images.unsplash.com/photo-1580519549965-7e0e6a53af9f?w=150&h=150&fit=crop&auto=format',
    color: '#e94560',
    icon: '💰',
  },
];

function LuckyDrawPremiumPrizesV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=spin, 2=result+form, 3=redirecting
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 24, minutes: 0, seconds: 0 });

  const canvasRef = useRef(null);
  const audioCtx = useRef(null);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── 24‑hour countdown ──
  useEffect(() => {
    const startTime = Date.now();
    const duration = 24 * 60 * 60 * 1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining({ hours, minutes, seconds });
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Draw wheel ──
  const drawWheel = useCallback(
    (rotationAngle = rotation) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) / 2 - 10;
      const segmentAngle = (Math.PI * 2) / PRIZES.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      PRIZES.forEach((prize, i) => {
        const startAngle = i * segmentAngle + rotationAngle;
        const endAngle = startAngle + segmentAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        const gradient = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius);
        gradient.addColorStop(0, lightenColor(prize.color, 40));
        gradient.addColorStop(1, prize.color);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;

        const textRadius = radius * 0.65;
        ctx.fillText(prize.icon, textRadius, -8);
        ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(prize.label.split(' ').slice(0, 2).join(' '), textRadius, 16);
        ctx.restore();
      });

      // ── Center circle ──
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      const centerGradient = ctx.createRadialGradient(centerX - 10, centerY - 10, 5, centerX, centerY, 40);
      centerGradient.addColorStop(0, '#f5a623');
      centerGradient.addColorStop(1, '#e67e22');
      ctx.fillStyle = centerGradient;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText('SPIN', centerX, centerY - 4);
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('NOW', centerX, centerY + 14);

      // ── Pointer ──
      const pointerAngle = -Math.PI / 2;
      const pointerX = centerX + Math.cos(pointerAngle) * (radius + 8);
      const pointerY = centerY + Math.sin(pointerAngle) * (radius + 8);
      ctx.beginPath();
      ctx.moveTo(pointerX - 15, pointerY - 8);
      ctx.lineTo(pointerX, pointerY + 18);
      ctx.lineTo(pointerX + 15, pointerY - 8);
      ctx.closePath();
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [rotation]
  );

  const lightenColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  };

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const playSound = (type) => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      osc.type = 'sine';
      osc.frequency.value = type === 'win' ? 880 : 560;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + 0.3);
      osc.stop(audioCtx.current.currentTime + 0.35);
    } catch (e) {}
  };

  // ── Spin ──
  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    playSound('click');

    const segmentAngle = (Math.PI * 2) / PRIZES.length;
    const targetIndex = Math.floor(Math.random() * PRIZES.length);
    const extraSpins = 5 + Math.random() * 3;
    const targetAngle = extraSpins * Math.PI * 2 + (Math.PI * 2 - targetIndex * segmentAngle - segmentAngle / 2);
    const startRotation = rotation;
    const endRotation = startRotation + targetAngle;
    const duration = 4000;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (endRotation - startRotation) * ease;
      setRotation(currentRotation);
      drawWheel(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(endRotation);
        drawWheel(endRotation);
        setIsSpinning(false);
        const finalIndex = Math.floor(
          (((Math.PI * 2 - (endRotation % (Math.PI * 2))) % (Math.PI * 2)) / segmentAngle) % PRIZES.length
        );
        const winPrize = PRIZES[finalIndex];
        setResult(winPrize);
        setStep(2);
        playSound('win');
      }
    };
    requestAnimationFrame(animate);
  };

  // ── Submit name & email ──
  const handleClaim = () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);

    // Save data to localStorage or send to backend
    localStorage.setItem('lucky_draw_name', name);
    localStorage.setItem('lucky_draw_email', email);

    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── WebView Modal ──
  if (showWebViewModal) {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-icon">🌐</div>
          <h2>Open in Browser</h2>
          <p>For the best experience, open this page in your default browser.</p>
          <div className="modal-actions">
            <button className="modal-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); setShowWebViewModal(false); }}>📋 Copy Link</button>
            <button className="modal-btn primary" onClick={() => { const url = window.location.href; if (navigator.userAgent.includes('Android')) { window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`; } else { window.open(url, '_system'); } }}>🚀 Open in Browser</button>
          </div>
          <button className="modal-btn ghost" onClick={() => setShowWebViewModal(false)}>Continue Anyway</button>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="page-wrapper">

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <span className="logo-icon">🎰</span>
          <span className="logo-text">Lucky<span>Draw</span></span>
        </div>
        <div className="header-badge">🏆 Win Premium Prizes</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge">🔥 Limited Entries</div>
              <h1>Spin & Win<br />Premium Prizes</h1>
              <p>iPhone, MacBook, TV, Gaming PC, Cash & more – one lucky winner every hour!</p>
              <div className="hero-stats">
                <div><span>📱</span> iPhone 15 Pro</div>
                <div><span>💻</span> MacBook Air</div>
                <div><span>💰</span> $500 Cash</div>
                <div><span>⏳</span> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left</div>
              </div>
            </>
          )}
          {step === 2 && result && (
            <>
              <div className="hero-badge">🎉 You Won!</div>
              <h1>Congratulations!</h1>
              <p>You’ve won <strong>{result.label}</strong>! Enter your details to claim it.</p>
              <div className="result-display">
                <img src={result.image} alt={result.label} className="result-image" />
                <span className="result-label">{result.label}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Spin Wheel */}
        {step === 1 && (
          <div className="spin-card">
            <div className="rewards-preview">
              <h3>🎁 Prizes You Can Win</h3>
              <div className="rewards-grid">
                {PRIZES.map((item, idx) => (
                  <div key={idx} className="reward-item">
                    <img src={item.image} alt={item.label} className="reward-image" />
                    <span className="reward-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wheel-container">
              <canvas ref={canvasRef} width="400" height="400" className="wheel-canvas"></canvas>
              <button className="spin-btn" onClick={handleSpin} disabled={isSpinning}>
                {isSpinning ? 'Spinning...' : 'SPIN'}
              </button>
            </div>
            <p className="spin-note">🎯 Click the SPIN button to try your luck!</p>
          </div>
        )}

        {/* Step 2: Result + Claim Form */}
        {step === 2 && result && (
          <div className="claim-card">
            <h2>Claim Your Prize</h2>
            <p>Enter your details to receive your prize.</p>

            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Ram Sharma"
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

            {error && <p className="form-error">{error}</p>}

            <button className="claim-btn" onClick={handleClaim} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Submitting...
                </>
              ) : (
                'Claim Prize →'
              )}
            </button>

            <p className="form-footnote">🔒 Your information is secure and will not be shared.</p>
          </div>
        )}

      </main>

      {/* ─── HOW TO WIN ─── */}
      <section className="how-to-win">
        <h2 className="section-title">🏅 How to Win</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Spin the Wheel</h3>
              <p>Click the SPIN button and watch the wheel decide your fate.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Check Your Prize</h3>
              <p>You'll instantly see which premium prize you've won.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Enter Your Details</h3>
              <p>Provide your name and email to claim the prize.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Complete Tasks</h3>
              <p>Finish a few simple tasks to verify your entry.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>Get Your Prize</h3>
              <p>We'll ship your prize or send cash within 48 hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title">📜 Terms & Conditions</h2>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all participants aged 18 years and above.</li>
            <li><strong>Entry:</strong> One spin per person. Duplicate entries will be disqualified.</li>
            <li><strong>Prize Validity:</strong> Prizes must be claimed within 24 hours of winning.</li>
            <li><strong>Tasks:</strong> Winners must complete the required tasks within the given timeframe.</li>
            <li><strong>Fraud Prevention:</strong> Any fraudulent activity will result in immediate disqualification.</li>
            <li><strong>Data Privacy:</strong> Your information is secure and will only be used for prize distribution.</li>
            <li><strong>Shipping:</strong> Physical prizes will be shipped within 7 working days.</li>
            <li><strong>Cash Prizes:</strong> Cash prizes are paid via PayPal or bank transfer.</li>
            <li><strong>Changes:</strong> The organizers reserve the right to modify or terminate this promotion at any time.</li>
            <li><strong>Affiliation:</strong> This promotion is not affiliated with any third‑party platform.</li>
          </ul>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Lucky Draw. All rights reserved.</p>
        <p className="footer-contact">Questions? support@luckydraw.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: #f8f9fc;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f8f9fc;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.6rem; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #f5a623; }
        .header-badge {
          background: #f5a623;
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          color: #fff;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.3);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(245, 166, 35, 0.2);
          border: 1px solid #f5a623;
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #f5a623;
          margin-bottom: 1rem;
        }
        .hero h1 {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
        }
        .hero p {
          font-size: 1.1rem;
          color: #ccc;
          margin-bottom: 1.8rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .hero-stats div {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(6px);
          padding: 0.4rem 1rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.1);
          font-weight: 600;
          font-size: 0.85rem;
        }
        .hero-stats span { margin-right: 6px; }

        .result-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1rem;
          background: rgba(255,255,255,0.1);
          padding: 0.8rem 1.5rem;
          border-radius: 60px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .result-display .result-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid #f5a623;
        }
        .result-display .result-label {
          font-size: 1.4rem;
          font-weight: 800;
          color: #f5a623;
        }

        /* ── Main Content ── */
        .main-content {
          max-width: 700px;
          margin: -2rem auto 3rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Spin Card ── */
        .spin-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef0f4;
          text-align: center;
        }

        .rewards-preview {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f0f0f0;
        }
        .rewards-preview h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 1rem;
        }
        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.8rem;
        }
        .reward-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.4rem 0.2rem;
          background: #f8f9fc;
          border-radius: 12px;
          border: 1px solid #eef0f4;
          transition: transform 0.2s;
        }
        .reward-item:hover {
          transform: translateY(-2px);
        }
        .reward-item .reward-image {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 0.2rem;
        }
        .reward-item .reward-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: #4b5563;
          text-align: center;
        }

        .wheel-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        .wheel-canvas {
          width: 100%;
          height: auto;
          border-radius: 50%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        }
        .spin-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f5a623;
          border: 4px solid #fff;
          color: #1a1a2e;
          font-size: 1.2rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(245, 166, 35, 0.4);
          transition: transform 0.2s;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .spin-btn:hover:not(:disabled) {
          transform: translate(-50%, -50%) scale(1.05);
        }
        .spin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: translate(-50%, -50%);
        }
        .spin-note {
          margin-top: 1.2rem;
          color: #6b7280;
          font-size: 0.9rem;
        }

        /* ── Claim Card ── */
        .claim-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef0f4;
        }
        .claim-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          color: #1a1a2e;
          margin-bottom: 0.2rem;
        }
        .claim-card > p {
          text-align: center;
          color: #6b7280;
          margin-bottom: 1.8rem;
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #374151;
          margin-bottom: 0.3rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          background: #f9fafb;
          transition: border-color 0.2s;
          outline: none;
        }
        .form-group input:focus {
          border-color: #f5a623;
          background: #fff;
        }
        .form-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }
        .claim-btn {
          width: 100%;
          padding: 1rem;
          background: #10b981;
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }
        .claim-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spinner {
          display: inline-block;
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-footnote {
          font-size: 0.75rem;
          color: #9ca3af;
          text-align: center;
          margin-top: 1.2rem;
        }

        /* ── How to Win ── */
        .how-to-win {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 2rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 2.5rem;
          color: #1a1a2e;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 60px;
          height: 4px;
          background: #f5a623;
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .step {
          background: #fff;
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #eef0f4;
          transition: transform 0.2s;
        }
        .step:hover {
          transform: translateY(-4px);
        }
        .step-number {
          width: 48px; height: 48px;
          background: #f5a623;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.3rem;
          color: #fff;
          margin: 0 auto 0.8rem;
        }
        .step-content h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 0.2rem;
        }
        .step-content p {
          color: #6b7280;
          font-size: 0.85rem;
        }

        /* ── Terms Section ── */
        .terms-section {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .terms-content {
          background: #fff;
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid #eef0f4;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.6rem 0 0.6rem 1.8rem;
          position: relative;
          color: #4b5563;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
        }
        .terms-content ul li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #f5a623;
          font-weight: 700;
        }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong {
          color: #1a1a2e;
        }

        /* ── Footer ── */
        .site-footer {
          background: #1a1a2e;
          color: #9ca3af;
          padding: 2.5rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 2rem;
        }
        .site-footer p {
          font-size: 0.8rem;
          margin-bottom: 0.3rem;
        }
        .footer-contact {
          font-weight: 600;
          color: #e5e7eb;
        }

        /* ── WebView Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 36px;
          padding: 2.8rem 2rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(245, 166, 35, 0.2);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .modal-icon { font-size: 3.2rem; margin-bottom: 0.5rem; }
        .modal-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .modal-card p {
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
          background: #f5a623;
          border: none;
          color: #1a1a2e;
        }
        .modal-btn.primary:hover { background: #e0991a; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .hero { min-height: 40vh; }
          .hero h1 { font-size: 1.8rem; }
          .hero p { font-size: 0.95rem; }
          .hero-stats { gap: 0.5rem; }
          .hero-stats div { font-size: 0.7rem; padding: 0.2rem 0.6rem; }
          .main-content { padding: 0 1rem; }
          .spin-card, .claim-card { padding: 1.8rem 1.2rem; }
          .steps { grid-template-columns: 1fr 1fr; }
          .rewards-grid { grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
          .reward-item .reward-image { width: 40px; height: 40px; }
          .reward-item .reward-label { font-size: 0.55rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.6rem; padding: 0.2rem 0.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .claim-card h2 { font-size: 1.5rem; }
          .steps { grid-template-columns: 1fr; }
          .terms-content { padding: 1.2rem; }
          .spin-btn { width: 60px; height: 60px; font-size: 0.9rem; }
          .rewards-grid { grid-template-columns: repeat(2, 1fr); }
          .result-display .result-image { width: 50px; height: 50px; }
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
export default withCampaignMeta(LuckyDrawPremiumPrizesV1, defaultMeta);