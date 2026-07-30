// pages/templates/daily-scratch-win.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaGift,
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaCopy,
  FaShareAlt,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaStar,
  FaGem,
  FaTrophy,
  FaSparkles,
} from 'react-icons/fa';

// ── Default Meta (Clean URL – no {id}) ──
const defaultMeta = {
  title: 'Daily Scratch & Win – Get $10 Free Every Day!',
  description: 'Scratch the card daily and win $10 instantly. Free to play – no hidden fees! Claim your reward now.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/daily-scratch-win',
};

// ── Rewards Data ──
const DAILY_REWARDS = [
  { day: 'Today', amount: '$10', icon: <FaGem className="w-5 h-5" />, image: 'https://i.etsystatic.com/8474866/r/il/0d68e6/4559099123/il_fullxfull.4559099123_b0gl.jpg', status: 'active' },
  { day: 'Day 2', amount: '$5', icon: <FaStar className="w-5 h-5" />, image: 'https://media.istockphoto.com/id/1414969873/photo/five-dollar-banknote-on-white-background.jpg?s=612x612&w=0&k=20&c=yvVw-CHAQgcpkonGfeMYZhqZY7Yvr2FdW1Cnx_i38CU=', status: 'locked' },
  { day: 'Day 3', amount: '$15', icon: <FaSparkles className="w-5 h-5" />, image: 'https://www.jurist.org/news/wp-content/uploads/sites/4/2019/07/wage_1563500528.jpg', status: 'locked' },
  { day: 'Day 7', amount: '$50', icon: <FaTrophy className="w-5 h-5" />, image: 'https://media.istockphoto.com/id/1470067468/photo/fifty-dollar-banknote-on-white-background.jpg?s=612x612&w=0&k=20&c=1xzGogOFhNhk6nESgMRGXh-L1NnvU35leFKvVyGS7Vw=', status: 'locked' },
];

