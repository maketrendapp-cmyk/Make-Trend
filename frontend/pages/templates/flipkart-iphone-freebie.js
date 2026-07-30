// pages/templates/flipkart-iphone-freebie.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaShoppingBag,
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
  FaBolt,
  FaArrowRight,
  FaGlobe,
  FaQuestionCircle,
} from 'react-icons/fa';

// ── Default Meta (Clean URL) ──
const defaultMeta = {
  title: 'Flipkart Big Billion Days – Get iPhone 15 & Electronics Free!',
  description: 'Invite friends, cut the price, and get rewards or electronics for free on Flipkart. Limited time offer!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/flipkart-iphone-freebie', // ✅ Clean base URL
};

// ── Static Winner Data ──
const WINNERS = [
  { name: 'amit_99***', product: 'iPhone 15 Pro (128GB)' },
  { name: 'pooja_sh***', product: 'Sony WH-1000XM4 Headphones' },
  { name: 'bikash_np***', product: 'Realme Smart Watch 2 Pro' },
  { name: 'sunil_kt***', product: 'Boat Rockerz 450' },
  { name: 'ramesh_m***', product: 'Flipkart 5,000 SuperCoins' },
];

function FlipkartFreebie({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [claimedCount, setClaimedCount] = useState(14850);

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

  // ── Simulate claim count updates ──
  useEffect(() => {
    const interval = setInterval(() => {
      setClaimedCount(prev => prev + Math.floor(Math.random() * 4) + 1);
    }, 3500);
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

  // ── Share button handlers ──
  const handleShare = () => {
    // Visual feedback only
  };

  // ── WebView Modal ──
  const WebViewModal = () => {
    if (!showWebViewModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-icon-container">
            <FaGlobe className="modal-icon" />
          </div>
          <h2>Open in Browser</h2>
          <p>For the best experience and to track your Flipkart price cuts correctly, please open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Link copied! Open Chrome or Safari to paste.');
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
              <FaShoppingBag className="w-4 h-4 text-[#2874F0]" />
            </div>
            <span className="logo-text">Flipkart <span className="logo-sub">Freebie</span></span>
          </div>
          <div className="header-badge">
            <FaBolt className="w-3 h-3 text-yellow-400" /> Big Billion Days
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
              <FaGift className="w-3.5 h-3.5 text-yellow-400" /> 100% GENUINE GIVEAWAY
            </div>
          </div>
          <h1>Cut Price & Get Electronics <br /><span className="text-gradient">For ₹0 on Flipkart</span></h1>
          <p>Invite friends to slash the price. Reach ₹0 and claim your prize instantly!</p>
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
              <p className="product-meta">256GB • Special Flipkart Edition</p>
              <div className="claimed-badge">
                <FaUserCircle className="w-3.5 h-3.5" />
                <span>{claimedCount.toLocaleString()}+ users claimed successfully</span>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="price-row">
              <span className="price-label">You Have Cut</span>
              <span className="price-value cut">₹99,840.50</span>
            </div>
            <div className="price-row">
              <span className="price-label">Left to Cut</span>
              <span className="price-value remaining">₹1,159.50</span>
            </div>
            <div className="price-divider"></div>
            <div className="price-row highlight-row">
              <span className="price-label free-label">Status</span>
              <span className="price-value free">98.85% FREE</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-wrapper">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '98.85%' }}>
                <div className="progress-glow"></div>
              </div>
            </div>
            <div className="progress-labels">
              <span className="text-red-400">Only ₹1,159.50 Left!</span>
              <span className="text-blue-400">98.85% Completed</span>
            </div>
          </div>

          {/* Timer */}
          <div className="timer-section">
            <FaClock className="timer-icon" />
            <span className="timer-text">Flash Deal Ends In</span>
            <span className="timer-value">11:42:15</span>
          </div>

          {/* Share Buttons */}
          <div className="share-section">
            <div className="share-title">Share Via WhatsApp & Socials To Cut Price</div>
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
                <FaSms className="w-3.5 h-3.5" /> Send SMS
              </button>
              <button className="share-action" onClick={handleShare}>
                <FaShareAlt className="w-3.5 h-3.5" /> More Options
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
              <>
                Claim Your Reward Now
                <FaArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* ─── RECENT WINS ─── */}
      <section className="wins-section">
        <div className="wins-header">
          <h2><FaTrophy className="w-4 h-4 text-yellow-400" /> Recent Winner Feed</h2>
          <span className="wins-badge"><span className="pulse-dot-small"></span> Live Updates</span>
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
          <h2 className="section-title">How It Works</h2>
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-number-wrap">1</div>
            <h3>Share Link</h3>
            <p>Send your unique referral link to friends on WhatsApp or social media.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">2</div>
            <h3>Friends Cut Price</h3>
            <p>Each friend who clicks lowers the final amount down automatically.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">3</div>
            <h3>Claim Item</h3>
            <p>Reach ₹0 balance and get your reward delivered directly to your doorstep.</p>
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
            <div className="faq-icon">
              <FaQuestionCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="faq-question">Is this Flipkart promotion real?</div>
              <div className="faq-answer">Yes! This is part of our seasonal festive and flash event campaigns rewarding active users.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">
              <FaQuestionCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="faq-question">Are there any delivery charges?</div>
              <div className="faq-answer">No, standard home delivery is completely free once your price cut reaches zero.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">
              <FaQuestionCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="faq-question">How many friends do I need to invite?</div>
              <div className="faq-answer">It varies depending on random price drops, but most users achieve it with just a few active shares!</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="logo footer-logo">
            <FaShoppingBag className="w-4 h-4 text-[#2874F0]" /> Flipkart Internet Private Limited
          </div>
          <p>© {new Date().getFullYear()} Flipkart Promotional Events. All rights reserved.</p>
          <p className="footer-contact">All trademarks are properties of their respective owners.</p>
        </div>
      </footer>

      {/* ─── ENHANCED FLIPKART STYLING ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --fk-blue: #2874F0;
          --fk-yellow: #FFE11B;
          --fk-orange: #FB641B;
          
          --bg-base: #f1f3f6;
          --bg-surface: #ffffff;
          --bg-surface-solid: #ffffff;
          --border-color: #e0e0e0;
          
          --text-main: #212121;
          --text-muted: #878787;
          
          --success: #388E3C;
          --danger: #FF6161;
          --warning: #FF9F00;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Roboto, Arial, sans-serif; }
        body { background: var(--bg-base); color: var(--text-main); line-height: 1.5; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header (Flipkart Blue) ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: var(--fk-blue); box-shadow: 0 2px 4px 0 rgba(0,0,0,.2);
          padding: 0.75rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.25rem; font-style: italic; }
        .logo-icon-bg { width: 30px; height: 30px; background: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        .logo-text { color: #fff; font-size: 1.2rem; }
        .logo-sub { color: var(--fk-yellow); font-size: 0.85rem; font-weight: 500; font-style: normal; }
        .header-badge {
          background: var(--fk-yellow); color: #212121; font-weight: 700; font-size: 0.7rem;
          padding: 0.35rem 0.8rem; border-radius: 4px; display: flex; align-items: center; gap: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-transform: uppercase;
        }
        .pulse-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite; }
        .pulse-dot-small { display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite; margin-right: 4px; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 32vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 3rem 1.5rem; overflow: hidden; background: linear-gradient(135deg, #1e40af, #2874F0);
          color: #fff;
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.3; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: var(--fk-yellow); top: -150px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #60a5fa; bottom: -100px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1rem; }
        .hero-badge {
          background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); padding: 0.3rem 1rem;
          border-radius: 4px; font-size: 0.65rem; font-weight: 700; color: var(--fk-yellow);
          letter-spacing: 0.5px; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 6px;
        }
        .hero h1 { font-size: clamp(1.8rem, 4.5vw, 2.8rem); font-weight: 800; line-height: 1.2; margin-bottom: 0.8rem; letter-spacing: -0.5px; }
        .text-gradient { color: var(--fk-yellow); text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .hero p { font-size: 1rem; color: #e2e8f0; max-width: 600px; margin: 0 auto; font-weight: 400; }

        /* ── Main Card ── */
        .main-section { padding: 0 1rem; max-width: 700px; margin: -2.5rem auto 2.5rem; position: relative; z-index: 10; }
        .main-card {
          background: var(--bg-surface); border-radius: 12px; padding: 2rem 1.5rem; border: 1px solid var(--border-color);
          box-shadow: 0 4px 12px 0 rgba(0,0,0,0.1);
          transition: box-shadow 0.3s ease;
        }
        .main-card:hover { box-shadow: 0 8px 24px 0 rgba(0,0,0,0.15); }

        /* Product Header */
        .product-header { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem; padding-bottom: 1.2rem; border-bottom: 1px solid #f0f0f0; }
        .product-image { width: 80px; height: 80px; border-radius: 8px; overflow: hidden; flex-shrink: 0; border: 1px solid #eee; background: #fafafa; transition: transform 0.3s ease; }
        .product-image:hover { transform: scale(1.02); }
        .product-img { width: 100%; height: 100%; object-fit: contain; }
        .product-info h2 { font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
        .product-meta { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; }
        .claimed-badge { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: var(--success); background: rgba(56, 142, 60, 0.1); padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 600; }

        /* Price Section */
        .price-section { background: #f8fafc; border-radius: 8px; padding: 1.2rem; margin-bottom: 1.2rem; border: 1px solid #e2e8f0; }
        .price-row { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; }
        .price-divider { height: 1px; background: #e2e8f0; margin: 0.5rem 0; }
        .highlight-row { padding-top: 0.4rem; }
        .price-label { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
        .free-label { color: var(--text-main); font-weight: 700; }
        .price-value { font-weight: 700; font-size: 1rem; font-variant-numeric: tabular-nums; }
        .price-value.cut { color: var(--success); }
        .price-value.remaining { color: var(--danger); }
        .price-value.free { color: var(--fk-orange); font-size: 1.2rem; font-weight: 800; }

        /* Progress Bar */
        .progress-wrapper { margin-bottom: 1.5rem; }
        .progress-bar { height: 10px; background: #e0e0e0; border-radius: 4px; overflow: hidden; position: relative; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--fk-blue), var(--success)); border-radius: 4px; position: relative; transition: width 1s ease-in-out; }
        .progress-glow { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; background: #fff; opacity: 0.4; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-top: 0.4rem; }
        .text-red-400 { color: var(--danger); }
        .text-blue-400 { color: var(--fk-blue); }

        /* Timer */
        .timer-section { display: flex; align-items: center; justify-content: center; gap: 0.6rem; background: #fffbeb; padding: 0.7rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #fef3c7; }
        .timer-icon { font-size: 1.1rem; color: #d97706; }
        .timer-text { font-size: 0.8rem; font-weight: 600; color: #b45309; }
        .timer-value { font-weight: 800; color: #b45309; font-size: 1rem; font-family: monospace; letter-spacing: 0.5px; }

        /* Share Section */
        .share-section { margin-bottom: 1.5rem; }
        .share-title { font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.8rem; text-align: center; }
        .share-buttons { display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; margin-bottom: 0.8rem; }
        .share-btn { display: flex; align-items: center; gap: 5px; padding: 0.5rem 0.9rem; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .share-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .share-btn:active { transform: scale(0.96); }
        .share-btn.whatsapp { background: #25D366; color: #fff; }
        .share-btn.facebook { background: #1877F2; color: #fff; }
        .share-btn.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; }
        .share-btn.twitter { background: #111; color: #fff; }
        .share-btn.telegram { background: #0088CC; color: #fff; }

        .share-actions { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
        .share-action { display: flex; align-items: center; gap: 4px; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--border-color); background: #f8fafc; font-size: 0.75rem; font-weight: 500; color: #334155; cursor: pointer; transition: all 0.2s ease; }
        .share-action:hover { background: #f1f5f9; transform: translateY(-2px); }

        /* Continue Button (Flipkart Orange) */
        .continue-btn {
          width: 100%; padding: 1rem; background: var(--fk-orange); color: #fff;
          border: none; border-radius: 8px; font-weight: 700; font-size: 1.05rem; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 2px 4px 0 rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .continue-btn:hover:not(:disabled) { background: #e55a14; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
        .continue-btn:active:not(:disabled) { transform: scale(0.98); }
        .continue-btn.loading { opacity: 0.8; cursor: wait; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 1.5rem; }
        .section-title { font-size: 1.3rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.3px; }

        /* ── Recent Wins ── */
        .wins-section { padding: 1rem 1rem 2rem; max-width: 700px; margin: 0 auto; width: 100%; }
        .wins-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
        .wins-header h2 { display: flex; align-items: center; gap: 0.4rem; font-size: 1.05rem; font-weight: 700; color: var(--text-main); }
        .wins-badge { display: flex; align-items: center; font-size: 0.65rem; font-weight: 600; background: rgba(56, 142, 60, 0.1); color: var(--success); border: 1px solid rgba(56, 142, 60, 0.2); padding: 0.2rem 0.6rem; border-radius: 4px; }
        .wins-list { background: var(--bg-surface); border-radius: 8px; padding: 0.4rem 1rem; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .win-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px solid #f0f0f0; }
        .win-item:last-child { border-bottom: none; }
        .win-avatar-wrap { width: 32px; height: 32px; border-radius: 50%; background: #f1f3f6; display: flex; align-items: center; justify-content: center; }
        .win-avatar { font-size: 1.1rem; color: #94a3b8; }
        .win-info { display: flex; flex-direction: column; gap: 1px; }
        .win-name { font-weight: 600; font-size: 0.8rem; color: var(--text-main); }
        .win-product { font-size: 0.75rem; color: var(--text-muted); }
        .text-white { color: #fff; }

        /* ── How It Works ── */
        .how-section { padding: 2rem 1rem; max-width: 900px; margin: 0 auto; width: 100%; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }
        .step-card { background: var(--bg-surface); padding: 1.5rem 1rem; border-radius: 8px; text-align: center; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.3s ease; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); border-color: var(--fk-blue); }
        .step-number-wrap { width: 36px; height: 36px; background: rgba(40, 116, 240, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; color: var(--fk-blue); font-weight: 700; font-size: 0.95rem; transition: all 0.3s ease; }
        .step-card:hover .step-number-wrap { background: var(--fk-blue); color: #fff; }
        .step-card h3 { font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
        .step-card p { font-size: 0.8rem; color: var(--text-muted); }

        /* ── FAQ ── */
        .faq-section { padding: 2rem 1rem 4rem; max-width: 700px; margin: 0 auto; width: 100%; }
        .faq-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .faq-item { background: var(--bg-surface); border-radius: 8px; padding: 1rem 1.2rem; border: 1px solid var(--border-color); display: flex; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.3s ease; }
        .faq-item:hover { border-color: var(--fk-blue); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .faq-icon { width: 28px; height: 28px; flex-shrink: 0; background: #f1f3f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.9rem; transition: color 0.3s ease; }
        .faq-item:hover .faq-icon { color: var(--fk-blue); }
        .faq-question { font-weight: 600; font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.2rem; }
        .faq-answer { font-size: 0.8rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #172337; color: #fff; padding: 2.5rem 1rem; text-align: center; margin-top: auto; border-top: 1px solid #2874F0; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
        .footer-logo { font-size: 1rem; opacity: 0.8; margin-bottom: 0.3rem; justify-content: center; color: #fff; }
        .site-footer p { font-size: 0.75rem; color: #878787; }
        .footer-contact { font-weight: 500; color: #b2b2b2; font-size: 0.7rem; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 12px; padding: 2rem 1.5rem; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .modal-icon-container { width: 50px; height: 50px; background: rgba(40, 116, 240, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .modal-icon { font-size: 1.5rem; color: var(--fk-blue); }
        .modal-card h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; flex-direction: column; gap: 8px; }
        .modal-btn { padding: 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; transition: all 0.2s ease; }
        .modal-btn.primary { background: var(--fk-orange); color: #fff; }
        .modal-btn.primary:hover { background: #e55a14; transform: translateY(-2px); }
        .modal-btn.ghost { background: #f1f3f6; color: var(--text-main); border: 1px solid var(--border-color); }
        .modal-btn.ghost:hover { background: #e2e8f0; }
        .modal-btn.text-only { background: transparent; color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem; }
        .modal-btn.text-only:hover { color: var(--text-main); }

        /* ── Responsive Mobile Optimization ── */
        @media (max-width: 768px) {
          .steps { grid-template-columns: 1fr; max-width: 360px; margin: 0 auto; gap: 1rem; }
          .main-section { padding: 0 0.8rem; margin-top: -2rem; }
          .main-card { padding: 1.5rem 1rem; }
          .hero { padding-top: 2rem; padding-bottom: 3.5rem; }
          .hero h1 { font-size: 1.9rem; }
          .product-header { flex-direction: column; align-items: center; text-align: center; gap: 0.8rem; }
          .product-image { width: 100px; height: 100px; }
          .share-buttons { justify-content: center; }
          .share-actions { flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.6rem; padding: 0.25rem 0.6rem; }
          .main-card { padding: 1.2rem 0.8rem; }
          .price-section { padding: 0.8rem; }
          .timer-section { flex-wrap: wrap; gap: 0.3rem; }
          .continue-btn { font-size: 1rem; padding: 0.9rem; }
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
export default withCampaignMeta(FlipkartFreebie, defaultMeta);