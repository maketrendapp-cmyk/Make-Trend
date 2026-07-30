// pages/templates/amazon-iphone-freebie.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaAmazon,
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
  FaBoxOpen,
} from 'react-icons/fa';

// ── Default Meta (Clean URL) ──
const defaultMeta = {
  title: 'Amazon Prime Deals – Get iPhone 15 Pro Max Free!',
  description: 'Invite friends, cut the price, and get iPhone 15 Pro Max or electronics for free on Amazon. Limited time offer!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/amazon-iphone-freebie', // ✅ Clean base URL
};

// ── Static Winner Data (Amazon themed) ──
const WINNERS = [
  { name: 'priya_m***', product: 'iPhone 15 Pro Max (256GB)' },
  { name: 'rahul_99***', product: 'Sony WH-1000XM5 Headphones' },
  { name: 'amit_sh***', product: 'Kindle Paperwhite (16GB)' },
  { name: 'neha_np***', product: 'Echo Dot (5th Gen)' },
  { name: 'vikram_k***', product: 'Amazon ₹5,000 Gift Card' },
];

function AmazonFreebie({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [claimedCount, setClaimedCount] = useState(19240);

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
    }, 3200);
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
          <p>For the best experience and to track your Amazon price cuts correctly, please open this page in your default browser.</p>
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

      {/* ─── HEADER (Amazon Navbar Style) ─── */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon-bg">
              <FaAmazon className="w-5 h-5 text-[#FF9900]" />
            </div>
            <span className="logo-text">amazon<span className="logo-sub">.in</span></span>
          </div>
          <div className="header-badge">
            <FaBoxOpen className="w-3 h-3 text-[#FF9900]" /> Prime Exclusive
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
              <FaGift className="w-3.5 h-3.5 text-[#FF9900]" /> OFFICIAL GIVEAWAY EVENT
            </div>
          </div>
          <h1>Cut Price & Get iPhone 15 <br /><span className="text-gradient">For ₹0 on Amazon</span></h1>
          <p>Invite friends to slash the price tag. Reach ₹0 and claim your prize with free Prime delivery!</p>
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
              <p className="product-meta">256GB • Prime Day Special Edition</p>
              <div className="claimed-badge">
                <FaUserCircle className="w-3.5 h-3.5" />
                <span>{claimedCount.toLocaleString()}+ claimed successfully</span>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="price-row">
              <span className="price-label">You Have Cut</span>
              <span className="price-value cut">₹1,33,840.00</span>
            </div>
            <div className="price-row">
              <span className="price-label">Left to Cut</span>
              <span className="price-value remaining">₹1,159.00</span>
            </div>
            <div className="price-divider"></div>
            <div className="price-row highlight-row">
              <span className="price-label free-label">Status</span>
              <span className="price-value free">99.14% FREE</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-wrapper">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '99.14%' }}>
                <div className="progress-glow"></div>
              </div>
            </div>
            <div className="progress-labels">
              <span className="text-red-400">Only ₹1,159 Left!</span>
              <span className="text-amazon-orange">99.14% Completed</span>
            </div>
          </div>

          {/* Timer */}
          <div className="timer-section">
            <FaClock className="timer-icon" />
            <span className="timer-text">Lightning Deal Ends In</span>
            <span className="timer-value">08:24:50</span>
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

          {/* Continue Button (Amazon Yellow/Orange) */}
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
              'Proceed to Claim Reward →'
            )}
          </button>
        </div>
      </section>

      {/* ─── RECENT WINS ─── */}
      <section className="wins-section">
        <div className="wins-header">
          <h2><FaTrophy className="w-4 h-4 text-[#FF9900]" /> Recent Winner Feed</h2>
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
                <span className="win-product">won FREE <strong className="text-dark">{winner.product}</strong></span>
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
            <p>Reach ₹0 balance and get your reward delivered with Prime delivery.</p>
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
              <div className="faq-question">Is this Amazon promotional event real?</div>
              <div className="faq-answer">Yes! This is part of our seasonal festival rewards program celebrating active Prime shoppers.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">Are there any delivery charges?</div>
              <div className="faq-answer">No, standard home delivery via Amazon Prime is completely free once your price cut reaches zero.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">How many friends do I need to invite?</div>
              <div className="faq-answer">It varies depending on random price cuts, but most users achieve it with just a few active shares!</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER (Amazon Dark Footer) ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="logo footer-logo">
            <FaAmazon className="w-4 h-4 text-[#FF9900]" /> Amazon Seller Services Private Limited
          </div>
          <p>© {new Date().getFullYear()} Amazon.com, Inc. or its affiliates. All rights reserved.</p>
          <p className="footer-contact">All trademarks are properties of their respective owners.</p>
        </div>
      </footer>

      {/* ─── ENHANCED AMAZON STYLING ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --amz-dark: #131921;
          --amz-dark-blue: #232f3e;
          --amz-orange: #FF9900;
          --amz-yellow: #febd69;
          
          --bg-base: #eaeded;
          --bg-surface: #ffffff;
          --border-color: #d5d9d9;
          
          --text-main: #0f1111;
          --text-muted: #565959;
          
          --success: #007600;
          --danger: #cc0c39;
          --warning: #ff8f00;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Amazon Ember', Arial, sans-serif; }
        body { background: var(--bg-base); color: var(--text-main); line-height: 1.5; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header (Amazon Charcoal Navy) ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: var(--amz-dark); box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 0.75rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.25rem; }
        .logo-icon-bg { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
        .logo-text { color: #fff; font-size: 1.3rem; letter-spacing: -0.5px; font-weight: 800; }
        .logo-sub { color: #fff; font-size: 0.85rem; font-weight: 500; }
        .header-badge {
          background: rgba(255, 153, 0, 0.15); color: #FF9900; font-weight: 700; font-size: 0.7rem;
          padding: 0.35rem 0.8rem; border-radius: 4px; display: flex; align-items: center; gap: 5px;
          border: 1px solid rgba(255, 153, 0, 0.3); text-transform: uppercase;
        }
        .pulse-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite; }
        .pulse-dot-small { display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite; margin-right: 4px; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 32vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 3rem 1.5rem; overflow: hidden; background: linear-gradient(135deg, var(--amz-dark-blue), var(--amz-dark));
          color: #fff;
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.25; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: var(--amz-orange); top: -150px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #007185; bottom: -100px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1rem; }
        .hero-badge {
          background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.3rem 1rem;
          border-radius: 4px; font-size: 0.65rem; font-weight: 700; color: #FF9900;
          letter-spacing: 0.5px; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 6px;
        }
        .hero h1 { font-size: clamp(1.8rem, 4.5vw, 2.8rem); font-weight: 800; line-height: 1.2; margin-bottom: 0.8rem; letter-spacing: -0.5px; }
        .text-gradient { color: #FF9900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .hero p { font-size: 1rem; color: #d5d9d9; max-width: 600px; margin: 0 auto; font-weight: 400; }

        /* ── Main Card ── */
        .main-section { padding: 0 1rem; max-width: 700px; margin: -2.5rem auto 2.5rem; position: relative; z-index: 10; }
        .main-card {
          background: var(--bg-surface); border-radius: 8px; padding: 2rem 1.5rem; border: 1px solid var(--border-color);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .main-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.1); }

        /* Product Header */
        .product-header { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem; padding-bottom: 1.2rem; border-bottom: 1px solid #e7e7e7; }
        .product-image { width: 80px; height: 80px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #e7e7e7; background: #fff; }
        .product-img { width: 100%; height: 100%; object-fit: contain; }
        .product-info h2 { font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
        .product-meta { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; }
        .claimed-badge { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: var(--success); background: rgba(0, 118, 0, 0.1); padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 600; }

        /* Price Section */
        .price-section { background: #f7fafa; border-radius: 8px; padding: 1.2rem; margin-bottom: 1.2rem; border: 1px solid var(--border-color); }
        .price-row { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; }
        .price-divider { height: 1px; background: #d5d9d9; margin: 0.5rem 0; }
        .highlight-row { padding-top: 0.4rem; }
        .price-label { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
        .free-label { color: var(--text-main); font-weight: 700; }
        .price-value { font-weight: 700; font-size: 1rem; font-variant-numeric: tabular-nums; }
        .price-value.cut { color: var(--success); }
        .price-value.remaining { color: var(--danger); }
        .price-value.free { color: #B12704; font-size: 1.2rem; font-weight: 800; }

        /* Progress Bar */
        .progress-wrapper { margin-bottom: 1.5rem; }
        .progress-bar { height: 10px; background: #e3e6e6; border-radius: 4px; overflow: hidden; position: relative; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #ffa41c, #FF9900); border-radius: 4px; position: relative; transition: width 1s ease-in-out; }
        .progress-glow { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; background: #fff; opacity: 0.4; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-top: 0.4rem; }
        .text-red-400 { color: var(--danger); }
        .text-amazon-orange { color: #B12704; }

        /* Timer */
        .timer-section { display: flex; align-items: center; justify-content: center; gap: 0.6rem; background: #fff8e1; padding: 0.7rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #ffe082; }
        .timer-icon { font-size: 1.1rem; color: #b26a00; }
        .timer-text { font-size: 0.8rem; font-weight: 600; color: #854d0e; }
        .timer-value { font-weight: 800; color: #b26a00; font-size: 1rem; font-family: monospace; letter-spacing: 0.5px; }

        /* Share Section */
        .share-section { margin-bottom: 1.5rem; }
        .share-title { font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.8rem; text-align: center; }
        .share-buttons { display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; margin-bottom: 0.8rem; }
        .share-btn { display: flex; align-items: center; gap: 5px; padding: 0.5rem 0.9rem; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .share-btn:hover { transform: translateY(-2px); filter: brightness(0.95); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .share-btn.whatsapp { background: #25D366; color: #fff; }
        .share-btn.facebook { background: #1877F2; color: #fff; }
        .share-btn.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; }
        .share-btn.twitter { background: #111; color: #fff; }
        .share-btn.telegram { background: #0088CC; color: #fff; }

        .share-actions { display: flex; gap: 0.6rem; justify-content: center; }
        .share-action { display: flex; align-items: center; gap: 4px; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--border-color); background: #f7fafa; font-size: 0.75rem; font-weight: 500; color: #334155; cursor: pointer; transition: all 0.2s ease; }
        .share-action:hover { background: #e3e6e6; transform: scale(1.02); }

        /* Continue Button (Amazon Yellow Button) */
        .continue-btn {
          width: 100%; padding: 1rem; background: #FFD814; color: #0f1111;
          border: 1px solid #FCD200; border-radius: 8px; font-weight: 700; font-size: 1.05rem; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 2px 5px rgba(213, 217, 217, 0.5);
        }
        .continue-btn:hover:not(:disabled) { background: #F7CA00; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(213, 217, 217, 0.6); }
        .continue-btn:active:not(:disabled) { transform: scale(0.98); }
        .continue-btn.loading { opacity: 0.8; cursor: wait; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #0f1111; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 1.5rem; }
        .section-title { font-size: 1.3rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.3px; }

        /* ── Recent Wins ── */
        .wins-section { padding: 1rem 1rem 2rem; max-width: 700px; margin: 0 auto; width: 100%; }
        .wins-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
        .wins-header h2 { display: flex; align-items: center; gap: 0.4rem; font-size: 1.05rem; font-weight: 700; color: var(--text-main); }
        .wins-badge { display: flex; align-items: center; font-size: 0.65rem; font-weight: 600; background: rgba(0, 118, 0, 0.1); color: var(--success); border: 1px solid rgba(0, 118, 0, 0.2); padding: 0.2rem 0.6rem; border-radius: 4px; }
        .wins-list { background: var(--bg-surface); border-radius: 8px; padding: 0.4rem 1rem; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .win-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px solid #e7e7e7; }
        .win-item:last-child { border-bottom: none; }
        .win-avatar-wrap { width: 32px; height: 32px; border-radius: 50%; background: #eaeded; display: flex; align-items: center; justify-content: center; }
        .win-avatar { font-size: 1.1rem; color: #565959; }
        .win-info { display: flex; flex-direction: column; gap: 1px; }
        .win-name { font-weight: 600; font-size: 0.8rem; color: var(--text-main); }
        .win-product { font-size: 0.75rem; color: var(--text-muted); }
        .text-dark { color: var(--text-main); font-weight: 700; }

        /* ── How It Works ── */
        .how-section { padding: 2rem 1rem; max-width: 900px; margin: 0 auto; width: 100%; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }
        .step-card { background: var(--bg-surface); padding: 1.5rem 1rem; border-radius: 8px; text-align: center; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.3s ease; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.06); }
        .step-number-wrap { width: 36px; height: 36px; background: rgba(255, 153, 0, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; color: #B12704; font-weight: 700; font-size: 0.95rem; }
        .step-card h3 { font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
        .step-card p { font-size: 0.8rem; color: var(--text-muted); }

        /* ── FAQ ── */
        .faq-section { padding: 2rem 1rem 4rem; max-width: 700px; margin: 0 auto; width: 100%; }
        .faq-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .faq-item { background: var(--bg-surface); border-radius: 8px; padding: 1rem 1.2rem; border: 1px solid var(--border-color); display: flex; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: border-color 0.2s; }
        .faq-item:hover { border-color: #FF9900; }
        .faq-icon { width: 24px; height: 24px; flex-shrink: 0; background: #eaeded; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; }
        .faq-question { font-weight: 600; font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.2rem; }
        .faq-answer { font-size: 0.8rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: var(--amz-dark-blue); color: #fff; padding: 2.5rem 1rem; text-align: center; margin-top: auto; border-top: 1px solid #374151; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
        .footer-logo { font-size: 1rem; opacity: 0.9; margin-bottom: 0.3rem; justify-content: center; color: #fff; }
        .site-footer p { font-size: 0.75rem; color: #999; }
        .footer-contact { font-weight: 500; color: #ccc; font-size: 0.7rem; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 8px; padding: 2rem 1.5rem; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-icon-container { width: 50px; height: 50px; background: #fff8e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .modal-icon { font-size: 1.5rem; }
        .modal-card h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; flex-direction: column; gap: 8px; }
        .modal-btn { padding: 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; transition: background 0.2s; }
        .modal-btn.primary { background: #FFD814; color: #0f1111; border: 1px solid #FCD200; }
        .modal-btn.primary:hover { background: #F7CA00; }
        .modal-btn.ghost { background: #eaeded; color: var(--text-main); border: 1px solid var(--border-color); }
        .modal-btn.ghost:hover { background: #d5d9d9; }
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
export default withCampaignMeta(AmazonFreebie, defaultMeta);