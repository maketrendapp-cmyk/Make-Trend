// pages/templates/survey-to-earn-cash.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaPoll,
  FaDollarSign,
  FaClock,
  FaCheckCircle,
  FaShieldAlt,
  FaChartLine,
  FaArrowRight,
  FaArrowLeft,
  FaCopy,
  FaShareAlt,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
} from 'react-icons/fa';

// ── Default Meta (Clean base URL) ──
const defaultMeta = {
  title: 'Survey to Earn Cash – Get $10 Free!',
  description: 'Complete a short survey and earn $10 instantly. Share your opinion, help brands improve, and get paid.',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/survey-to-earn-cash',
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
  const [step, setStep] = useState(1); // 1=survey, 2=claimed success
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 23, minutes: 59, seconds: 59 });

  // ── Clean URL if no id parameter is present ──
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
      // Survey complete → move directly to congratulations success step
      setStep(2);
    }
  };

  // ── Previous question ──
  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
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

  // ── Share handlers ──
  const handleShare = (platform) => {
    const shareUrl = id ? `${window.location.origin}/survey-to-earn-cash?id=${id}` : `${window.location.origin}/survey-to-earn-cash`;
    const text = `💰 I just earned $10 on SurveyReward! Check it out:`;
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      default:
        navigator.clipboard?.writeText(shareUrl);
        alert('Link copied to clipboard!');
    }
  };

  // ── WebView Modal ──
  const WebViewModal = () => {
    if (!showWebViewModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-icon-container">
            <span className="modal-icon">🌐</span>
          </div>
          <h2>Open in Browser</h2>
          <p>For the best experience, open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                const shareUrl = id ? `${window.location.origin}/survey-to-earn-cash?id=${id}` : `${window.location.origin}/survey-to-earn-cash`;
                navigator.clipboard?.writeText(shareUrl);
                alert('Link copied! Open Chrome or Safari to paste.');
                setShowWebViewModal(false);
              }}
            >
              <FaCopy className="w-4 h-4" /> Copy Link
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
              <FaShareAlt className="w-4 h-4" /> Open in Browser
            </button>
          </div>
          <button
            className="modal-btn text-only"
            onClick={() => setShowWebViewModal(false)}
          >
            Continue anyway (Not Recommended)
          </button>
        </div>
      </div>
    );
  };

  // ── Main UI ──
  return (
    <div className="page-wrapper">
      <WebViewModal />

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon-bg"><FaPoll className="w-4 h-4 text-cyan-600" /></div>
            <span className="logo-text">Survey<span>Reward</span></span>
          </div>
          <div className="header-badge">
            <FaDollarSign className="w-3 h-3" /> $10 Reward
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-glow shape-1"></div>
        <div className="hero-glow shape-2"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge-wrap">
                <div className="hero-badge">
                  <span className="pulse-dot"></span> PAID OPINION SURVEY
                </div>
              </div>
              <h1>{campaign?.title || 'Share Your Opinion & Get $10 Free'}</h1>
              <p>{campaign?.description || 'Complete a short interactive survey and earn $10 instantly. Fast verification, zero fees.'}</p>
              <div className="hero-stats">
                <div className="stat-pill"><FaClock className="w-3.5 h-3.5 text-cyan-500" /> 3-5 Minutes</div>
                <div className="stat-pill"><FaPoll className="w-3.5 h-3.5 text-cyan-500" /> 5 Questions</div>
                <div className="stat-pill timer-pill">
                  ⏳ {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge-wrap">
                <div className="hero-badge">
                  <span className="pulse-dot"></span> REWARD SECURED
                </div>
              </div>
              <h1>Congratulations! <span>$10 Unlocked</span></h1>
              <p>Your survey responses have been successfully verified.</p>
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
              <span className="progress-text">Question {currentQuestion + 1} of {SURVEY_QUESTIONS.length}</span>
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
                    <span className="option-label">{option}</span>
                    {answers[currentQuestion] === option && <FaCheckCircle className="check-mark w-4 h-4 text-cyan-500 ml-auto" />}
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
                <FaArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button className="next-btn" onClick={nextQuestion}>
                <span>{currentQuestion === SURVEY_QUESTIONS.length - 1 ? 'Complete Survey' : 'Next Question'}</span>
                <FaArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Congratulations Success Card */}
        {step === 2 && (
          <div className="success-card">
            <div className="success-icon-wrap">
              <FaCheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2>🎉 Survey Completed!</h2>
            <p>You have successfully unlocked your <strong>$10 Cash Reward</strong>.</p>
            
            <div className="reward-display">
              <FaDollarSign className="w-6 h-6 text-cyan-600" />
              <span className="reward-amount">$10.00</span>
            </div>

            <div className="success-info">
              <p>Click below to finalize and secure your reward payout instantly.</p>
            </div>

            <button className="continue-btn" onClick={handleContinue} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> 
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <span>Continue to Claim →</span>
                  <FaArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="share-row">
              <span>Share this opportunity:</span>
              <button onClick={() => handleShare('whatsapp')}><FaWhatsapp className="w-5 h-5 text-emerald-500 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('facebook')}><FaFacebook className="w-5 h-5 text-blue-600 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('twitter')}><FaTwitter className="w-5 h-5 text-sky-400 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('copy')}><FaCopy className="w-5 h-5 text-slate-600 hover:scale-110 transition" /></button>
            </div>
          </div>
        )}

      </main>

      {/* ─── WHY PARTICIPATE ─── */}
      <section className="why-section">
        <div className="section-header">
          <h2 className="section-title">Why Participate?</h2>
          <p className="section-subtitle">Join thousands earning daily rewards</p>
        </div>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon-bg"><FaDollarSign className="w-5 h-5 text-cyan-600" /></div>
            <h3>Earn $10</h3>
            <p>Get paid for sharing your valuable opinion.</p>
          </div>
          <div className="why-card">
            <div className="why-icon-bg"><FaClock className="w-5 h-5 text-cyan-600" /></div>
            <h3>Quick Survey</h3>
            <p>Only 5 rapid questions take under 3 minutes.</p>
          </div>
          <div className="why-card">
            <div className="why-icon-bg"><FaShieldAlt className="w-5 h-5 text-cyan-600" /></div>
            <h3>Safe & Secure</h3>
            <p>Your personal data is strictly protected.</p>
          </div>
          <div className="why-card">
            <div className="why-icon-bg"><FaChartLine className="w-5 h-5 text-cyan-600" /></div>
            <h3>Impact Brands</h3>
            <p>Help global companies shape better products.</p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three easy steps to your cash reward</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Take Survey</h3>
              <p>Answer 5 straightforward questions.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Unlock Payout</h3>
              <p>Verify completion instantly.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get $10</h3>
              <p>Claim your reward right away.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <div className="section-header">
          <h2 className="section-title">Terms &amp; Conditions</h2>
        </div>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all participants aged 18 and above globally.</li>
            <li><strong>One Entry Per User:</strong> Each individual can complete this reward survey once.</li>
            <li><strong>Reward Processing:</strong> $10 credited safely to your account profile.</li>
            <li><strong>Authenticity:</strong> Honest responses are required for valid payout.</li>
          </ul>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-question">How long does the survey take?</div>
            <div className="faq-answer"><p>It takes only 3 to 5 minutes to complete all 5 questions.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-question">How do I receive the $10?</div>
            <div className="faq-answer"><p>The payout is processed automatically upon finishing verification tasks.</p></div>
          </div>
          <div className="faq-item">
            <div className="faq-question">Is my information safe?</div>
            <div className="faq-answer"><p>Yes, all communications are encrypted with industry-standard protocols.</p></div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} Survey Reward Platform. All rights reserved.</p>
          <p className="footer-contact">Secure feedback research network.</p>
        </div>
      </footer>

      {/* ─── ENHANCED STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: #00B4D8;
          --primary-dark: #0077B6;
          --primary-light: #e0f2fe;
          --bg-main: #f8fafc;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --success: #10b981;
          --card-bg: #ffffff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        body { background: var(--bg-main); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding: 1rem 1.5rem;
        }
        .header-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.6rem; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
        .logo-icon-bg { background: var(--primary-light); width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .logo-text { color: var(--text-main); }
        .logo-text span { color: var(--primary); }
        .header-badge {
          background: #ecfdf5; color: #059669; font-weight: 700; font-size: 0.7rem;
          padding: 0.4rem 0.9rem; border-radius: 40px; display: flex; align-items: center; gap: 6px;
          border: 1px solid #d1fae5;
        }

        /* ── Hero ── */
        .hero {
          position: relative; min-height: 45vh; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 4rem 1.5rem 5rem; overflow: hidden;
          background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.4; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: #38bdf8; top: -100px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #818cf8; bottom: -50px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1.2rem; }
        .hero-badge {
          background: #fff; border: 1px solid rgba(0, 180, 216, 0.2); padding: 0.4rem 1.1rem;
          border-radius: 40px; font-size: 0.7rem; font-weight: 800; color: var(--primary-dark);
          display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          letter-spacing: 0.5px;
        }
        .pulse-dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; display: block; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1rem; color: #0f172a; letter-spacing: -1px; }
        .hero h1 span { color: var(--primary); }
        .hero p { font-size: 1.1rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        
        .hero-stats { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
        .stat-pill { background: rgba(255,255,255,0.7); padding: 0.5rem 1.1rem; border-radius: 40px; border: 1px solid rgba(255,255,255,0.9); font-weight: 600; font-size: 0.85rem; color: var(--text-muted); backdrop-filter: blur(4px); display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .timer-pill { color: #0369a1; font-weight: 700; background: #e0f2fe; border-color: #bae6fd; }

        /* ── Main Content ── */
        .main-content { max-width: 600px; margin: -3.5rem auto 3rem; padding: 0 1.5rem; position: relative; z-index: 10; }

        /* ── Survey Card ── */
        .survey-card {
          background: var(--card-bg); border-radius: 28px; padding: 2.5rem 2rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
        }
        .survey-progress { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.8rem; }
        .progress-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-dark)); border-radius: 99px; transition: width 0.4s ease; }
        .progress-text { font-size: 0.75rem; font-weight: 800; color: var(--primary); white-space: nowrap; }

        .question-container { margin-bottom: 1.8rem; }
        .question-text { font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 1.2rem; letter-spacing: -0.3px; }
        
        .options-grid { display: flex; flex-direction: column; gap: 0.8rem; }
        .option-btn {
          display: flex; align-items: center; gap: 1rem; padding: 1rem 1.2rem; border: 2px solid #e2e8f0;
          border-radius: 16px; background: #f8fafc; font-size: 0.95rem; font-weight: 600; color: var(--text-main);
          cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .option-btn:hover { border-color: var(--primary); background: #f0f9ff; transform: translateY(-1px); }
        .option-btn.selected { border-color: var(--primary); background: #f0f9ff; box-shadow: 0 0 0 4px rgba(0, 180, 216, 0.1); }
        .option-letter { width: 28px; height: 28px; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: #475569; flex-shrink: 0; transition: 0.2s; }
        .option-btn.selected .option-letter { background: var(--primary); color: #fff; }
        .option-label { flex: 1; }

        .survey-actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .prev-btn {
          padding: 0.8rem 1.5rem; background: #f1f5f9; border: none; border-radius: 50px; font-weight: 700;
          font-size: 0.9rem; color: #475569; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .prev-btn:hover:not(:disabled) { background: #e2e8f0; }
        .prev-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .next-btn {
          flex: 1; padding: 0.9rem; background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none; border-radius: 50px; font-weight: 800; font-size: 1rem; color: #fff; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 15px rgba(0, 180, 216, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .next-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 180, 216, 0.4); }
        .form-error { color: #ef4444; font-size: 0.85rem; font-weight: 600; margin-top: 0.8rem; }

        /* ── Success Card ── */
        .success-card {
          background: var(--card-bg); border-radius: 28px; padding: 2.5rem 2rem; text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
        }
        .success-icon-wrap { width: 72px; height: 72px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; border: 1px solid #d1fae5; }
        .success-card h2 { font-size: 1.8rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.3rem; }
        .success-card p { color: var(--text-muted); margin-bottom: 1.5rem; font-size: 1rem; }
        
        .reward-display {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: var(--primary-light);
          padding: 1rem 2rem; border-radius: 60px; margin: 0 auto 1.5rem; max-width: 200px; border: 1px solid #bae6fd;
        }
        .reward-amount { font-size: 1.8rem; font-weight: 900; color: var(--primary-dark); }
        .success-info { margin-bottom: 1.8rem; }
        .success-info p { color: var(--text-muted); font-size: 0.9rem; }

        .continue-btn {
          width: 100%; padding: 1.1rem; background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none; border-radius: 50px; font-weight: 800; font-size: 1.05rem; color: #fff; cursor: pointer;
          transition: all 0.3s; box-shadow: 0 10px 25px -5px rgba(0, 180, 216, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .continue-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px -5px rgba(0, 180, 216, 0.5); }
        .continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .share-row {
          display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem;
          font-size: 0.9rem; color: var(--text-muted); font-weight: 600;
        }
        .share-row button { background: none; border: none; cursor: pointer; transition: transform 0.2s; }
        .share-row button:hover { transform: scale(1.15); }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 2.5rem; }
        .section-title { font-size: 1.8rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; }
        .section-subtitle { font-size: 1rem; color: var(--text-muted); margin-top: 0.3rem; }

        /* ── Why Participate ── */
        .why-section { padding: 4rem 1.5rem; max-width: 1000px; margin: 0 auto; }
        .why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .why-card { background: #fff; border-radius: 20px; padding: 1.8rem 1.2rem; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: all 0.3s; }
        .why-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--primary-light); }
        .why-icon-bg { width: 48px; height: 48px; background: var(--primary-light); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .why-card h3 { font-size: 1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.3rem; }
        .why-card p { font-size: 0.85rem; color: var(--text-muted); }

        /* ── How It Works ── */
        .how-section { padding: 4rem 1.5rem; max-width: 900px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .step { background: #fff; padding: 2rem 1.5rem; border-radius: 24px; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: all 0.3s; }
        .step:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--primary-light); }
        .step-number { width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.2rem; color: #fff; margin: 0 auto 1rem; box-shadow: 0 4px 10px rgba(0,180,216,0.3); }
        .step-content h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.3rem; }
        .step-content p { font-size: 0.9rem; color: var(--text-muted); }

        /* ── Terms Section ── */
        .terms-section { padding: 4rem 1.5rem; max-width: 900px; margin: 0 auto; }
        .terms-content { background: #fff; padding: 2rem; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .terms-content ul { list-style: none; padding: 0; }
        .terms-content ul li { padding: 0.7rem 0 0.7rem 1.8rem; position: relative; color: var(--text-muted); border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .terms-content ul li::before { content: '✓'; position: absolute; left: 0; color: var(--success); font-weight: 900; }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong { color: var(--text-main); }

        /* ── FAQ ── */
        .faq-section { padding: 4rem 1.5rem 6rem; max-width: 750px; margin: 0 auto; }
        .faq-list { display: flex; flex-direction: column; gap: 1rem; }
        .faq-item { background: #fff; border-radius: 20px; padding: 1.5rem; border: 1px solid #f1f5f9; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
        .faq-item:hover { border-color: var(--primary-light); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03); }
        .faq-question { font-weight: 800; font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.4rem; }
        .faq-answer p { font-size: 0.95rem; color: var(--text-muted); }

        /* ── Footer ── */
        .site-footer { background: #fff; border-top: 1px solid #e2e8f0; padding: 3rem 1.5rem; text-align: center; margin-top: auto; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
        .site-footer p { font-size: 0.85rem; color: var(--text-muted); }
        .footer-contact { font-weight: 600; color: #94a3b8; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 28px; padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .modal-icon-container { width: 64px; height: 64px; background: #e0f2fe; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; }
        .modal-icon { font-size: 2rem; }
        .modal-card h2 { font-size: 1.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.5rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-btn { padding: 1rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .modal-btn.primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(0, 180, 216, 0.3); }
        .modal-btn.primary:hover { background: var(--primary-dark); transform: translateY(-2px); }
        .modal-btn.ghost { background: var(--bg-main); color: var(--text-main); border: 1px solid #e2e8f0; }
        .modal-btn.ghost:hover { background: #e2e8f0; }
        .modal-btn.text-only { background: transparent; color: #94a3b8; font-size: 0.8rem; margin-top: 1rem; }
        .modal-btn.text-only:hover { color: var(--text-main); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .why-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .steps { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; gap: 1.2rem; }
          .hero { padding-top: 2rem; }
          .hero h1 { font-size: 2.2rem; }
          .hero-stats { gap: 0.6rem; }
          .stat-pill { font-size: 0.75rem; padding: 0.4rem 0.9rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.65rem; padding: 0.3rem 0.6rem; }
          .logo { font-size: 1.1rem; }
          .why-grid { grid-template-columns: 1fr; }
          .survey-card { padding: 1.5rem; }
          .success-card { padding: 1.5rem; }
          .hero h1 { font-size: 1.9rem; }
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