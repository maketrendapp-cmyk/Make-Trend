// pages/templates/survey-to-earn-cash.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaChartBar,
  FaDollarSign,
  FaClock,
  FaClipboardList,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaLock,
  FaGift,
  FaShieldAlt,
  FaStar,
  FaRegClock,
  FaCopy,
  FaExternalLinkAlt,
  FaGlobe,
  FaTrophy,
} from 'react-icons/fa';

// ── Default Meta (Clean URL) ──
const defaultMeta = {
  title: 'Survey to Earn Cash – Get $10 Free!',
  description: 'Complete a short survey and earn $10 instantly. Share your opinion, help brands improve, and get paid.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/survey-to-earn-cash', // ✅ Clean base URL
};

// ── Survey Questions ──
const SURVEY_QUESTIONS = [
  {
    id: 1,
    question: 'How often do you shop online?',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
  },
  {
    id: 2,
    question: 'What social media platform do you use most?',
    options: ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'Twitter'],
  },
  {
    id: 3,
    question: 'What type of content do you enjoy most?',
    options: ['Videos', 'Photos', 'Text/Articles', 'Live Streams', 'Gaming'],
  },
  {
    id: 4,
    question: 'How likely are you to recommend this to a friend?',
    options: ['Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely'],
  },
  {
    id: 5,
    question: 'What would you like to see more of?',
    options: ['Gaming Content', 'Fashion/Beauty', 'Tech Reviews', 'Food/Travel', 'Educational'],
  },
];

