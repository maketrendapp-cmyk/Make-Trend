// pages/templates/quiz-challenge-win-cash-v1.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta ──
const defaultMeta = {
  title: 'Quiz Challenge – Win Real Cash 2026 | Free Quiz Competition',
  description: 'Join the ultimate quiz competition and win real cash prizes. Answer 8 questions, complete tasks, and claim your $100 reward. Free to enter!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/quiz-challenge-win-cash-v1?id={id}',
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
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('general');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 24, minutes: 0, seconds: 0 });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

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

  // ── Validation ──
  const validateRegistration = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!acceptedTerms) return 'You must accept the terms to continue.';
    return null;
  };

  // ── Start Quiz ──
  const handleStartQuiz = () => {
    const err = validateRegistration();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(2);
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(QUESTIONS.length).fill(null));
  };

  // ── Answer selection ──
  const handleAnswerSelect = (optionIndex) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  // ── Next question ──
  const handleNext = () => {
    if (selectedAnswers[currentQuestion] === null) {
      setError('Please select an answer before proceeding.');
      return;
    }
    setError('');
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizCompleted(true);
      setStep(3);
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
          <span className="logo-text">Quiz<span>Challenge</span></span>
        </div>
        <div className="header-badge">💰 Win Real Cash</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {step === 1 && (
            <>
              <div className="hero-badge">🔥 Limited Time</div>
              <h1>Win Real Cash<br />with Quiz Challenge</h1>
              <p>Answer 8 questions, complete tasks, and claim your share of the prize pool.</p>
              <div className="hero-stats">
                <div><span>💰</span> $5,000 Prize Pool</div>
                <div><span>🏅</span> 100+ Winners</div>
                <div><span>⏳</span> <span>{String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}</span> Left</div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hero-badge">📝 Question {currentQuestion + 1} of {QUESTIONS.length}</div>
              <h1>Test Your Knowledge</h1>
              <p>Select the correct answer to proceed.</p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="hero-badge">🎉 Congratulations!</div>
              <h1>You Did It!</h1>
              <p>You have successfully completed the quiz. Your reward is on the way.</p>
              <div className="hero-stats">
                <div><span>🏆</span> $100 Cash Prize</div>
                <div><span>✅</span> Verified Entry</div>
                <div><span>⏳</span> Claim within 24h</div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">

        {/* Step 1: Registration */}
        {step === 1 && (
          <div className="register-card">
            <h2>Join the Challenge</h2>
            <p>Fill in your details to get started.</p>

            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category <span className="required">*</span></label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">General Knowledge</option>
                <option value="sports">Sports</option>
                <option value="technology">Technology</option>
                <option value="science">Science</option>
                <option value="history">History</option>
                <option value="entertainment">Entertainment</option>
                <option value="geography">Geography</option>
              </select>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms">I agree to the <a href="#terms">Terms &amp; Conditions</a>.</label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="join-btn" onClick={handleStartQuiz}>
              Start Quiz →
            </button>

            <p className="form-footnote">🔒 Your information is secure and will not be shared.</p>
          </div>
        )}

        {/* Step 2: Quiz */}
        {step === 2 && (
          <div className="quiz-card">
            <div className="question-number">Question {currentQuestion + 1} of {QUESTIONS.length}</div>
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
                    <span className="option-letter">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                    {isSelected && <span className="check-mark">✓</span>}
                  </button>
                );
              })}
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="next-btn" onClick={handleNext}>
              {currentQuestion === QUESTIONS.length - 1 ? 'Finish' : 'Next →'}
            </button>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}></div>
            </div>
          </div>
        )}

        {/* Step 3: Congratulations */}
        {step === 3 && (
          <div className="result-card">
            <div className="result-icon">🎉</div>
            <h2>Congratulations, {fullName}!</h2>
            <p>You have successfully completed the quiz. You are now eligible to claim your reward.</p>
            <div className="prize-badge">
              <span>🏆</span>
              <div>
                <span className="prize-label">Your Prize</span>
                <span className="prize-amount">$100</span>
              </div>
            </div>
            <p className="result-note">Complete the final tasks to receive your cash prize.</p>
            <button className="claim-btn" onClick={handleClaim} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Processing...
                </>
              ) : (
                'Claim Your Prize →'
              )}
            </button>
          </div>
        )}

      </main>

      {/* ─── HOW TO PLAY ─── */}
      <section className="how-to-play">
        <h2 className="section-title">📋 How to Play</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Register</h3>
              <p>Enter your full name and select your preferred category.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Answer Questions</h3>
              <p>Answer 8 quiz questions. Select the correct option for each.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Complete Tasks</h3>
              <p>Finish 3 simple tasks to verify your entry and eligibility.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Claim Your Prize</h3>
              <p>Receive your $100 cash prize directly to your wallet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="terms-section">
        <h2 className="section-title">📜 Terms & Conditions</h2>
        <div className="terms-content">
          <ul>
            <li><strong>Eligibility:</strong> Open to all participants aged 18 years and above.</li>
            <li><strong>Entry:</strong> One entry per person. Duplicate entries will be disqualified.</li>
            <li><strong>Quiz Rules:</strong> Participants must answer all 8 questions to qualify.</li>
            <li><strong>Tasks:</strong> Winners must complete the required tasks within 24 hours of quiz completion.</li>
            <li><strong>Prize Distribution:</strong> Prizes are paid via PayPal or bank transfer within 48 hours of task completion.</li>
            <li><strong>Fraud Prevention:</strong> Any fraudulent activity, including fake accounts or automated entries, will result in immediate disqualification.</li>
            <li><strong>Data Privacy:</strong> Your information is secure and will only be used for prize distribution.</li>
            <li><strong>Changes:</strong> The organizers reserve the right to modify or terminate this competition at any time.</li>
            <li><strong>Affiliation:</strong> This competition is not affiliated with any third‑party platform.</li>
          </ul>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <p>© 2026 Quiz Challenge. All rights reserved.</p>
        <p className="footer-contact">Questions? support@quizchallenge.com</p>
      </footer>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: #f8f9fc;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #f8f9fc;
        }

        /* ── Header ── */
        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
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
        .logo-text { color: #1a1a2e; }
        .logo-text span { color: #f5a623; }
        .header-badge {
          background: #f5a623;
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.3rem 1rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          color: #fff;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.3);
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 800px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(245, 166, 35, 0.2);
          border: 1px solid #f5a623;
          padding: 0.3rem 1.2rem;
          border-radius: 40px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #f5a623;
          margin-bottom: 1rem;
        }
        .hero h1 {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.5rem;
        }
        .hero p {
          font-size: 1.1rem;
          color: #ccc;
          margin-bottom: 1.8rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .hero-stats div {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(6px);
          padding: 0.4rem 1.2rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.1);
          font-weight: 600;
          font-size: 0.9rem;
        }
        .hero-stats span { margin-right: 6px; }

        /* ── Main Content ── */
        .main-content {
          max-width: 700px;
          margin: -2rem auto 3rem;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        /* ── Registration Card ── */
        .register-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef0f4;
        }
        .register-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          color: #1a1a2e;
        }
        .register-card > p {
          text-align: center;
          color: #6b7280;
          margin-bottom: 1.8rem;
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.85rem;
          color: #374151;
          margin-bottom: 0.3rem;
        }
        .form-group .required { color: #ef4444; }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          background: #f9fafb;
          transition: border-color 0.2s;
          outline: none;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color: #f5a623;
          background: #fff;
        }
        .checkbox-group {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 1rem 0 1.2rem;
        }
        .checkbox-group input {
          width: 18px; height: 18px;
          margin-top: 2px;
          accent-color: #f5a623;
          flex-shrink: 0;
        }
        .checkbox-group label {
          font-size: 0.85rem;
          color: #4b5563;
        }
        .checkbox-group label a {
          color: #f5a623;
          text-decoration: none;
        }
        .form-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }
        .join-btn {
          width: 100%;
          padding: 1rem;
          background: #f5a623;
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #1a1a2e;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(245, 166, 35, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .join-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245, 166, 35, 0.3);
        }
        .join-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-footnote {
          font-size: 0.75rem;
          color: #9ca3af;
          text-align: center;
          margin-top: 1.2rem;
        }

        /* ── Quiz Card ── */
        .quiz-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef0f4;
        }
        .question-number {
          font-size: 0.8rem;
          font-weight: 700;
          color: #f5a623;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }
        .question-text {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 1.5rem;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          margin-bottom: 1.5rem;
        }
        .option-btn {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.9rem 1.2rem;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          background: #f9fafb;
          font-size: 1rem;
          font-weight: 500;
          color: #1a1a2e;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .option-btn:hover {
          border-color: #d1d5db;
          background: #f3f4f6;
        }
        .option-btn.selected {
          border-color: #f5a623;
          background: #fef9e7;
          box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.1);
        }
        .option-letter {
          font-weight: 700;
          color: #9ca3af;
          min-width: 24px;
        }
        .option-btn.selected .option-letter {
          color: #f5a623;
        }
        .check-mark {
          margin-left: auto;
          color: #10b981;
          font-weight: 700;
        }
        .next-btn {
          width: 100%;
          padding: 0.9rem;
          background: #f5a623;
          border: none;
          border-radius: 60px;
          font-weight: 700;
          font-size: 1rem;
          color: #1a1a2e;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .next-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245, 166, 35, 0.2);
        }
        .progress-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 99px;
          margin-top: 1.2rem;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #f5a623;
          border-radius: 99px;
          transition: width 0.4s ease;
        }

        /* ── Result Card ── */
        .result-card {
          background: #fff;
          border-radius: 32px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
          border: 1px solid #eef0f4;
        }
        .result-icon {
          font-size: 4rem;
          margin-bottom: 0.5rem;
        }
        .result-card h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 0.5rem;
        }
        .result-card p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .prize-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: #fef9e7;
          border: 1px solid #f5a623;
          border-radius: 60px;
          padding: 0.6rem 1.5rem;
          margin: 0 auto 1.5rem;
          max-width: 280px;
        }
        .prize-badge > span {
          font-size: 2rem;
        }
        .prize-badge div {
          text-align: left;
        }
        .prize-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
        }
        .prize-amount {
          display: block;
          font-size: 1.6rem;
          font-weight: 900;
          color: #f5a623;
        }
        .result-note {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .claim-btn {
          width: 100%;
          padding: 1rem;
          background: #10b981;
          border: none;
          border-radius: 60px;
          font-weight: 800;
          font-size: 1.05rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }
        .claim-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spinner {
          display: inline-block;
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── How to Play ── */
        .how-to-play {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 2rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 2.5rem;
          color: #1a1a2e;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 60px;
          height: 4px;
          background: #f5a623;
          margin: 0.5rem auto 0;
          border-radius: 4px;
        }
        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .step {
          background: #fff;
          padding: 1.5rem;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #eef0f4;
          transition: transform 0.2s;
        }
        .step:hover {
          transform: translateY(-4px);
        }
        .step-number {
          width: 48px; height: 48px;
          background: #f5a623;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.3rem;
          color: #fff;
          margin: 0 auto 0.8rem;
        }
        .step-content h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 0.2rem;
        }
        .step-content p {
          color: #6b7280;
          font-size: 0.85rem;
        }

        /* ── Terms Section ── */
        .terms-section {
          padding: 4rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .terms-content {
          background: #fff;
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid #eef0f4;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          max-width: 900px;
          margin: 0 auto;
        }
        .terms-content ul {
          list-style: none;
          padding: 0;
        }
        .terms-content ul li {
          padding: 0.6rem 0 0.6rem 1.8rem;
          position: relative;
          color: #4b5563;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
        }
        .terms-content ul li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #f5a623;
          font-weight: 700;
        }
        .terms-content ul li:last-child { border-bottom: none; }
        .terms-content ul li strong {
          color: #1a1a2e;
        }

        /* ── Footer ── */
        .site-footer {
          background: #1a1a2e;
          color: #9ca3af;
          padding: 2.5rem 1.5rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 2rem;
        }
        .site-footer p {
          font-size: 0.8rem;
          margin-bottom: 0.3rem;
        }
        .footer-contact {
          font-weight: 600;
          color: #e5e7eb;
        }

        /* ── WebView Modal ── */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-card {
          background: #1a1c22;
          border-radius: 36px;
          padding: 2.8rem 2rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(245, 166, 35, 0.2);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
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
          background: rgba(255,255,255,0.08);
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
        .modal-btn:hover { background: rgba(255,255,255,0.15); }
        .modal-btn.primary {
          background: #f5a623;
          border: none;
          color: #1a1a2e;
        }
        .modal-btn.primary:hover { background: #e0991a; }
        .modal-btn.ghost {
          background: transparent;
          border: none;
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.8rem;
        }
        .modal-btn.ghost:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .hero { min-height: 40vh; }
          .hero h1 { font-size: 1.8rem; }
          .hero p { font-size: 0.95rem; }
          .hero-stats { gap: 0.8rem; }
          .hero-stats div { font-size: 0.75rem; padding: 0.2rem 0.8rem; }
          .main-content { padding: 0 1rem; }
          .register-card, .quiz-card, .result-card { padding: 1.8rem 1.2rem; }
          .question-text { font-size: 1.2rem; }
          .option-btn { padding: 0.7rem 1rem; font-size: 0.9rem; }
          .steps { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.6rem; padding: 0.2rem 0.8rem; }
          .site-header { padding: 0.5rem 1rem; }
          .register-card h2 { font-size: 1.5rem; }
          .prize-badge { padding: 0.4rem 1rem; }
          .prize-amount { font-size: 1.3rem; }
          .steps { grid-template-columns: 1fr; }
          .terms-content { padding: 1.2rem; }
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