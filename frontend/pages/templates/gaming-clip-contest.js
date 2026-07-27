// pages/templates/gaming-clip-contest-v1.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Gaming Clip Contest – Show Your Skills & Win Big!',
  description: 'Submit your best gameplay clip from Free Fire, PUBG, and more. Win amazing prizes including iPhone, Gaming Laptop, and Cash!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/gaming-clip-contest-v1?id={id}',
};

// ── Prize Data ──
const PRIZES = [
  {
    label: 'iPhone 15 Pro',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=150&h=150&fit=crop&auto=format',
    color: '#7C3AED',
    glowColor: 'rgba(124, 58, 237, 0.3)',
  },
  {
    label: 'Gaming Laptop',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=150&h=150&fit=crop&auto=format',
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.3)',
  },
  {
    label: '$2,000 Cash',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=150&h=150&fit=crop&auto=format',
    color: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.3)',
  },
  {
    label: 'Gaming Gear',
    image: 'https://mms.businesswire.com/media/20210111005169/en/851040/5/hx-press-image-all-products-1000x611.jpg?download=1',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.3)',
  },
];

const GAMES = ['Free Fire', 'PUBG Mobile', 'Call of Duty', 'Mobile Legends', 'Apex Legends', 'Other'];

// ── Mock Live Activity ──
const LIVE_UPDATES = [
  'Rahul uploaded a Free Fire clip',
  'Alex received 1,200 votes',
  'Sarah entered the contest',
  'Mike shared a PUBG clip',
  'Emma received 850 votes',
];

