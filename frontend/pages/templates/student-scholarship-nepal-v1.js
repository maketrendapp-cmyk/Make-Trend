// pages/templates/student-scholarship-nepal-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

function StudentScholarshipNepalV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState({
    name: '',
    college: '',
    class: '',
    phone: '',
    rollNumber: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 24,
    minutes: 0,
    seconds: 0,
  });
  const [showWebViewWarning, setShowWebViewWarning] = useState(false);

  // ── Detect WebView ──
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isWebView = /FBAN|FBAV|Instagram|WebView|wv/.test(ua);
    setIsWebView(isWebView);
    if (isWebView) {
      setShowWebViewWarning(true);
    }
  }, []);

  // ── 24‑hour countdown timer ──
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

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ── Handle form input changes ──
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // ── Validate and submit ──
  const handleContinue = () => {
    const { name, college, class: studentClass } = formData;

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!college.trim()) {
      setError('Please enter your college name.');
      return;
    }
    if (!studentClass) {
      setError('Please select your class.');
      return;
    }

    setIsLoading(true);

    if (!id) {
      setError('Campaign ID missing. Please check the link.');
      setIsLoading(false);
      return;
    }

    router.push(`/tasks?id=${id}`);
  };

  // ── WebView Warning Overlay ──
  if (showWebViewWarning) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Open in Browser</h2>
          <p className="text-gray-500 text-sm mb-6">
            This page works best in a full browser. Please open it in your default browser to continue.
          </p>
          <button
            onClick={() => {
  const currentUrl = window.location.href;
  // Try to open in a new browser tab
  const newWindow = window.open(currentUrl, '_blank');
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    // Fallback: copy link and let user paste manually
    navigator.clipboard?.writeText(currentUrl)
      .then(() => {
        alert('Link copied! Please open it in your browser.');
        setShowWebViewWarning(false);
      })
      .catch(() => {
        // If clipboard fails, just show the URL
        alert(`Please copy this URL and open in your browser: ${currentUrl}`);
        setShowWebViewWarning(false);
      });
  } else {
    // Success: close the overlay
    setShowWebViewWarning(false);
  }
}}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            Open in Browser
          </button>
          <button
            onClick={() => setShowWebViewWarning(false)}
            className="mt-3 w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition text-sm"
          >
            Continue Anyway
          </button>
          <p className="mt-3 text-xs text-gray-400">If the button doesn't work, copy the URL manually.</p>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="header-logo">
          <span className="logo-text">📘 <strong>Scholarship</strong> 2026</span>
        </div>
        <div className="header-badge">
          <span className="pulse-dot"></span> Official Program
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-icon">🎓</div>
          <h1>Student Scholarship Program 2026</h1>
          <p>Government initiative to support Class 11 &amp; 12 students with laptops for digital learning.</p>
          <div className="hero-badge-row">
            <span><span className="icon">⏳</span> 24 Hours</span>
            <span><span className="icon">📚</span> Class 11–12</span>
            <span><span className="icon">💻</span> Laptop</span>
          </div>
        </div>
      </section>

      <main className="main-card-wrapper">
        <div className="reward-card">
          <div className="timer-section">
            <div className="timer-display">
              <div className="timer-block">
                <span className="timer-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="timer-label">Hours</span>
              </div>
              <span className="timer-separator">:</span>
              <div className="timer-block">
                <span className="timer-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="timer-label">Minutes</span>
              </div>
              <span className="timer-separator">:</span>
              <div className="timer-block">
                <span className="timer-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="timer-label">Seconds</span>
              </div>
            </div>
            <p className="timer-subtext">⏳ Time remaining to apply</p>
          </div>

          <div className="step-indicator">
            <div className="step-dot active">1</div>
            <div className="step-dot">2</div>
          </div>

          <div className="panel">
            <div className="text-center">
              <span className="reward-tag">🎯 Apply Now</span>
              <h2 className="form-title">Student Details</h2>
              <p className="benefit-text">
                Fill in your details to apply for the <strong>laptop scholarship</strong>. This is a limited‑time opportunity.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Full Name <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                placeholder="e.g., Ram Sharma"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-input ${error && !formData.name ? 'error' : ''}`}
              />
            </div>

            <div className="input-group">
              <label className="input-label">College / School <span className="required">*</span></label>
              <input
                type="text"
                name="college"
                placeholder="e.g., Janata Secondary School"
                value={formData.college}
                onChange={handleInputChange}
                className={`form-input ${error && !formData.college ? 'error' : ''}`}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Class <span className="required">*</span></label>
              <select
                name="class"
                value={formData.class}
                onChange={handleInputChange}
                className={`form-select ${error && !formData.class ? 'error' : ''}`}
              >
                <option value="">Select your class</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Phone Number <span className="optional">(optional)</span></label>
              <input
                type="tel"
                name="phone"
                placeholder="e.g., 98XXXXXXXX"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Symbol / Roll No. <span className="optional">(optional)</span></label>
              <input
                type="text"
                name="rollNumber"
                placeholder="e.g., 12345"
                value={formData.rollNumber}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button
              className="btn-primary"
              onClick={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Continue to Claim 🎓'}
            </button>

            <div className="trust-badges">
              <span><span className="icon">🔒</span> Secure</span>
              <span><span className="icon">✅</span> Verified</span>
              <span><span className="icon">🏛️</span> Government</span>
            </div>
          </div>
        </div>
      </main>

      <div className="trust-cards">
        <div><span className="icon">💻</span><span>Laptop</span></div>
        <div><span className="icon">📚</span><span>Class 11–12</span></div>
        <div><span className="icon">🏛️</span><span>Government</span></div>
        <div><span className="icon">⏳</span><span>24 Hours</span></div>
      </div>

      <div className="info-sections">
        <div className="info-block">
          <h3><span className="icon">📖</span> About the Program</h3>
          <p>
            The <strong>Student Scholarship Program 2026</strong> is a government initiative to provide <strong>laptops</strong> to Class 11 and 12 students across Nepal. The goal is to bridge the digital divide and enable students to access online learning resources effectively.
          </p>
        </div>
        <div className="info-block">
          <h3><span className="icon">📋</span> Eligibility &amp; Terms</h3>
          <ul>
            <li><strong>Open to:</strong> All students currently enrolled in Class 11 or 12.</li>
            <li><strong>Institution:</strong> Must be studying in a recognized school/college in Nepal.</li>
            <li><strong>One application</strong> per student – duplicate entries will be disqualified.</li>
            <li>Selected students will be notified via SMS/email.</li>
            <li>This is a <strong>limited‑time offer</strong> – apply within 24 hours.</li>
          </ul>
        </div>
      </div>

      <footer className="site-footer">
        <p>© 2026 Ministry of Education, Nepal. All Rights Reserved.</p>
        <p className="footer-contact">Kathmandu, Nepal &nbsp;|&nbsp; Support: 1660</p>
      </footer>

      {/* ── Styles using dangerouslySetInnerHTML (same as ncell template) ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f0f7ff; color: #1f2937; line-height: 1.6; min-height: 100vh; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; }

        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 86, 179, 0.08);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-logo .logo-text { font-size: 1.1rem; font-weight: 800; color: #0a2463; letter-spacing: -0.5px; }
        .header-logo .logo-text strong { color: #0066cc; }
        .header-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #0066cc;
          background: #e6f0ff;
          padding: 6px 14px;
          border-radius: 99px;
          border: 1px solid rgba(0, 86, 179, 0.15);
        }
        .pulse-dot { width: 8px; height: 8px; background: #0066cc; border-radius: 50%; animation: pulseDot 2s infinite; }
        @keyframes pulseDot { 0%,100% { box-shadow: 0 0 0 0 rgba(0,102,204,0.5); } 50% { box-shadow: 0 0 0 10px rgba(0,102,204,0); } }

        .hero-section {
          position: relative;
          width: 100%;
          min-height: 240px;
          background: linear-gradient(155deg, rgba(10, 36, 99, 0.88), rgba(0, 86, 179, 0.85), rgba(0, 153, 204, 0.75)),
            url('https://images.unsplash.com/photo-1523050854058-8df90110c7f1?q=80&w=1200&auto=format&fit=crop') center/cover no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: white;
          padding: 3rem 1.5rem;
        }
        .hero-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .hero-content h1 { font-size: clamp(1.3rem, 3vw, 2rem); font-weight: 900; letter-spacing: -0.5px; margin-bottom: 0.4rem; }
        .hero-content p { font-size: 0.9rem; opacity: 0.9; font-weight: 500; max-width: 420px; margin: 0 auto; }
        .hero-badge-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 1rem; }
        .hero-badge-row span {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .hero-badge-row .icon { margin-right: 4px; }

        .timer-section {
          background: linear-gradient(135deg, #f0f7ff, #e6f0ff);
          border-radius: 20px;
          padding: 1.2rem 1rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(0, 86, 179, 0.08);
        }
        .timer-display { display: flex; justify-content: center; align-items: center; gap: 4px; }
        .timer-block { text-align: center; min-width: 50px; }
        .timer-value {
          display: block;
          font-size: 2rem;
          font-weight: 900;
          color: #0a2463;
          letter-spacing: 1px;
          line-height: 1.2;
        }
        .timer-label {
          display: block;
          font-size: 0.55rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #5a7a9a;
          letter-spacing: 0.5px;
        }
        .timer-separator {
          font-size: 2rem;
          font-weight: 900;
          color: #0a2463;
          padding: 0 2px;
        }
        .timer-subtext {
          text-align: center;
          font-size: 0.7rem;
          color: #5a7a9a;
          margin-top: 6px;
          font-weight: 600;
        }

        .main-card-wrapper { max-width: 480px; margin: -45px auto 2rem; padding: 0 1rem; position: relative; z-index: 10; }
        .reward-card {
          background: #ffffff;
          border-radius: 36px;
          padding: 2rem 1.6rem;
          box-shadow: 0 24px 56px rgba(0,0,0,0.10), 0 12px 32px rgba(0, 86, 179, 0.12);
          border: 1px solid rgba(0, 86, 179, 0.06);
        }

        .step-indicator { display: flex; justify-content: center; gap: 12px; margin-bottom: 1.8rem; }
        .step-dot {
          width: 34px; height: 34px; border-radius: 50%;
          background: white;
          border: 2.5px solid #d1d5db;
          display: flex;
          align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 800;
          color: #9ca3af;
          transition: all 0.3s ease;
        }
        .step-dot.active {
          border-color: #0066cc;
          color: #0066cc;
          background: #e6f0ff;
          box-shadow: 0 0 0 6px rgba(0, 86, 179, 0.08);
        }
        .step-dot.completed {
          background: #0066cc;
          border-color: #0066cc;
          color: white;
        }

        .panel { animation: fadeSlide 0.4s ease-out forwards; }
        @keyframes fadeSlide { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        .text-center { text-align: center; }

        .reward-tag {
          display: inline-block;
          background: #e6f0ff;
          color: #0066cc;
          font-weight: 800;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          padding: 6px 16px;
          border-radius: 99px;
          margin-bottom: 0.5rem;
          border: 1px solid rgba(0, 86, 179, 0.15);
        }
        .form-title { font-size: 1.5rem; font-weight: 900; color: #0a2463; margin-bottom: 0.2rem; }
        .benefit-text { font-size: 0.85rem; color: #6b7280; margin-bottom: 1.5rem; font-weight: 500; }
        .input-group { margin-bottom: 1rem; }
        .input-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 5px;
        }
        .input-label .required { color: #ef4444; margin-left: 2px; }
        .input-label .optional { color: #9ca3af; font-weight: 400; font-size: 0.7rem; margin-left: 4px; }
        .form-input, .form-select {
          width: 100%;
          padding: 0.9rem 1rem;
          border: 2.5px solid #e5e7eb;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 500;
          color: #111827;
          background: #f9fafb;
          transition: all 0.3s ease;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }
        .form-input:focus, .form-select:focus {
          border-color: #0066cc;
          background: white;
          outline: none;
          box-shadow: 0 0 0 6px rgba(0, 86, 179, 0.06);
        }
        .form-input.error, .form-select.error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 6px rgba(239,68,68,0.06) !important;
        }
        .form-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; padding-right: 2.8rem; }
        .error-msg { display: block; font-size: 0.75rem; color: #ef4444; margin-top: 6px; font-weight: 600; padding-left: 4px; }

        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #0a2463 0%, #0066cc 100%);
          color: white;
          border: none;
          padding: 1.1rem;
          border-radius: 20px;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 12px 32px rgba(0, 86, 179, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 0.3px;
          font-family: inherit;
          margin-top: 0.5rem;
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(0, 86, 179, 0.35); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        .trust-badges {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 1.8rem;
          padding-top: 1.4rem;
          border-top: 1px solid #f3f4f6;
        }
        .trust-badges span {
          text-align: center;
          font-size: 0.65rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .trust-badges .icon { display: block; font-size: 1.3rem; margin-bottom: 4px; color: #0066cc; }

        .trust-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          max-width: 700px;
          margin: 0 auto 2rem;
          padding: 0 1.5rem;
        }
        .trust-cards div {
          background: white;
          border-radius: 28px;
          padding: 1.2rem;
          text-align: center;
          border: 1px solid #f3f4f6;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.3s ease;
        }
        .trust-cards div:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .trust-cards .icon { display: block; font-size: 1.8rem; margin-bottom: 6px; }
        .trust-cards span { font-size: 0.7rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }

        .info-sections { max-width: 700px; margin: 2rem auto 2rem; padding: 0 1.5rem; }
        .info-block {
          background: white;
          border-radius: 28px;
          padding: 1.8rem;
          margin-bottom: 1.5rem;
          border: 1px solid #f3f4f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.3s ease;
        }
        .info-block:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .info-block h3 {
          font-size: 1rem;
          font-weight: 800;
          color: #0a2463;
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .info-block h3 .icon { font-size: 1.2rem; }
        .info-block p { font-size: 0.85rem; color: #6b7280; line-height: 1.7; }
        .info-block ul { list-style: none; padding: 0; }
        .info-block ul li {
          font-size: 0.83rem;
          color: #6b7280;
          padding: 6px 0 6px 22px;
          position: relative;
          line-height: 1.6;
        }
        .info-block ul li::before { content: '▸'; position: absolute; left: 0; color: #0066cc; font-weight: 700; }

        .site-footer {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 2rem 1.5rem;
          text-align: center;
        }
        .site-footer p { font-size: 0.7rem; color: #9ca3af; max-width: 550px; margin: 0 auto; line-height: 1.7; }
        .footer-contact { font-weight: 700; color: #6b7280; margin-top: 0.4rem; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }

        @media (max-width: 520px) {
          .hero-section { min-height: 180px; padding: 1.8rem 1rem; }
          .hero-content h1 { font-size: 1.2rem; }
          .hero-content p { font-size: 0.75rem; }
          .hero-icon { font-size: 2rem; }
          .main-card-wrapper { margin-top: -35px; padding: 0 0.7rem; }
          .reward-card { padding: 1.5rem 1.1rem; border-radius: 28px; }
          .timer-value { font-size: 1.6rem; }
          .timer-block { min-width: 40px; }
          .form-title { font-size: 1.2rem; }
          .form-input, .form-select { padding: 0.75rem 0.9rem; font-size: 0.85rem; border-radius: 14px; }
          .btn-primary { padding: 0.95rem; font-size: 0.95rem; border-radius: 16px; }
          .trust-badges { gap: 6px; }
          .trust-badges span { font-size: 0.6rem; }
          .trust-badges .icon { font-size: 1.1rem; }
          .info-sections { padding: 0 0.8rem; }
          .info-block { padding: 1.2rem; border-radius: 20px; }
          .trust-cards { grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 0.8rem; }
          .site-header { padding: 0.6rem 1rem; }
          .header-logo .logo-text { font-size: 0.95rem; }
          .header-badge { font-size: 0.55rem; padding: 5px 10px; gap: 4px; }
        }
        @media (max-width: 360px) {
          .timer-value { font-size: 1.3rem; }
          .timer-block { min-width: 32px; }
          .reward-card { padding: 1.2rem 0.9rem; }
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

export default withCampaignMeta(StudentScholarshipNepalV1, {
  title: 'Government Scholarship 2026 – Laptop for Students',
  description:
    'Apply for the Government Student Scholarship Program 2026. Class 11 & 12 students can get a laptop for digital learning. Limited time offer – 24 hours only.',
  image: 'https://i.postimg.cc/9fqWws3p/1784692216079.png',
  url: 'https://maketrend.vercel.app/student-scholarship-nepal-v1?id={id}',
});