// pages/templates/photography-contest-v1.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Photography Contest – Show Your Vision & Win!',
  description: 'Submit your best photograph and win amazing prizes including DSLR Camera, Lens, and Cash! Open to all skill levels.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/photography-contest?id={id}',
};

// ── Prize Data ──
const PRIZES = [
  {
    label: 'Canon EOS R5',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=150&h=150&fit=crop&auto=format',
    color: '#D4AF37',
    glowColor: 'rgba(212, 175, 55, 0.3)',
  },
  {
    label: 'Professional Lens',
    image: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=150&h=150&fit=crop&auto=format',
    color: '#C0C0C0',
    glowColor: 'rgba(192, 192, 192, 0.3)',
  },
  {
    label: '$3,000 Cash',
    image: 'https://images.unsplash.com/photo-1580519549965-7e0e6a53af9f?w=150&h=150&fit=crop&auto=format',
    color: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.3)',
  },
  {
    label: 'Tripod + Accessories',
    image: 'https://images.unsplash.com/photo-1589739900243-4b52cd9dd8df?w=150&h=150&fit=crop&auto=format',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.3)',
  },
];

// ── Categories ──
const CATEGORIES = ['Nature', 'Portrait', 'Street', 'Wildlife', 'Architecture', 'Macro', 'Night', 'Travel'];

// ── Mock Live Activity ──
const LIVE_UPDATES = [
  'Sarah submitted a stunning nature photo',
  'Alex received 450 votes',
  'Mike entered the portrait category',
  'Emma shared a street photography shot',
  'Rahul uploaded a wildlife capture',
];