function SurveyToEarnCash({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1=survey, 2=form, 3=claimed
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 23, minutes: 59, seconds: 59 });

  // ── ✅ CLEAN URL: remove query params if no id ──
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

  // ── Countdown timer ──
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Select answer ──
  const selectAnswer = (option) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: option
    }));
  };

  // ── Next question ──
  const nextQuestion = () => {
    if (answers[currentQuestion] === undefined) {
      setError('Please select an answer before proceeding.');
      return;
    }
    setError('');
    if (currentQuestion < SURVEY_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Survey complete → move to form step
      setStep(2);
    }
  };

  // ── Previous question ──
  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // ── Validate form ──
  const validateForm = () => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    if (!acceptedTerms) return 'You must accept the terms to continue.';
    return null;
  };

  // ── Claim reward ──
  const handleClaim = () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  // ── Continue to tasks ──
  const handleContinue = () => {
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
          <FaGlobe className="modal-icon" style={{ fontSize: '3rem', marginBottom: '0.3rem', color: '#00B4D8' }} />
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

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <FaChartBar className="logo-icon" />
          <span className="logo-text">Survey<span>Reward</span></span>
        </div>
        <div className="header-badge"><FaDollarSign className="icon-inline" /> $10 Reward</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge"><FaClipboardList className="icon-inline" /> PAID SURVEY</div>
              <h1>Share Your Opinion<br />Get <span>$10</span> Free</h1>
              <p>Complete a short survey and earn $10 instantly. No hidden fees.</p>
              <div className="hero-stats">
                <div><FaRegClock className="icon-inline" /> 3-5 Minutes</div>
                <div><FaClipboardList className="icon-inline" /> 5 Questions</div>
                <div><FaClock className="icon-inline" /> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left</div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge"><FaCheckCircle className="icon-inline" /> SURVEY COMPLETE</div>
              <h1>Almost Done!</h1>
              <p>Enter your details to claim your $10 reward.</p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="hero-badge"><FaGift className="icon-inline" /> REWARD READY</div>
              <h1>You Earned <span>$10</span>!</h1>
              <p>Your reward has been confirmed.</p>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Survey Questions */}
        {step === 1 && (
          <div className="survey-card">
            <div className="survey-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((currentQuestion + 1) / SURVEY_QUESTIONS.length) * 100}%` }}
                ></div>
              </div>
              <span className="progress-text">{currentQuestion + 1} / {SURVEY_QUESTIONS.length}</span>
            </div>

            <div className="question-container">
              <h3 className="question-text">{SURVEY_QUESTIONS[currentQuestion].question}</h3>
              <div className="options-grid">
                {SURVEY_QUESTIONS[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`option-btn ${answers[currentQuestion] === option ? 'selected' : ''}`}
                    onClick={() => selectAnswer(option)}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                    {option}
                    {answers[currentQuestion] === option && <FaCheckCircle className="check-mark" />}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="survey-actions">
              <button 
                className="prev-btn" 
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
              >
                <FaArrowLeft className="icon-inline" /> Back
              </button>
              <button className="next-btn" onClick={nextQuestion}>
                {currentQuestion === SURVEY_QUESTIONS.length - 1 ? (
                  <>Submit Survey <FaArrowRight className="icon-inline" /></>
                ) : (
                  <>Next <FaArrowRight className="icon-inline" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <div className="form-card">
            <div className="reward-badge"><FaDollarSign className="icon-inline" /> $10 Reward</div>
            <h2>Enter Your Details</h2>
            <p>Fill in your information to claim your $10 reward.</p>

            <div className="form-group">
              <label><FaUser className="icon-inline" /> Full Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><FaEnvelope className="icon-inline" /> Email Address <span className="required">*</span></label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms">I agree to the <a href="#terms">Terms &amp; Conditions</a></label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="claim-btn" onClick={handleClaim} disabled={loading}>
              {loading ? (
                <>
                  <FaSpinner className="spinner" /> Processing...
                </>
              ) : (
                <>
                  Claim $10 Now <FaArrowRight className="icon-inline" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Claimed Success */}
        {step === 3 && (
          <div className="success-card">
            <div className="success-icon"><FaCheckCircle style={{ color: '#22C55E' }} /></div>
            <h2>$10 Reward Claimed!</h2>
            <p>Your reward has been confirmed and is being processed.</p>
            <div className="reward-display">
              <FaDollarSign className="reward-icon" style={{ color: '#00B4D8' }} />
              <span className="reward-amount">$10</span>
            </div>
            <div className="success-info">
              <p>Check your email for confirmation details.</p>
            </div>
            <button className="continue-btn" onClick={handleContinue} disabled={loading}>
              {loading ? (
                <>
                  <FaSpinner className="spinner" /> Redirecting...
                </>
              ) : (
                <>
                  Continue <FaArrowRight className="icon-inline" />
                </>
              )}
            </button>
          </div>
        )}

      </main>

      {/* ─── WHY PARTICIPATE ─── */}
      <section className="why-section">
        <h2 className="section-title">Why Participate?</h2>
        <div className="why-grid">
          <div className="why-card">
            <FaDollarSign className="why-icon" style={{ color: '#22C55E' }} />
            <h3>Earn $10</h3>
            <p>Get paid $10 for sharing your opinion.</p>
          </div>
          <div className="why-card">
            <FaRegClock className="why-icon" style={{ color: '#00B4D8' }} />
            <h3>Quick Survey</h3>
            <p>Only 5 questions – takes 3-5 minutes.</p>
          </div>
          <div className="why-card">
            <FaLock className="why-icon" style={{ color: '#F59E0B' }} />
            <h3>Safe & Secure</h3>
            <p>Your data is protected and private.</p>
          </div>
          <div className="why-card">
            <FaStar className="why-icon" style={{ color: '#8B5CF6' }} />
            <h3>Impact Brands</h3>
            <p>Help brands improve their products.</p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <h2 className="section-title"><FaClipboardList className="icon-inline" /> How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Take Survey</h3>
              <p>Answer 5 simple questions.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Enter Details</h3>
              <p>Provide your name and email.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get $10</h3>
              <p>Claim your reward instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title"><FaShieldAlt className="icon-inline" /> Terms & Conditions</h2>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all users aged 18 years and above.</li>
            <li><strong>One Survey Per User:</strong> Each user can complete the survey once.</li>
            <li><strong>Reward Distribution:</strong> $10 reward is credited within 24 hours.</li>
            <li><strong>Honest Responses:</strong> All responses must be truthful and accurate.</li>
            <li><strong>Fraud Prevention:</strong> Any fraudulent activity will result in disqualification.</li>
            <li><strong>Changes:</strong> The organizers reserve the right to modify or terminate this offer at any time.</li>
          </ul>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">FAQ</h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">How long does the survey take?</div>
            <div className="faq-answer">The survey takes 3-5 minutes to complete.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How do I receive the $10?</div>
            <div className="faq-answer">You'll receive the $10 reward via email or payment method provided.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Is my data safe?</div>
            <div className="faq-answer">Yes, your data is protected and never shared with third parties.</div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Can I take the survey more than once?</div>
            <div className="faq-answer">No, each user can only complete the survey once.</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Survey Reward. All rights reserved.</p>
        <p className="footer-contact">Questions? support@surveyreward.com</p>
      </footer>

      {/* ─── ENHANCED STYLES ─── */}
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
        }
        .icon-inline {
          display: inline-block;
          margin-right: 4px;
          vertical-align: middle;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0, 180, 216, 0.15);
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.6rem;
          font-weight: 800; font-size: 1.2rem;
        }
        .logo-icon { font-size: 1.4rem; color: #00B4D8; }
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #00B4D8; }
        .header-badge {
          background: linear-gradient(135deg, #00B4D8, #0077B6);
          color: #fff;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 12px rgba(0, 180, 216, 0.2);
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
          background: linear-gradient(135deg, #f0f4f8, #e0e8f0);
          color: #1a1a2e;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300B4D8' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(0, 180, 216, 0.12);
          border: 1px solid rgba(0, 180, 216, 0.2);
          padding: 0.3rem 1.5rem;
          border-radius: 40px;
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #00B4D8;
          margin-bottom: 0.8rem;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }
        .hero-badge:hover {
          background: rgba(0, 180, 216, 0.2);
          transform: scale(1.02);
        }
        .hero h1 {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.3rem;
          color: #1a1a2e;
        }
        .hero h1 span {
          color: #00B4D8;
        }
        .hero p {
          font-size: 1.05rem;
          color: #555;
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
          color: #555;
          transition: all 0.3s ease;
        }
        .hero-stats div:hover {
          background: rgba(0, 180, 216, 0.06);
          transform: translateY(-2px);
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Main Content ── */
        .main-content {
          max-width: 560px;
          margin: -1.5rem auto 2.5rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Survey Card ── */
        .survey-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
          transition: box-shadow 0.3s ease;
        }
        .survey-card:hover {
          box-shadow: 0 28px 80px rgba(0,0,0,0.08);
        }
        .survey-progress {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1.5rem;
        }
        .progress-bar {
          flex: 1;
          height: 6px;
          background: #e5e7eb;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00B4D8, #0077B6);
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .progress-text {
          font-size: 0.75rem;
          font-weight: 700;
          color: #00B4D8;
        }
        .question-container {
          margin-bottom: 1.5rem;
        }
        .question-text {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 1rem;
        }
        .options-grid {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .option-btn {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.8rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          background: #f9fafb;
          font-size: 0.9rem;
          font-weight: 500;
          color: #1a1a2e;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
        }
        .option-btn:hover {
          border-color: #00B4D8;
          background: #f0f9ff;
          transform: translateX(4px);
        }
        .option-btn.selected {
          border-color: #00B4D8;
          background: #f0f9ff;
          box-shadow: 0 0 0 4px rgba(0, 180, 216, 0.08);
        }
        .option-letter {
          font-weight: 700;
          color: #9ca3af;
          min-width: 24px;
        }
        .option-btn.selected .option-letter {
          color: #00B4D8;
        }
        .check-mark {
          margin-left: auto;
          color: #22C55E;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .survey-actions {
          display: flex;
          gap: 0.8rem;
        }
        .prev-btn {
          padding: 0.7rem 1.5rem;
          background: #f3f4f6;
          border: none;
          border-radius: 60px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .prev-btn:hover:not(:disabled) { background: #e5e7eb; transform: translateX(-2px); }
        .prev-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .next-btn {
          flex: 1;
          padding: 0.7rem 1rem;
          background: linear-gradient(135deg, #00B4D8, #0077B6);
          border: none;
          border-radius: 60px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 180, 216, 0.25);
        }
        .next-btn:active { transform: scale(0.98); }
        .form-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin: 0.5rem 0;
        }

        /* ── Form Card ── */
        .form-card {
          background: #fff;
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
          transition: box-shadow 0.3s ease;
        }
        .form-card:hover {
          box-shadow: 0 28px 80px rgba(0,0,0,0.08);
        }
        .reward-badge {
          display: inline-block;
          background: linear-gradient(135deg, #00B4D8, #0077B6);
          color: #fff;
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          font-weight: 700;
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
        }
        .form-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a1a2e;
        }
        .form-card > p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.8rem;
          color: #374151;
          margin-bottom: 0.2rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9rem;
          background: #f9fafb;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .form-group input:focus {
          border-color: #00B4D8;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(0, 180, 216, 0.08);
        }

        .checkbox-group {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 1rem 0;
        }
        .checkbox-group input {
          width: 18px; height: 18px;
          margin-top: 2px;
          accent-color: #00B4D8;
          flex-shrink: 0;
        }
        .checkbox-group label {
          font-size: 0.8rem;
          color: #4b5563;
        }
        .checkbox-group label a {
          color: #00B4D8;
          text-decoration: none;
        }

        .claim-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .claim-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
        }
        .claim-btn:active:not(:disabled) { transform: scale(0.98); }
        .claim-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Success Card ── */
        .success-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef2f6;
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .success-icon { font-size: 3.5rem; margin-bottom: 0.3rem; }
        .success-card h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a1a2e;
        }
        .success-card p { color: #6b7280; margin-bottom: 1.2rem; }
        .reward-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          background: #f0f9ff;
          padding: 0.8rem 1.5rem;
          border-radius: 60px;
          margin: 0 auto 1.2rem;
          max-width: 160px;
          border: 1px solid rgba(0, 180, 216, 0.1);
          transition: all 0.3s ease;
        }
        .reward-display:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 180, 216, 0.1);
        }
        .reward-icon { font-size: 1.8rem; }
        .reward-amount { font-size: 1.6rem; font-weight: 900; color: #00B4D8; }
        .success-info { margin-bottom: 1.5rem; }
        .success-info p { color: #6b7280; font-size: 0.9rem; }

        .continue-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #00B4D8, #0077B6);
          border: none;
          border-radius: 60px;
          font-weight: 700;
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 16px rgba(0, 180, 216, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .continue-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 180, 216, 0.3);
        }
        .continue-btn:active:not(:disabled) { transform: scale(0.98); }
        .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Why Participate ── */
        .why-section {
          padding: 3rem 1.5rem;
          max-width: 1000px;
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
          background: linear-gradient(90deg, #00B4D8, #0077B6);
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .why-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.2rem;
          margin-top: 1.5rem;
        }
        .why-card {
          background: #fff;
          border-radius: 20px;
          padding: 1.5rem 1rem;
          text-align: center;
          border: 1px solid #eef2f6;
          transition: all 0.3s ease;
        }
        .why-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          border-color: #00B4D8;
        }
        .why-icon { font-size: 2rem; display: block; margin-bottom: 0.3rem; }
        .why-card h3 { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
        .why-card p { font-size: 0.8rem; color: #888; }

        /* ── How It Works ── */
        .how-section {
          padding: 3rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
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
          border: 1px solid #eef2f6;
          transition: all 0.3s ease;
        }
        .step:hover {
          transform: translateY(-6px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          border-color: #00B4D8;
        }
        .step-number {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #00B4D8, #0077B6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 auto 0.6rem;
          transition: transform 0.3s ease;
        }
        .step:hover .step-number {
          transform: scale(1.05);
        }
        .step-content h3 { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
        .step-content p { font-size: 0.8rem; color: #888; }

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
          transition: border-color 0.3s ease;
        }
        .terms-content:hover {
          border-color: #00B4D8;
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
          transition: color 0.3s ease;
        }
        .terms-content ul li:hover {
          color: #1a1a2e;
        }
        .terms-content ul li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #00B4D8;
          font-weight: 700;
        }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong { color: #1a1a2e; }

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
          transition: all 0.3s ease;
        }
        .faq-item:hover {
          border-color: #00B4D8;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .faq-question { font-weight: 700; font-size: 0.9rem; color: #1a1a2e; }
        .faq-answer { font-size: 0.85rem; color: #6b7280; margin-top: 0.3rem; }

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
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 36px;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(0, 180, 216, 0.15);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
          transition: all 0.25s ease;
          flex: 1;
          min-width: 100px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .modal-btn:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-2px);
        }
        .modal-btn.primary {
          background: #00B4D8;
          border: none;
          color: #fff;
        }
        .modal-btn.primary:hover {
          background: #0077B6;
          box-shadow: 0 4px 16px rgba(0, 180, 216, 0.3);
        }
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
          .why-grid { grid-template-columns: 1fr 1fr; }
          .steps { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.3rem 1rem; }
          .survey-actions { flex-wrap: wrap; }
          .prev-btn { flex: 1; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.55rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .survey-card { padding: 1.5rem; }
          .form-card { padding: 1.5rem; }
          .success-card { padding: 1.5rem; }
          .why-grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 1.8rem; }
          .question-text { font-size: 1rem; }
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
export default withCampaignMeta(SurveyToEarnCash, defaultMeta);