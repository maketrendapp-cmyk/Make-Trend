// pages/templates/quiz-challenge-win-cash-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';
import {
  FaTrophy,
  FaDollarSign,
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaCopy,
  FaShareAlt,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaListUl,
  FaGlobe,
  FaShieldAlt,
  FaMedal
} from 'react-icons/fa';

// ── Default Meta (Clean base URL) ──
const defaultMeta = {
  title: 'Quiz Challenge – Win Real Cash | Free Competition',
  description: 'Join the ultimate quiz competition and win real cash prizes. Answer 8 questions, complete tasks, and claim your $100 reward. Free to enter!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/quiz-challenge-win-cash-v1',
};

// ── Default Questions (8 questions) ──
const QUESTIONS = [
  {
    id: 1,
    question: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correct: 1,
  },
  {
    id: 2,
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correct: 1,
  },
  {
    id: 3,
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correct: 3,
  },
  {
    id: 4,
    question: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'],
    correct: 1,
  },
  {
    id: 5,
    question: 'What is the chemical symbol for water?',
    options: ['H2O', 'CO2', 'NaCl', 'HCl'],
    correct: 0,
  },
  {
    id: 6,
    question: 'Which country won the FIFA World Cup in 2018?',
    options: ['Brazil', 'Germany', 'France', 'Argentina'],
    correct: 2,
  },
  {
    id: 7,
    question: 'What is the tallest mountain in the world?',
    options: ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'],
    correct: 1,
  },
  {
    id: 8,
    question: 'Which element is needed for combustion?',
    options: ['Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Hydrogen'],
    correct: 1,
  },
];