function PhotographyContestV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=upload, 2=processing, 3=appeal, 4=redirecting
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Nature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 48, minutes: 0, seconds: 0 });
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

  // ── 48‑hour countdown ──
  useEffect(() => {
    const startTime = Date.now();
    const duration = 48 * 60 * 60 * 1000;
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

  // ── File handling ──
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum size is 50MB.');
      return;
    }
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target.result);
    reader.readAsDataURL(selectedFile);
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
    if (!title.trim()) {
      setError('Please enter a title for your photo.');
      return;
    }
    if (!file) {
      setError('Please upload your photo.');
      return;
    }
    setError('');
    setIsUploading(true);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 12;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsUploading(false);
        setStep(2);
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
          <span className="logo-icon">📸</span>
          <span className="logo-text">Photo<span>Contest</span></span>
        </div>
        <div className="header-badge">🏆 $10,000 Prize Pool</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">📷 PHOTOGRAPHY CONTEST 2026</div>
          <h1>Show Your Vision<br />& Win Amazing Prizes</h1>
          <p>Submit your best photograph and compete with photographers worldwide.</p>
          <div className="hero-stats">
            <div><span>📸</span> 5,000+ Submissions</div>
            <div><span>⏳</span> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left</div>
            <div><span>⭐</span> 4.9/5 Rating</div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Upload Form */}
        {step === 1 && (
          <div className="upload-card">
            <h2>Submit Your Photo</h2>
            <p>Share your best work with the world.</p>

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
              <label>Photo Title <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Golden Sunset"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category <span className="required">*</span></label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description <span className="optional">(optional)</span></label>
              <textarea
                placeholder="Tell us about your photo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Upload Your Photo <span className="required">*</span></label>
              <div
                className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {filePreview ? (
                  <div className="file-preview">
                    <img src={filePreview} alt="Preview" />
                    <div className="file-info">
                      <span>{file.name}</span>
                      <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <button className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="drop-icon">🖼️</div>
                    <h3>Drag & Drop Your Photo</h3>
                    <p>or <span className="browse-text">Browse Files</span></p>
                    <span className="supported-formats">JPG • PNG • WEBP • Max 50MB</span>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
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
                'Submit Photo →'
              )}
            </button>

            <div className="trust-badges">
              <span><span className="badge-icon">🔒</span> 100% Secure</span>
              <span><span className="badge-icon">📸</span> Free to Enter</span>
              <span><span className="badge-icon">⭐</span> Verified Contest</span>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <div className="processing-card">
            <div className="processing-animation">
              <div className="pulse-circle"></div>
              <div className="pulse-circle delay-1"></div>
              <div className="pulse-circle delay-2"></div>
            </div>
            <h2>🖼️ Processing Your Photo</h2>
            <p>Your submission is being reviewed by our expert panel.</p>
            <div className="processing-info">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value status-pending">⏳ Processing</span>
              </div>
              <div className="info-item">
                <span className="info-label">Your Entry</span>
                <span className="info-value">{category} • "{title}"</span>
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
            <p>You will receive an email within <strong>48 hours</strong> to view the selected candidates as winners.</p>
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

      {/* ─── FEATURED PRIZES ─── */}
      <section className="prizes-section">
        <div className="prizes-header">
          <span className="prizes-badge">🏆 PRIZE POOL</span>
          <h2 className="section-title">Featured Prizes</h2>
          <p className="prizes-subtitle">Win these amazing photography prizes</p>
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

      {/* ─── HOW TO ENTER ─── */}
      <section className="steps-section">
        <h2 className="section-title">📋 How to Enter</h2>
        <div className="steps-timeline">
          <div className="step-item">
            <div className="step-icon">📸</div>
            <div className="step-content">
              <h3>Capture</h3>
              <p>Take your best photograph.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step-item">
            <div className="step-icon">📤</div>
            <div className="step-content">
              <h3>Upload</h3>
              <p>Submit your photo with details.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step-item">
            <div className="step-icon">🗳️</div>
            <div className="step-content">
              <h3>Vote</h3>
              <p>Get votes from the community.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step-item">
            <div className="step-icon">🏆</div>
            <div className="step-content">
              <h3>Win</h3>
              <p>Win amazing photography prizes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RULES ─── */}
      <section className="rules-section">
        <h2 className="section-title">📜 Rules & Guidelines</h2>
        <div className="rules-grid">
          <div className="rule-card">
            <span className="rule-icon">📷</span>
            <h3>Original Work</h3>
            <p>Only original photographs. No copyright infringement.</p>
          </div>
          <div className="rule-card">
            <span className="rule-icon">🖼️</span>
            <h3>High Quality</h3>
            <p>Minimum 1920px on the longest side.</p>
          </div>
          <div className="rule-card">
            <span className="rule-icon">🚫</span>
            <h3>No Watermarks</h3>
            <p>Photos must not have watermarks or text overlays.</p>
          </div>
          <div className="rule-card">
            <span className="rule-icon">📅</span>
            <h3>Submission Deadline</h3>
            <p>All entries must be submitted within the contest period.</p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Photography Contest. All rights reserved.</p>
        <p className="footer-contact">Questions? support@photocontest.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0a0a0f;
          color: #FFFFFF;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #0a0a0f;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10, 10, 15, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(212, 175, 55, 0.15);
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
        .logo-text span { color: #D4AF37; }
        .header-badge {
          background: linear-gradient(135deg, #D4AF37, #C0A030);
          color: #0a0a0f;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          box-shadow: 0 2px 12px rgba(212, 175, 55, 0.3);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 55vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 70%),
                      radial-gradient(ellipse at 70% 60%, rgba(255,255,255,0.03) 0%, transparent 50%),
                      #0a0a0f;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.25);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #D4AF37;
          margin-bottom: 1rem;
          letter-spacing: 1.5px;
        }
        .hero h1 {
          font-size: clamp(2.4rem, 8vw, 4.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff 30%, #D4AF37 70%, #C0A030 100%);
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
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(8px);
          padding: 0.5rem 1.5rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.05);
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
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.05);
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
        .form-group .optional { color: #666; font-weight: 400; font-size: 0.75rem; }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          font-size: 0.95rem;
          background: rgba(255,255,255,0.03);
          color: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          appearance: none;
          font-family: inherit;
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #555;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #D4AF37;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.08);
        }
        .form-group select option {
          background: #1a1a2e;
          color: #fff;
        }

        .drop-zone {
          position: relative;
          border: 2px dashed rgba(255,255,255,0.08);
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
          border-color: #D4AF37;
          background: rgba(212,175,55,0.03);
        }
        .drop-zone.dragging {
          border-color: #D4AF37;
          background: rgba(212,175,55,0.06);
          transform: scale(1.01);
        }
        .drop-zone.has-file {
          border-color: #22C55E;
          border-style: solid;
        }
        .drop-icon {
          font-size: 3.5rem;
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
          color: #D4AF37;
          font-weight: 600;
          text-decoration: underline;
        }
        .supported-formats {
          font-size: 0.75rem;
          color: #555;
          margin-top: 0.5rem;
        }

        .file-preview {
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .file-preview img {
          width: 100%;
          max-height: 250px;
          object-fit: cover;
          border-radius: 12px;
        }
        .file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          padding: 0.5rem;
        }
        .file-size { font-size: 0.75rem; color: #666; }
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
          background: linear-gradient(135deg, #D4AF37, #B8962E);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #0a0a0f;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);
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
          color: #666;
        }
        .trust-badges span {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .badge-icon { font-size: 0.9rem; }

        /* ── Processing Card ── */
        .processing-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 3rem 2rem;
          border: 1px solid rgba(255,255,255,0.05);
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
          background: #D4AF37;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .pulse-circle.delay-1 { animation-delay: 0.4s; background: #C0A030; }
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
          background: rgba(255,255,255,0.03);
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
          color: #555;
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
          color: #D4AF37;
        }
        .info-value.status-success {
          color: #22C55E;
        }
        .processing-note {
          font-size: 0.85rem;
          color: #555;
        }

        /* ── Appeal Card ── */
        .appeal-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 3rem 2rem;
          border: 1px solid rgba(34, 197, 94, 0.15);
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
          background: rgba(255,255,255,0.03);
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
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border-radius: 36px;
          padding: 3rem 2rem;
          border: 1px solid rgba(255,255,255,0.05);
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

        /* ── PRIZES SECTION ── */
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
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.25);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #D4AF37;
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
          background: linear-gradient(90deg, #D4AF37, #C0A030);
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
          background: rgba(255,255,255,0.03);
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
          box-shadow: 0 12px 48px rgba(212, 175, 55, 0.15) !important;
        }
        .prize-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          border-radius: 50%;
          opacity: 0.08;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .prize-card:hover .prize-glow {
          opacity: 0.15;
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
          border: 2px solid rgba(255,255,255,0.06);
          transition: transform 0.3s;
        }
        .prize-card:hover .prize-image {
          transform: scale(1.05);
        }
        .prize-rank {
          position: absolute;
          top: -8px;
          right: -8px;
          background: linear-gradient(135deg, #D4AF37, #B8962E);
          color: #0a0a0f;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          border: 2px solid #0a0a0f;
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
          background: rgba(255,255,255,0.04);
          padding: 0.2rem 0.8rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.03);
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
          background: rgba(255,255,255,0.03);
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
          background: rgba(255,255,255,0.03);
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.04);
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
          background: linear-gradient(180deg, #D4AF37, #C0A030);
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
          background: rgba(255,255,255,0.03);
          border-radius: 24px;
          padding: 1.8rem 1.2rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.04);
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
          color: #555;
          padding: 2.5rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.03);
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
          border: 1px solid rgba(212, 175, 55, 0.15);
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
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.7rem 1.5rem;
          border-radius: 60px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: 0.2s;
          flex: 1;
          min-width: 120px;
        }
        .modal-btn:hover { background: rgba(255,255,255,0.1); }
        .modal-btn.primary {
          background: #D4AF37;
          border: none;
          color: #0a0a0f;
        }
        .modal-btn.primary:hover { background: #C0A030; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #666;
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
export default withCampaignMeta(PhotographyContestV1, defaultMeta);