function DailyScratchWin({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=scratch, 2=claimed
  const [loading, setLoading] = useState(false);
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

  // ── Clean URL if no id ──
  useEffect(() => {
    if (!router.isReady) return;
    if (!id && router.asPath.includes('?')) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router.isReady, id, router]);

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
      ctx.drawImage(moneyImage, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#fef3c7');
      gradient.addColorStop(0.5, '#fde68a');
      gradient.addColorStop(1, '#f59e0b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // ── "$10" text ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('$10', w / 2, h / 2 - 20);
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('YOU WON!', w / 2, h / 2 + 35);
    ctx.shadowBlur = 0;

    // ── Scratch overlay ──
    const overlayGradient = ctx.createLinearGradient(0, 0, w, h);
    overlayGradient.addColorStop(0, '#6b7280');
    overlayGradient.addColorStop(0.3, '#9ca3af');
    overlayGradient.addColorStop(0.6, '#6b7280');
    overlayGradient.addColorStop(0.8, '#4b5563');
    overlayGradient.addColorStop(1, '#6b7280');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, w, h);

    // ── Scratch me text ──
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖐️ Scratch Me', w / 2, h / 2);
    ctx.shadowBlur = 0;

    // ── Border ──
    ctx.shadowColor = 'rgba(139, 92, 246, 0.2)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
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

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
      }
      const progress = (transparent / (canvas.width * canvas.height)) * 100;

      if (progress > 10 && !isScratched) {
        setIsScratched(true);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        setTimeout(() => setStep(2), 500);
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

  // ── Continue to tasks ──
  const handleContinue = () => {
    setLoading(true);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── Share handlers ──
  const handleShare = (platform) => {
    const url = id ? `${window.location.origin}/daily-scratch-win?id=${id}` : `${window.location.origin}/daily-scratch-win`;
    const text = '🎉 I just won $10 on Daily Scratch & Win! Try your luck here:';
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
        navigator.clipboard?.writeText(`${text} ${url}`);
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
            <button className="modal-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); setShowWebViewModal(false); }}><FaCopy className="w-4 h-4" /> Copy Link</button>
            <button className="modal-btn primary" onClick={() => { const url = window.location.href; if (navigator.userAgent.includes('Android')) { window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`; } else { window.open(url, '_system'); } }}><FaShareAlt className="w-4 h-4" /> Open in Browser</button>
          </div>
          <button className="modal-btn ghost" onClick={() => setShowWebViewModal(false)}>Continue Anyway</button>
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
          <span className="logo-icon"><FaGift className="w-5 h-5" /></span>
          <span className="logo-text">Daily<span>Scratch</span></span>
        </div>
        <div className="header-badge">💰 $10 Daily</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge"><FaGift className="w-3.5 h-3.5" /> DAILY REWARD</div>
              <h1>Scratch & Win <span>$10</span></h1>
              <p>Scratch the card to reveal your daily reward.</p>
              <div className="hero-stats">
                <div><FaClock className="w-3.5 h-3.5" /> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}</div>
                <div><FaGift className="w-3.5 h-3.5" /> $10 Reward</div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge"><FaCheckCircle className="w-3.5 h-3.5" /> REWARD UNLOCKED</div>
              <h1>You Won <span>$10</span>!</h1>
              <p>Your reward has been confirmed. Continue to claim it.</p>
            </>
          )}
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

        {/* Step 2: Claimed Success */}
        {step === 2 && (
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <h2>You Won $10!</h2>
            <p>Your reward has been confirmed and is ready to claim.</p>

            <div className="reward-display">
              <div className="reward-image-wrapper">
                <img
                  src="https://i.etsystatic.com/8474866/r/il/0d68e6/4559099123/il_fullxfull.4559099123_b0gl.jpg"
                  alt="$10"
                  className="reward-image"
                />
              </div>
              <span className="reward-amount">$10</span>
            </div>

            <div className="success-info">
              <p>Complete the final steps to receive your reward.</p>
            </div>

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
              <span>Share with friends:</span>
              <button onClick={() => handleShare('whatsapp')}><FaWhatsapp className="w-5 h-5 text-emerald-500 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('facebook')}><FaFacebook className="w-5 h-5 text-blue-600 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('twitter')}><FaTwitter className="w-5 h-5 text-sky-400 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('copy')}><FaCopy className="w-5 h-5 text-slate-600 hover:scale-110 transition" /></button>
            </div>
          </div>
        )}

      </main>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">How It Works</h2>
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
              <p>Continue to complete the final steps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DAILY REWARDS ─── */}
      <section className="rewards-section">
        <h2 className="section-title">Daily Rewards</h2>
        <p className="section-subtitle">Come back every day to claim your reward.</p>
        <div className="rewards-grid">
          {DAILY_REWARDS.map((reward, idx) => (
            <div key={idx} className={`reward-card ${reward.status}`}>
              <div className="reward-day">{reward.day}</div>
              <div className="reward-icon-wrapper">{reward.icon}</div>
              <div className="reward-amount-large">{reward.amount}</div>
              <span className="reward-status">
                {reward.status === 'active' ? '✅ Available' : '🔒 Coming Soon'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TERMS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title">Terms & Conditions</h2>
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
        <h2 className="section-title">FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">How do I scratch the card?</div>
            <div className="faq-answer">Simply use your finger on mobile or your mouse on desktop to rub the silver layer.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What happens after I scratch?</div>
            <div className="faq-answer">You'll see if you won $10. Then continue to claim your reward.</div>
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
          border-bottom: 1px solid rgba(139, 92, 246, 0.15);
          padding: 0.75rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.25rem;
        }
        .logo-icon {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }
        .logo-text { color: #1e293b; }
        .logo-text span { color: #8B5CF6; }
        .header-badge {
          display: flex;
          align-items: center; gap: 0.4rem;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.35rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.25);
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
          background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          color: #fff;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 40%, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center; gap: 0.4rem;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 0.35rem 1.25rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 800;
          color: #8B5CF6;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 0.4rem;
        }
        .hero h1 span {
          color: #8B5CF6;
        }
        .hero p {
          font-size: 1.05rem;
          color: #cbd5e1;
          margin-bottom: 1.2rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .hero-stats div {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.06);
          font-weight: 600;
          font-size: 0.85rem;
          color: #e2e8f0;
        }

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
          box-shadow: 0 20px 50px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .scratch-card {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
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
          color: #64748b;
          font-size: 0.85rem;
        }

        /* ── Success Card ── */
        .success-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        }
        .success-icon { font-size: 3.5rem; margin-bottom: 0.5rem; }
        .success-card h2 {
          font-size: 1.8rem;
          font-weight: 900;
          color: #1e293b;
          margin-bottom: 0.3rem;
        }
        .success-card p {
          color: #64748b;
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }

        .reward-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: #f5f3ff;
          padding: 0.8rem 1.5rem;
          border-radius: 60px;
          margin: 0 auto 1.5rem;
          max-width: 200px;
          border: 1px solid #e5e7eb;
        }
        .reward-image-wrapper {
          width: 48px;
          height: 48px;
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
          font-size: 1.6rem;
          font-weight: 900;
          color: #8B5CF6;
        }

        .success-info { margin-bottom: 1.5rem; }
        .success-info p { color: #64748b; font-size: 0.9rem; }

        .continue-btn {
          width: 100%;
          padding: 1.1rem;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(139, 92, 246, 0.45); }
        .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .share-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.2rem;
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          flex-wrap: wrap;
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
          color: #1e293b;
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
          color: #64748b;
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
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          transition: transform 0.2s;
        }
        .step:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .step-number {
          width: 48px; height: 48px;
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
        .step-content h3 { font-size: 1rem; font-weight: 700; color: #1e293b; }
        .step-content p { font-size: 0.85rem; color: #64748b; }

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
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
        }
        .reward-card.active {
          border-color: #8B5CF6;
          background: #f5f3ff;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
        }
        .reward-card.locked { opacity: 0.5; }
        .reward-day {
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .reward-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0.3rem auto;
          font-size: 1.2rem;
          color: #8B5CF6;
        }
        .reward-card.active .reward-icon-wrapper { background: #ede9fe; }
        .reward-amount-large {
          font-size: 1.2rem;
          font-weight: 900;
          color: #1e293b;
        }
        .reward-card.active .reward-amount-large { color: #8B5CF6; }
        .reward-status {
          display: block;
          font-size: 0.6rem;
          font-weight: 700;
          margin-top: 0.3rem;
          color: #94a3b8;
        }
        .reward-card.active .reward-status { color: #22C55E; }

        /* ── Terms ── */
        .terms-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content {
          background: #fff;
          padding: 1.8rem;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.5rem 0 0.5rem 1.8rem;
          position: relative;
          color: #475569;
          border-bottom: 1px solid #f1f5f9;
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
        .terms-content ul li strong { color: #1e293b; }

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
          background: #fff;
          border-radius: 16px;
          padding: 1rem 1.2rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .faq-item:hover { border-color: #8B5CF6; }
        .faq-question {
          font-weight: 700;
          font-size: 0.9rem;
          color: #1e293b;
        }
        .faq-answer p {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 0.3rem;
        }

        /* ── Footer ── */
        .site-footer {
          background: #1e293b;
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
          border: 1px solid rgba(139, 92, 246, 0.2);
          box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .modal-icon { font-size: 3rem; margin-bottom: 0.4rem; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 900; color: #fff; margin-bottom: 0.4rem; }
        .modal-card p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.8rem; }
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
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border: none;
          color: #fff;
        }
        .modal-btn.primary:hover { opacity: 0.9; }
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
          .steps { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .rewards-grid { grid-template-columns: repeat(2, 1fr); }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.3rem 1rem; }
          .scratch-card { max-width: 340px; }
          .success-card { padding: 1.8rem 1.2rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .scratch-card { max-width: 300px; }
          .hero h1 { font-size: 1.8rem; }
          .rewards-grid { grid-template-columns: 1fr 1fr; }
          .rewards-section { padding: 2rem 1rem; }
          .share-row { gap: 0.6rem; }
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