function GamingClipContestV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=upload, 2=processing, 3=appeal, 4=redirecting
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [game, setGame] = useState('Free Fire');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 24, minutes: 0, seconds: 0 });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [liveUpdateIndex, setLiveUpdateIndex] = useState(0);

  const fileInputRef = useRef(null);

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── 24‑hour countdown ──
  useEffect(() => {
    const startTime = Date.now();
    const duration = 24 * 60 * 60 * 1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining({ hours, minutes, seconds });
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Live activity ticker ──
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveUpdateIndex((prev) => (prev + 1) % LIVE_UPDATES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── File handling (preview only – no save) ──
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum size is 500MB.');
      return;
    }
    setFile(selectedFile);
    setError('');

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // ── Submit ──
  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!file) {
      setError('Please upload your gameplay clip.');
      return;
    }
    setError('');
    setIsUploading(true);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsUploading(false);
        // Move to processing state
        setStep(2);
        // After 3 seconds, move to appeal step
        setTimeout(() => {
          setStep(3);
        }, 3000);
      }
      setUploadProgress(Math.min(100, progress));
    }, 200);
  };

  // ── Appeal: redirect to tasks ──
  const handleAppeal = () => {
    setLoading(true);
    setStep(4);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── WebView Modal ──
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

  // ── Main UI ──
  return (
    <div className="page-wrapper">

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <span className="logo-icon">🏆</span>
          <span className="logo-text">Gaming<span>Clips</span></span>
        </div>
        <div className="header-badge">🔥 Contest Live</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-particles"></div>
        <div className="hero-content">
          <div className="hero-badge">🎮 EPIC GAMING CLIP CONTEST</div>
          <h1>Show Your Best<br />Gameplay & Win</h1>
          <p>Submit your best gaming clip and win amazing prizes. 48,239 players joined!</p>
          <div className="hero-stats">
            <div><span>🎁</span> $5,000 Prize Pool</div>
            <div><span>⏳</span> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left</div>
            <div><span>⭐</span> 4.8/5 Rating</div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Upload Form */}
        {step === 1 && (
          <div className="upload-card">
            <h2>Submit Your Clip</h2>
            <p>Show us your best gameplay moments!</p>

            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Select Game <span className="required">*</span></label>
              <select value={game} onChange={(e) => setGame(e.target.value)}>
                {GAMES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Upload Your Clip <span className="required">*</span></label>
              <div
                className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {filePreview ? (
                  <div className="file-preview">
                    {file.type.startsWith('image/') ? (
                      <img src={filePreview} alt="Preview" />
                    ) : file.type.startsWith('video/') ? (
                      <video src={filePreview} controls className="video-preview" />
                    ) : (
                      <div className="file-info">
                        <span className="file-icon">📄</span>
                        <span>{file.name}</span>
                        <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    )}
                    <button className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="drop-icon">🎥</div>
                    <h3>Drag & Drop</h3>
                    <p>or <span className="browse-text">Browse Files</span></p>
                    <span className="supported-formats">MP4 • MOV • AVI • PNG • JPG • Max 500MB</span>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/*,image/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="submit-btn" onClick={handleSubmit} disabled={isUploading}>
              {isUploading ? (
                <>
                  <span className="spinner"></span> Uploading... {Math.round(uploadProgress)}%
                </>
              ) : (
                'Submit Clip →'
              )}
            </button>

            <div className="trust-badges">
              <span><span className="badge-icon">🔒</span> 100% Secure</span>
              <span><span className="badge-icon">🎮</span> Free to Enter</span>
              <span><span className="badge-icon">⭐</span> Verified Contest</span>
            </div>
          </div>
        )}

        {/* Step 2: Processing / Waiting */}
        {step === 2 && (
          <div className="processing-card">
            <div className="processing-animation">
              <div className="pulse-circle"></div>
              <div className="pulse-circle delay-1"></div>
              <div className="pulse-circle delay-2"></div>
            </div>
            <h2>🎯 Processing Your Clip</h2>
            <p>Your gameplay clip is being reviewed by our team.</p>
            <div className="processing-info">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value status-pending">⏳ Processing</span>
              </div>
              <div className="info-item">
                <span className="info-label">Your Entry</span>
                <span className="info-value">{game} • {name}</span>
              </div>
            </div>
            <p className="processing-note">This may take a few moments. Please wait...</p>
          </div>
        )}

        {/* Step 3: Appeal */}
        {step === 3 && (
          <div className="appeal-card">
            <div className="appeal-icon">📧</div>
            <h2>Submission Received!</h2>
            <p>You will receive an email within <strong>24 hours</strong> to view the selected candidates as winners.</p>
            <div className="appeal-info">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value status-success">✅ Submitted</span>
              </div>
              <div className="info-item">
                <span className="info-label">Next Step</span>
                <span className="info-value">Email Notification</span>
              </div>
            </div>
            <p className="appeal-note">To submit your appeal and complete the process, click the button below.</p>
            <button className="appeal-btn" onClick={handleAppeal} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Redirecting...
                </>
              ) : (
                'Complete Steps →'
              )}
            </button>
          </div>
        )}

        {/* Step 4: Redirecting */}
        {step === 4 && (
          <div className="redirect-card">
            <div className="redirect-animation">
              <div className="pulse-circle"></div>
              <div className="pulse-circle delay-1"></div>
              <div className="pulse-circle delay-2"></div>
            </div>
            <h2>🚀 Redirecting...</h2>
            <p>Please wait while we complete your submission.</p>
          </div>
        )}

      </main>

      {/* ─── FEATURED PRIZES SECTION (Premium UI) ─── */}
      <section className="prizes-section">
        <div className="prizes-header">
          <span className="prizes-badge">🎁 PRIZE POOL</span>
          <h2 className="section-title">Featured Prizes</h2>
          <p className="prizes-subtitle">Win these amazing prizes by showcasing your skills</p>
        </div>
        <div className="prizes-grid">
          {PRIZES.map((prize, idx) => (
            <div key={idx} className="prize-card" style={{ 
              borderColor: prize.color,
              boxShadow: `0 8px 32px ${prize.glowColor}`
            }}>
              <div className="prize-glow" style={{ background: prize.glowColor }}></div>
              <div className="prize-image-wrapper">
                <img src={prize.image} alt={prize.label} className="prize-image" />
                <div className="prize-rank">#{idx + 1}</div>
              </div>
              <h3>{prize.label}</h3>
              <span className="prize-value-tag">Premium Prize</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── LIVE ACTIVITY ─── */}
      <section className="activity-section">
        <div className="activity-ticker">
          <span className="live-dot"></span>
          <span className="activity-text">🟢 {LIVE_UPDATES[liveUpdateIndex]}</span>
        </div>
      </section>

      {/* ─── CONTEST STEPS ─── */}
      <section className="steps-section">
        <h2 className="section-title">📋 How It Works</h2>
        <div className="steps-timeline">
          <div className="step-item">
            <div className="step-icon">🎮</div>
            <div className="step-content">
              <h3>Upload Clip</h3>
              <p>Share your best gameplay moment.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step-item">
            <div className="step-icon">🗳️</div>
            <div className="step-content">
              <h3>Community Votes</h3>
              <p>Get votes from other players.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step-item">
            <div className="step-icon">👨‍⚖️</div>
            <div className="step-content">
              <h3>Judges Review</h3>
              <p>Expert judges review top clips.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step-item">
            <div className="step-icon">🏆</div>
            <div className="step-content">
              <h3>Winner Announcement</h3>
              <p>Prizes awarded to winners.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RULES ─── */}
      <section className="rules-section">
        <h2 className="section-title">📜 Rules & Guidelines</h2>
        <div className="rules-grid">
          <div className="rule-card">
            <span className="rule-icon">🎮</span>
            <h3>Original Gameplay</h3>
            <p>Only original gameplay clips. No copyright content.</p>
          </div>
          <div className="rule-card">
            <span className="rule-icon">⏱️</span>
            <h3>Max 60 Seconds</h3>
            <p>Keep your clip short and impactful.</p>
          </div>
          <div className="rule-card">
            <span className="rule-icon">🚫</span>
            <h3>No Edited Content</h3>
            <p>No heavy edits, effects, or third-party content.</p>
          </div>
          <div className="rule-card">
            <span className="rule-icon">📅</span>
            <h3>Submission Deadline</h3>
            <p>All clips must be submitted within the contest period.</p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Gaming Clip Contest. All rights reserved.</p>
        <p className="footer-contact">Questions? support@gamingclips.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0B0F1A;
          color: #FFFFFF;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #0B0F1A;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(11, 15, 26, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(124, 58, 237, 0.2);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.6rem; }
        .logo-text { color: #fff; }
        .logo-text span { color: #7C3AED; }
        .header-badge {
          background: linear-gradient(135deg, #7C3AED, #06B6D4);
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          box-shadow: 0 2px 12px rgba(124, 58, 237, 0.3);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 70%),
                      radial-gradient(ellipse at 70% 60%, rgba(6,182,212,0.08) 0%, transparent 50%),
                      #0B0F1A;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237C3AED' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-particles {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 80%, rgba(124,58,237,0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(6,182,212,0.08) 0%, transparent 50%);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.3);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #7C3AED;
          margin-bottom: 1rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2.4rem, 8vw, 4.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff 30%, #7C3AED 70%, #06B6D4 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero p {
          font-size: 1.15rem;
          color: #aaa;
          margin-bottom: 1.8rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .hero-stats div {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(8px);
          padding: 0.5rem 1.5rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.06);
          font-weight: 600;
          font-size: 0.9rem;
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Main Content ── */
        .main-content {
          max-width: 720px;
          margin: -2rem auto 3rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Upload Card ── */
        .upload-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
        }
        .upload-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          color: #fff;
        }
        .upload-card > p {
          text-align: center;
          color: #888;
          margin-bottom: 1.8rem;
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #ccc;
          margin-bottom: 0.3rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 2px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          font-size: 0.95rem;
          background: rgba(255,255,255,0.04);
          color: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          appearance: none;
        }
        .form-group input::placeholder {
          color: #666;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color: #7C3AED;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
        }
        .form-group select option {
          background: #1a1a2e;
          color: #fff;
        }

        .drop-zone {
          position: relative;
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .drop-zone:hover {
          border-color: #7C3AED;
          background: rgba(124,58,237,0.04);
        }
        .drop-zone.dragging {
          border-color: #7C3AED;
          background: rgba(124,58,237,0.08);
          transform: scale(1.01);
        }
        .drop-zone.has-file {
          border-color: #22C55E;
          border-style: solid;
        }
        .drop-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        .drop-zone h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.2rem;
        }
        .drop-zone p {
          color: #888;
          font-size: 0.95rem;
        }
        .browse-text {
          color: #7C3AED;
          font-weight: 600;
          text-decoration: underline;
        }
        .supported-formats {
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.5rem;
        }

        .file-preview {
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .file-preview img,
        .file-preview .video-preview {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: 12px;
        }
        .file-preview .video-preview {
          background: #000;
        }
        .file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          padding: 0.5rem;
        }
        .file-icon { font-size: 2rem; }
        .file-size { font-size: 0.75rem; color: #888; }
        .remove-file {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ef4444;
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          transition: transform 0.2s;
        }
        .remove-file:hover {
          transform: scale(1.1);
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #7C3AED, #06B6D4);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.4);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.5rem;
          font-size: 0.75rem;
          color: #888;
        }
        .trust-badges span {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .badge-icon { font-size: 0.9rem; }

        /* ── Processing Card ── */
        .processing-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 3rem 2rem;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .processing-animation {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .pulse-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #7C3AED;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .pulse-circle.delay-1 { animation-delay: 0.4s; background: #06B6D4; }
        .pulse-circle.delay-2 { animation-delay: 0.8s; background: #22C55E; }
        @keyframes pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .processing-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .processing-card p {
          color: #888;
          margin-bottom: 2rem;
        }
        .processing-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          background: rgba(255,255,255,0.04);
          padding: 1.5rem;
          border-radius: 20px;
          margin-bottom: 1.5rem;
        }
        .info-item {
          text-align: center;
        }
        .info-label {
          display: block;
          font-size: 0.7rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          display: block;
          font-weight: 700;
          color: #fff;
          font-size: 1.05rem;
        }
        .info-value.status-pending {
          color: #f5a623;
        }
        .info-value.status-success {
          color: #22C55E;
        }
        .processing-note {
          font-size: 0.85rem;
          color: #666;
        }

        /* ── Appeal Card ── */
        .appeal-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 3rem 2rem;
          border: 1px solid rgba(34, 197, 94, 0.2);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        .appeal-icon {
          font-size: 4rem;
          margin-bottom: 0.5rem;
        }
        .appeal-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .appeal-card p {
          color: #888;
          margin-bottom: 1.5rem;
        }
        .appeal-card p strong {
          color: #22C55E;
        }
        .appeal-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          background: rgba(255,255,255,0.04);
          padding: 1.5rem;
          border-radius: 20px;
          margin-bottom: 1.5rem;
        }
        .appeal-note {
          font-size: 0.9rem;
          color: #aaa;
          margin-bottom: 1.5rem;
        }
        .appeal-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .appeal-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
        }
        .appeal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Redirect Card ── */
        .redirect-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 3rem 2rem;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        .redirect-animation {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .redirect-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .redirect-card p {
          color: #888;
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }

        /* ── PRIZES SECTION (Premium) ── */
        .prizes-section {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .prizes-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .prizes-badge {
          display: inline-block;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.3);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #7C3AED;
          letter-spacing: 1.5px;
          margin-bottom: 0.5rem;
        }
        .section-title {
          font-size: 2.2rem;
          font-weight: 800;
          text-align: center;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 64px;
          height: 4px;
          background: linear-gradient(90deg, #7C3AED, #06B6D4);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .prizes-subtitle {
          text-align: center;
          color: #888;
          font-size: 1rem;
          margin-top: 0.5rem;
        }
        .prizes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .prize-card {
          position: relative;
          background: rgba(255,255,255,0.04);
          border-radius: 24px;
          padding: 1.5rem 1rem;
          text-align: center;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          overflow: hidden;
          backdrop-filter: blur(8px);
        }
        .prize-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 12px 48px rgba(124, 58, 237, 0.2) !important;
        }
        .prize-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          border-radius: 50%;
          opacity: 0.1;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .prize-card:hover .prize-glow {
          opacity: 0.2;
        }
        .prize-image-wrapper {
          position: relative;
          display: inline-block;
          margin-bottom: 0.8rem;
        }
        .prize-image {
          width: 90px;
          height: 90px;
          object-fit: cover;
          border-radius: 16px;
          border: 2px solid rgba(255,255,255,0.1);
          transition: transform 0.3s;
        }
        .prize-card:hover .prize-image {
          transform: scale(1.05);
        }
        .prize-rank {
          position: absolute;
          top: -8px;
          right: -8px;
          background: linear-gradient(135deg, #7C3AED, #06B6D4);
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          border: 2px solid #0B0F1A;
        }
        .prize-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.2rem;
        }
        .prize-value-tag {
          display: inline-block;
          font-size: 0.65rem;
          color: #888;
          background: rgba(255,255,255,0.06);
          padding: 0.2rem 0.8rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.04);
        }

        /* ── Live Activity ── */
        .activity-section {
          padding: 2rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .activity-ticker {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255,255,255,0.04);
          padding: 0.8rem 1.5rem;
          border-radius: 60px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22C55E;
          animation: pulse-dot 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .activity-text {
          color: #aaa;
          font-size: 0.9rem;
        }

        /* ── Steps Timeline ── */
        .steps-section {
          padding: 4rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .steps-timeline {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          align-items: start;
          position: relative;
          background: rgba(255,255,255,0.04);
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .step-item {
          text-align: center;
          padding: 0 0.5rem;
        }
        .step-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .step-content h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .step-content p {
          font-size: 0.8rem;
          color: #888;
        }
        .step-line {
          width: 1px;
          height: 60px;
          background: linear-gradient(180deg, #7C3AED, #06B6D4);
          margin: 0 auto;
        }

        /* ── Rules ── */
        .rules-section {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .rule-card {
          background: rgba(255,255,255,0.04);
          border-radius: 24px;
          padding: 1.8rem 1.2rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
          transition: transform 0.3s;
        }
        .rule-card:hover {
          transform: translateY(-4px);
        }
        .rule-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        .rule-card h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.3rem;
        }
        .rule-card p {
          font-size: 0.85rem;
          color: #888;
        }

        /* ── Footer ── */
        .site-footer {
          background: rgba(0,0,0,0.3);
          color: #666;
          padding: 2.5rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 2rem;
        }
        .site-footer p {
          font-size: 0.8rem;
          margin-bottom: 0.3rem;
        }
        .footer-contact {
          font-weight: 600;
          color: #888;
        }

        /* ── WebView Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.92);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 40px;
          padding: 2.8rem 2rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(124, 58, 237, 0.2);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
        }
        .modal-icon { font-size: 3.2rem; margin-bottom: 0.5rem; }
        .modal-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .modal-card p {
          color: #aaa;
          margin-bottom: 1.8rem;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .modal-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.7rem 1.5rem;
          border-radius: 60px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: 0.2s;
          flex: 1;
          min-width: 120px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.12); }
        .modal-btn.primary {
          background: #7C3AED;
          border: none;
        }
        .modal-btn.primary:hover { background: #6D2DE0; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .steps-timeline {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .step-line {
            width: 60px;
            height: 1px;
          }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.3rem 1rem; }
          .prizes-grid { grid-template-columns: 1fr 1fr; }
          .rules-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .upload-card { padding: 1.8rem 1.2rem; }
          .processing-card { padding: 2rem 1.2rem; }
          .appeal-card { padding: 2rem 1.2rem; }
          .redirect-card { padding: 2rem 1.2rem; }
          .prizes-grid { grid-template-columns: 1fr; }
          .rules-grid { grid-template-columns: 1fr; }
          .drop-zone { padding: 1.5rem 1rem; min-height: 150px; }
          .trust-badges { flex-wrap: wrap; gap: 0.8rem; }
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
export default withCampaignMeta(GamingClipContestV1, defaultMeta);