// pages/templates/download-your-files.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta (Clean base URL) ──
const defaultMeta = {
  title: 'Download Your Files – Complete Tasks to Unlock',
  description: 'Get your files by completing a few simple tasks. Safe, secure, and free. Start now!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/download-your-files',
};

function DownloadYourFiles({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  // ── Clean URL if no id parameter is present ──
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

  // ── Handle download click (Instant feedback) ──
  const handleDownload = () => {
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
          <div className="modal-icon-container">
            <span className="modal-icon">🌐</span>
          </div>
          <h2>Action Required</h2>
          <p>For the best experience and to prevent download issues, please open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                const shareUrl = id ? `${window.location.origin}/download-your-files?id=${id}` : `${window.location.origin}/download-your-files`;
                navigator.clipboard?.writeText(shareUrl);
                alert('Link copied! Open Chrome/Safari and paste it.');
                setShowWebViewModal(false);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy Link
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              Open in Browser
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
            <div className="logo-icon-bg"><span className="logo-icon">📦</span></div>
            <span className="logo-text">Make<span>Trend</span></span>
          </div>
          <div className="header-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            100% Secure
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
              <span className="pulse-dot"></span> FILE IS READY
            </div>
          </div>
          <h1>{campaign?.title || 'Download Your Files'}</h1>
          <p>
            {campaign?.description ||
              'Complete the required verification steps below to securely unlock and download your files instantly.'}
          </p>
          <div className="hero-stats">
            <div className="stat-pill"><span className="stat-icon">⚡</span> Instant Delivery</div>
            <div className="stat-pill"><span className="stat-icon">🛡️</span> Virus Scanned</div>
            <div className="stat-pill"><span className="stat-icon">🆓</span> 100% Free</div>
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD CARD ─── */}
      <section className="download-section">
        <div className="download-card">
          {/* File Icon */}
          <div className="file-icon-wrapper">
            <div className="file-icon-bg"></div>
            <span className="file-icon">📁</span>
          </div>

          {/* File Name */}
          <h2 className="file-name">{campaign?.file_name || 'Secure_Package.zip'}</h2>
          <div className="file-meta">
            <span>Size: <strong>Unknown</strong></span>
            <span className="dot-sep">•</span>
            <span className="status-text success">Ready to unlock</span>
          </div>

          {/* Progress Steps */}
          <div className="progress-container">
            <div className="progress-steps">
              <div className="progress-step completed">
                <div className="step-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                <div className="step-line"></div>
                <span className="step-label">File Found</span>
              </div>
              <div className="progress-step active">
                <div className="step-circle pulse">2</div>
                <div className="step-line"></div>
                <span className="step-label">Verify</span>
              </div>
              <div className="progress-step">
                <div className="step-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m7-7l5 5 5-5m-5 5V3"/></svg></div>
                <span className="step-label">Download</span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            className={`download-btn ${loading ? 'loading' : ''}`}
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> 
                <span>Redirecting securely...</span>
              </>
            ) : (
              <>
                <span>Unlock & Download Now</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>

          <p className="secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Your download is encrypted and secure.
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get your files in three simple steps</p>
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-icon-wrap">
              <span className="step-number">1</span>
            </div>
            <h3>Click Download</h3>
            <p>Click the unlock button above to initiate the secure verification process.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrap">
              <span className="step-number">2</span>
            </div>
            <h3>Complete Tasks</h3>
            <p>Follow the quick instructions to verify you are a real human, not a bot.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrap">
              <span className="step-number">3</span>
            </div>
            <h3>Get Your File</h3>
            <p>Once verified, your file download will begin instantly and securely.</p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">What tasks do I need to complete?</div>
              <div className="faq-answer">You will be presented with a few simple tasks like subscribing or viewing content. Once completed, the download unlocks automatically.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">Is my file safe?</div>
              <div className="faq-answer">Yes, all files are hosted securely and scanned for threats. Your connection is encrypted and private.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">How long does verification take?</div>
              <div className="faq-answer">Usually less than 2 minutes. The system verifies your completion in real-time.</div>
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-icon">?</div>
            <div>
              <div className="faq-question">What if I have issues?</div>
              <div className="faq-answer">If your download doesn't start, ensure you have completed all tasks or try refreshing the page.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="logo footer-logo">
            <span className="logo-icon">📦</span> Make<span>Trend</span>
          </div>
          <p>© {new Date().getFullYear()} MakeTrend. All rights reserved.</p>
          <p className="footer-contact">Protected by industry-standard encryption.</p>
        </div>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: #6366f1;
          --primary-dark: #4f46e5;
          --primary-light: #e0e7ff;
          --bg-main: #f8fafc;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --success: #10b981;
          --card-bg: #ffffff;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        body { background: var(--bg-main); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
        
        .page-wrapper {
          max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding: 1rem 1.5rem;
        }
        .header-container {
          max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;
        }
        .logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
        .logo-icon-bg { background: var(--primary-light); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .logo-icon { font-size: 1.1rem; }
        .logo-text { color: var(--text-main); }
        .logo-text span { color: var(--primary); }
        .header-badge {
          background: #ecfdf5; color: #059669; font-weight: 700; font-size: 0.7rem;
          padding: 0.4rem 0.8rem; border-radius: 40px; display: flex; align-items: center; gap: 4px;
          border: 1px solid #d1fae5;
        }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 45vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 4rem 1.5rem 6rem; overflow: hidden;
          background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
        }
        .hero-glow {
          position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.4; z-index: 1;
        }
        .shape-1 { width: 400px; height: 400px; background: #818cf8; top: -100px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #c084fc; bottom: -50px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1.2rem; }
        .hero-badge {
          background: #fff; border: 1px solid rgba(99, 102, 241, 0.2); padding: 0.4rem 1rem;
          border-radius: 40px; font-size: 0.7rem; font-weight: 800; color: var(--primary-dark);
          display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          letter-spacing: 0.5px;
        }
        .pulse-dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; display: block; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1rem; color: #0f172a; letter-spacing: -1px; }
        .hero p { font-size: 1.1rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        
        .hero-stats { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
        .stat-pill { background: rgba(255,255,255,0.6); padding: 0.5rem 1rem; border-radius: 40px; border: 1px solid rgba(255,255,255,0.8); font-weight: 600; font-size: 0.85rem; color: var(--text-muted); backdrop-filter: blur(4px); display: flex; align-items: center; gap: 6px; }

        /* ── Download Card ── */
        .download-section { padding: 0 1.5rem; max-width: 680px; margin: -4rem auto 3rem; position: relative; z-index: 10; }
        .download-card {
          background: var(--card-bg); border-radius: 24px; padding: 3rem 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02); text-align: center;
        }

        .file-icon-wrapper { position: relative; width: 110px; height: 110px; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; animation: float 6s ease-in-out infinite; }
        .file-icon-bg { position: absolute; inset: 0; background: linear-gradient(135deg, var(--primary-light), #c7d2fe); border-radius: 30px; transform: rotate(-10deg); opacity: 0.5; transition: 0.3s; }
        .file-icon { font-size: 4rem; position: relative; z-index: 2; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

        .file-name { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem; word-break: break-all; }
        .file-meta { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2rem; }
        .dot-sep { color: #cbd5e1; }
        .status-text.success { color: var(--success); font-weight: 600; }

        /* Progress Steps */
        .progress-container { background: #f8fafc; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #f1f5f9; }
        .progress-steps { display: flex; align-items: center; justify-content: space-between; position: relative; }
        .progress-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; z-index: 2; }
        .step-circle { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; background: #fff; color: #94a3b8; border: 2px solid #e2e8f0; transition: all 0.3s; z-index: 2; }
        .step-circle svg { width: 20px; height: 20px; }
        .step-line { position: absolute; top: 20px; left: 50%; width: 100%; height: 3px; background: #e2e8f0; z-index: 1; }
        
        .progress-step.completed .step-circle { background: var(--success); border-color: var(--success); color: #fff; }
        .progress-step.completed .step-line { background: var(--success); }
        
        .progress-step.active .step-circle { border-color: var(--primary); color: var(--primary); background: #fff; box-shadow: 0 0 0 4px var(--primary-light); }
        .step-circle.pulse { animation: pulse-border 2s infinite; }
        @keyframes pulse-border { 0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); } 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); } }
        
        .step-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-top: 0.5rem; }
        .progress-step.completed .step-label { color: var(--text-main); }
        .progress-step.active .step-label { color: var(--primary); }

        /* Download Button */
        .download-btn {
          width: 100%; padding: 1.1rem; background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; color: #fff; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
          display: flex; align-items: center; justify-content: center; gap: 10px; position: relative; overflow: hidden;
        }
        .download-btn::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg); animation: shine 3s infinite;
        }
        @keyframes shine { 0% { left: -100%; } 20% { left: 200%; } 100% { left: 200%; } }
        
        .download-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.5); }
        .download-btn:active:not(:disabled) { transform: translateY(0); }
        .download-btn.loading { opacity: 0.8; cursor: wait; }
        .download-btn.loading::after { display: none; }

        .spinner { width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .secure-note { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-top: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 6px; }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 2.5rem; }
        .section-title { font-size: 1.8rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; }
        .section-subtitle { font-size: 1rem; color: var(--text-muted); margin-top: 0.3rem; }

        /* ── How It Works ── */
        .how-section { padding: 4rem 1.5rem; max-width: 1000px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .step-card { background: #fff; padding: 2rem 1.5rem; border-radius: 24px; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: all 0.3s; }
        .step-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--primary-light); }
        .step-icon-wrap { width: 56px; height: 56px; background: var(--primary-light); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; color: var(--primary); font-weight: 900; font-size: 1.4rem; transform: rotate(-5deg); transition: 0.3s; }
        .step-card:hover .step-icon-wrap { transform: rotate(0) scale(1.1); background: var(--primary); color: #fff; }
        .step-card h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.9rem; color: var(--text-muted); }

        /* ── FAQ ── */
        .faq-section { padding: 4rem 1.5rem 6rem; max-width: 800px; margin: 0 auto; }
        .faq-grid { display: flex; flex-direction: column; gap: 1.2rem; }
        .faq-item { background: #fff; border-radius: 20px; padding: 1.5rem; border: 1px solid #f1f5f9; display: flex; gap: 1.2rem; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
        .faq-item:hover { border-color: var(--primary-light); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03); }
        .faq-icon { width: 32px; height: 32px; flex-shrink: 0; background: var(--bg-main); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--primary); }
        .faq-question { font-weight: 800; font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.4rem; }
        .faq-answer { font-size: 0.95rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #fff; border-top: 1px solid #e2e8f0; padding: 3rem 1.5rem; text-align: center; margin-top: auto; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
        .footer-logo { font-size: 1.1rem; filter: grayscale(1); opacity: 0.5; margin-bottom: 0.5rem; }
        .site-footer p { font-size: 0.85rem; color: var(--text-muted); }
        .footer-contact { font-weight: 600; color: #94a3b8; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 28px; padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        .modal-icon-container { width: 64px; height: 64px; background: #eff6ff; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; }
        .modal-icon { font-size: 2rem; }
        .modal-card h2 { font-size: 1.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.5rem; letter-spacing: -0.5px; }
        .modal-card p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-btn { padding: 1rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .modal-btn.primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        .modal-btn.primary:hover { background: var(--primary-dark); transform: translateY(-2px); }
        .modal-btn.ghost { background: var(--bg-main); color: var(--text-main); border: 1px solid #e2e8f0; }
        .modal-btn.ghost:hover { background: #e2e8f0; }
        .modal-btn.text-only { background: transparent; color: #94a3b8; font-size: 0.8rem; margin-top: 1rem; }
        .modal-btn.text-only:hover { color: var(--text-main); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .steps { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; gap: 1.2rem; }
          .download-section { margin-top: -2.5rem; }
          .download-card { padding: 2rem 1.5rem; }
          .file-name { font-size: 1.3rem; }
          .progress-container { padding: 1rem; }
          .step-label { font-size: 0.65rem; }
          .hero { padding-top: 2rem; }
          .hero h1 { font-size: 2.2rem; }
          .stat-pill { font-size: 0.75rem; padding: 0.4rem 0.8rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.65rem; padding: 0.3rem 0.6rem; }
          .logo { font-size: 1.1rem; }
          .download-card { border-radius: 20px; }
          .file-icon-wrapper { width: 90px; height: 90px; }
          .file-icon { font-size: 3rem; }
          .download-btn { font-size: 1rem; padding: 1rem; }
          .faq-item { padding: 1.2rem; flex-direction: column; gap: 0.8rem; }
          .faq-icon { width: 28px; height: 28px; font-size: 0.9rem; }
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
export default withCampaignMeta(DownloadYourFiles, defaultMeta);