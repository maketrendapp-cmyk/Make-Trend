// pages/templates/tonde-gamer-lucky-spin-v1.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Wheel data (10 segments) ──
const WHEEL_ITEMS = [
  { name: 'Magic Cube', imgURL: 'https://staticg.sportskeeda.com/editor/2022/10/ea3ac-16658218866013-1920.jpg', fallback: '🎲' },
  { name: 'Sakura Bundle', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxieMJvf0s-lsR5k1qhVHy6vV0TNkvMJUvQS288XpbrGQ7cqZLltNKHt4&s=10', fallback: '🔫' },
  { name: 'Red Criminal', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjionZzqgeIx4UsPzPi9ieAk76uJZtJVCygPCptzc01g&s=10', fallback: '⏳' },
  { name: 'S1 Heroic T-shirt', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1wcCrF20ad3ffizJTsAMi0pgarE5Wx3pp2-WrqZraqQ&s=10', fallback: '🎉' },
  { name: 'Pumpkin Gloo', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcyZ3swx626FcVvFhvsvD16HI4LWW2LL1RrRc1wD7xzKOT3CXbEf_q870&s=10', fallback: '🧱' },
  { name: 'Angel Wings', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvpraxq4XbrwLZVFd2iq6Lo7BU3fmFRJzYNxWtt_Z1bSJHXs8zv_03ET_U&s=10', fallback: '🎧' },
  { name: 'Draco AK', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ126d716Yk1XYMnwKrynYlxuySqng19emzXENPdmWoGZRvRQYZmYC2V4zH&s=10', fallback: '💎' },
  { name: 'Push-Up Emote', imgURL: 'https://staticg.sportskeeda.com/editor/2022/01/7c755-16430916800365-1920.jpg?w=640', fallback: '⚔️' },
  { name: '10000 Diamonds', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkAhQlS9VI48rcPI4duW8ywuUHorZ8AEJ-liG7JyotJiTmpQS0UYKZoZTV&s=10', fallback: '🎫' },
  { name: 'HipHop', imgURL: 'https://i.postimg.cc/SRGhjn8t/quality-restoration-20260523115249617.png', fallback: '🎒' },
];

const SHOWCASE_ITEMS = [
  { name: 'HipHop Bundle', imgURL: 'https://techgenyz.com/wp-content/uploads/2022/12/Free-Fire-Golden-Hip-Hop-Bundle.jpg', fallback: '🎒' },
  { name: 'Draco AK', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ126d716Yk1XYMnwKrynYlxuySqng19emzXENPdmWoGZRvRQYZmYC2V4zH&s=10', fallback: '💎' },
  { name: 'Push-Up Emote', imgURL: 'https://staticg.sportskeeda.com/editor/2022/01/7c755-16430916800365-1920.jpg?w=640', fallback: '⚔️' },
  { name: '10000 Diamonds', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkAhQlS9VI48rcPI4duW8ywuUHorZ8AEJ-liG7JyotJiTmpQS0UYKZoZTV&s=10', fallback: '🎫' },
  { name: 'Red Criminal', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjionZzqgeIx4UsPzPi9ieAk76uJZtJVCygPCptzc01g&s=10', fallback: '⏳' },
  { name: 'Sakura Bundle', imgURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxieMJvf0s-lsR5k1qhVHy6vV0TNkvMJUvQS288XpbrGQ7cqZLltNKHt4&s=10', fallback: '🔫' },
];

const STORAGE_KEY = 'TondeGamerLuckySpin_FinalV2';

function TondeGamerLuckySpinV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [uid, setUid] = useState('');
  const [entryUid, setEntryUid] = useState('');
  const [uidError, setUidError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spinCompleted, setSpinCompleted] = useState(false);
  const [savedPrizeIndex, setSavedPrizeIndex] = useState(null);
  const [forcePrizeIndex, setForcePrizeIndex] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [winningPrize, setWinningPrize] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [systemRotation, setSystemRotation] = useState(0);
  const [cachedImages, setCachedImages] = useState([]);
  const [assetsLoaded, setAssetsLoaded] = useState(0);
  const [showEntry, setShowEntry] = useState(true);


  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Detect WebView ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) {
      setShowWebViewModal(true);
    }
  }, []);


  // ── Load persistent data ──
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.uid && /^\d{8,11}$/.test(data.uid)) {
          setUid(data.uid);
          setSpinCompleted(data.spinCompleted === true);
          setSavedPrizeIndex(data.prizeIndex !== undefined ? data.prizeIndex : null);
          if (data.spinCompleted && data.prizeIndex !== null) {
            setSpinCompleted(false);
            setForcePrizeIndex(true);
          } else {
            setForcePrizeIndex(false);
          }
          setIsAuthenticated(true);
          setShowEntry(false);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // ── Preload images ──
  useEffect(() => {
    const imgs = [];
    let loaded = 0;
    WHEEL_ITEMS.forEach((item, idx) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        imgs[idx] = img;
        loaded++;
        setAssetsLoaded(loaded);
        if (loaded === WHEEL_ITEMS.length) {
          setCachedImages([...imgs]);
        }
      };
      img.onerror = () => {
        imgs[idx] = null;
        loaded++;
        setAssetsLoaded(loaded);
        if (loaded === WHEEL_ITEMS.length) {
          setCachedImages([...imgs]);
        }
      };
      img.src = item.imgURL;
    });
  }, []);

  // ── Draw wheel (takes optional rotation) ──
  const drawWheel = useCallback((rotation = systemRotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure proper canvas internal resolution
    if (canvas.width !== 500 || canvas.height !== 500) {
      canvas.width = 500;
      canvas.height = 500;
    }

    const ctx = canvas.getContext('2d');
    const total = WHEEL_ITEMS.length;
    const angleStep = (Math.PI * 2) / total;
    const center = canvas.width / 2;
    const outerR = canvas.width / 2 - 8;
    const innerR = 70;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer glow
    for (let i = 0; i < total; i++) {
      const start = i * angleStep + rotation;
      const end = (i + 1) * angleStep + rotation;
      ctx.beginPath();
      ctx.arc(center, center, outerR + 4, start, end);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255, 170, 50, 0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffaa33';
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (let i = 0; i < total; i++) {
      const start = i * angleStep + rotation;
      const end = (i + 1) * angleStep + rotation;
      ctx.beginPath();
      ctx.arc(center, center, outerR, start, end);
      ctx.arc(center, center, innerR, end, start, true);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(
        center + 50, center - 50,
        center - 50, center + 50
      );
      gradient.addColorStop(0, i % 2 === 0 ? '#2D1B69' : '#401E7A');
      gradient.addColorStop(1, i % 2 === 0 ? '#1A0E44' : '#2C1660');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#FFD966';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const midAngle = start + angleStep / 2;

      // ── Icon ──
      const iconRadius = 140;
      const iconX = center + Math.cos(midAngle) * iconRadius;
      const iconY = center + Math.sin(midAngle) * iconRadius;
      const imgSize = 70;
      if (cachedImages[i] && cachedImages[i].complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(iconX, iconY, imgSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(cachedImages[i], iconX - imgSize / 2, iconY - imgSize / 2, imgSize, imgSize);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(iconX, iconY, imgSize / 2 + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD966';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffaa44';
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Fallback icon (always visible)
        ctx.font = '42px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFE0A3';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffaa44';
        ctx.fillText(WHEEL_ITEMS[i].fallback, iconX - 22, iconY + 16);
        ctx.shadowBlur = 0;
      }

      // ── Text along arc ──
      const textRadius = 205;
      const textX = center + Math.cos(midAngle) * textRadius;
      const textY = center + Math.sin(midAngle) * textRadius;
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.font = '700 11px "Orbitron", "Exo 2", sans-serif';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffaa66';
      const textGrad = ctx.createLinearGradient(-35, -2, 35, 5);
      textGrad.addColorStop(0, '#FFF7CF');
      textGrad.addColorStop(0.5, '#FFD966');
      textGrad.addColorStop(1, '#FFA500');
      ctx.fillStyle = textGrad;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(WHEEL_ITEMS[i].name.toUpperCase(), 0, 8);
      ctx.restore();
    }

    // Center ring
    ctx.beginPath();
    ctx.arc(center, center, innerR - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#07020ecc';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(center, center, innerR + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffcc55';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffaa44';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [systemRotation, cachedImages]);

  // ── Redraw whenever rotation, cachedImages, or canvas visibility changes ──
  useEffect(() => {
    if (!showEntry && !showWebViewModal) {
      // Use requestAnimationFrame to ensure canvas element is mounted in DOM before drawing
      const frameId = requestAnimationFrame(() => {
        drawWheel(systemRotation);
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [showEntry, showWebViewModal, systemRotation, cachedImages, drawWheel]);

  // ── Spin animation ──
  const animateSpinToSegment = useCallback((targetSegment) => {
    if (isSpinning) return;
    setIsSpinning(true);
    const segCount = WHEEL_ITEMS.length;
    const degPer = 360 / segCount;
    const currentSeg = Math.floor(((Math.PI * 1.5 - systemRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / ((Math.PI * 2) / segCount)) % segCount;
    let deltaSeg = (targetSegment - currentSeg + segCount) % segCount;
    let extraRot = 360 * 8 + Math.floor(Math.random() * 360);
    let deltaDeg = (deltaSeg * degPer) + extraRot;
    const startRot = systemRotation;
    const targetRot = systemRotation + (deltaDeg * Math.PI / 180);
    const startTime = performance.now();
    const duration = 2800;

    const step = (now) => {
      let t = Math.min(1, (now - startTime) / duration);
      let ease = 1 - Math.pow(1 - t, 3.2);
      const currentRot = startRot + (targetRot - startRot) * ease;
      setSystemRotation(currentRot);
      drawWheel(currentRot);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        const finalRot = targetRot % (Math.PI * 2);
        setSystemRotation(finalRot);
        drawWheel(finalRot);
        setIsSpinning(false);
        const finalSeg = Math.floor(((Math.PI * 1.5 - finalRot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / ((Math.PI * 2) / segCount)) % segCount;
        const prize = WHEEL_ITEMS[finalSeg];
        setSpinCompleted(true);
        setSavedPrizeIndex(finalSeg);
        setForcePrizeIndex(false);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          uid,
          spinCompleted: true,
          prizeIndex: finalSeg,
        }));
        setWinningPrize(prize);
        setShowSuccessModal(true);
        playSound('win');
      }
    };
    requestAnimationFrame(step);
  }, [systemRotation, isSpinning, drawWheel, uid]);

  const handleSpin = () => {
    if (isSpinning) return;
    if (spinCompleted) return;
    let targetIdx = forcePrizeIndex && savedPrizeIndex !== null
      ? savedPrizeIndex
      : Math.floor(Math.random() * WHEEL_ITEMS.length);
    playSound('click');
    animateSpinToSegment(targetIdx);
  };

  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.type = 'sine';
      osc.frequency.value = type === 'win' ? 880 : 560;
      gain.gain.value = 0.12;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.4);
      osc.stop(audioCtxRef.current.currentTime + 0.45);
    } catch (e) {}
  };

  // ── Entry submission ──
  const handleSubmitUid = () => {
    const val = entryUid.trim();
    if (!/^\d{8,11}$/.test(val)) {
      setUidError('UID must be 8 to 11 digits');
      return;
    }
    setUidError('');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.uid === val) {
          setUid(val);
          setSpinCompleted(data.spinCompleted === true);
          setSavedPrizeIndex(data.prizeIndex !== undefined ? data.prizeIndex : null);
          if (data.spinCompleted && data.prizeIndex !== null) {
            setSpinCompleted(false);
            setForcePrizeIndex(true);
          } else {
            setForcePrizeIndex(false);
          }
          setIsAuthenticated(true);
          setShowEntry(false);
          return;
        }
      } catch (e) {}
    }
    setUid(val);
    setSpinCompleted(false);
    setSavedPrizeIndex(null);
    setForcePrizeIndex(false);
    setIsAuthenticated(true);
    setShowEntry(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid: val, spinCompleted: false, prizeIndex: null }));
  };

  // ── Claim redirect ──
  const handleClaim = () => {
    setShowSuccessModal(false);
    if (!id) {
      router.push('/create');
      return;
    }
    router.push(`/tasks?id=${id}`);
  };

  // ── Render showcase ──
  const renderShowcase = () => {
    return SHOWCASE_ITEMS.map((item, idx) => (
      <div key={idx} className="showcase-card">
        <img
          src={item.imgURL}
          alt={item.name}
          className="showcase-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%231b0e3d'/%3E%3Ctext x='40' y='45' text-anchor='middle' font-size='32'%3E${item.fallback}%3C/text%3E%3C/svg%3E`;
          }}
        />
        <span className="showcase-name">{item.name}</span>
      </div>
    ));
  };


  // ── Main render ──
  return (
    <div className="page-container">

      {/* ── WebView Modal ── */}
      {showWebViewModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <h2><i className="fas fa-external-link-alt"></i> Open in Browser</h2>
            <p>This page works best in a full browser.</p>
            <div className="modal-actions">
              <button className="modal-btn" onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                setShowWebViewModal(false);
              }}>
                <i className="fas fa-copy"></i> Copy Link
              </button>
              <button className="modal-btn primary" onClick={() => {
                const url = window.location.href;
                if (navigator.userAgent.indexOf('Android') > -1) {
                  window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`;
                } else {
                  window.open(url, '_system');
                }
              }}>
                <i className="fas fa-external-link-alt"></i> Open in Browser
              </button>
            </div>
            <button className="modal-btn ghost" onClick={() => setShowWebViewModal(false)}>
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* ── Entry Overlay ── */}
      {showEntry && !showWebViewModal && (
        <div className="entry-overlay">
          <div className="entry-card">
            <h2>🎡 LUCKY SPIN 🎡</h2>
            <p>by <strong>TONDE GAMER</strong></p>
            <div className="input-group">
              <label><i className="fas fa-id-card"></i> Free Fire UID (8-11 digits)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="11"
                placeholder="e.g., 12345678"
                value={entryUid}
                onChange={(e) => setEntryUid(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitUid()}
              />
              {uidError && <div className="uid-error">{uidError}</div>}
            </div>
            <button className="entry-btn" onClick={handleSubmitUid}>🔥 ENTER EVENT 🔥</button>
            <div className="warning-text">One spin per UID • Reward sent to your UID</div>
          </div>
        </div>
      )}

      {/* ── Main App ── */}
      {!showEntry && !showWebViewModal && (
        <div className="app-container">
          {/* Header */}
          <header className="profile-header">
            <div className="profile-left">
              <img
                className="profile-avatar"
                src="https://i.postimg.cc/YSnPpSmp/quality-restoration-20260523102303532.png"
                alt="TG"
                onError={(e) => e.target.src = 'https://via.placeholder.com/48/ffaa00/000000?text=TG'}
              />
              <div className="profile-identity">
                <div className="profile-title-row">
                  <span className="profile-name">TONDE GAMER</span>
                  <span className="tag-verified">TG</span>
                </div>
                <div className="game-details">
                  <span><i className="fas fa-gamepad"></i> Game: TONDE FF</span>
                  <span><i className="fas fa-id-card"></i> UID: {uid}</span>
                </div>
              </div>
            </div>
            <div className="right-header-group">
              <div className="user-uid-badge">
                <i className="fas fa-user-astronaut"></i>
                <span className="uid-value">{uid}</span>
              </div>
              <div className="diamond-area">
                <i className="fas fa-gem"></i>
                <span className="wallet-balance">999,999</span>
              </div>
            </div>
          </header>

          {/* Branding */}
          <div className="branding-banner">
            <div className="flame-wrapper">
              <span className="flame-graphic">🔥</span>
              <span className="text-sub-glow">TONDE GAMER'S EXCLUSIVE</span>
              <span className="flame-graphic">🔥</span>
            </div>
            <div className="text-main-glow">LUCKY SPIN</div>
          </div>

          {/* Wheel */}
          <div className="wheel-display-zone">
            <div className="wheel-outer-ring">
              <canvas ref={canvasRef} id="wheelCanvas" width="500" height="500"></canvas>
              <div className="wheel-pointer"></div>
              <button
                className={`spin-trigger-core ${isSpinning || spinCompleted ? 'disabled' : ''}`}
                onClick={handleSpin}
                disabled={isSpinning || spinCompleted}
              >
                <div className="spin-core-text">SPIN<br />NOW</div>
                <div className="spin-core-sub">FREE SPIN</div>
              </button>
            </div>
            {spinCompleted && (
              <div className="already-spun-info">
                🏆 Already claimed: {WHEEL_ITEMS[savedPrizeIndex]?.name || 'Prize'}
              </div>
            )}
            {forcePrizeIndex && !spinCompleted && savedPrizeIndex !== null && (
              <div className="already-spun-info">
                ✨ Your reserved reward: {WHEEL_ITEMS[savedPrizeIndex]?.name}! Spin again to win it ✨
              </div>
            )}
          </div>

          {/* Guide */}
          <div className="guide-panel">
            <div className="guide-heading">⚡ HOW TO PARTICIPATE ⚡</div>
            <div className="guide-steps-row">
              <div className="guide-step-card"><span>1️⃣</span>Connect UID</div>
              <div className="guide-step-card"><span>2️⃣</span>Spin Wheel</div>
              <div className="guide-step-card"><span>3️⃣</span>Claim Reward</div>
            </div>
            <div className="claim-limitation-badge">✨ Limited 1 Item Per Fan ✨</div>
          </div>

          {/* Showcase */}
          <div className="showcase-panel">
            <div className="showcase-inner">
              <div className="showcase-title">🔥 LIMITED TIME REWARDS 🔥</div>
              <div className="showcase-subtitle">Available Prizes inside the Wheel</div>
              <div className="showcase-grid">
                {renderShowcase()}
              </div>
            </div>
          </div>

          {/* Featured Banner */}
          <div className="featured-banner">
            <img
              src="https://i.postimg.cc/cH5Mggsc/quality-restoration-20260523110907617.jpg"
              alt="Event Thumbnail"
              onError={(e) => e.target.src = 'https://via.placeholder.com/800x300/1b0e3d/ffaa00?text=TONDE+GAMER+PROMO'}
            />
          </div>

          {/* Footer */}
          <div className="footer-branding-zone">
            <div className="social-link-row">
              <a href="https://youtube.com/@tondegamer?si=nVxdpoPnOWVTQdTy" target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube"></i></a>
              <a href="https://www.tiktok.com/@tondeofficial?_r=1&_t=ZS-96b58CWT7G1" target="_blank" rel="noopener noreferrer"><i className="fab fa-tiktok"></i></a>
              <a href="https://www.facebook.com/tondegamer" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
            </div>
            <div className="footer-legal-text">TONDE GAMER OFFICIAL</div>
            <div className="audio-control-row" onClick={() => {
              setSoundEnabled(!soundEnabled);
            }}>
              <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
              <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal && winningPrize && (
        <div className="modal-overlay active">
          <div className="modal-card success">
            <i className="fas fa-gift" style={{ fontSize: '2.5rem', color: '#ffaa00' }}></i>
            <h2>🎉 YOU WON!</h2>
            <img
              src={winningPrize.imgURL}
              alt={winningPrize.name}
              className="prize-image"
              onError={(e) => e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Crect width='90' height='90' fill='%231b0e3d'/%3E%3Ctext x='45' y='55' text-anchor='middle' font-size='36'%3E${winningPrize.fallback}%3C/text%3E%3C/svg%3E`}
            />
            <p><strong>{winningPrize.name}</strong></p>
            <p className="success-desc">Reward sent to UID: {uid}</p>
            <button className="modal-btn primary" onClick={handleClaim}>
              <i className="fas fa-gift"></i> Claim → Tasks
            </button>
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&family=Orbitron:wght@600;800;900&display=swap');

        * { margin:0; padding:0; box-sizing:border-box; user-select:none; }
        body {
          background: radial-gradient(circle at 50% 0%, #1a0b36, #070314, #020107);
          font-family: 'Exo 2', 'Inter', sans-serif;
          color: #fff;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow-x: hidden;
        }
        .page-container {
          width: 100%;
          max-width: 100%;
          min-height: 100vh;
          background: linear-gradient(180deg, rgba(16,8,36,0.96) 0%, rgba(7,3,18,0.98) 100%);
          box-shadow: 0 0 0 1px rgba(255,170,0,0.15);
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 16px 0 24px;
        }

        .entry-overlay {
          position: fixed;
          top:0; left:0; width:100%; height:100%;
          background: rgba(2,1,12,0.97);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .entry-card {
          background: linear-gradient(145deg, #130b2a, #05020c);
          border: 2px solid #ffaa33;
          border-radius: 48px;
          padding: 28px 22px;
          width: 90%;
          max-width: 340px;
          text-align: center;
          box-shadow: 0 0 40px rgba(255,85,0,0.5);
        }
        .entry-card h2 {
          font-family: 'Orbitron', monospace;
          font-size: 1.6rem;
          background: linear-gradient(135deg, #FFD966, #FF8C00);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 6px;
        }
        .entry-card p { font-size:0.75rem; color:#ffbb77; margin-bottom:20px; }
        .input-group { margin-bottom:20px; text-align:left; }
        .input-group label { font-size:0.7rem; letter-spacing:1px; margin-bottom:5px; display:block; color:#ffcc88; }
        .input-group input {
          width:100%; background:#0c0822; border:1px solid #ffaa33; border-radius:60px;
          padding:12px 16px; font-size:0.9rem; color:#fff; outline:none;
        }
        .input-group input:focus { border-color:#ffcc55; box-shadow:0 0 0 3px rgba(255,170,0,0.2); }
        .uid-error { color:#ff8866; font-size:0.7rem; margin-top:5px; }
        .entry-btn {
          background: linear-gradient(90deg, #ff6600, #ffaa00);
          border:none; width:100%; padding:12px; border-radius:60px;
          font-weight:800; font-family:'Orbitron',monospace; font-size:1rem;
          color:#0f071f; cursor:pointer; box-shadow:0 0 12px #ff7700;
        }
        .entry-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
        .warning-text { margin-top:14px; font-size:0.65rem; color:#ffaa66; }

        .profile-header {
          background: rgba(10,5,25,0.9);
          border-top:1px solid rgba(255,170,0,0.4);
          border-bottom:1px solid rgba(255,170,0,0.4);
          padding:10px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
          gap:10px;
        }
        .profile-left { display:flex; align-items:center; gap:12px; }
        .profile-avatar { width:48px; height:48px; border-radius:50%; border:2px solid #ffaa00; object-fit:cover; }
        .profile-identity { display:flex; flex-direction:column; gap:4px; }
        .profile-title-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .profile-name {
          font-family:'Orbitron',sans-serif; font-weight:900; font-size:1rem;
          background:linear-gradient(135deg, #fff3cc, #ffaa00);
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .tag-verified {
          background:linear-gradient(90deg, #ff5500, #ffaa00);
          padding:2px 8px; border-radius:12px; font-size:0.6rem; font-weight:800;
        }
        .game-details { display:flex; gap:12px; font-size:0.6rem; color:#ffdd99; flex-wrap:wrap; }
        .right-header-group { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .user-uid-badge {
          display:flex; align-items:center; gap:6px;
          background:#0a0520cc; padding:5px 12px; border-radius:40px; border:1px solid #ffaa66;
        }
        .uid-value { font-weight:800; font-size:0.75rem; font-family:monospace; color:#FFD966; }
        .diamond-area {
          display:flex; align-items:center; gap:5px;
          background:#0a0520; padding:5px 12px; border-radius:40px; border:1px solid rgba(0,221,255,0.5);
        }
        .diamond-area i { color:#00ddff; font-size:0.9rem; }
        .wallet-balance { font-weight:800; font-size:0.85rem; }

        .branding-banner { text-align:center; margin:4px 0; }
        .flame-wrapper { display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap; }
        .flame-graphic { font-size:1.6rem; animation:flamePulse 0.6s infinite alternate; }
        @keyframes flamePulse {
          0% { transform:scale(1); filter:drop-shadow(0 0 2px #ff4400); }
          100% { transform:scale(1.1); filter:drop-shadow(0 0 12px #ff8800); }
        }
        .text-sub-glow { font-size:0.75rem; font-weight:800; letter-spacing:1.5px; color:#fff4e0; }
        .text-main-glow {
          font-family:'Orbitron',sans-serif; font-size:2.4rem; font-weight:900;
          background:linear-gradient(180deg, #ffffff 0%, #ffcc00 40%, #ff4400 100%);
          -webkit-background-clip:text; background-clip:text; color:transparent;
          line-height:1.1;
        }

        .wheel-display-zone {
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:12px;
          width:100%;
          padding:0 10px;
        }
        .wheel-outer-ring {
          position:relative;
          width:100%;
          max-width:480px;
          aspect-ratio:1/1;
          margin:0 auto;
          border-radius:50%;
          background:radial-gradient(circle, #ffaa33 0%, #ff5500 60%, #220e4d 100%);
          box-shadow: 0 0 0 8px rgba(255,170,0,0.7), 0 20px 35px rgba(0,0,0,0.8), 0 0 40px #ffaa33, inset 0 0 15px rgba(255,200,100,0.7);
        }
        #wheelCanvas {
          width:100% !important;
          height:100% !important;
          border-radius:50%;
          display:block;
          background:#1a0b36;
        }
        .wheel-pointer {
          position:absolute;
          top:-18px;
          left:50%;
          transform:translateX(-50%);
          width:0; height:0;
          border-left:26px solid transparent;
          border-right:26px solid transparent;
          border-top:50px solid #ffdd88;
          filter:drop-shadow(0 8px 12px black) drop-shadow(0 0 10px #ffaa33);
          z-index:30;
        }
        .spin-trigger-core {
          position:absolute;
          top:50%; left:50%;
          transform:translate(-50%, -50%);
          width:110px; height:110px;
          background:radial-gradient(circle, #ffffff 0%, #ffbb44 40%, #d45500 100%);
          border-radius:50%;
          border:4px solid #ffefb0;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          z-index:40;
          transition:0.05s linear;
          box-shadow:0 10px 25px black, 0 0 30px #ffaa44, inset 0 1px 4px rgba(255,255,200,0.8);
        }
        .spin-trigger-core:active { transform:translate(-50%, -50%) scale(0.96); }
        .spin-trigger-core.disabled {
          filter:grayscale(0.6);
          cursor:not-allowed;
          opacity:0.7;
          pointer-events:none;
        }
        .spin-core-text { font-size:1rem; font-weight:900; font-family:'Orbitron'; color:#2a1500; text-shadow:0 1px 2px #ffdd99; text-align:center; line-height:1.2; }
        .spin-core-sub { font-size:0.6rem; font-weight:800; color:#fff0c0; background:#b33f00aa; padding:2px 6px; border-radius:30px; margin-top:2px; }
        .already-spun-info {
          background:rgba(0,0,0,0.75);
          border-radius:40px;
          padding:6px 16px;
          font-size:0.75rem;
          color:#ffaa66;
          text-align:center;
          display:inline-block;
          margin-top:5px;
        }

        .guide-panel {
          background:rgba(14,7,31,0.7);
          border:1px solid rgba(255,170,0,0.4);
          border-radius:28px;
          padding:14px;
          text-align:center;
          margin:0 16px;
        }
        .guide-heading { font-family:'Orbitron'; color:#ffaa00; font-size:1rem; margin-bottom:10px; }
        .guide-steps-row { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .guide-step-card { background:rgba(255,255,255,0.04); padding:8px 4px; border-radius:18px; font-size:0.7rem; font-weight:600; flex:1; min-width:60px; }
        .claim-limitation-badge { margin-top:10px; background:rgba(255,68,0,0.2); border:1px solid #ffaa44; border-radius:30px; padding:4px 16px; display:inline-block; font-size:0.7rem; }

        .showcase-panel {
          background:linear-gradient(180deg,#130a2a 0%,#080314 100%);
          border-top:1px solid #ffaa00;
          border-bottom:1px solid #ffaa00;
          padding:16px 0;
          width:100%;
        }
        .showcase-inner { padding:0 16px; }
        .showcase-title { font-size:1.1rem; text-align:center; margin-bottom:4px; font-weight:800; }
        .showcase-subtitle { font-size:0.65rem; text-align:center; margin-bottom:14px; opacity:0.8; }
        .showcase-grid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
        }
        .showcase-card {
          background:#1b0e3d;
          border-radius:20px;
          padding:0;
          text-align:center;
          border:1px solid rgba(255,170,0,0.4);
          transition:all 0.2s;
          display:flex;
          flex-direction:column;
          overflow:hidden;
        }
        .showcase-card:hover { transform:translateY(-4px); border-color:#ffaa00; box-shadow:0 0 12px rgba(255,170,0,0.3); }
        .showcase-img {
          width:100%;
          aspect-ratio:1/1;
          object-fit:cover;
          display:block;
          background:#0f0828;
        }
        .showcase-name { font-size:0.7rem; font-weight:700; margin:6px 0; text-align:center; }

        .featured-banner {
          margin:0 16px;
          border-radius:28px;
          overflow:hidden;
          background:linear-gradient(135deg, #0f0622, #1c0e3a);
          border:1px solid rgba(255,170,0,0.5);
          box-shadow:0 10px 25px rgba(0,0,0,0.4);
        }
        .featured-banner img { width:100%; height:auto; display:block; object-fit:cover; }

        .footer-branding-zone { text-align:center; margin-top:6px; }
        .social-link-row { display:flex; justify-content:center; gap:32px; margin-bottom:10px; }
        .social-link-row a { color:#ffaa00; font-size:1.8rem; transition:0.2s; }
        .social-link-row a:hover { color:#ffcc44; transform:scale(1.1); }
        .footer-legal-text { font-size:0.6rem; color:#ffaa66; }
        .audio-control-row {
          margin-top:10px;
          font-size:0.65rem;
          cursor:pointer;
          display:inline-flex;
          gap:8px;
          background:#0a0620;
          padding:4px 16px;
          border-radius:40px;
          align-items:center;
        }

        .modal-overlay {
          position:fixed;
          top:0; left:0; width:100%; height:100%;
          background:rgba(4,2,10,0.96);
          backdrop-filter:blur(8px);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1100;
          opacity:0;
          visibility:hidden;
          transition:0.2s;
        }
        .modal-overlay.active { opacity:1; visibility:visible; }
        .modal-card {
          background:linear-gradient(145deg, #180c36, #070314);
          border:2px solid #ffaa00;
          border-radius:36px;
          padding:22px;
          width:85%;
          max-width:300px;
          text-align:center;
          transform:scale(0.7);
          transition:transform 0.2s;
        }
        .modal-overlay.active .modal-card { transform:scale(1); }
        .modal-card h2 { font-family:'Orbitron'; margin-bottom:8px; color:#ffaa00; font-size:1.2rem; }
        .modal-card p { font-size:0.75rem; color:#ccc; }
        .modal-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:16px 0; }
        .modal-btn {
          background:rgba(255,255,255,0.1);
          border:1px solid rgba(255,255,255,0.15);
          padding:8px 16px;
          border-radius:40px;
          font-weight:700;
          color:#fff;
          cursor:pointer;
          transition:0.2s;
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:0.8rem;
        }
        .modal-btn:hover { background:rgba(255,255,255,0.2); }
        .modal-btn.primary {
          background:#ffcc00;
          color:#1a1a2e;
          border:none;
        }
        .modal-btn.primary:hover { background:#ffa500; }
        .modal-btn.ghost {
          background:transparent;
          border:none;
          color:#8f9bb3;
          font-size:0.7rem;
        }
        .modal-btn.ghost:hover { color:#fff; }
        .prize-image { width:90px; margin:8px auto; object-fit:contain; border-radius:12px; }
        .success-desc { font-size:0.7rem; color:#ffaa66; margin:8px 0; }

        @media (max-width: 520px) {
          .text-main-glow { font-size:1.8rem; }
          .profile-name { font-size:0.8rem; }
          .game-details { font-size:0.5rem; gap:8px; }
          .user-uid-badge { padding:3px 8px; }
          .uid-value { font-size:0.65rem; }
          .diamond-area { padding:3px 8px; }
          .wallet-balance { font-size:0.7rem; }
          .spin-trigger-core { width:90px; height:90px; }
          .spin-core-text { font-size:0.8rem; }
          .spin-core-sub { font-size:0.5rem; }
          .guide-steps-row { gap:6px; }
          .guide-step-card { font-size:0.6rem; padding:6px 2px; }
          .showcase-grid { grid-template-columns:repeat(2,1fr); }
          .modal-card { max-width:280px; padding:16px; }
        }
        @media (max-width: 380px) {
          .profile-header { flex-direction:column; align-items:stretch; }
          .right-header-group { justify-content:center; }
          .wheel-outer-ring { max-width:320px; }
          .spin-trigger-core { width:70px; height:70px; }
          .spin-core-text { font-size:0.6rem; }
          .spin-core-sub { font-size:0.45rem; }
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

export default withCampaignMeta(TondeGamerLuckySpinV1, {
  title: 'TONDE GAMER – Free Fire Lucky Spin Event',
  description: 'Join TONDE GAMER’s exclusive Free Fire Lucky Spin event. Win exclusive in-game rewards!',
  image: 'https://maketrend.vercel.app/og-tonde-spin.jpg',
  url: 'https://maketrend.vercel.app/tonde-gamer-lucky-spin-v1?id={id}',
});