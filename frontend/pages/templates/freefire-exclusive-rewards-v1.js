// pages/templates/freefire-exclusive-rewards-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

function FreefireExclusiveRewardsV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query; // campaign ID from URL (e.g. ?id=abc123)

  // ── State ──
  const [uid, setUid] = useState('');
  const [codeParts, setCodeParts] = useState(['', '', '']);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [modalUid, setModalUid] = useState('');
  const [uidError, setUidError] = useState('');
  const [toast, setToast] = useState('');
  const [isWebView, setIsWebView] = useState(false);

  const router = useRouter();

  // ── Detect WebView ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    setIsWebView(isWebView);
    if (isWebView) {
      // Auto‑redirect to browser
      const currentUrl = window.location.href;
      if (navigator.userAgent.indexOf('Android') > -1) {
        window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`;
      } else {
        window.open(currentUrl, '_system');
        // Fallback: show a banner
      }
    }
  }, []);

  // ── Generate a random 12‑character code ──
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // ── Set random code on mount ──
  useEffect(() => {
    const code = generateRandomCode();
    setCodeParts([code.slice(0,4), code.slice(4,8), code.slice(8,12)]);
  }, []);

  // ── Helpers ──
  const isValidUid = (uid) => /^\d{5,12}$/.test(uid);

  const showToast = (msg, isError = false) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ── Modal handlers ──
  const handleModalContinue = () => {
    const enteredUid = modalUid.trim();
    if (!enteredUid) {
      setUidError('Please enter your Game UID.');
      return;
    }
    if (!isValidUid(enteredUid)) {
      setUidError('UID must contain only numbers and be at least 5 digits.');
      return;
    }
    setUid(enteredUid);
    setShowModal(false);
    setUidError('');
  };

  // ── Redeem button handler ──
  const handleRedeem = () => {
    if (!uid) {
      showToast('Please enter your Game UID first.');
      return;
    }
    if (isRedeemed) return;
    if (!id) {
      showToast('Campaign ID missing in URL.');
      return;
    }

    const fullCode = codeParts.join('');
    if (fullCode.length !== 12) {
      showToast('Invalid redemption code. Must be 12 characters.');
      return;
    }

    // Simulate redemption success
    setIsRedeemed(true);
    // Redirect after a short delay
    setIsLoading(true);
    setTimeout(() => {
      router.push(`/tasks?id=${id}`);
    }, 1500);
  };

  // ── Handle code input changes ──
  const handleCodeChange = (index, value) => {
    const newParts = [...codeParts];
    newParts[index] = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setCodeParts(newParts);
    // Auto‑advance to next input
    if (newParts[index].length === 4 && index < 2) {
      const nextInput = document.getElementById(`codePart${index + 2}`);
      if (nextInput) nextInput.focus();
    }
  };

  // ── Render ──
  return (
    <div className="page-container">

      {/* ── WebView Banner ── */}
      {isWebView && (
        <div className="webview-banner">
          📱 For a better experience, open this page in your browser.
          <button onClick={() => window.location.href = window.location.href}>
            Open in Browser
          </button>
        </div>
      )}

      {/* ── Main Card ── */}
      <div className="container">
        <div className="redemption-card">
          {/* UID Display */}
          <div className="uid-display-bar">
            <span className="uid-label"><i className="fas fa-id-card"></i> Game UID</span>
            <span className="uid-value">{uid || '—'}</span>
          </div>

          {/* Code Input */}
          <div className="code-section">
            <div className="code-title"><i className="fas fa-ticket-alt"></i> Enter Redemption Code</div>
            <div className="code-input-group">
              <input
                type="text"
                id="codePart1"
                className="code-part"
                maxLength="4"
                placeholder="XXXX"
                value={codeParts[0]}
                onChange={(e) => handleCodeChange(0, e.target.value)}
              />
              <span className="code-dash">—</span>
              <input
                type="text"
                id="codePart2"
                className="code-part"
                maxLength="4"
                placeholder="XXXX"
                value={codeParts[1]}
                onChange={(e) => handleCodeChange(1, e.target.value)}
              />
              <span className="code-dash">—</span>
              <input
                type="text"
                id="codePart3"
                className="code-part"
                maxLength="4"
                placeholder="XXXX"
                value={codeParts[2]}
                onChange={(e) => handleCodeChange(2, e.target.value)}
              />
            </div>
          </div>

          {/* Redeem Button */}
          <button
            className="redeem-btn"
            onClick={handleRedeem}
            disabled={isRedeemed || isLoading}
          >
            {isLoading ? (
              <><i className="fas fa-spinner fa-spin"></i> Processing...</>
            ) : isRedeemed ? (
              <><i className="fas fa-check-circle"></i> Redeemed!</>
            ) : (
              <><i className="fas fa-gift"></i> Redeem</>
            )}
          </button>

          {/* Success Message */}
          {isRedeemed && (
            <div className="redeem-success">
              <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.5rem' }}></i>
              <p style={{ marginTop: '8px' }}>
                🎉 Congratulations! Your code has been successfully redeemed.<br />
                Reward is ready for claiming.
              </p>
              <button className="claim-btn" onClick={() => router.push(`/tasks?id=${id}`)}>
                <i className="fas fa-gift"></i> Claim Reward
              </button>
            </div>
          )}

          {/* Notice Box */}
          <div className="notice-box">
            <div className="notice-title"><i className="fas fa-info-circle"></i> Important Notice:</div>
            <p>1. Redemption code has 12 characters, consisting of capital letters and numbers.</p>
            <p>2. Item rewards are shown in [vault] tab in game lobby; Golds or diamonds will add in account wallet automatically.</p>
            <p>3. Please note redemption expiration date. Any expired codes cannot be redeemed.</p>
            <p>4. Please contact customer service if you encountered any issue.</p>
            <p>5. Reminder: you will not be able to redeem your rewards with guest accounts. You may bind your account to Facebook or VK in order to receive the rewards.</p>
          </div>
        </div>

        <div className="footer">
          <p>Copyright © Garena International. Trademarks belong to their own respects. All rights Reserved.</p>
        </div>
      </div>

      {/* ── UID Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2><i className="fas fa-gamepad"></i> Enter Game UID</h2>
            <p style={{ color: '#ccc', fontSize: '0.8rem' }}>Only numeric digits allowed</p>
            <input
              type="text"
              placeholder="e.g., 123456789"
              maxLength="12"
              inputMode="numeric"
              value={modalUid}
              onChange={(e) => setModalUid(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleModalContinue()}
            />
            {uidError && <div className="error-txt">{uidError}</div>}
            <button onClick={handleModalContinue}>Continue</button>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}

      {/* ── Styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Global Reset ── */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Poppins', 'Inter', system-ui, sans-serif;
          background: #0a0b10;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: url('https://i.postimg.cc/fLM9Nrt5/quality-restoration-20260508164514935.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          position: relative;
        }
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 20% 30%, rgba(0,0,0,0.5), rgba(0,0,0,0.85));
          pointer-events: none;
          z-index: 0;
        }
        .page-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          position: relative;
          z-index: 1;
        }
        .container {
          max-width: 550px;
          width: 100%;
        }

        /* ── Card ── */
        .redemption-card {
          background: rgba(10, 15, 25, 0.88);
          backdrop-filter: blur(12px);
          border-radius: 32px;
          padding: 2rem;
          border: 1px solid rgba(255, 204, 0, 0.15);
          box-shadow: 0 30px 45px -12px rgba(0,0,0,0.6);
          transition: transform 0.2s;
        }

        /* ── UID Display ── */
        .uid-display-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.8rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .uid-label {
          color: #ffcc00;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 1px;
          background: rgba(255,204,0,0.1);
          padding: 0.3rem 0.8rem;
          border-radius: 60px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .uid-value {
          background: #1a1f2e;
          border: 1px solid rgba(255,204,0,0.3);
          padding: 0.5rem 1.2rem;
          border-radius: 60px;
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          font-family: monospace;
          letter-spacing: 0.5px;
          min-width: 80px;
          text-align: center;
        }

        /* ── Code Input ── */
        .code-section {
          margin: 1.5rem 0;
          text-align: center;
        }
        .code-title {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 1rem;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .code-input-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .code-part {
          background: rgba(0,0,0,0.6);
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          padding: 0.8rem;
          width: 100px;
          text-align: center;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          letter-spacing: 2px;
          text-transform: uppercase;
          outline: none;
          transition: 0.3s;
        }
        .code-part:focus {
          border-color: #ffcc00;
          box-shadow: 0 0 0 3px rgba(255,204,0,0.2);
        }
        .code-dash {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffcc00;
          align-self: center;
          user-select: none;
        }
        @media (max-width: 480px) {
          .code-part { width: 75px; padding: 0.6rem; font-size: 0.9rem; }
        }

        /* ── Redeem Button ── */
        .redeem-btn {
          width: 100%;
          background: linear-gradient(135deg, #ffcc00, #ffa500);
          border: none;
          padding: 1.1rem;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #1e1e2a;
          cursor: pointer;
          transition: all 0.25s;
          margin: 1.5rem 0 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 6px 18px rgba(255,204,0,0.3);
        }
        .redeem-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(255,204,0,0.5);
          background: linear-gradient(135deg, #ffb800, #ff8c00);
        }
        .redeem-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ── Success ── */
        .redeem-success {
          background: rgba(16,185,129,0.12);
          border-radius: 20px;
          padding: 1.2rem;
          margin: 1rem 0;
          text-align: center;
          border: 1px solid rgba(16,185,129,0.25);
          animation: fadeInUp 0.4s ease;
        }
        .claim-btn {
          background: #ffcc00;
          border: none;
          padding: 0.7rem 1.8rem;
          border-radius: 60px;
          font-weight: 800;
          color: #1e1e2a;
          cursor: pointer;
          margin-top: 0.8rem;
          transition: 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .claim-btn:hover {
          background: #ffa500;
          transform: translateY(-2px);
        }

        /* ── Notice ── */
        .notice-box {
          background: rgba(0,0,0,0.4);
          border-left: 4px solid #ffcc00;
          padding: 0.8rem 1rem;
          border-radius: 16px;
          margin: 1.2rem 0;
        }
        .notice-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #ffcc00;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .notice-box p {
          font-size: 0.7rem;
          color: #ddd;
          line-height: 1.6;
          margin-bottom: 0.2rem;
        }

        /* ── Footer ── */
        .footer {
          text-align: center;
          font-size: 0.65rem;
          color: #8f9bb3;
          margin-top: 1.2rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 1rem;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }
        .modal-card {
          background: rgba(10, 15, 25, 0.95);
          backdrop-filter: blur(16px);
          border-radius: 36px;
          padding: 2.2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(255,204,0,0.3);
          box-shadow: 0 30px 50px -20px black;
        }
        .modal-card h2 {
          color: #ffcc00;
          margin-bottom: 0.5rem;
          font-weight: 800;
          font-size: 1.4rem;
        }
        .modal-card input {
          width: 100%;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 60px;
          padding: 0.9rem;
          color: white;
          font-size: 1rem;
          text-align: center;
          margin: 0.8rem 0;
          outline: none;
          transition: 0.2s;
        }
        .modal-card input:focus {
          border-color: #ffcc00;
        }
        .modal-card button {
          background: linear-gradient(135deg, #ffcc00, #ffa500);
          border: none;
          padding: 0.8rem 1.8rem;
          border-radius: 60px;
          font-weight: 800;
          color: #1e1e2a;
          cursor: pointer;
          transition: 0.2s;
        }
        .modal-card button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(255,204,0,0.3);
        }
        .error-txt {
          color: #ff6b6b;
          font-size: 0.75rem;
          margin-top: 0.2rem;
        }

        /* ── Toast ── */
        .toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.9);
          color: white;
          padding: 0.8rem 1.8rem;
          border-radius: 60px;
          font-weight: 600;
          z-index: 3000;
          border: 1px solid rgba(255,204,0,0.2);
          animation: fadeInUp 0.3s ease;
        }

        /* ── WebView Banner ── */
        .webview-banner {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: rgba(0,0,0,0.92);
          color: #fff;
          text-align: center;
          padding: 12px;
          z-index: 9999;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
        }
        .webview-banner button {
          background: #ffcc00;
          color: #1a1a2e;
          border: none;
          padding: 6px 20px;
          margin-left: 10px;
          border-radius: 40px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .webview-banner button:hover {
          background: #ffa500;
        }

        /* ── Animations ── */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .redemption-card {
            padding: 1.5rem;
            border-radius: 28px;
          }
          .uid-display-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }
          .uid-value {
            text-align: center;
          }
          .code-title {
            font-size: 0.9rem;
          }
          .redeem-btn {
            font-size: 0.95rem;
            padding: 0.9rem;
          }
          .modal-card {
            padding: 1.5rem;
          }
        }
      `}} />
    </div>
  );
}

// ── SERVER‑SIDE PROPS ──
export async function getServerSideProps({ query }) {
  const campaignId = query.id || query.campaign || null;
  const campaign = campaignId ? await fetchCampaign(campaignId) : null;
  return { props: { campaign } };
}

// ── WRAP WITH META ──
export default withCampaignMeta(FreefireExclusiveRewardsV1, {
  title: 'Free Fire Exclusive Rewards',
  description: 'Redeem exclusive rewards and codes for Garena Free Fire.',
  image: 'https://maketrend.vercel.app/og-freefire-rewards.jpg',
  url: 'https://maketrend.vercel.app/freefire-exclusive-rewards-v1?id={id}',
});