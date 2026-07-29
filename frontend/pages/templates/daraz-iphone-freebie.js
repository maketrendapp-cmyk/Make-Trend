
// pages/templates/iphone-freebie.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaApple,
  FaWhatsapp,
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaTelegram,
  FaCopy,
  FaSms,
  FaShareAlt,
  FaGift,
  FaTrophy,
  FaUserCircle,
  FaClock,
} from 'react-icons/fa';

// ── Default Meta ──
const defaultMeta = {
  title: 'iPhone Freebie – Get iPhone 15 Pro Max for Free!',
  description: 'Invite friends, cut the price, and get iPhone 15 Pro Max for free. Limited time offer!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/daraz-iphone-freebie',
};

// ── Static Winner Data (Updated to match Apple Ecosystem) ──
const WINNERS = [
  { name: 'sahraj***', product: 'AirPods Pro (2nd Gen)' },
  { name: 'Grishm***', product: 'iPhone 15 Pro FineWoven Case' },
  { name: 'reshma***', product: 'Apple AirTag 4-Pack' },
  { name: 'subedi***', product: 'MagSafe Wireless Charger' },
  { name: 'Rohit ***', product: 'AirPods (3rd Gen)' },
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
  const handleShare = () => {
    // Visual feedback only – no actual share logic
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
          <h2>Action Required</h2>
          <p>For the best experience and to track your price cuts accurately, open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Link copied! Paste it in Safari or Chrome.');
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
              <FaApple className="w-5 h-5 text-white" />
            </div>
            <span className="logo-text">Daraz<span>Freebie</span></span>
          </div>
          <div className="header-badge">
            <span className="pulse-dot"></span> <FaGift className="w-3 h-3" /> Live Giveaway
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-glow shape-1"></div>
        <div className="hero-glow shape-2"></div>
        <div className="hero-content">
          <div className="hero-badge-wrap">
            <div className="hero-badge">
              <FaTrophy className="w-3.5 h-3.5 text-yellow-400" /> LIMITED TIME OFFER
            </div>
          </div>
          <h1>Get iPhone 15 Pro Max<br /><span className="text-gradient">for Free</span></h1>
          <p>Invite friends to cut the price. Reach $0 and claim your brand new iPhone instantly!</p>
        </div>
      </section>

      {/* ─── MAIN CARD ─── */}
      <section className="main-section">
        <div className="main-card">

          {/* Product Header */}
          <div className="product-header">
            <div className="product-image">
              <img
                src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop&auto=format"
                alt="iPhone 15 Pro Max"
                className="product-img"
              />
            </div>
            <div className="product-info">
              <h2>iPhone 15 Pro Max</h2>
              <p className="product-meta">256GB • Natural Titanium</p>
              <div className="claimed-badge">
                <FaUserCircle className="w-3.5 h-3.5" />
                <span>{claimedCount.toLocaleString()}+ claimed for FREE</span>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="price-row">
              <span className="price-label">You Have Cut</span>
              <span className="price-value cut">$1,180.50</span>
            </div>
            <div className="price-row">
              <span className="price-label">Left to Cut</span>
              <span className="price-value remaining">$18.50</span>
            </div>
            <div className="price-divider"></div>
            <div className="price-row highlight-row">
              <span className="price-label free-label">Status</span>
              <span className="price-value free">98.45% FREE</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-wrapper">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '98.45%' }}>
                <div className="progress-glow"></div>
              </div>
            </div>
            <div className="progress-labels">
              <span className="text-red-400">Only $18.50 Left!</span>
              <span className="text-green-400">98.45% Completed</span>
            </div>
          </div>

          {/* Timer */}
          <div className="timer-section">
            <FaClock className="timer-icon" />
            <span className="timer-text">Offer Expires In</span>
            <span className="timer-value">23:55:38</span>
          </div>

          {/* Share Buttons */}
          <div className="share-section">
            <div className="share-title">Invite Friends To Cut The Remaining Price</div>
            <div className="share-buttons">
              <button className="share-btn whatsapp" onClick={handleShare}>
                <FaWhatsapp className="w-4 h-4" /> WhatsApp
              </button>
              <button className="share-btn facebook" onClick={handleShare}>
                <FaFacebook className="w-4 h-4" /> Facebook
              </button>
              <button className="share-btn instagram" onClick={handleShare}>
                <FaInstagram className="w-4 h-4" /> Instagram
              </button>
              <button className="share-btn twitter" onClick={handleShare}>
                <FaTwitter className="w-4 h-4" /> Twitter
              </button>
              <button className="share-btn telegram" onClick={handleShare}>
                <FaTelegram className="w-4 h-4" /> Telegram
              </button>
            </div>
            <div className="share-actions">
              <button className="share-action" onClick={handleShare}>
                <FaCopy className="w-3.5 h-3.5" /> Copy Link
              </button>
              <button className="share-action" onClick={handleShare}>
                <FaSms className="w-3.5 h-3.5" /> SMS
              </button>
              <button className="share-action" onClick={handleShare}>
                <FaShareAlt className="w-3.5 h-3.5" /> Share More
              </button>
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
                <span className="spinner"></span> Processing...
              </>
            ) : (
              'Continue to Claim iPhone →'
            )}
          </button>
        </div>
      </section>

      {/* ─── RECENT WINS ─── */}
      <section className="wins-section">
        <div className="wins-header">
          <h2><FaTrophy className="w-4 h-4 text-yellow-400" /> Recent Winners</h2>
          <span className="wins-badge"><span className="pulse-dot-small"></span> Live</span>
        </div>
        <div className="wins-list">
          {WINNERS.map((winner, idx) => (
            <div key={idx} className="win-item">
              <div className="win-avatar-wrap">
                <FaUserCircle className="win-avatar" />
              </div>
              <div className="win-info">
                <span className="win-name">{winner.name}</span>
                <span className="win-product">won FREE <strong className="text-white">{winner.product}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW TO WIN ─── */}
      <section className="how-section">
        <div className="section-header">
          <h2 className="section-title">How it Works</h2>
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-number-wrap">1</div>
            <h3>Invite Friends</h3>
            <p>Share your unique invite link with friends and family.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">2</div>
            <h3>Cut The Price</h3>
            <p>Every friend who clicks your link cuts the price down randomly.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">3</div>
            <h3>Get It Free</h3>
            <p>Once the price drops to exactly $0, claim your iPhone!</p>
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
              <div className="faq-question">What is iPhone Freebie?</div>
              <div className="faq-answer">A referral program where you invite friends to cut the price of an iPhone. When it reaches $0, you get it for free.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">How much price is cut per referral?</div>
              <div className="faq-answer">The cut amount is random, from $0.50 to $10.00. New users cut significantly more!</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">Are there hidden shipping fees?</div>
              <div className="faq-answer">No! Once the price reaches $0, shipping and handling are completely covered by us.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="logo footer-logo">
            <FaApple className="w-4 h-4" /> Freebie Events
          </div>
          <p>© {new Date().getFullYear()} MakeTrend Promotions. All rights reserved.</p>
          <p className="footer-contact">Apple is not a participant in or sponsor of this promotion.</p>
        </div>
      </footer>

      {/* ─── ENHANCED CSS ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --brand-primary: #0A84FF; /* Apple Blue */
          --brand-primary-light: #5E5CE6;
          --brand-primary-dark: #0066CC;
          
          --bg-base: #000000;
          --bg-surface: #111111;
          --bg-surface-solid: #1c1c1e;
          --border-color: rgba(255, 255, 255, 0.1);
          --border-highlight: rgba(10, 132, 255, 0.3);
          
          --text-main: #f5f5f7;
          --text-muted: #86868b;
          
          --success: #30D158;
          --danger: #FF453A;
          --warning: #FF9F0A;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: var(--bg-base); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color); padding: 1rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1.25rem; letter-spacing: -0.5px; }
        .logo-icon-bg { width: 32px; height: 32px; background: linear-gradient(135deg, #333, #111); border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); }
        .logo-text { color: var(--text-main); }
        .logo-text span { color: var(--brand-primary); }
        .header-badge {
          background: rgba(48, 209, 88, 0.15); color: var(--success); font-weight: 600; font-size: 0.75rem;
          padding: 0.4rem 0.8rem; border-radius: 40px; display: flex; align-items: center; gap: 6px;
          border: 1px solid rgba(48, 209, 88, 0.3);
        }
        .pulse-dot { width: 6px; height: 6px; background: var(--success); border-radius: 50%; animation: pulse-green 2s infinite; }
        .pulse-dot-small { display: inline-block; width: 4px; height: 4px; background: #fff; border-radius: 50%; animation: pulse-green 2s infinite; margin-right: 4px; margin-bottom: 2px;}
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(48, 209, 88, 0); } 100% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0); } }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 35vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 4rem 1.5rem; overflow: hidden;
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: #5E5CE6; top: -150px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #0A84FF; bottom: -100px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1.2rem; }
        .hero-badge {
          background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); padding: 0.4rem 1rem;
          border-radius: 40px; font-size: 0.7rem; font-weight: 600; color: #fff;
          letter-spacing: 1px; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 6px;
        }
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.1; margin-bottom: 1rem; letter-spacing: -1px; }
        .text-gradient { background: linear-gradient(to right, #0A84FF, #30D158); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 1.1rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; font-weight: 400; }

        /* ── Main Card (Balanced for PC) ── */
        .main-section { padding: 0 1.5rem; max-width: 720px; margin: -2rem auto 3rem; position: relative; z-index: 10; }
        .main-card {
          background: var(--bg-surface); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
          border-radius: 32px; padding: 2.5rem 2rem; border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        /* Product Header */
        .product-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); }
        .product-image { width: 90px; height: 90px; border-radius: 20px; overflow: hidden; flex-shrink: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); background: #fff; }
        .product-img { width: 100%; height: 100%; object-fit: cover; }
        .product-info h2 { font-size: 1.3rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-bottom: 2px;}
        .product-meta { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;}
        .claimed-badge { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: var(--success); background: rgba(48, 209, 88, 0.1); padding: 0.3rem 0.8rem; border-radius: 40px; border: 1px solid rgba(48,209,88,0.2); font-weight: 500;}

        /* Price Section */
        .price-section { background: rgba(0,0,0,0.3); border-radius: 20px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); }
        .price-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; }
        .price-divider { height: 1px; background: var(--border-color); margin: 0.5rem 0; }
        .highlight-row { padding-top: 0.8rem; }
        .price-label { font-size: 0.85rem; font-weight: 500; color: var(--text-muted); }
        .free-label { color: #fff; font-weight: 600; }
        .price-value { font-weight: 700; font-size: 1.1rem; font-variant-numeric: tabular-nums; }
        .price-value.cut { color: var(--success); }
        .price-value.remaining { color: var(--danger); }
        .price-value.free { background: linear-gradient(to right, #0A84FF, #30D158); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.3rem; font-weight: 800; }

        /* Progress Bar */
        .progress-wrapper { margin-bottom: 2rem; }
        .progress-bar { height: 12px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #0A84FF, #30D158); border-radius: 99px; position: relative; transition: width 1s ease-in-out; }
        .progress-glow { position: absolute; right: 0; top: 0; bottom: 0; width: 20px; background: #fff; filter: blur(5px); opacity: 0.5; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; margin-top: 0.6rem; }
        .text-red-400 { color: #FF6961; }
        .text-green-400 { color: #32D74B; }

        /* Timer */
        .timer-section { display: flex; align-items: center; justify-content: center; gap: 0.8rem; background: rgba(255, 159, 10, 0.1); padding: 0.8rem 1.5rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid rgba(255, 159, 10, 0.2); }
        .timer-icon { font-size: 1.2rem; color: var(--warning); }
        .timer-text { font-size: 0.85rem; font-weight: 500; color: #fff; }
        .timer-value { font-weight: 700; color: var(--warning); font-size: 1.1rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 1px;}

        /* Share Section */
        .share-section { margin-bottom: 2rem; }
        .share-title { font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 1rem; text-align: center; }
        .share-buttons { display: flex; flex-wrap: wrap; gap: 0.8rem; justify-content: center; margin-bottom: 1rem; }
        .share-btn { display: flex; align-items: center; gap: 6px; padding: 0.6rem 1rem; border-radius: 12px; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .share-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .share-btn.whatsapp { background: #25D366; color: #fff; }
        .share-btn.facebook { background: #1877F2; color: #fff; }
        .share-btn.instagram { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color: #fff; }
        .share-btn.twitter { background: #000; color: #fff; border: 1px solid rgba(255,255,255,0.2); }
        .share-btn.telegram { background: #0088CC; color: #fff; }

        .share-actions { display: flex; gap: 0.8rem; justify-content: center; }
        .share-action { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); font-size: 0.75rem; font-weight: 500; color: var(--text-main); cursor: pointer; transition: all 0.2s; }
        .share-action:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }

        /* Continue Button */
        .continue-btn {
          width: 100%; padding: 1.1rem; background: var(--text-main); color: #000;
          border: none; border-radius: 16px; font-weight: 700; font-size: 1.1rem; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.1); }
        .continue-btn:active:not(:disabled) { transform: translateY(0); }
        .continue-btn.loading { opacity: 0.8; cursor: wait; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 2rem; }
        .section-title { font-size: 1.6rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; }

        /* ── Recent Wins ── */
        .wins-section { padding: 1rem 1.5rem 3rem; max-width: 600px; margin: 0 auto; width: 100%; }
        .wins-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .wins-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.2rem; font-weight: 700; color: #fff; }
        .wins-badge { display: flex; align-items: center; font-size: 0.65rem; font-weight: 600; background: rgba(48, 209, 88, 0.15); color: var(--success); border: 1px solid rgba(48, 209, 88, 0.3); padding: 0.2rem 0.6rem; border-radius: 40px; }
        .wins-list { background: var(--bg-surface-solid); border-radius: 20px; padding: 0.5rem 1rem; border: 1px solid var(--border-color); }
        .win-item { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .win-item:last-child { border-bottom: none; }
        .win-avatar-wrap { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;}
        .win-avatar { font-size: 1.2rem; color: var(--text-muted); }
        .win-info { display: flex; flex-direction: column; gap: 2px;}
        .win-name { font-weight: 600; font-size: 0.85rem; color: #fff; }
        .win-product { font-size: 0.8rem; color: var(--text-muted); }

        /* ── How It Works ── */
        .how-section { padding: 3rem 1.5rem; max-width: 900px; margin: 0 auto; width: 100%; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .step-card { background: var(--bg-surface-solid); padding: 2rem 1.5rem; border-radius: 24px; text-align: center; border: 1px solid var(--border-color); transition: all 0.3s; }
        .step-card:hover { transform: translateY(-5px); border-color: rgba(10, 132, 255, 0.5); background: rgba(28, 28, 30, 0.8); }
        .step-number-wrap { width: 44px; height: 44px; background: rgba(10, 132, 255, 0.1); border: 1px solid rgba(10, 132, 255, 0.3); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: var(--brand-primary); font-weight: 700; font-size: 1.1rem; }
        .step-card h3 { font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.85rem; color: var(--text-muted); }

        /* ── FAQ ── */
        .faq-section { padding: 3rem 1.5rem 5rem; max-width: 700px; margin: 0 auto; width: 100%; }
        .faq-list { display: flex; flex-direction: column; gap: 1rem; }
        .faq-item { background: var(--bg-surface-solid); border-radius: 16px; padding: 1.2rem 1.5rem; border: 1px solid var(--border-color); display: flex; gap: 1.2rem; transition: all 0.2s; }
        .faq-item:hover { border-color: rgba(255,255,255,0.2); }
        .faq-icon { width: 28px; height: 28px; flex-shrink: 0; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-muted); font-size: 0.9rem;}
        .faq-question { font-weight: 600; font-size: 0.95rem; color: #fff; margin-bottom: 0.3rem; }
        .faq-answer { font-size: 0.85rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #000; border-top: 1px solid var(--border-color); padding: 3rem 1.5rem; text-align: center; margin-top: auto; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
        .footer-logo { font-size: 1.1rem; opacity: 0.4; margin-bottom: 0.5rem; justify-content: center; color: #fff;}
        .site-footer p { font-size: 0.8rem; color: var(--text-muted); }
        .footer-contact { font-weight: 500; color: #555; font-size: 0.75rem;}

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0, 0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: var(--bg-surface-solid); border-radius: 28px; padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .modal-icon-container { width: 56px; height: 56px; background: rgba(255,255,255,0.05); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; border: 1px solid rgba(255,255,255,0.05); }
        .modal-icon { font-size: 1.8rem; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
        .modal-card p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; line-height: 1.5; }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-btn { padding: 1rem; border-radius: 14px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .modal-btn.primary { background: var(--text-main); color: #000; }
        .modal-btn.primary:hover { opacity: 0.9; }
        .modal-btn.ghost { background: transparent; color: #fff; border: 1px solid var(--border-color); }
        .modal-btn.ghost:hover { background: rgba(255,255,255,0.05); }
        .modal-btn.text-only { background: transparent; color: #666; font-size: 0.8rem; margin-top: 1rem; }
        .modal-btn.text-only:hover { color: #fff; }

        /* ── Responsive Mobile Optimization ── */
        @media (max-width: 768px) {
          .steps { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; gap: 1.2rem; }
          .main-section { max-width: 100%; padding: 0 1rem; margin-top: -1.5rem; }
          .main-card { padding: 2rem 1.5rem; }
          .hero { padding-top: 2rem; min-height: auto; padding-bottom: 4rem; }
          .hero h1 { font-size: 2.2rem; }
        }
        
        @media (max-width: 480px) {
          .header-badge { font-size: 0.65rem; padding: 0.3rem 0.6rem; }
          .logo { font-size: 1.1rem; }
          
          .main-section { padding: 0 0.8rem; margin-top: -1.5rem; }
          .main-card { border-radius: 24px; padding: 1.5rem 1.25rem; }
          
          .product-header { flex-direction: row; gap: 1rem; text-align: left; margin-bottom: 1.5rem; padding-bottom: 1rem;}
          .product-image { width: 70px; height: 70px; border-radius: 16px;}
          .product-info h2 { font-size: 1.1rem; }
          .product-meta { font-size: 0.75rem; }
          .claimed-badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; margin-top: 4px; }
          
          .price-section { padding: 1rem; margin-bottom: 1.2rem;}
          .price-label { font-size: 0.75rem; }
          .price-value { font-size: 1rem; }
          .price-value.free { font-size: 1.15rem; }
          
          .share-buttons { gap: 0.5rem; }
          .share-btn { font-size: 0.75rem; padding: 0.5rem 0.8rem; border-radius: 10px;}
          .share-actions { flex-wrap: wrap; }
          .share-action { font-size: 0.7rem; padding: 0.4rem 0.8rem; }
          
          .timer-section { padding: 0.6rem 1rem; }
          .timer-text { font-size: 0.75rem; }
          .timer-value { font-size: 1rem; }
          
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
export default withCampaignMeta(IphoneFreebie, defaultMeta);