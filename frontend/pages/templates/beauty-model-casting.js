// pages/templates/beauty-model-casting.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Model Casting – Get Selected for Movies & Videos',
  description: 'Submit your portfolio and get discovered by top casting directors. Selected candidates will be contacted for movies, music videos, and campaigns.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/beauty-model-casting?id={id}',
};

// ── Categories ──
const CATEGORIES = ['Fashion', 'Commercial', 'Beauty', 'Lifestyle', 'Editorial', 'Runway', 'Film', 'Music Video'];

function BeautyModelCasting({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=upload, 2=processing, 3=appeal, 4=redirecting
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({ days: 5, hours: 12, minutes: 0, seconds: 0 });
  const [liveUpdateIndex, setLiveUpdateIndex] = useState(0);

  const fileInputRef = useRef(null);

  // ── Live activity updates ──
  const LIVE_UPDATES = [
    'Sarah submitted her portfolio',
    'Alex received a callback from casting',
    'Mia entered the contest',
    'Emma submitted her beauty shot',
    'Rahul uploaded his professional portfolio',
  ];

  // ── WebView detection ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
  }, []);

  // ── Countdown timer ──
  useEffect(() => {
    const startTime = Date.now();
    const duration = 5 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining({ days, hours, minutes, seconds });
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
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum size is 20MB.');
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

  // ── Validate ──
  const validate = () => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\s/g, ''))) return 'Please enter a valid 10-digit phone number.';
    if (!age.trim() || !/^\d{1,3}$/.test(age) || parseInt(age) < 16 || parseInt(age) > 70) return 'Please enter a valid age (16-70).';
    if (!file) return 'Please upload your photo.';
    return null;
  };

  // ── Submit ──
  const handleSubmit = () => {
    const err = validate();
    if (err) {
      setError(err);
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
          <span className="logo-icon">⭐</span>
          <span className="logo-text">Model<span>Casting</span></span>
        </div>
        <div className="header-badge">🎬 Open Call</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge">🎬 MODEL CASTING</div>
              <h1>Get Discovered for <span>Movies & Videos</span></h1>
              <p>Submit your portfolio and get selected by top casting directors.</p>
              <div className="hero-stats">
                <div><span>🎬</span> 500+ Projects</div>
                <div><span>⭐</span> 2,000+ Models</div>
                <div><span>⏳</span> {String(timeRemaining.days).padStart(2, '0')}D {String(timeRemaining.hours).padStart(2, '0')}H {String(timeRemaining.minutes).padStart(2, '0')}M Left</div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge">📤 PROCESSING</div>
              <h1>Reviewing Your Submission</h1>
              <p>Our team is reviewing your portfolio.</p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="hero-badge">✅ SUBMITTED</div>
              <h1>Application Received!</h1>
              <p>You will be contacted if selected.</p>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Upload Form */}
        {step === 1 && (
          <div className="upload-card">
            <div className="form-header">
              <h2>Submit Your Portfolio</h2>
              <p>Enter your details and upload your best photo.</p>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
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
                <label>Phone Number <span className="required">*</span></label>
                <input
                  type="tel"
                  placeholder="e.g. 98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>

              <div className="form-group">
                <label>Age <span className="required">*</span></label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  min="16"
                  max="70"
                />
              </div>

              <div className="form-group">
                <label>Height (cm) <span className="optional">(optional)</span></label>
                <input
                  type="number"
                  placeholder="e.g. 170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value.replace(/\D/g, '').slice(0, 3))}
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
            </div>

            <div className="form-group full-width">
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
                    <div className="drop-icon">📸</div>
                    <h3>Drag & Drop Your Photo</h3>
                    <p>or <span className="browse-text">Browse Files</span></p>
                    <span className="supported-formats">JPG • PNG • WEBP • Max 20MB</span>
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
                'Submit Portfolio →'
              )}
            </button>

            <div className="trust-badges">
              <span><span className="badge-icon">🔒</span> 100% Secure</span>
              <span><span className="badge-icon">⭐</span> Free to Enter</span>
              <span><span className="badge-icon">🎬</span> Verified Casting</span>
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
            <h2>📤 Processing Your Submission</h2>
            <p>Our casting team is reviewing your portfolio.</p>
            <div className="processing-info">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value status-pending">⏳ Under Review</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-value">{category}</span>
              </div>
            </div>
            <p className="processing-note">This may take a few moments. Please wait...</p>
          </div>
        )}

        {/* Step 3: Appeal */}
        {step === 3 && (
          <div className="appeal-card">
            <div className="appeal-icon">📧</div>
            <h2>Application Submitted!</h2>
            <p>You will be contacted via email if selected for the next round.</p>
            <div className="appeal-info">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value status-success">✅ Submitted</span>
              </div>
              <div className="info-item">
                <span className="info-label">Next Step</span>
                <span className="info-value">Casting Review</span>
              </div>
            </div>
            <p className="appeal-note">To complete the process and receive updates, click the button below.</p>
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

      {/* ─── LIVE ACTIVITY ─── */}
      <section className="activity-section">
        <div className="activity-ticker">
          <span className="live-dot"></span>
          <span className="activity-text">🟢 {LIVE_UPDATES[liveUpdateIndex]}</span>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title">📋 How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Submit Your Portfolio</h3>
              <p>Upload your best photo and fill in your details.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Casting Review</h3>
              <p>Our team reviews your submission.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get Selected</h3>
              <p>You will be contacted if selected for the project.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE LOOK FOR ─── */}
      <section className="criteria-section">
        <h2 className="section-title">What We Look For</h2>
        <div className="criteria-grid">
          <div className="criteria-card">
            <span className="criteria-icon">🌟</span>
            <h3>Confidence</h3>
            <p>We look for models who exude confidence and charisma.</p>
          </div>
          <div className="criteria-card">
            <span className="criteria-icon">📸</span>
            <h3>Photogenic</h3>
            <p>Natural beauty and camera presence are key.</p>
          </div>
          <div className="criteria-card">
            <span className="criteria-icon">🎭</span>
            <h3>Versatility</h3>
            <p>Ability to adapt to different styles and concepts.</p>
          </div>
          <div className="criteria-card">
            <span className="criteria-icon">💪</span>
            <h3>Professionalism</h3>
            <p>Reliability and a strong work ethic are essential.</p>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title">📜 Terms & Conditions</h2>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all participants aged 16 years and above.</li>
            <li><strong>Portfolio:</strong> Photos must be clear, recent, and high-quality.</li>
            <li><strong>Selection:</strong> Casting directors will review all submissions.</li>
            <li><strong>Contact:</strong> Selected candidates will be contacted via email or phone.</li>
            <li><strong>Privacy:</strong> Your information will only be used for casting purposes.</li>
            <li><strong>Changes:</strong> The organizers reserve the right to modify or terminate this casting call at any time.</li>
          </ul>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">What kind of photos should I submit?</div>
            <div className="faq-answer">Submit a clear, high-quality portrait photo. Professional photos are preferred but not required.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">When will I hear back?</div>
            <div className="faq-answer">You will be contacted within 24-48 hours if selected for the next round.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Is there any fee to participate?</div>
            <div className="faq-answer">No, participation is completely free.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">What projects will I be considered for?</div>
            <div className="faq-answer">You will be considered for movies, music videos, commercials, and fashion campaigns.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Model Casting. All rights reserved.</p>
        <p className="footer-contact">Questions? support@modelcasting.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f8fafc;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #8B5CF6; }
        .header-badge {
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(139, 92, 246, 0.2);
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 45vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          color: #fff;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 40%, rgba(139, 92, 246, 0.08), transparent 70%);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #8B5CF6;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
        }
        .hero h1 {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
        }
        .hero h1 span {
          color: #8B5CF6;
        }
        .hero p {
          font-size: 1.05rem;
          color: #ccc;
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
          backdrop-filter: blur(8px);
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.06);
          font-weight: 600;
          font-size: 0.85rem;
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Main Content ── */
        .main-content {
          max-width: 720px;
          margin: -2rem auto 2.5rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Upload Card ── */
        .upload-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
        }
        .form-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .form-header h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a1a2e;
        }
        .form-header p {
          color: #6b7280;
          font-size: 0.95rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .full-width { grid-column: span 2; }
        .form-group {
          margin-bottom: 0.8rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.8rem;
          color: #374151;
          margin-bottom: 0.2rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group .optional { color: #9ca3af; font-weight: 400; font-size: 0.7rem; }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9rem;
          background: #f9fafb;
          transition: border-color 0.2s;
          outline: none;
          font-family: inherit;
          appearance: none;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color: #8B5CF6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
        }
        .form-group select option {
          background: #1a1a2e;
          color: #fff;
        }

        .drop-zone {
          position: relative;
          border: 2px dashed #e5e7eb;
          border-radius: 16px;
          padding: 1.8rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .drop-zone:hover {
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.04);
        }
        .drop-zone.dragging {
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.08);
          transform: scale(1.01);
        }
        .drop-zone.has-file {
          border-color: #22C55E;
          border-style: solid;
        }
        .drop-icon { font-size: 2.5rem; margin-bottom: 0.3rem; }
        .drop-zone h3 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
        .drop-zone p { color: #6b7280; font-size: 0.9rem; }
        .browse-text { color: #8B5CF6; font-weight: 600; text-decoration: underline; }
        .supported-formats { font-size: 0.7rem; color: #9ca3af; margin-top: 0.3rem; }

        .file-preview {
          position: relative;
          width: 100%;
          max-width: 300px;
        }
        .file-preview img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: 12px;
        }
        .file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          padding: 0.3rem;
        }
        .file-size { font-size: 0.7rem; color: #6b7280; }
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
        .remove-file:hover { transform: scale(1.1); }

        .submit-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.3);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.2rem;
          font-size: 0.7rem;
          color: #6b7280;
        }
        .trust-badges span {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .badge-icon { font-size: 0.8rem; }
        .form-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin: 0.5rem 0;
        }

        /* ── Processing Card ── */
        .processing-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
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
          background: #8B5CF6;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .pulse-circle.delay-1 { animation-delay: 0.4s; background: #EC4899; }
        .pulse-circle.delay-2 { animation-delay: 0.8s; background: #22C55E; }
        @keyframes pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .processing-card h2 { font-size: 1.6rem; font-weight: 800; color: #1a1a2e; margin-bottom: 0.3rem; }
        .processing-card p { color: #6b7280; margin-bottom: 1.5rem; }
        .processing-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          background: #f8fafc;
          padding: 1.2rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
        }
        .info-item { text-align: center; }
        .info-label { display: block; font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { display: block; font-weight: 700; color: #1a1a2e; font-size: 1rem; }
        .info-value.status-pending { color: #f59e0b; }
        .info-value.status-success { color: #22C55E; }
        .processing-note { font-size: 0.85rem; color: #6b7280; }

        /* ── Appeal Card ── */
        .appeal-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid rgba(34, 197, 94, 0.2);
          animation: fadeIn 0.5s ease-out;
        }
        .appeal-icon { font-size: 4rem; margin-bottom: 0.5rem; }
        .appeal-card h2 { font-size: 1.6rem; font-weight: 800; color: #1a1a2e; margin-bottom: 0.3rem; }
        .appeal-card p { color: #6b7280; margin-bottom: 1.5rem; }
        .appeal-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          background: #f8fafc;
          padding: 1.2rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
        }
        .appeal-note { font-size: 0.9rem; color: #6b7280; margin-bottom: 1.5rem; }
        .appeal-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
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
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
        }
        .appeal-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Redirect Card ── */
        .redirect-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
          animation: fadeIn 0.5s ease-out;
        }
        .redirect-animation {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .redirect-card h2 { font-size: 1.6rem; font-weight: 800; color: #1a1a2e; }
        .redirect-card p { color: #6b7280; }

        /* ── Live Activity ── */
        .activity-section {
          padding: 1.5rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .activity-ticker {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #fff;
          padding: 0.6rem 1.2rem;
          border-radius: 60px;
          border: 1px solid #eef2f6;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
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
        .activity-text { color: #4b5563; font-size: 0.85rem; }

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
          background: linear-gradient(90deg, #8B5CF6, #EC4899);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .step {
          background: #fff;
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #eef2f6;
          transition: transform 0.2s;
        }
        .step:hover { transform: translateY(-4px); }
        .step-number {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 auto 0.6rem;
        }
        .step-content h3 { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
        .step-content p { font-size: 0.8rem; color: #6b7280; }

        /* ── Criteria Section ── */
        .criteria-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .criteria-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .criteria-card {
          background: #fff;
          padding: 1.5rem 1rem;
          border-radius: 20px;
          text-align: center;
          border: 1px solid #eef2f6;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .criteria-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .criteria-icon { font-size: 2rem; display: block; margin-bottom: 0.3rem; }
        .criteria-card h3 { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
        .criteria-card p { font-size: 0.8rem; color: #6b7280; }

        /* ── Terms Section ── */
        .terms-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content {
          background: #fff;
          padding: 1.8rem;
          border-radius: 20px;
          border: 1px solid #eef2f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.5rem 0 0.5rem 1.8rem;
          position: relative;
          color: #4b5563;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.85rem;
        }
        .terms-content ul li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #8B5CF6;
          font-weight: 700;
        }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong { color: #1a1a2e; }

        /* ── FAQ Section ── */
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
        .faq-item:hover { border-color: #8B5CF6; }
        .faq-question { font-weight: 700; font-size: 0.9rem; color: #1a1a2e; }
        .faq-answer p { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }

        /* ── Footer ── */
        .site-footer {
          background: #1a1a2e;
          color: #9ca3af;
          padding: 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 1rem;
        }
        .site-footer p { font-size: 0.75rem; margin-bottom: 0.2rem; }
        .footer-contact { font-weight: 600; color: #e5e7eb; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
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
          border: 1px solid rgba(139, 92, 246, 0.15);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }
        .modal-icon { font-size: 3rem; margin-bottom: 0.3rem; }
        .modal-card h2 { font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.3rem; }
        .modal-card p { color: #aaa; font-size: 0.85rem; margin-bottom: 1.5rem; }
        .modal-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .modal-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
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
        .modal-btn:hover { background: rgba(255,255,255,0.12); }
        .modal-btn.primary {
          background: #8B5CF6;
          border: none;
        }
        .modal-btn.primary:hover { background: #7C3AED; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.7rem;
          margin-top: 0.3rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
          .steps { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .criteria-grid { grid-template-columns: 1fr 1fr; }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.3rem 1rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .upload-card { padding: 1.5rem; }
          .processing-card { padding: 1.8rem 1.2rem; }
          .appeal-card { padding: 1.8rem 1.2rem; }
          .hero h1 { font-size: 1.8rem; }
          .criteria-grid { grid-template-columns: 1fr; }
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
export default withCampaignMeta(BeautyModelCasting, defaultMeta);