function QuizChallengeWinCashV1({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [step, setStep] = useState(1); // 1 = Quiz, 2 = Congrats
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 24, minutes: 0, seconds: 0 });
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(new Array(QUESTIONS.length).fill(null));
  const [confettiActive, setConfettiActive] = useState(false);

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

  // ── Confetti effect ──
  useEffect(() => {
    if (confettiActive) {
      const container = document.querySelector('.confetti-container');
      if (!container) return;
      const colors = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#ec4899'];
      for (let i = 0; i < 90; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '-10px';
        particle.style.width = (Math.random() * 10 + 5) + 'px';
        particle.style.height = (Math.random() * 10 + 5) + 'px';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
        particle.style.position = 'absolute';
        particle.style.pointerEvents = 'none';
        particle.style.animation = `confettiFall ${Math.random() * 2 + 2}s linear forwards`;
        container.appendChild(particle);
      }
    }
  }, [confettiActive]);

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

  // ── Answer selection ──
  const handleAnswerSelect = (optionIndex) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
    setError('');
  };

  // ── Next question ──
  const handleNext = () => {
    if (selectedAnswers[currentQuestion] === null) {
      setError('Please select an answer to continue.');
      return;
    }
    setError('');
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz Complete - Move instantly to Congrats
      setStep(2);
      setConfettiActive(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // ── Redirect to tasks ──
  const handleClaim = () => {
    setLoading(true);
    if (!id) {
      router.push('/create');
    } else {
      router.push(`/tasks?id=${id}`);
    }
  };

  // ── Share handlers ──
  const handleShare = (platform) => {
    const shareUrl = id ? `${window.location.origin}/quiz-challenge-win-cash-v1?id=${id}` : `${window.location.origin}/quiz-challenge-win-cash-v1`;
    const text = `🏆 I just completed the Quiz Challenge for $100! Play here:`;
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
            <FaGlobe className="modal-icon text-indigo-500" />
          </div>
          <h2>Open in Browser</h2>
          <p>For the best experience, open this page in your default browser.</p>
          <div className="modal-actions">
            <button
              className="modal-btn ghost"
              onClick={() => {
                const shareUrl = id ? `${window.location.origin}/quiz-challenge-win-cash-v1?id=${id}` : `${window.location.origin}/quiz-challenge-win-cash-v1`;
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
            <div className="logo-icon-bg">
              <FaTrophy className="w-4 h-4 text-amber-500" />
            </div>
            <span className="logo-text">Quiz<span>Challenge</span></span>
          </div>
          <div className="header-badge">
            <FaDollarSign className="w-3 h-3 text-emerald-400" /> Real Cash
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
                  <span className="pulse-dot"></span> LIVE COMPETITION
                </div>
              </div>
              <h1>{campaign?.title || 'Test Your Knowledge & Win Real Cash'}</h1>
              <p>{campaign?.description || 'Answer 8 simple questions and complete verification tasks to claim your $100 reward. Free entry!'}</p>
              <div className="hero-stats">
                <div className="stat-pill"><FaDollarSign className="w-3.5 h-3.5 text-emerald-400" /> $5,000 Prize Pool</div>
                <div className="stat-pill"><FaListUl className="w-3.5 h-3.5 text-amber-400" /> 8 Questions</div>
                <div className="stat-pill timer-pill">
                  <FaClock className="w-3.5 h-3.5 text-indigo-400" /> {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')} Left
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge-wrap">
                <div className="hero-badge bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <FaCheckCircle className="w-3 h-3" /> QUIZ COMPLETE
                </div>
              </div>
              <h1>Congratulations!</h1>
              <p>You have successfully completed the quiz challenge and unlocked your reward.</p>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Quiz */}
        {step === 1 && (
          <div className="quiz-card">
            <div className="quiz-header">
              <div className="question-counter">Question {currentQuestion + 1} of {QUESTIONS.length}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}></div>
              </div>
            </div>
            
            <h3 className="question-text">{QUESTIONS[currentQuestion].question}</h3>
            
            <div className="options">
              {QUESTIONS[currentQuestion].options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestion] === idx;
                return (
                  <button
                    key={idx}
                    className={`option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(idx)}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="option-label">{option}</span>
                    {isSelected && <FaCheckCircle className="check-mark w-5 h-5 text-amber-500 ml-auto" />}
                  </button>
                );
              })}
            </div>
            
            {error && <p className="form-error">{error}</p>}
            
            <div className="quiz-actions">
              <button 
                className="prev-btn" 
                onClick={handlePrev}
                disabled={currentQuestion === 0}
              >
                <FaArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button className="next-btn" onClick={handleNext}>
                <span>{currentQuestion === QUESTIONS.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
                <FaArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Congratulations */}
        {step === 2 && (
          <div className="result-card">
            <div className="confetti-container"></div>
            <div className="result-icon-wrap">
              <FaTrophy className="w-14 h-14 text-amber-500 drop-shadow-md" />
            </div>
            <h2>You Did It!</h2>
            <p className="result-subtitle">You answered all questions and are eligible to claim your prize.</p>
            
            <div className="prize-badge">
              <FaMedal className="w-8 h-8 text-amber-500" />
              <div className="prize-info">
                <span className="prize-label">Your Unlocked Reward</span>
                <span className="prize-amount">$100.00</span>
              </div>
            </div>
            
            <p className="result-note">Click below to verify your entry and finalize your payout securely.</p>
            
            <button className="claim-btn" onClick={handleClaim} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> 
                  <span>Redirecting Securely...</span>
                </>
              ) : (
                <>
                  <span>Claim Your Prize</span>
                  <FaArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="share-row">
              <span>Challenge your friends:</span>
              <button onClick={() => handleShare('whatsapp')}><FaWhatsapp className="w-5 h-5 text-emerald-500 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('facebook')}><FaFacebook className="w-5 h-5 text-blue-600 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('twitter')}><FaTwitter className="w-5 h-5 text-sky-400 hover:scale-110 transition" /></button>
              <button onClick={() => handleShare('copy')}><FaCopy className="w-5 h-5 text-slate-500 hover:scale-110 transition" /></button>
            </div>
          </div>
        )}

      </main>

      {/* ─── HOW TO PLAY ─── */}
      <section className="how-to-play">
        <div className="section-header">
          <h2 className="section-title">How to Play</h2>
          <p className="section-subtitle">Follow these steps to claim your prize</p>
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-icon-wrap">
              <span className="step-number">1</span>
            </div>
            <h3>Take The Quiz</h3>
            <p>Answer 8 interactive questions accurately to prove your knowledge.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrap">
              <span className="step-number">2</span>
            </div>
            <h3>Verify Entry</h3>
            <p>Complete a few rapid verification tasks to secure your spot.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrap">
              <span className="step-number">3</span>
            </div>
            <h3>Claim Cash</h3>
            <p>Get your $100 reward delivered directly to your account.</p>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <div className="section-header">
          <h2 className="section-title">Terms & Conditions</h2>
        </div>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all participants aged 18 years and above globally.</li>
            <li><strong>Entry Rules:</strong> One entry per person. Duplicate entries will be flagged.</li>
            <li><strong>Verification:</strong> Winners must complete the required verification tasks within 24 hours.</li>
            <li><strong>Prize Distribution:</strong> Rewards are safely processed upon successful completion of all steps.</li>
          </ul>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} Quiz Challenge Platform. All rights reserved.</p>
          <p className="footer-contact">Secure competition and rewards network.</p>
        </div>
      </footer>

      {/* ─── ENHANCED STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: #8b5cf6;
          --primary-dark: #6d28d9;
          --accent: #f59e0b;
          --accent-dark: #d97706;
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
        .logo-icon-bg { background: #fef3c7; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
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
          background: linear-gradient(135deg, #0f172a, #1e1b4b, #312e81);
        }
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; z-index: 1; }
        .shape-1 { width: 400px; height: 400px; background: var(--primary); top: -100px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: var(--accent); bottom: -50px; right: -50px; }
        .hero-content { position: relative; z-index: 2; max-width: 700px; color: #fff; }
        
        .hero-badge-wrap { display: flex; justify-content: center; margin-bottom: 1.2rem; }
        .hero-badge {
          background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.4rem 1.1rem;
          border-radius: 40px; font-size: 0.7rem; font-weight: 800; color: var(--accent);
          display: inline-flex; align-items: center; gap: 8px; backdrop-filter: blur(4px);
          letter-spacing: 0.5px;
        }
        .pulse-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; display: block; animation: pulse-amber 2s infinite; }
        @keyframes pulse-amber { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
        
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1rem; letter-spacing: -1px; }
        .hero p { font-size: 1.1rem; color: #cbd5e1; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        
        .hero-stats { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
        .stat-pill { background: rgba(255,255,255,0.08); padding: 0.5rem 1.1rem; border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); font-weight: 600; font-size: 0.85rem; color: #fff; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 8px; }

        /* ── Main Content ── */
        .main-content { max-width: 680px; margin: -3.5rem auto 3rem; padding: 0 1.5rem; position: relative; z-index: 10; }

        /* ── Quiz Card ── */
        .quiz-card {
          background: var(--card-bg); border-radius: 28px; padding: 2.5rem 2rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;
        }
        .quiz-header { margin-bottom: 1.8rem; }
        .question-counter { font-size: 0.8rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.8rem; }
        .progress-bar { height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-dark)); border-radius: 99px; transition: width 0.4s ease; }

        .question-text { font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 1.5rem; line-height: 1.3; }
        
        .options { display: flex; flex-direction: column; gap: 0.8rem; }
        .option-btn {
          display: flex; align-items: center; gap: 1rem; padding: 1rem 1.2rem; border: 2px solid #e2e8f0;
          border-radius: 16px; background: #f8fafc; font-size: 1rem; font-weight: 600; color: var(--text-main);
          cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .option-btn:hover { border-color: var(--primary); background: #f5f3ff; transform: translateY(-1px); }
        .option-btn.selected { border-color: var(--accent); background: #fffbeb; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1); }
        .option-letter { width: 30px; height: 30px; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; color: #475569; flex-shrink: 0; transition: 0.2s; }
        .option-btn.selected .option-letter { background: var(--accent); color: #fff; }
        .option-label { flex: 1; }

        .form-error { color: #ef4444; font-size: 0.85rem; font-weight: 600; margin-top: 1rem; text-align: center; }

        .quiz-actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .prev-btn {
          padding: 0.9rem 1.5rem; background: #f1f5f9; border: none; border-radius: 50px; font-weight: 700;
          font-size: 0.95rem; color: #475569; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .prev-btn:hover:not(:disabled) { background: #e2e8f0; }
        .prev-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .next-btn {
          flex: 1; padding: 0.9rem; background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none; border-radius: 50px; font-weight: 800; font-size: 1.05rem; color: #fff; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .next-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4); }

        /* ── Result Card ── */
        .result-card {
          background: var(--card-bg); border-radius: 28px; padding: 3rem 2rem; text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; position: relative; overflow: hidden;
        }
        .confetti-container { position: absolute; inset: 0; pointer-events: none; border-radius: 28px; }
        @keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; } }

        .result-icon-wrap { width: 80px; height: 80px; background: #fffbeb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 1px solid #fde68a; }
        .result-card h2 { font-size: 2rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.4rem; letter-spacing: -0.5px; }
        .result-subtitle { color: var(--text-muted); margin-bottom: 2rem; font-size: 1.05rem; }
        
        .prize-badge {
          display: flex; align-items: center; justify-content: center; gap: 1rem; background: #f8fafc;
          padding: 1.2rem 2rem; border-radius: 20px; margin: 0 auto 1.5rem; max-width: 300px; border: 2px solid #e2e8f0;
        }
        .prize-info { text-align: left; }
        .prize-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .prize-amount { display: block; font-size: 1.8rem; font-weight: 900; color: var(--accent); line-height: 1; margin-top: 2px; }
        
        .result-note { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }

        .claim-btn {
          width: 100%; padding: 1.1rem; background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          border: none; border-radius: 50px; font-weight: 800; font-size: 1.1rem; color: #fff; cursor: pointer;
          transition: all 0.3s; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .claim-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px -5px rgba(245, 158, 11, 0.5); }
        .claim-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .share-row {
          display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 2rem;
          font-size: 0.9rem; color: var(--text-muted); font-weight: 600;
        }
        .share-row button { background: none; border: none; cursor: pointer; transition: transform 0.2s; }
        .share-row button:hover { transform: scale(1.15); }

        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Sections Common ── */
        .section-header { text-align: center; margin-bottom: 2.5rem; }
        .section-title { font-size: 1.8rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; }
        .section-subtitle { font-size: 1rem; color: var(--text-muted); margin-top: 0.3rem; }

        /* ── How To Play ── */
        .how-to-play { padding: 4rem 1.5rem; max-width: 1000px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .step-card { background: #fff; padding: 2rem 1.5rem; border-radius: 24px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: all 0.3s; }
        .step-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--primary-light); }
        .step-icon-wrap { width: 56px; height: 56px; background: #f5f3ff; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; color: var(--primary); font-weight: 900; font-size: 1.4rem; border: 1px solid #ede9fe; transition: 0.3s; }
        .step-card:hover .step-icon-wrap { background: var(--primary); color: #fff; transform: scale(1.05) rotate(-5deg); }
        .step-card h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.9rem; color: var(--text-muted); }

        /* ── Terms Section ── */
        .terms-section { padding: 4rem 1.5rem 6rem; max-width: 900px; margin: 0 auto; }
        .terms-content { background: #fff; padding: 2rem; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .terms-content ul { list-style: none; padding: 0; }
        .terms-content ul li { padding: 0.7rem 0 0.7rem 1.8rem; position: relative; color: var(--text-muted); border-bottom: 1px solid #f8fafc; font-size: 0.9rem; }
        .terms-content ul li::before { content: '✓'; position: absolute; left: 0; color: var(--success); font-weight: 900; }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong { color: var(--text-main); }

        /* ── Footer ── */
        .site-footer { background: #fff; border-top: 1px solid #e2e8f0; padding: 3rem 1.5rem; text-align: center; margin-top: auto; }
        .footer-content { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
        .site-footer p { font-size: 0.85rem; color: var(--text-muted); }
        .footer-contact { font-weight: 600; color: #94a3b8; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-card { background: #fff; border-radius: 28px; padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .modal-icon-container { width: 64px; height: 64px; background: #eef2ff; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; }
        .modal-icon { font-size: 2rem; }
        .modal-card h2 { font-size: 1.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.5rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-btn { padding: 1rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .modal-btn.primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
        .modal-btn.primary:hover { background: var(--primary-dark); transform: translateY(-2px); }
        .modal-btn.ghost { background: var(--bg-main); color: var(--text-main); border: 1px solid #e2e8f0; }
        .modal-btn.ghost:hover { background: #e2e8f0; }
        .modal-btn.text-only { background: transparent; color: #94a3b8; font-size: 0.8rem; margin-top: 1rem; }
        .modal-btn.text-only:hover { color: var(--text-main); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .steps { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; gap: 1.2rem; }
          .hero { padding-top: 2rem; }
          .hero h1 { font-size: 2.2rem; }
          .hero-stats { gap: 0.6rem; }
          .stat-pill { font-size: 0.75rem; padding: 0.4rem 0.9rem; }
          .quiz-card { padding: 1.8rem 1.2rem; }
          .result-card { padding: 2rem 1.2rem; }
          .quiz-actions { flex-wrap: wrap; }
          .prev-btn { flex: 1; justify-content: center; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.65rem; padding: 0.3rem 0.6rem; }
          .logo { font-size: 1.1rem; }
          .hero h1 { font-size: 1.9rem; }
          .question-text { font-size: 1.15rem; }
          .prize-badge { padding: 1rem; flex-direction: column; text-align: center; gap: 0.5rem; }
          .prize-info { text-align: center; }
          .share-row { flex-wrap: wrap; }
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
export default withCampaignMeta(QuizChallengeWinCashV1, defaultMeta);