// pages/templates/pubg-uc-giveaway-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

const defaultMeta = {
  title: 'PUBG UC Giveaway – Official Event',
  description: 'Claim free UC for PUBG Mobile. Complete tasks and win up to 10,000 UC. Limited time official event.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/pubg-uc-giveaway-v1?id={id}',
};

function PubgUcGiveawayV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [uid, setUid] = useState('');
  const [server, setServer] = useState('asia');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  const isValidUid = (val) => /^\d{8,12}$/.test(val);

  const handleSubmit = () => {
    if (!isValidUid(uid)) {
      setError('Enter a valid 8‑12 digit UID.');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the terms.');
      return;
    }
    setError('');
    setLoading(true);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

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

  return (
    <div className="page-wrapper">
      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon">⚔️</span>
            <span className="logo-text">PUBG<span>GIVEAWAY</span></span>
          </div>
          <div className="header-right">
            <div className="live-badge">
              <span className="pulse"></span> LIVE
            </div>
            <div className="uid-badge">
              <span className="uid-label">UID</span>
              <span className="uid-value">{uid || '—'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🔥 OFFICIAL EVENT</div>
          <h1>PUBG Mobile UC<br />Giveaway</h1>
          <p className="hero-sub">
            Complete tasks &amp; win up to <span className="highlight">10,000 UC</span> + exclusive skins
          </p>
          <div className="hero-stats">
            <div><span>🏆</span> 50,000 UC Pool</div>
            <div><span>👥</span> 500+ Winners</div>
            <div><span>⏳</span> <span id="countdown">24h</span> Left</div>
          </div>
          <a href="#claim" className="hero-cta">Claim Your Reward →</a>
        </div>
      </section>

      {/* ─── REWARDS ─── */}
      <section className="rewards-section">
        <h2 className="section-title">🎁 What You Can Win</h2>
        <div className="rewards-grid">
          <div className="reward-card">
            <div className="reward-icon">💎</div>
            <h3>10,000 UC</h3>
            <p>Grand Prize</p>
          </div>
          <div className="reward-card">
            <div className="reward-icon">🔫</div>
            <h3>M416 Glory</h3>
            <p>Legendary Skin</p>
          </div>
          <div className="reward-card">
            <div className="reward-icon">🎒</div>
            <h3>Full Outfit</h3>
            <p>Exclusive Set</p>
          </div>
          <div className="reward-card">
            <div className="reward-icon">🎫</div>
            <h3>5,000 UC</h3>
            <p>Runner‑up</p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">📋 How to Claim</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Enter Your UID</h3>
              <p>Provide your PUBG Mobile UID and select your server.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Complete Tasks</h3>
              <p>Finish 3 simple tasks (watch, follow, share) to verify.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get Reward</h3>
              <p>Reward is sent to your in‑game mailbox within 24 hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TERMS ─── */}
      <section className="terms-section">
        <h2 className="section-title">📜 Official Rules</h2>
        <div className="terms-content">
          <ul>
            <li>Only one entry per PUBG Mobile UID.</li>
            <li>Your account must be at least level 10 to be eligible.</li>
            <li>Rewards are distributed within 24–48 hours after task completion.</li>
            <li>Any fraudulent activity will result in disqualification.</li>
            <li>This event is not affiliated with Krafton or PUBG Corporation.</li>
          </ul>
        </div>
      </section>

      {/* ─── CLAIM FORM ─── */}
      <section id="claim" className="claim-section">
        <div className="claim-card">
          <h2>🎮 Enter Your Details</h2>
          <p>Fill in the fields below to start the process.</p>

          <div className="form-group">
            <label htmlFor="uid">PUBG UID <span className="required">*</span></label>
            <input
              type="text"
              id="uid"
              inputMode="numeric"
              maxLength="12"
              placeholder="e.g. 1234567890"
              value={uid}
              onChange={(e) => {
                setUid(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              className={error && !isValidUid(uid) ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="server">Server <span className="required">*</span></label>
            <select
              id="server"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            >
              <option value="asia">Asia</option>
              <option value="europe">Europe</option>
              <option value="north-america">North America</option>
              <option value="south-america">South America</option>
              <option value="middle-east">Middle East</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <label htmlFor="terms">
              I agree to the <a href="#terms">Terms &amp; Conditions</a>.
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            className="claim-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Processing...
              </>
            ) : (
              'Claim UC Now 🚀'
            )}
          </button>

          <p className="form-footnote">
            ⚡ By continuing, you agree to complete the required tasks.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-container">
          <p>© 2026 PUBG Giveaway Event. Not affiliated with Krafton.</p>
          <p className="footer-contact">Support: support@pubggiveaway.com</p>
          <div className="footer-socials">
            <span>📱</span>
            <span>🐦</span>
            <span>📺</span>
          </div>
        </div>
      </footer>

      {/* ─── FULL CSS (now with !important fallback for safety) ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ───── RESET ───── */
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0b0d10 !important;
          color: #f0f0f0 !important;
          line-height: 1.6;
          scroll-behavior: smooth;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #0b0d10;
        }

        /* ───── HEADER ───── */
        .site-header {
          position: sticky; top:0; z-index:100;
          background: rgba(10,12,15,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,140,0,0.25);
          padding: 0.7rem 1.5rem;
        }
        .header-container {
          max-width: 1200px; margin:0 auto;
          display:flex; justify-content:space-between; align-items:center;
        }
        .logo {
          display:flex; align-items:center; gap:10px;
          font-weight:800; font-size:1.2rem;
        }
        .logo-icon { font-size:1.6rem; }
        .logo-text { color:#fff; letter-spacing:1px; }
        .logo-text span { color:#ff8c00; margin-left:2px; }
        .header-right { display:flex; align-items:center; gap:20px; }
        .live-badge {
          display:flex; align-items:center; gap:6px;
          background:rgba(255,50,50,0.15);
          border:1px solid #ff3333;
          padding:0.2rem 0.8rem;
          border-radius:40px;
          font-size:0.7rem;
          font-weight:700;
          color:#ff6666;
          text-transform:uppercase;
        }
        .pulse {
          display:inline-block; width:8px; height:8px;
          background:#ff3333; border-radius:50%;
          animation:pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(1.2); }
          100% { opacity:1; transform:scale(1); }
        }
        .uid-badge {
          display:flex; align-items:center; gap:6px;
          background:rgba(255,255,255,0.05);
          padding:0.2rem 0.8rem 0.2rem 0.6rem;
          border-radius:40px;
          border:1px solid rgba(255,255,255,0.08);
          font-size:0.8rem;
        }
        .uid-label { color:#888; font-weight:600; }
        .uid-value { color:#fff; font-weight:700; min-width:50px; }

        /* ───── HERO ───── */
        .hero-section {
          position:relative;
          min-height:85vh;
          display:flex;
          align-items:center;
          justify-content:center;
          text-align:center;
          padding:2rem 1.5rem;
          background: url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop') center/cover no-repeat;
          background-attachment:fixed;
        }
        .hero-overlay {
          position:absolute; inset:0;
          background:linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 100%);
        }
        .hero-content {
          position:relative; z-index:2;
          max-width:900px;
        }
        .hero-badge {
          display:inline-block;
          background:rgba(255,140,0,0.2);
          border:1px solid #ff8c00;
          padding:0.3rem 1.5rem;
          border-radius:40px;
          font-size:0.7rem;
          text-transform:uppercase;
          font-weight:700;
          color:#ff8c00;
          margin-bottom:1rem;
        }
        .hero-section h1 {
          font-size:clamp(2.8rem, 10vw, 5.2rem);
          font-weight:900;
          line-height:1.1;
          background:linear-gradient(135deg, #fff 30%, #ff8c00 100%);
          -webkit-background-clip:text;
          background-clip:text;
          color:transparent;
          margin-bottom:0.5rem;
          text-shadow:0 0 40px rgba(255,140,0,0.2);
        }
        .hero-sub {
          font-size:1.3rem;
          color:#ccc;
          margin-bottom:1.8rem;
        }
        .highlight { color:#ff8c00; font-weight:800; }
        .hero-stats {
          display:flex;
          justify-content:center;
          gap:2.5rem;
          flex-wrap:wrap;
          margin-bottom:2.5rem;
        }
        .hero-stats div {
          background:rgba(0,0,0,0.5);
          backdrop-filter:blur(8px);
          padding:0.6rem 1.8rem;
          border-radius:60px;
          border:1px solid rgba(255,255,255,0.08);
          font-weight:600;
          font-size:1rem;
        }
        .hero-stats span { margin-right:8px; }
        .hero-cta {
          display:inline-block;
          background:linear-gradient(135deg, #ff8c00, #e67600);
          color:#0b0d10;
          padding:1rem 3rem;
          border-radius:60px;
          font-weight:800;
          font-size:1.2rem;
          text-decoration:none;
          box-shadow:0 4px 30px rgba(255,140,0,0.4);
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .hero-cta:hover {
          transform:translateY(-4px);
          box-shadow:0 8px 40px rgba(255,140,0,0.6);
        }

        /* ───── SECTIONS ───── */
        section {
          padding:4rem 1.5rem;
          max-width:1100px;
          margin:0 auto;
        }
        .section-title {
          font-size:2.2rem;
          font-weight:800;
          text-align:center;
          margin-bottom:2.5rem;
          position:relative;
          color:#fff;
        }
        .section-title::after {
          content:'';
          display:block;
          width:70px;
          height:4px;
          background:#ff8c00;
          margin:0.5rem auto 0;
          border-radius:4px;
        }

        /* ───── REWARDS ───── */
        .rewards-grid {
          display:grid;
          grid-template-columns:repeat(auto-fit, minmax(200px,1fr));
          gap:2rem;
        }
        .reward-card {
          background:rgba(255,255,255,0.04);
          backdrop-filter:blur(6px);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:28px;
          padding:2rem 1.2rem;
          text-align:center;
          transition:transform 0.25s, border-color 0.25s;
        }
        .reward-card:hover {
          transform:translateY(-8px);
          border-color:#ff8c00;
        }
        .reward-icon { font-size:3rem; margin-bottom:0.5rem; }
        .reward-card h3 { font-size:1.4rem; font-weight:800; color:#fff; }
        .reward-card p { color:#aaa; font-size:0.9rem; }

        /* ───── HOW IT WORKS ───── */
        .steps {
          display:flex;
          flex-direction:column;
          gap:1.8rem;
          max-width:700px;
          margin:0 auto;
        }
        .step {
          display:flex;
          align-items:flex-start;
          gap:1.5rem;
          background:rgba(255,255,255,0.03);
          border-left:4px solid #ff8c00;
          padding:1.5rem 2rem;
          border-radius:16px;
        }
        .step-number {
          width:48px; height:48px;
          background:#ff8c00;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:900;
          font-size:1.4rem;
          color:#0b0d10;
          flex-shrink:0;
        }
        .step-content h3 {
          font-size:1.2rem;
          font-weight:700;
          color:#fff;
          margin-bottom:0.2rem;
        }
        .step-content p {
          color:#bbb;
          font-size:0.95rem;
        }

        /* ───── TERMS ───── */
        .terms-content {
          background:rgba(255,255,255,0.04);
          padding:2rem;
          border-radius:24px;
          border:1px solid rgba(255,255,255,0.06);
        }
        .terms-content ul {
          list-style:none;
          padding:0;
        }
        .terms-content ul li {
          padding:0.6rem 0 0.6rem 2rem;
          position:relative;
          color:#ccc;
          border-bottom:1px solid rgba(255,255,255,0.04);
        }
        .terms-content ul li::before {
          content:'▸';
          position:absolute;
          left:0;
          color:#ff8c00;
          font-weight:700;
        }
        .terms-content ul li:last-child { border-bottom:none; }

        /* ───── CLAIM FORM ───── */
        .claim-section { padding-bottom:5rem; }
        .claim-card {
          background:rgba(255,255,255,0.05);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:36px;
          padding:2.8rem 2.2rem;
          max-width:560px;
          margin:0 auto;
          box-shadow:0 20px 60px rgba(0,0,0,0.5);
        }
        .claim-card h2 {
          font-size:2rem;
          font-weight:800;
          text-align:center;
          color:#fff;
          margin-bottom:0.2rem;
        }
        .claim-card > p {
          text-align:center;
          color:#aaa;
          margin-bottom:2rem;
        }
        .form-group { margin-bottom:1.4rem; }
        .form-group label {
          display:block;
          font-weight:600;
          font-size:0.9rem;
          color:#ddd;
          margin-bottom:0.3rem;
        }
        .form-group .required { color:#ff4444; }
        .form-group input,
        .form-group select {
          width:100%;
          padding:0.9rem 1rem;
          background:rgba(0,0,0,0.5);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:14px;
          color:#fff;
          font-size:1rem;
          outline:none;
          transition:border-color 0.2s;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color:#ff8c00;
        }
        .form-group input.error {
          border-color:#ff4444;
        }
        .checkbox-group {
          display:flex;
          align-items:flex-start;
          gap:12px;
        }
        .checkbox-group input {
          width:20px; height:20px;
          margin-top:2px;
          accent-color:#ff8c00;
          flex-shrink:0;
        }
        .checkbox-group label {
          font-size:0.85rem;
          color:#ccc;
        }
        .checkbox-group label a {
          color:#ff8c00;
          text-decoration:none;
        }
        .form-error {
          color:#ff4444;
          font-size:0.85rem;
          margin:0.5rem 0;
        }
        .claim-btn {
          width:100%;
          padding:1rem;
          background:linear-gradient(135deg, #ff8c00, #e67600);
          border:none;
          border-radius:60px;
          font-weight:800;
          font-size:1.1rem;
          color:#0b0d10;
          cursor:pointer;
          transition:transform 0.2s, box-shadow 0.2s;
          box-shadow:0 4px 20px rgba(255,140,0,0.3);
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
        }
        .claim-btn:hover:not(:disabled) {
          transform:translateY(-3px);
          box-shadow:0 8px 30px rgba(255,140,0,0.5);
        }
        .claim-btn:disabled {
          opacity:0.6;
          cursor:not-allowed;
          transform:none;
        }
        .spinner {
          display:inline-block;
          width:20px; height:20px;
          border:3px solid rgba(0,0,0,0.2);
          border-top-color:#0b0d10;
          border-radius:50%;
          animation:spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .form-footnote {
          font-size:0.75rem;
          color:#888;
          text-align:center;
          margin-top:1rem;
        }

        /* ───── FOOTER ───── */
        .site-footer {
          background:rgba(0,0,0,0.5);
          border-top:1px solid rgba(255,255,255,0.05);
          padding:2.5rem 1.5rem;
          text-align:center;
        }
        .footer-container {
          max-width:1100px;
          margin:0 auto;
        }
        .footer-container p {
          font-size:0.8rem;
          color:#777;
          margin-bottom:0.3rem;
        }
        .footer-contact { font-weight:600; }
        .footer-socials {
          margin-top:0.8rem;
          display:flex;
          justify-content:center;
          gap:1.8rem;
          font-size:1.6rem;
        }

        /* ───── WEBVIEW MODAL ───── */
        .modal-overlay {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.92);
          backdrop-filter:blur(16px);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:9999;
        }
        .modal-card {
          background:#1a1c22;
          border-radius:36px;
          padding:2.8rem 2rem;
          max-width:420px;
          width:90%;
          text-align:center;
          border:1px solid rgba(255,140,0,0.2);
          box-shadow:0 20px 50px rgba(0,0,0,0.6);
        }
        .modal-icon { font-size:3.2rem; margin-bottom:0.5rem; }
        .modal-card h2 {
          font-size:1.6rem;
          font-weight:800;
          color:#fff;
          margin-bottom:0.5rem;
        }
        .modal-card p {
          color:#aaa;
          margin-bottom:1.8rem;
        }
        .modal-actions {
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          justify-content:center;
        }
        .modal-btn {
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.1);
          padding:0.7rem 1.5rem;
          border-radius:60px;
          font-weight:600;
          color:#fff;
          cursor:pointer;
          transition:0.2s;
          flex:1;
          min-width:120px;
        }
        .modal-btn:hover { background:rgba(255,255,255,0.15); }
        .modal-btn.primary {
          background:#ff8c00;
          border:none;
          color:#0b0d10;
        }
        .modal-btn.primary:hover { background:#e67600; }
        .modal-btn.ghost {
          background:transparent;
          border:none;
          color:#888;
          margin-top:0.5rem;
          font-size:0.8rem;
        }
        .modal-btn.ghost:hover { color:#fff; }

        /* ───── RESPONSIVE ───── */
        @media (max-width:768px) {
          .hero-section { min-height:70vh; background-attachment:scroll; }
          .hero-stats { gap:1rem; }
          .hero-stats div { font-size:0.85rem; padding:0.4rem 1.2rem; }
          .claim-card { padding:2rem 1.2rem; }
          .rewards-grid { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:480px) {
          .header-container { flex-wrap:wrap; gap:0.5rem; }
          .uid-badge { display:none; }
          .site-header { padding:0.5rem 1rem; }
          .hero-cta { font-size:1rem; padding:0.8rem 2rem; }
          .claim-card h2 { font-size:1.5rem; }
          .steps { gap:1rem; }
          .step { padding:1rem; }
          .rewards-grid { grid-template-columns:1fr; }
          .section-title { font-size:1.6rem; }
        }
      `}} />
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

export default withCampaignMeta(PubgUcGiveawayV1, defaultMeta);