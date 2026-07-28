// pages/templates/download-your-files.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
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
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Handle download click ──
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
          <span className="logo-icon">📥</span>
          <span className="logo-text">File<span>Hub</span></span>
        </div>
        <div className="header-badge">🔒 Secure</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">📂 FILE READY</div>
          <h1>{campaign?.title || 'Download Your Files'}</h1>
          <p>
            {campaign?.description ||
              'Complete the tasks below to unlock your download.'}
          </p>
          <div className="hero-stats">
            <div><span>📁</span> File Ready</div>
            <div><span>🔒</span> Secure</div>
            <div><span>⚡</span> Instant</div>
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD CARD ─── */}
      <section className="download-section">
        <div className="download-card">

          {/* File Icon */}
          <div className="file-icon-wrapper">
            <span className="file-icon">📄</span>
          </div>

          {/* File Name */}
          <h2 className="file-name">{campaign?.file_name || 'Your File'}</h2>

          {/* Progress Steps */}
          <div className="progress-steps">
            <div className="progress-step completed">
              <div className="step-circle">✓</div>
              <div className="step-line"></div>
              <span className="step-label">File Ready</span>
            </div>
            <div className="progress-step active">
              <div className="step-circle">🔓</div>
              <div className="step-line"></div>
              <span className="step-label">Complete Tasks</span>
            </div>
            <div className="progress-step">
              <div className="step-circle">⬇️</div>
              <div className="step-line"></div>
              <span className="step-label">Download</span>
            </div>
          </div>

          {/* Download Button */}
          <button
            className="download-btn"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Redirecting...
              </>
            ) : (
              'Download Now →'
            )}
          </button>

          <p className="secure-note">🔒 Your download is secure and private.</p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">📋 How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Complete Tasks</h3>
              <p>Finish the required tasks to verify your identity.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Unlock File</h3>
              <p>Your file is unlocked instantly after task completion.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Download</h3>
              <p>Download your file safely and securely.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">What tasks do I need to complete?</div>
            <div className="faq-answer">You'll be shown a list of simple tasks to complete. Once done, your download will unlock.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Is my file safe?</div>
            <div className="faq-answer">Yes, all files are hosted securely. Your download is private and protected.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How long does it take?</div>
            <div className="faq-answer">Most tasks take less than 2 minutes to complete.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What if I have issues?</div>
            <div className="faq-answer">Contact support and we'll help you resolve any issues.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 FileHub. All rights reserved.</p>
        <p className="footer-contact">Questions? support@filehub.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f0f4f8;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f0f4f8;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(37, 99, 235, 0.1);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; color: #2563EB; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #2563EB; }
        .header-badge {
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(37, 99, 235, 0.2);
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
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #1a1a2e;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563EB' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(37, 99, 235, 0.12);
          border: 1px solid rgba(37, 99, 235, 0.2);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #2563EB;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2.2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
          color: #1a1a2e;
        }
        .hero p {
          font-size: 1.05rem;
          color: #4b5563;
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
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(0,0,0,0.06);
          font-weight: 600;
          font-size: 0.85rem;
          color: #4b5563;
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Download Section ── */
        .download-section {
          padding: 2rem 1.5rem;
          max-width: 640px;
          margin: -2rem auto 2rem;
          position: relative;
          z-index: 10;
        }
        .download-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
          text-align: center;
        }

        .file-icon-wrapper {
          width: 100px;
          height: 100px;
          background: #eff6ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.5rem;
          box-shadow: 0 8px 32px rgba(37, 99, 235, 0.12);
        }
        .file-icon {
          font-size: 3.5rem;
          color: #2563EB;
        }

        .file-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 1.5rem;
        }

        /* Progress Steps */
        .progress-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 2rem;
          padding: 0 0.5rem;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }
        .step-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: 700;
          background: #e5e7eb;
          color: #9ca3af;
          transition: all 0.3s;
          z-index: 2;
          position: relative;
        }
        .step-line {
          position: absolute;
          top: 24px;
          left: 50%;
          right: -50%;
          height: 3px;
          background: #e5e7eb;
          z-index: 1;
        }
        .progress-step:last-child .step-line {
          display: none;
        }
        .progress-step.completed .step-circle {
          background: #22C55E;
          color: #fff;
        }
        .progress-step.completed .step-line {
          background: #22C55E;
        }
        .progress-step.active .step-circle {
          background: #2563EB;
          color: #fff;
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.15);
        }
        .progress-step.active .step-line {
          background: #2563EB;
        }
        .step-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #6b7280;
          margin-top: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .progress-step.completed .step-label {
          color: #22C55E;
        }
        .progress-step.active .step-label {
          color: #2563EB;
        }

        /* Download Button */
        .download-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(37, 99, 235, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .download-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 36px rgba(37, 99, 235, 0.35);
        }
        .download-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .secure-note {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 1rem;
        }

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
          background: linear-gradient(90deg, #2563EB, #1D4ED8);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .step {
          background: #fff;
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          border: 1px solid #eef2f6;
          transition: transform 0.2s;
        }
        .step:hover {
          transform: translateY(-4px);
        }
        .step-number {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 auto 0.6rem;
        }
        .step-content h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .step-content p {
          font-size: 0.85rem;
          color: #888;
        }

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
          border: 1px solid #eef2f6;
          transition: border-color 0.2s;
        }
        .faq-item:hover {
          border-color: #2563EB;
        }
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
          margin-top: auto;
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
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
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
          border: 1px solid rgba(37, 99, 235, 0.15);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }
        .modal-icon {
          font-size: 3rem;
          margin-bottom: 0.3rem;
        }
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
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
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
        .modal-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .modal-btn.primary {
          background: #2563EB;
          border: none;
        }
        .modal-btn.primary:hover {
          background: #1D4ED8;
        }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.7rem;
          margin-top: 0.3rem;
        }
        .modal-btn.ghost:hover {
          color: #fff;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .steps {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }
          .hero-stats {
            gap: 0.8rem;
          }
          .hero-stats div {
            font-size: 0.75rem;
            padding: 0.3rem 1rem;
          }
          .download-card {
            padding: 1.8rem 1.2rem;
          }
          .file-icon-wrapper {
            width: 80px;
            height: 80px;
          }
          .file-icon {
            font-size: 2.8rem;
          }
          .file-name {
            font-size: 1.3rem;
          }
          .step-circle {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }
          .step-line {
            top: 20px;
          }
          .step-label {
            font-size: 0.6rem;
          }
        }
        @media (max-width: 480px) {
          .header-badge {
            font-size: 0.55rem;
            padding: 0.2rem 0.8rem;
          }
          .hero h1 {
            font-size: 1.8rem;
          }
          .site-header {
            padding: 0.5rem 1rem;
          }
          .download-section {
            padding: 1rem 1rem;
          }
          .progress-steps {
            flex-direction: column;
            gap: 0.3rem;
          }
          .step-line {
            display: none !important;
          }
          .progress-step {
            flex-direction: row;
            gap: 0.8rem;
            width: 100%;
          }
          .step-label {
            margin-top: 0;
          }
          .download-btn {
            font-size: 1rem;
            padding: 0.8rem;
          }
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