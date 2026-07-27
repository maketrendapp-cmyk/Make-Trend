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

// ── Prize Data (with working image URLs) ──
const PRIZES = [
  {
    label: 'iPhone 15 Pro',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=150&h=150&fit=crop&auto=format',
    color: '#1a1a2e',
  },
  {
    label: 'MacBook Air',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&h=150&fit=crop&auto=format',
    color: '#2d4059',
  },
  {
    label: 'Samsung TV 55"',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150&h=150&fit=crop&auto=format',
    color: '#e94560',
  },
  {
    label: 'Gaming PC',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBla5n5awwuLJxW1OAAwN-RCoEDaHV8mvyMY2-DUr5VM4ddhw4msktMSjQ&s=10',
    color: '#0f3460',
  },
  {
    label: '$500 Cash',
    image: 'https://thumbs.dreamstime.com/b/united-states-currency-hundred-dollar-bills-isolated-white-multiple-scattered-background-83510093.jpg',
    color: '#f5a623',
  },
  {
    label: 'iPad Pro',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150&h=150&fit=crop&auto=format',
    color: '#16213e',
  },
  {
    label: 'Smart Watch',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=150&h=150&fit=crop&auto=format',
    color: '#533483',
  },
  {
    label: '$200 Cash',
    image: 'https://thumbs.dreamstime.com/b/united-states-currency-hundred-dollar-bills-isolated-white-multiple-scattered-background-83510093.jpg',
    color: '#e94560',
  },
];

