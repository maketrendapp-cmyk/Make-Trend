
// pages/templates/alibaba-freebie.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaGlobe,
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
  FaBox,
} from 'react-icons/fa';

// ── Default Meta ──
const defaultMeta = {
  title: 'Alibaba Global Trade – Get iPhone 15 Pro Max Sample Free!',
  description: 'Invite business partners or friends, cut the price, and get iPhone 15 Pro Max for free. Limited global supply!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/alibaba-freebie?id={id}',
};

// ── Static Winner Data (Alibaba themed) ──
const WINNERS = [
  { name: 'zhang_l***', product: 'iPhone 15 Pro Max (Sample)' },
  { name: 'ahmed_m***', product: 'MacBook Pro M3 Sample' },
  { name: 'carlos_g***', product: 'Industrial Drone 4K' },
  { name: 'li_wei***', product: 'Wireless Earbuds Bulk Pack' },
  { name: 'fatima_h***', product: 'Smart Watch Series 9 Sample' },
];

function AlibabaFreebie({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [claimedCount, setClaimedCount] = useState(24680);

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

  // ── Share button handlers (visual feedback) ──
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
            <span className="modal-icon">🌐</span>
          </div>
          <h2>Open in Browser</h2>
          <p>For the best experience and to track your Alibaba trade price cuts correctly, please open this page in your default browser.</p>
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

      {/* ─── HEADER (Alibaba Orange Style) ─── */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon-bg">
              <FaGlobe className="w-4 h-4 text-white" />
            </div>
            <span className="logo-text">alibaba<span className="logo-sub">.com</span></span>
          </div>
          <div className="header-badge">
            <FaBox className="w-3 h-3 text-[#FF6A00]" /> Global Sample Event
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
              <FaGift className="w-3.5 h-3.5 text-[#FF6A00]" /> WHOLESALE SAMPLE GIVEAWAY
            </div>
          </div>
          <h1>Cut Price & Get iPhone 15 Pro <br /><span className="text-gradient">For $0 on Alibaba.com</span></h1>
          <p>Invite connections to slash the sample cost. Reach $0 and claim your sample unit with free global courier shipping!</p>
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
              <h2>iPhone 15 Pro Max (Sample)</h2>
              <p className="product-meta">256GB • Direct Factory Supply</p>
              <div className="claimed-badge">
                <FaUserCircle className="w-3.5 h-3.5" />
                <span>{claimedCount.toLocaleString()}+ samples claimed globally</span>
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
              <span className="text-alibaba-orange">98.45% Completed</span>
            </div>
          </div>

          {/* Timer */}
          <div className="timer-section">
            <FaClock className="timer-icon" />
            <span className="timer-text">Trade Flash Deal Ends In</span>
            <span className="timer-value">14:10:22</span>
          </div>

          {/* Share Buttons */}
          <div className="share-section">
            <div className="share-title">Share Via WhatsApp & Socials To Cut Sample Price</div>
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

          {/* Continue Button (Alibaba Orange Button) */}
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
              'Claim Sample Unit Now →'
            )}
          </button>
        </div>
      </section>

      {/* ─── RECENT WINS ─── */}
      <section className="wins-section">
        <div className="wins-header">
          <h2><FaTrophy className="w-4 h-4 text-[#FF6A00]" /> Recent Global Sample Feed</h2>
          <span className="wins-badge"><span className="pulse-dot-small"></span> Live Feed</span>
        </div>
        <div className="wins-list">
          {WINNERS.map((winner, idx) => (
            <div key={idx} className="win-item">
              <div className="win-avatar-wrap">
                <FaUserCircle className="win-avatar" />
              </div>
              <div className="win-info">
                <span className="win-name">{winner.name}</span>
                <span className="win-product">claimed FREE <strong className="text-dark">{winner.product}</strong></span>
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
            <p>Send your unique global referral link to contacts via social media or trade groups.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">2</div>
            <h3>Connections Cut Price</h3>
            <p>Each user who clicks lowers the final sample cost down automatically.</p>
          </div>
          <div className="step-card">
            <div className="step-number-wrap">3</div>
            <h3>Claim Sample</h3>
            <p>Reach $0 balance and get your device shipped via international express delivery.</p>
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
              <div className="faq-question">Are these samples genuine factory items?</div>
              <div className="faq-answer">Yes! All sample units come directly from verified global manufacturers participating in our promotion.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">Is international shipping free?</div>
              <div className="faq-answer">Yes, standard global courier freight is completely covered once your price cut reaches zero.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">How many referrals do I need?</div>
              <div className="faq-answer">It varies based on active clicks, but most global participants hit the target within a few shares!</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER (Alibaba Dark Industrial Footer) ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="logo footer-logo">
            <FaGlobe className="w-4 h-4 text-[#FF6A00]" /> Alibaba.com Hong Kong Limited
          </div>
          <p>© {new Date().getFullYear()} Alibaba.com. All rights reserved.</p>
          <p className="footer-contact">Global B2B Trade and Sample Platform.</p>
        </div>
      </footer>

      {/* ─── ALIBABA STYLING & CSS ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --ali-orange: #FF6A00;
          --ali-orange-dark: #E05D00;
          --ali-dark: #222222;
          
          --bg-base: #f4f4f4;
          --bg-surface: #ffffff;
          --border-color: #e5e5e5;
          
          --text-main: #333333;
          --text-muted: #777777;
          
          --success: #10B981;
          --danger: #EF4444;
          --warning: #F59E0B;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Open Sans', Arial, sans-serif; }
        body { background: var(--bg-base); color: var(--text-main); line-height: 1.5; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header (Alibaba Orange/Dark) ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: var(--ali-dark); box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 0.75rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.25rem; }
        .logo-icon-bg { width: 30px; height: 30px; background: var(--ali-orange); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .logo-text { color: #fff; font-size: 1.3rem; letter-spacing: -0.5px; font-weight: 800; text-transform: lowercase; }
        .logo-sub { color: var(--ali-orange); font-size: 0.9rem; font-weight: 700; }
        .header-badge {
          background: rgba(255, 106, 0, 0.15); color: var(--ali-orange); font-weight: 700; font-size: 0.7rem;
          padding: 0.35rem 0.8rem; border-radius: 4px; display: flex; align-items: center; gap: 5px;
          border: 1px solid rgba(255, 106, 0, 0.3); text-transform: uppercase;
        }
        .pulse-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite; }
        .pulse-dot-small { display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite; margin-right: 4px; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 32vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 3rem 1.5rem; overflow: hidden; background: linear-gradient(135deg, #111111, var(--ali-dark));
          color: #fff;
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.25; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: var(--ali-orange); top: -150px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #0284c7; bottom: -100px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1rem; }
        .hero-badge {
          background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.3rem 1rem;
          border-radius: 4px; font-size: 0.65rem; font-weight: 700; color: var(--ali-orange);
          letter-spacing: 0.5px; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 6px;
        }
        .hero h1 { font-size: clamp(1.8rem, 4.5vw, 2.8rem); font-weight: 800; line-height: 1.2; margin-bottom: 0.8rem; letter-spacing: -0.5px; }
        .text-gradient { color: var(--ali-orange); text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .hero p { font-size: 1rem; color: #d1d5db; max-width: 600px; margin: 0 auto; font-weight: 400; }

        /* ── Main Card ── */
        .main-section { padding: 0 1rem; max-width: 700px; margin: -2.5rem auto 2.5rem; position: relative; z-index: 10; }
        .main-card {
          background: var(--bg-surface); border-radius: 8px; padding: 2rem 1.5rem; border: 1px solid var(--border-color);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        /* Product Header */
        .product-header { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem; padding-bottom: 1.2rem; border-bottom: 1px solid #eeeeee; }
        .product-image { width: 80px; height: 80px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #eeeeee; background: #fff; }
        .product-img { width: 100%; height: 100%; object-fit: contain; }
        .product-info h2 { font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
        .product-meta { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; }
        .claimed-badge { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: var(--success); background: rgba(16, 185, 129, 0.1); padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 600; }

        /* Price Section */
        .price-section { background: #fafafa; border-radius: 8px; padding: 1.2rem; margin-bottom: 1.2rem; border: 1px solid #eeeeee; }
        .price-row { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; }
        .price-divider { height: 1px; background: #eeeeee; margin: 0.5rem 0; }
        .highlight-row { padding-top: 0.4rem; }
        .price-label { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
        .free-label { color: var(--text-main); font-weight: 700; }
        .price-value { font-weight: 700; font-size: 1rem; font-variant-numeric: tabular-nums; }
        .price-value.cut { color: var(--success); }
        .price-value.remaining { color: var(--danger); }
        .price-value.free { color: var(--ali-orange); font-size: 1.2rem; font-weight: 800; }

        /* Progress Bar */
        .progress-wrapper { margin-bottom: 1.5rem; }
        .progress-bar { height: 10px; background: #e5e5e5; border-radius: 4px; overflow: hidden; position: relative; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #FF6A00, #ff8533); border-radius: 4px; position: relative; transition: width 1s ease-in-out; }
        .progress-glow { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; background: #fff; opacity: 0.4; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-top: 0.4rem; }
        .text-red-400 { color: var(--danger); }
        .text-alibaba-orange { color: var(--ali-orange); }

        /* Timer */
        .timer-section { display: flex; align-items: center; justify-content: center; gap: 0.6rem; background: #fff7ed; padding: 0.7rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #ffedd5; }
        .timer-icon { font-size: 1.1rem; color: #c2410c; }
        .timer-text { font-size: 0.8rem; font-weight: 600; color: #9a3412; }
        .timer-value { font-weight: 800; color: #9a3412; font-size: 1rem; font-family: monospace; letter-spacing: 0.5px; }

        /* Share Section */
        .share-section { margin-bottom: 1.5rem; }
        .share-title { font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.8rem; text-align: center; }
        .share-buttons { display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; margin-bottom: 0.8rem; }
        .share-btn { display: flex; align-items: center; gap: 5px; padding: 0.5rem 0.9rem; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .share-btn:hover { filter: brightness(0.95); }
        .share-btn.whatsapp { background: #25D366; color: #fff; }
        .share-btn.facebook { background: #1877F2; color: #fff; }
        .share-btn.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; }
        .share-btn.twitter { background: #111; color: #fff; }
        .share-btn.telegram { background: #0088CC; color: #fff; }

        .share-actions { display: flex; gap: 0.6rem; justify-content: center; }
        .share-action { display: flex; align-items: center; gap: 4px; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--border-color); background: #fafafa; font-size: 0.75rem; font-weight: 500; color: #334155; cursor: pointer; }
        .share-action:hover { background: #eeeeee; }

        /* Continue Button (Alibaba Orange Button) */
        .continue-btn {
          width: 100%; padding: 1rem; background: var(--ali-orange); color: #fff;
          border: none; border-radius: 6px; font-weight: 700; font-size: 1.05rem; cursor: pointer;
          transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 2px 4px rgba(255, 106, 0, 0.3); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .continue-btn:hover:not(:disabled) { background: var(--ali-orange-dark); }
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
        .wins-badge { display: flex; align-items: center; font-size: 0.65rem; font-weight: 600; background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.2rem 0.6rem; border-radius: 4px; }
        .wins-list { background: var(--bg-surface); border-radius: 8px; padding: 0.4rem 1rem; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .win-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px solid #eeeeee; }
        .win-item:last-child { border-bottom: none; }
        .win-avatar-wrap { width: 32px; height: 32px; border-radius: 50%; background: #f4f4f4; display: flex; align-items: center; justify-content: center; }
        .win-avatar { font-size: 1.1rem; color: #777777; }
        .win-info { display: flex; flex-direction: column; gap: 1px; }
        .win-name { font-weight: 600; font-size: 0.8rem; color: var(--text-main); }
        .win-product { font-size: 0.75rem; color: var(--text-muted); }
        .text-dark { color: var(--text-main); font-weight: 700; }

        /* ── How It Works ── */
        .how-section { padding: 2rem 1rem; max-width: 900px; margin: 0 auto; width: 100%; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }
        .step-card { background: var(--bg-surface); padding: 1.5rem 1rem; border-radius: 8px; text-align: center; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .step-number-wrap { width: 36px; height: 36px; background: rgba(255, 106, 0, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; color: var(--ali-orange); font-weight: 700; font-size: 0.95rem; }
        .step-card h3 { font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
        .step-card p { font-size: 0.8rem; color: var(--text-muted); }

        /* ── FAQ ── */
        .faq-section { padding: 2rem 1rem 4rem; max-width: 700px; margin: 0 auto; width: 100%; }
        .faq-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .faq-item { background: var(--bg-surface); border-radius: 8px; padding: 1rem 1.2rem; border: 1px solid var(--border-color); display: flex; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .faq-icon { width: 24px; height: 24px; flex-shrink: 0; background: #f4f4f4; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; }
        .faq-question { font-weight: 600; font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.2rem; }
        .faq-answer { font-size: 0.8rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #111111; color: #fff; padding: 2.5rem 1rem; text-align: center; margin-top: auto; border-top: 1px solid var(--ali-orange); }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
        .footer-logo { font-size: 1rem; opacity: 0.9; margin-bottom: 0.3rem; justify-content: center; color: #fff; }
        .site-footer p { font-size: 0.75rem; color: #999; }
        .footer-contact { font-weight: 500; color: #ccc; font-size: 0.7rem; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 8px; padding: 2rem 1.5rem; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .modal-icon-container { width: 50px; height: 50px; background: #fff7ed; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .modal-icon { font-size: 1.5rem; }
        .modal-card h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; flex-direction: column; gap: 8px; }
        .modal-btn { padding: 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; }
        .modal-btn.primary { background: var(--ali-orange); color: #fff; }
        .modal-btn.primary:hover { background: var(--ali-orange-dark); }
        .modal-btn.ghost { background: #f4f4f4; color: var(--text-main); border: 1px solid var(--border-color); }
        .modal-btn.ghost:hover { background: #e5e5e5; }
        .modal-btn.text-only { background: transparent; color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem; }

        /* ── Responsive Mobile Optimization ── */
        @media (max-width: 768px) {
          .steps { grid-template-columns: 1fr; max-width: 360px; margin: 0 auto; gap: 1rem; }
          .main-section { padding: 0 0.8rem; margin-top: -2rem; }
          .main-card { padding: 1.5rem 1rem; }
          .hero { padding-top: 2rem; padding-bottom: 3.5rem; }
          .hero h1 { font-size: 1.9rem; }
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
export default withCampaignMeta(AlibabaFreebie, defaultMeta);