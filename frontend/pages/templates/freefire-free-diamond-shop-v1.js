// pages/templates/freefire-free-diamond-shop-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

function FreefireFreeDiamondShopV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query; // campaign ID from URL (e.g. ?id=abc123)

  // ── State (same as original HTML) ──
  const [uid, setUid] = useState('');
  const [loggedUid, setLoggedUid] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMode, setCurrentMode] = useState('purchase');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUid, setModalUid] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [toast, setToast] = useState('');
  const [isWebView, setIsWebView] = useState(false);

  // ── Detect WebView (same logic as original HTML) ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined');
    setIsWebView(isWebView);
  }, []);

  // ── Generate a random redeem code (same as original) ──
  const generateRedeemCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  // ── Initialize redeem code on mount ──
  useEffect(() => {
    setRedeemCode(generateRedeemCode());
  }, []);

  // ── Helpers ──
  const isValidUID = (uid) => /^\d{9,12}$/.test(uid);
  const isValidCode = (code) => /^[A-Za-z0-9]{12}$/.test(code);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ── Login ──
  const handleLogin = () => {
    if (!isValidUID(uid)) {
      showToast('Invalid UID Check Again');
      return;
    }
    setLoggedUid(uid);
    setIsLoggedIn(true);
    showToast(`Logged in as ${uid}`);
  };

  // ── Toggle purchase / redeem ──
  const handleToggle = (mode) => {
    setCurrentMode(mode);
    if (mode === 'redeem') {
      setRedeemCode(generateRedeemCode());
    }
  };

  // ── Open modal ──
  const openModal = (item) => {
    setSelectedItem(item);
    setModalUid('');
    setSuccessMessage('');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // ── CONTINUE BUTTON: redirect to /tasks?id={campaignId} ──
  const handleContinue = () => {
    if (!isValidUID(modalUid)) {
      showToast('Enter Valid UID');
      return;
    }
    if (!id) {
      showToast('Campaign ID missing in URL');
      return;
    }
    // Redirect to tasks page with the campaign ID (same as Ncell template)
    setSuccessMessage('Redirecting to tasks…');
    setTimeout(() => {
      router.push(`/tasks?id=${id}`);
    }, 1500);
  };

  // ── Diamond packs & deals (identical to original) ──
  const diamondPacks = [25, 100, 310, 520, 1060, 2180, 5600, 11500];
  const specialDeals = [
    { name: 'Weekly Membership', img: 'https://i.postimg.cc/B6h3f7k6/quality-restoration-20260510084158653.jpg?text=Weekly+Pass', id: 'weekly' },
    { name: 'Monthly Membership', img: 'https://i.postimg.cc/N0B8Wd1s/quality-restoration-20260510092518354.jpg?text=Monthly+Pass', id: 'monthly' },
    { name: 'Weekly Lite', img: 'https://i.postimg.cc/Pq7bVYQy/quality-restoration-20260510093054145.jpg?text=Weekly+Lite', id: 'wlite' },
    { name: 'Evo Access 3D', img: 'https://i.postimg.cc/vTcJFWJc/quality-restoration-20260510093721216.jpg?text=Evo+3D', id: 'evo3' },
    { name: 'Evo Access 7D', img: 'https://i.postimg.cc/SstPrnJZ/quality-restoration-20260510093953748.jpg?text=Evo+7D', id: 'evo7' },
    { name: 'Evo Access 30D', img: 'https://i.postimg.cc/0ys9m4gx/quality-restoration-20260510094204645.jpg?text=Evo+30D', id: 'evo30' }
  ];

  // ── Render ──
  return (
    <div className="page-container">

      {/* ── WebView banner (exactly as original HTML) ── */}
      {isWebView && (
        <div className="webview-banner">
          📱 For a better experience, open this page in your browser.
          <button onClick={() => window.location.href = window.location.href}>
            Open in Browser
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo">
          <img
            src="https://i.pinimg.com/736x/55/91/ff/5591ff7e7c75843c885c8a0a4957f167.jpg"
            alt="Garena"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span style={{ fontWeight: 800 }}>eGrowX TopUp</span>
        </div>
        <div className="header-right">
          <div className="uid-display" style={{ display: isLoggedIn ? 'flex' : 'none' }}>
            <i className="fas fa-user-circle"></i> <span>{loggedUid}</span>
          </div>
          <div className="profile-circle"><i className="fas fa-user"></i></div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-container">
        <div className="section-label"><div className="red-box">1</div><span>Login</span></div>
        <div className="login-card">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Player UID"
              inputMode="numeric"
              maxLength="12"
              value={uid}
              onChange={(e) => setUid(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button className="btn-red" onClick={handleLogin}>
              <i className="fas fa-arrow-right"></i> Login
            </button>
          </div>
          <div className="social-icons">
            <div className="social-circle" title="Facebook" onClick={() => showToast('Features Coming Soon')}><i className="fab fa-facebook-f"></i></div>
            <div className="social-circle" title="Google" onClick={() => showToast('Features Coming Soon')}><i className="fab fa-google"></i></div>
            <div className="social-circle" title="X" onClick={() => showToast('Features Coming Soon')}><i className="fab fa-x-twitter"></i></div>
            <div className="social-circle" title="VK" onClick={() => showToast('Features Coming Soon')}><i className="fab fa-vk"></i></div>
          </div>
        </div>

        <div className="section-label"><div className="red-box">2</div><span>Top-up Amount</span></div>
        <div className="toggle-row">
          <button
            className={`toggle-btn ${currentMode === 'purchase' ? 'active' : ''}`}
            onClick={() => handleToggle('purchase')}
          >
            Purchase
          </button>
          <button
            className={`toggle-btn ${currentMode === 'redeem' ? 'active' : ''}`}
            onClick={() => handleToggle('redeem')}
          >
            Redeem
          </button>
        </div>

        {currentMode === 'purchase' && (
          <div className="purchase-section">
            <div className="diamond-grid">
              {diamondPacks.map((num) => (
                <div
                  key={num}
                  className="diamond-card"
                  onClick={() => openModal({ type: 'diamonds', name: `${num} Diamonds`, id: `d${num}` })}
                >
                  <div className="free-tag">FREE</div>
                  <i className="fas fa-gem"></i>
                  <span>{num}</span>
                  <small>Diamonds</small>
                </div>
              ))}
            </div>
            <div className="section-label"><div className="red-box">★</div><span>Special Deals</span></div>
            <div className="deals-grid">
              {specialDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="deal-card"
                  onClick={() => openModal({ type: 'deal', name: deal.name, id: deal.id })}
                >
                  <div className="deal-img">
                    <img
                      src={deal.img}
                      alt={deal.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90'%3E%3Crect width='160' height='90' fill='%23f0f1f4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter,sans-serif' font-size='10' fill='%235a5c63'%3E${deal.name}%3C/text%3E%3C/svg%3E`;
                      }}
                    />
                  </div>
                  <h4>{deal.name}</h4>
                  <button className="get-free-btn">Get Free</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentMode === 'redeem' && (
          <div className="redeem-section active">
            <div className="login-card">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Enter Redeem Code</label>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="12-char code"
                  maxLength="12"
                  value={redeemCode}
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setRedeemCode(val);
                  }}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <button
                className="btn-red"
                style={{ width: '100%', marginTop: '1rem' }}
                onClick={() => {
                  if (!isValidCode(redeemCode)) {
                    showToast('Invalid code (12 characters, A-Z/0-9)');
                    return;
                  }
                  openModal({ type: 'redeem', name: 'Redeem Gift', id: 'redeem123' });
                }}
              >
                Claim Now
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Modal ── */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal-box">
          <h3>Enter your Game UID</h3>
          <input
            type="text"
            placeholder="Uid"
            inputMode="numeric"
            maxLength="12"
            value={modalUid}
            onChange={(e) => setModalUid(e.target.value.replace(/\D/g, ''))}
          />
          <button className="btn-continue" onClick={handleContinue}>Continue</button>
          {successMessage && (
            <div className="uid-result" style={{ display: 'block' }}>
              <strong>{successMessage}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>

      {/* ── Styles (IDENTICAL to original) ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --white: #ffffff;
            --light-bg: #f7f8fa;
            --gray-section: #f0f1f4;
            --border: #e2e4e7;
            --red: #e1302a;
            --red-dark: #c11b1b;
            --text: #1a1a1a;
            --text-secondary: #5a5c63;
            --shadow-sm: 0 2px 8px rgba(0,0,0,0.05);
            --shadow-md: 0 8px 22px rgba(0,0,0,0.08);
            --shadow-lg: 0 16px 36px rgba(0,0,0,0.12);
            --radius: 18px;
            --radius-sm: 10px;
            --radius-btn: 50px;
            --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            --font: 'Inter', system-ui, -apple-system, sans-serif;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            background: var(--white);
            font-family: var(--font);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            -webkit-font-smoothing: antialiased;
            line-height: 1.45;
            overflow-x: hidden;
        }
        .page-container { max-width: 100%; width: 100%; background: var(--white); }
        .app-header {
            background: var(--white);
            border-bottom: 1px solid var(--border);
            padding: 0 1.2rem;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 800;
            font-size: 1.3rem;
            color: var(--red);
        }
        .logo img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 8px;
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }
        .uid-display {
            background: #f2f3f5;
            padding: 0.4rem 1rem;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--text);
            display: none;
            align-items: center;
            gap: 0.4rem;
            border: 1px solid var(--border);
        }
        .profile-circle {
            width: 36px; height: 36px;
            border-radius: 50%;
            background: #f2f3f5;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #5a5c63;
            font-size: 1.2rem;
            cursor: pointer;
            border: 1px solid var(--border);
            transition: all var(--transition);
        }
        .main-container {
            flex: 1;
            max-width: 680px;
            width: 100%;
            margin: 0 auto;
            padding: 1.5rem 1rem 4rem;
        }
        .section-label {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            margin-bottom: 0.8rem;
        }
        .red-box {
            background: var(--red);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.9rem;
            flex-shrink: 0;
        }
        .section-label span { font-weight: 700; font-size: 1rem; color: var(--text); }
        .login-card {
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1.5rem 1.2rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow-sm);
        }
        .input-group { display: flex; gap: 0.5rem; align-items: center; }
        .input-group input {
            flex: 1;
            padding: 0.85rem 1rem;
            border: 1.5px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 0.95rem;
            outline: none;
            background: #fafafa;
        }
        .input-group input:focus { border-color: var(--red); background: white; box-shadow: 0 0 0 3px rgba(225,48,42,0.05); }
        .btn-red {
            background: var(--red);
            color: white;
            border: none;
            padding: 0.85rem 1.5rem;
            border-radius: var(--radius-sm);
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            white-space: nowrap;
            transition: all var(--transition);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .btn-red:hover { background: #c11b1b; box-shadow: 0 4px 12px rgba(225,48,42,0.25); transform: translateY(-1px); }
        .social-icons { display: flex; gap: 0.8rem; margin-top: 1rem; }
        .social-circle {
            width: 40px; height: 40px; border-radius: 50%;
            border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all var(--transition); color: #5a5c63; background: #fafafa;
        }
        .social-circle:hover { background: #e1302a10; border-color: var(--red); color: var(--red); }
        .toggle-row { display: flex; gap: 0.8rem; margin-bottom: 1.8rem; }
        .toggle-btn {
            flex: 1; padding: 0.85rem 1rem; border: 1px solid var(--border);
            border-radius: var(--radius-sm); background: var(--white);
            font-weight: 700; font-size: 0.95rem; cursor: pointer;
            transition: all var(--transition); text-align: center; color: #5a5c63;
        }
        .toggle-btn.active { background: var(--red); color: white; border-color: var(--red); box-shadow: 0 4px 12px rgba(225,48,42,0.25); }
        .toggle-btn:hover:not(.active) { border-color: #b0b4bb; }
        .diamond-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 2rem;
        }
        .diamond-card {
            background: var(--white); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 1rem 0.5rem;
            display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
            cursor: pointer; transition: all var(--transition);
            box-shadow: var(--shadow-sm); position: relative; transform-style: preserve-3d;
        }
        .diamond-card:hover { transform: translateY(-6px) rotateX(2deg); box-shadow: var(--shadow-lg); border-color: #c0c4cc; }
        .free-tag {
            position: absolute; top: 6px; right: 8px; background: #22c55e; color: white;
            font-size: 0.6rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 50px;
        }
        .diamond-card i { font-size: 2rem; color: var(--red); filter: drop-shadow(0 2px 4px rgba(225,48,42,0.3)); }
        .diamond-card span { font-weight: 800; font-size: 0.95rem; }
        .diamond-card small { font-size: 0.7rem; color: var(--text-secondary); }
        .deals-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .deal-card {
            background: var(--white); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 0.8rem; text-align: center;
            box-shadow: var(--shadow-sm); transition: all var(--transition);
            cursor: pointer;
        }
        .deal-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .deal-img {
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #f2f3f5;
            border-radius: var(--radius-sm);
            margin-bottom: 0.6rem;
            overflow: hidden;
        }
        .deal-img img { width: 100%; height: 100%; object-fit: cover; }
        .deal-card h4 { font-weight: 700; font-size: 0.9rem; margin-bottom: 0.1rem; }
        .deal-card .get-free-btn {
            background: var(--red); color: white; border: none;
            padding: 0.4rem 1.2rem; border-radius: 20px; font-weight: 700;
            font-size: 0.7rem; margin-top: 0.5rem; cursor: pointer; transition: 0.2s;
        }
        .deal-card .get-free-btn:hover { background: #c11b1b; box-shadow: 0 2px 8px rgba(225,48,42,0.3); }
        .redeem-section { display: none; }
        .redeem-section.active { display: block; }
        .purchase-section { display: block; }
        .purchase-section.hidden { display: none; }
        .modal-overlay {
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 2000; visibility: hidden; opacity: 0;
            transition: opacity 0.3s, visibility 0s 0.3s;
        }
        .modal-overlay.open { visibility: visible; opacity: 1; transition: opacity 0.3s, visibility 0s; }
        .modal-box {
            background: var(--white); border-radius: var(--radius);
            padding: 2.2rem 1.5rem; max-width: 380px; width: 90%;
            text-align: center; box-shadow: var(--shadow-lg);
            transform: translateY(20px); transition: transform 0.3s;
        }
        .modal-overlay.open .modal-box { transform: translateY(0); }
        .modal-box h3 { font-weight: 800; font-size: 1.4rem; margin-bottom: 1rem; }
        .modal-box input {
            width: 100%; padding: 0.9rem 1rem;
            border: 1.5px solid var(--border); border-radius: var(--radius-sm);
            font-size: 0.95rem; margin: 1rem 0; outline: none;
        }
        .modal-box input:focus { border-color: var(--red); }
        .btn-continue {
            background: var(--red); color: white; border: none;
            width: 100%; padding: 0.9rem; border-radius: var(--radius-sm);
            font-weight: 700; cursor: pointer; margin-top: 0.5rem; transition: 0.2s;
        }
        .btn-continue:hover { background: #c11b1b; }
        .uid-result {
            background: #f9fafb; padding: 0.8rem; border-radius: var(--radius-sm);
            margin-top: 1rem; font-weight: 600; color: var(--text); display: none;
        }
        .uid-result strong { color: black; }
        .toast {
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: #1a1a1a; color: white; padding: 0.8rem 1.8rem;
            border-radius: 50px; font-weight: 600; z-index: 3000;
            opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
        .toast.show { opacity: 1; }
        .webview-banner {
            position: fixed; top:0; left:0; width:100%; background:#1a1a1a; color:#fff;
            text-align:center; padding:12px; z-index:9999; font-family:Inter,sans-serif;
            font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.3);
        }
        .webview-banner button {
            background:#ff6b35; color:#fff; border:none; padding:6px 18px; margin-left:8px;
            border-radius:20px; font-weight:700; cursor:pointer;
        }
        @media (max-width: 480px) {
            .diamond-grid { grid-template-columns: repeat(2, 1fr); }
            .deals-grid { grid-template-columns: 1fr; }
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
export default withCampaignMeta(FreefireFreeDiamondShopV1, {
  title: 'Free Fire Free Diamond Shop',
  description: 'Get free diamonds and exclusive deals for Garena Free Fire.',
  image: 'https://maketrend.vercel.app/og-freefire.jpg',
  url: 'https://maketrend.vercel.app/freefire-free-diamond-shop-v1?id={id}',
});