function LuckyDrawPremiumPrizesV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 24, minutes: 0, seconds: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const canvasRef = useRef(null);
  const audioCtx = useRef(null);
  const imageCache = useRef([]);

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

  // ── Preload images for canvas ──
  useEffect(() => {
    let loaded = 0;
    PRIZES.forEach((prize, index) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        imageCache.current[index] = img;
        loaded++;
        if (loaded === PRIZES.length) {
          setImagesLoaded(true);
          drawWheel();
        }
      };
      img.onerror = () => {
        // fallback: use a placeholder (we'll just draw text)
        imageCache.current[index] = null;
        loaded++;
        if (loaded === PRIZES.length) {
          setImagesLoaded(true);
          drawWheel();
        }
      };
      img.src = prize.image;
    });
  }, []);

  // ── Draw wheel with images ──
  const drawWheel = useCallback(
    (rotationAngle = rotation) => {
      const canvas = canvasRef.current;
      if (!canvas || !imagesLoaded) return;
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) / 2 - 10;
      const segmentAngle = (Math.PI * 2) / PRIZES.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Draw segments ──
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

        // ── Draw image inside segment ──
        const img = imageCache.current[i];
        if (img) {
          const imgSize = radius * 0.5;
          const midAngle = startAngle + segmentAngle / 2;
          const imgX = centerX + Math.cos(midAngle) * (radius * 0.6) - imgSize / 2;
          const imgY = centerY + Math.sin(midAngle) * (radius * 0.6) - imgSize / 2;

          ctx.save();
          ctx.beginPath();
          // Clip to a circle
          const clipX = centerX + Math.cos(midAngle) * (radius * 0.6);
          const clipY = centerY + Math.sin(midAngle) * (radius * 0.6);
          ctx.arc(clipX, clipY, imgSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
          ctx.restore();

          // Small border
          ctx.beginPath();
          ctx.arc(clipX, clipY, imgSize / 2 + 1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // fallback text
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(startAngle + segmentAngle / 2);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px "Segoe UI", sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 6;
          ctx.fillText(prize.label.split(' ').slice(0, 2).join(' '), radius * 0.6, 0);
          ctx.restore();
        }
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
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText('SPIN', centerX, centerY - 4);
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText('NOW', centerX, centerY + 18);

      // ── Pointer ──
      const pointerAngle = -Math.PI / 2;
      const pointerX = centerX + Math.cos(pointerAngle) * (radius + 8);
      const pointerY = centerY + Math.sin(pointerAngle) * (radius + 8);
      ctx.beginPath();
      ctx.moveTo(pointerX - 15, pointerY - 8);
      ctx.lineTo(pointerX, pointerY + 20);
      ctx.lineTo(pointerX + 15, pointerY - 8);
      ctx.closePath();
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
    },
    [rotation, imagesLoaded]
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
    if (imagesLoaded) drawWheel();
  }, [drawWheel, imagesLoaded]);

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
    if (isSpinning || !imagesLoaded) return;
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

    localStorage.setItem('lucky_draw_name', name);
    localStorage.setItem('lucky_draw_email', email);

    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── WebView Modal (fixed with inline styles + _blank) ──
  if (showWebViewModal) {
    return (
      <>
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">🌐</div>
            <h2>Open in Browser</h2>
            <p>For the best experience, open this page in your default browser.</p>
            <div className="modal-actions">
              <button className="modal-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); setShowWebViewModal(false); }}>📋 Copy Link</button>
              <button className="modal-btn primary" onClick={() => { const url = window.location.href; if (navigator.userAgent.includes('Android')) { window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`; } else { window.open(url, '_blank'); } }}>🚀 Open in Browser</button>
            </div>
            <button className="modal-btn ghost" onClick={() => setShowWebViewModal(false)}>Continue Anyway</button>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.88);
            backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }
          .modal-card {
            background: #1a1c22;
            border-radius: 40px;
            padding: 2.8rem 2rem;
            max-width: 420px;
            width: 90%;
            text-align: center;
            border: 2px solid rgba(245, 166, 35, 0.25);
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          }
          .modal-card .modal-icon {
            font-size: 3.6rem;
            margin-bottom: 0.5rem;
          }
          .modal-card h2 {
            font-size: 1.6rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 0.3rem;
          }
          .modal-card p {
            color: #aaa;
            font-size: 0.95rem;
            margin-bottom: 1.8rem;
          }
          .modal-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .modal-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.7rem 1.5rem;
            border-radius: 60px;
            font-weight: 600;
            font-size: 0.85rem;
            color: #fff;
            cursor: pointer;
            transition: 0.2s;
            flex: 1;
            min-width: 120px;
          }
          .modal-btn:hover {
            background: rgba(255, 255, 255, 0.15);
          }
          .modal-btn.primary {
            background: #f5a623;
            border: none;
            color: #1a1a2e;
          }
          .modal-btn.primary:hover {
            background: #e0991a;
          }
          .modal-btn.ghost {
            background: transparent;
            border: none;
            color: #888;
            margin-top: 0.5rem;
            font-size: 0.8rem;
          }
          .modal-btn.ghost:hover {
            color: #fff;
          }
        `}} />
      </>
    );
  }

  // ── Main UI ──
  return (
    <div className="page-wrapper">

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <span className="logo-icon">🏆</span>
          <span className="logo-text">Lucky<span>Draw</span></span>
        </div>
        <div className="header-badge">✨ Win Premium Prizes</div>
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
              <button className="spin-btn" onClick={handleSpin} disabled={isSpinning || !imagesLoaded}>
                {isSpinning ? 'Spinning...' : !imagesLoaded ? 'Loading...' : 'SPIN'}
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
          background: #f0f2f5;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: linear-gradient(180deg, #f0f2f5 0%, #e8ecf1 100%);
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.3rem;
        }
        .logo-icon { font-size: 1.6rem; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #f5a623; }
        .header-badge {
          background: linear-gradient(135deg, #f5a623, #e67e22);
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          box-shadow: 0 2px 8px rgba(245, 166, 35, 0.3);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 55vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          color: #fff;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 40%, rgba(245,166,35,0.08) 0%, transparent 70%);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(245, 166, 35, 0.15);
          border: 1px solid rgba(245, 166, 35, 0.4);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #f5a623;
          margin-bottom: 1rem;
        }
        .hero h1 {
          font-size: clamp(2.2rem, 7vw, 3.8rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff 40%, #f5a623 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero p {
          font-size: 1.15rem;
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
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.08);
          font-weight: 600;
          font-size: 0.9rem;
        }
        .hero-stats span { margin-right: 6px; }

        .result-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          margin-top: 1.2rem;
          background: rgba(255,255,255,0.08);
          padding: 0.8rem 2rem;
          border-radius: 60px;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .result-display .result-image {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 16px;
          border: 2px solid #f5a623;
        }
        .result-display .result-label {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f5a623;
        }

        /* ── Main Content ── */
        .main-content {
          max-width: 720px;
          margin: -2.5rem auto 3rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Spin Card ── */
        .spin-card {
          background: #fff;
          border-radius: 36px;
          padding: 2rem 2rem 2.5rem;
          box-shadow: 0 24px 64px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.04);
          text-align: center;
        }

        .rewards-preview {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f0f2f5;
        }
        .rewards-preview h3 {
          font-size: 1.1rem;
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
          padding: 0.6rem 0.2rem;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #eef2f6;
          transition: all 0.2s;
        }
        .reward-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.04);
          border-color: #f5a623;
        }
        .reward-item .reward-image {
          width: 56px;
          height: 56px;
          object-fit: cover;
          border-radius: 10px;
          margin-bottom: 0.3rem;
        }
        .reward-item .reward-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #4b5563;
          text-align: center;
          line-height: 1.2;
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
          box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 0 0 6px rgba(245,166,35,0.2);
        }
        .spin-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f5a623, #e67e22);
          border: 4px solid #fff;
          color: #fff;
          font-size: 1.2rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 24px rgba(245, 166, 35, 0.5);
          transition: transform 0.2s, box-shadow 0.2s;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .spin-btn:hover:not(:disabled) {
          transform: translate(-50%, -50%) scale(1.06);
          box-shadow: 0 6px 32px rgba(245, 166, 35, 0.6);
        }
        .spin-btn:disabled {
          opacity: 0.7;
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
          border-radius: 36px;
          padding: 2.5rem 2rem;
          box-shadow: 0 24px 64px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.04);
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
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          font-size: 0.95rem;
          background: #f9fafb;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .form-group input:focus {
          border-color: #f5a623;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(245, 166, 35, 0.1);
        }
        .form-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }
        .claim-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.35);
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
          width: 64px;
          height: 4px;
          background: linear-gradient(90deg, #f5a623, #e67e22);
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
          padding: 1.8rem 1.2rem;
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 2px 16px rgba(0,0,0,0.04);
          border: 1px solid #eef2f6;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .step:hover {
          transform: translateY(-6px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.06);
        }
        .step-number {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #f5a623, #e67e22);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.4rem;
          color: #fff;
          margin: 0 auto 0.8rem;
          box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
        }
        .step-content h3 {
          font-size: 1.05rem;
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
          padding: 2rem 2.5rem;
          border-radius: 28px;
          border: 1px solid #eef2f6;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.7rem 0 0.7rem 2rem;
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
          border-top: 1px solid rgba(255,255,255,0.04);
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

        /* ── WebView Modal ── (already defined inline) ── */

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .hero { min-height: 45vh; }
          .hero h1 { font-size: 2rem; }
          .hero p { font-size: 0.95rem; }
          .hero-stats { gap: 0.5rem; }
          .hero-stats div { font-size: 0.7rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .spin-card, .claim-card { padding: 1.8rem 1.2rem; }
          .steps { grid-template-columns: 1fr 1fr; }
          .rewards-grid { grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
          .reward-item .reward-image { width: 44px; height: 44px; }
          .reward-item .reward-label { font-size: 0.6rem; }
          .spin-btn { width: 72px; height: 72px; font-size: 1rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.6rem; padding: 0.2rem 0.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .claim-card h2 { font-size: 1.5rem; }
          .steps { grid-template-columns: 1fr; }
          .terms-content { padding: 1.2rem; }
          .rewards-grid { grid-template-columns: repeat(2, 1fr); }
          .result-display .result-image { width: 50px; height: 50px; }
          .result-display .result-label { font-size: 1.2rem; }
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