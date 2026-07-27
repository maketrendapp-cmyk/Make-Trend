// pages/templates/bgmi-tournament-registration.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withCampaignMeta } from '../../lib/withCampaignMeta';
import { fetchCampaign } from '../../lib/fetchCampaign';

// ── Default Meta (YOUR DOMAIN) ──
const defaultMeta = {
  title: 'BGMI Tournament Registration – Join the Battle!',
  description: 'Register your team for the biggest BGMI tournament. Win $100,000 prize pool. Limited slots available. Join now!',
  image: 'https://maketrend.app/og-image.png',
  url: 'https://maketrend.app/bgmi-tournament-registration?id={id}',
};

// ── FAQ Data ──
const FAQS = [
  {
    q: 'How do I join the tournament?',
    a: 'Simply register your team using the form above. You will receive a confirmation email with further details.',
  },
  {
    q: 'How are room IDs shared?',
    a: 'Room IDs and passwords will be sent via email and Discord 30 minutes before the match starts.',
  },
  {
    q: 'Can I change players after registration?',
    a: 'Player changes are allowed up to 24 hours before the tournament starts. Contact support for changes.',
  },
  {
    q: 'Is the entry fee refundable?',
    a: 'Entry fees are non-refundable unless the tournament is cancelled by the organizers.',
  },
  {
    q: 'What happens if I disconnect during a match?',
    a: 'In case of disconnection, players can rejoin the room. No rematches will be provided for disconnections.',
  },
];

function BgmiTournamentRegistration({ campaign }) {
  const router = useRouter();
  const { id } = router.query;

  // ── State ──
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [player3Id, setPlayer3Id] = useState('');
  const [player4Id, setPlayer4Id] = useState('');
  const [discord, setDiscord] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ days: 2, hours: 14, minutes: 39, seconds: 0 });
  const [expandedFaq, setExpandedFaq] = useState(null);

  const formRef = useRef(null);

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
    const duration = 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000 + 39 * 60 * 1000;
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

  // ── Validate ──
  const validate = () => {
    if (!teamName.trim()) return 'Please enter your team name.';
    if (!captainName.trim()) return 'Please enter the captain\'s name.';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\s/g, ''))) return 'Please enter a valid 10-digit phone number.';
    if (!player1Id.trim() || !/^\d{9,12}$/.test(player1Id)) return 'Please enter a valid Player 1 UID (9-12 digits).';
    if (!player2Id.trim() || !/^\d{9,12}$/.test(player2Id)) return 'Please enter a valid Player 2 UID (9-12 digits).';
    if (!player3Id.trim() || !/^\d{9,12}$/.test(player3Id)) return 'Please enter a valid Player 3 UID (9-12 digits).';
    if (!player4Id.trim() || !/^\d{9,12}$/.test(player4Id)) return 'Please enter a valid Player 4 UID (9-12 digits).';
    if (!acceptedTerms) return 'You must accept the terms and conditions.';
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
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (!id) {
        router.push('/create');
      } else {
        router.push(`/tasks?id=${id}`);
      }
    }, 2000);
  };

  // ── Toggle FAQ ──
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // ── Scroll to form ──
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── WebView Modal (inline styles + _blank fallback) ──
  if (showWebViewModal) {
    return (
      <>
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">🌐</div>
            <h2>Open in Browser</h2>
            <p>For the best experience, open this page in your default browser.</p>
            <div className="modal-actions">
              <button className="modal-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); setShowWebViewModal(false); }}>📋 Copy Link</button>
              <button className="modal-btn primary" onClick={() => { const url = window.location.href; if (navigator.userAgent.includes('Android')) { window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`; } else { window.open(url, '_blank'); } }}>🚀 Open in Browser</button>
            </div>
            <button className="modal-btn ghost" onClick={() => setShowWebViewModal(false)}>Continue Anyway</button>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.88);
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
            border: 2px solid rgba(245, 158, 11, 0.25);
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          }
          .modal-card .modal-icon {
            font-size: 3.6rem;
            margin-bottom: 0.5rem;
          }
          .modal-card h2 {
            font-size: 1.6rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 0.3rem;
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
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.7rem 1.5rem;
            border-radius: 60px;
            font-weight: 600;
            font-size: 0.85rem;
            color: #fff;
            cursor: pointer;
            transition: 0.2s;
            flex: 1;
            min-width: 120px;
          }
          .modal-btn:hover {
            background: rgba(255, 255, 255, 0.15);
          }
          .modal-btn.primary {
            background: #F59E0B;
            border: none;
            color: #0A0F1E;
          }
          .modal-btn.primary:hover {
            background: #D97706;
          }
          .modal-btn.ghost {
            background: transparent;
            border: none;
            color: #888;
            margin-top: 0.5rem;
            font-size: 0.8rem;
          }
          .modal-btn.ghost:hover {
            color: #fff;
          }
        `}} />
      </>
    );
  }

  // ── Main UI ──
  return (
    <div className="page-wrapper">

      {/* ─── HEADER ─── */}
      <header className="site-header">
        <div className="logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">BGMI<span>Champions</span></span>
        </div>
        <div className="header-badge">🔥 Open</div>
      </header>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🏆 OFFICIAL BGMI TOURNAMENT</div>
          <h1>BGMI Champions Cup 2026</h1>
          <p>Register your squad and compete for the ultimate glory.</p>
          <div className="hero-stats">
            <div><span>💰</span> $100,000</div>
            <div><span>👥</span> Squad (4v4)</div>
          </div>
          <button className="hero-cta" onClick={scrollToForm}>
            Register Now →
          </button>
          <div className="countdown">
            <span className="countdown-label">⏳ Registration Ends In</span>
            <div className="countdown-numbers">
              <div className="countdown-item">
                <span className="cd-value">{String(timeRemaining.days).padStart(2, '0')}</span>
                <span className="cd-label">Days</span>
              </div>
              <span className="cd-separator">:</span>
              <div className="countdown-item">
                <span className="cd-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="cd-label">Hours</span>
              </div>
              <span className="cd-separator">:</span>
              <div className="countdown-item">
                <span className="cd-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="cd-label">Mins</span>
              </div>
              <span className="cd-separator">:</span>
              <div className="countdown-item">
                <span className="cd-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="cd-label">Secs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TOURNAMENT INFO ─── */}
      <section className="info-section">
        <h2 className="section-title">Tournament Info</h2>
        <div className="info-grid">
          <div className="info-card">
            <span className="info-icon">📅</span>
            <h3>Date</h3>
            <p className="info-value">Dec 15, 2026</p>
          </div>
          <div className="info-card">
            <span className="info-icon">🕒</span>
            <h3>Time</h3>
            <p className="info-value">7:00 PM IST</p>
          </div>
          <div className="info-card">
            <span className="info-icon">👥</span>
            <h3>Team Size</h3>
            <p className="info-value">Squad (4v4)</p>
          </div>
          <div className="info-card">
            <span className="info-icon">💰</span>
            <h3>Entry Fee</h3>
            <p className="info-value highlight">Free</p>
          </div>
        </div>
      </section>

      {/* ─── PRIZE POOL (DOLLAR) ─── */}
      <section className="prize-section">
        <h2 className="section-title">🏆 Prize Pool</h2>
        <div className="prize-grid">
          <div className="prize-card gold">
            <span className="prize-rank">🥇</span>
            <span className="prize-amount">$50,000</span>
            <span className="prize-label">1st</span>
          </div>
          <div className="prize-card silver">
            <span className="prize-rank">🥈</span>
            <span className="prize-amount">$30,000</span>
            <span className="prize-label">2nd</span>
          </div>
          <div className="prize-card bronze">
            <span className="prize-rank">🥉</span>
            <span className="prize-amount">$20,000</span>
            <span className="prize-label">3rd</span>
          </div>
        </div>
      </section>

      {/* ─── TIMELINE ─── */}
      <section className="timeline-section">
        <h2 className="section-title">Timeline</h2>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <h3>Registration Open</h3>
              <p>Team registration begins</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <h3>Registration Close</h3>
              <p>Dec 14, 2026 (11:59 PM)</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <h3>Room Details Sent</h3>
              <p>30 min before match</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <h3>Tournament Starts</h3>
              <p>Dec 15, 2026 (7:00 PM)</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <h3>Winner Announcement</h3>
              <p>Dec 17, 2026 (10:00 PM)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── REGISTRATION FORM ─── */}
      <section className="form-section" ref={formRef}>
        <h2 className="section-title">📝 Team Registration</h2>
        <div className="form-card">
          <div className="form-header">
            <h3>Register Your Team</h3>
            <p>Fill in your team details to secure your slot.</p>
          </div>

          <div className="form-grid">
            <div className="form-group full-width">
              <label>Team Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Team Invincible"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Captain Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="Full name"
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>BGMI UID <span className="required">*</span></label>
              <input
                type="text"
                placeholder="UID (9-12 digits)"
                value={player1Id}
                onChange={(e) => setPlayer1Id(e.target.value.replace(/\D/g, '').slice(0, 12))}
              />
            </div>

            <div className="form-group">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Phone <span className="required">*</span></label>
              <input
                type="tel"
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>

          <div className="player-section">
            <h3>👥 Team Members</h3>
            <p className="player-sub">Enter UID for each player (9-12 digits)</p>
            <div className="player-grid">
              <div className="form-group">
                <label>Player 1 <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="UID"
                  value={player1Id}
                  onChange={(e) => setPlayer1Id(e.target.value.replace(/\D/g, '').slice(0, 12))}
                />
              </div>
              <div className="form-group">
                <label>Player 2 <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="UID"
                  value={player2Id}
                  onChange={(e) => setPlayer2Id(e.target.value.replace(/\D/g, '').slice(0, 12))}
                />
              </div>
              <div className="form-group">
                <label>Player 3 <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="UID"
                  value={player3Id}
                  onChange={(e) => setPlayer3Id(e.target.value.replace(/\D/g, '').slice(0, 12))}
                />
              </div>
              <div className="form-group">
                <label>Player 4 <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="UID"
                  value={player4Id}
                  onChange={(e) => setPlayer4Id(e.target.value.replace(/\D/g, '').slice(0, 12))}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Discord ID <span className="optional">(optional)</span></label>
            <input
              type="text"
              placeholder="username#1234"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <label htmlFor="terms">I agree to the <a href="#rules">Terms &amp; Conditions</a></label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="register-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Registering...
              </>
            ) : (
              'REGISTER NOW →'
            )}
          </button>
        </div>
      </section>

      {/* ─── RULES ─── */}
      <section className="rules-section">
        <h2 className="section-title">📜 Rules</h2>
        <div className="rules-grid">
          <div className="rule-card"><span className="rule-icon">❌</span><h3>No Emulator</h3></div>
          <div className="rule-card"><span className="rule-icon">🚫</span><h3>No Hacks</h3></div>
          <div className="rule-card"><span className="rule-icon">📱</span><h3>Mobile Only</h3></div>
          <div className="rule-card"><span className="rule-icon">🎮</span><h3>Official Rules</h3></div>
          <div className="rule-card"><span className="rule-icon">⏰</span><h3>Join 15 Min Early</h3></div>
          <div className="rule-card"><span className="rule-icon">📢</span><h3>Voice Chat</h3></div>
        </div>
      </section>

      {/* ─── FEATURED REWARDS (YOUR ORIGINAL IMAGES) ─── */}
      <section className="rewards-section">
        <h2 className="section-title">🎁 Rewards</h2>
        <div className="rewards-grid">
          <div className="reward-card">
            <img src="https://mms.businesswire.com/media/20210111005169/en/851040/5/hx-press-image-all-products-1000x611.jpg?download=1" alt="Gaming Items" />
            <h3>Gaming Items</h3>
          </div>
          <div className="reward-card">
            <img src="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=150&h=150&fit=crop&auto=format" alt="Gaming Laptop" />
            <h3>Gaming Laptop</h3>
          </div>
          <div className="reward-card">
            <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&h=100&fit=crop&auto=format" alt="iPhone 15 Pro" />
            <h3>iPhone 15 Pro</h3>
          </div>
          <div className="reward-card">
            <img src="https://i.ytimg.com/vi/BYWx-2t3jxc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCD0hr9ZuRvK2zfzN6KwR0tpizEAw" alt="Mix Pro" />
            <h3>Mix Pro</h3>
          </div>
          <div className="reward-card">
            <img src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=100&h=100&fit=crop&auto=format" alt="Keyboard" />
            <h3>Gaming Keyboard</h3>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <h2 className="section-title">❓ FAQ</h2>
        <div className="faq-list">
          {FAQS.map((faq, idx) => (
            <div key={idx} className={`faq-item ${expandedFaq === idx ? 'expanded' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(idx)}>
                <span>{faq.q}</span>
                <span className="faq-icon">{expandedFaq === idx ? '−' : '+'}</span>
              </button>
              {expandedFaq === idx && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-section">
            <h3>BGMI Champions</h3>
            <p>Official tournament platform for competitive BGMI players.</p>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <a href="#register">Register</a>
            <a href="#rules">Rules</a>
            <a href="#prizes">Prizes</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-section">
            <h3>Follow Us</h3>
            <div className="social-links">
              <a href="#">📱</a>
              <a href="#">💬</a>
              <a href="#">📷</a>
              <a href="#">🐦</a>
            </div>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <p>support@bgmichampions.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 BGMI Champions. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── STYLES (COMPACT) ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #0A0F1E;
          color: #fff;
          line-height: 1.4;
        }
        .page-wrapper {
          max-width: 100%;
          overflow-x: hidden;
          background: #0A0F1E;
        }

        .site-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10, 15, 30, 0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
          padding: 0.4rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex; align-items: center; gap: 0.4rem;
          font-weight: 800; font-size: 1rem;
        }
        .logo-icon { font-size: 1.2rem; }
        .logo-text { color: #fff; }
        .logo-text span { color: #F59E0B; }
        .header-badge {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #0A0F1E;
          font-weight: 700;
          font-size: 0.55rem;
          padding: 0.15rem 0.7rem;
          border-radius: 40px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .hero {
          position: relative;
          min-height: 55vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 1.5rem 1rem;
          background: radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.08) 0%, transparent 70%), #0A0F1E;
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .hero-content {
          position: relative; z-index: 2;
          max-width: 700px;
        }
        .hero-badge {
          display: inline-block;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.25);
          padding: 0.15rem 1rem;
          border-radius: 40px;
          font-size: 0.55rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #F59E0B;
          margin-bottom: 0.3rem;
          letter-spacing: 0.5px;
        }
        .hero h1 {
          font-size: clamp(1.8rem, 5vw, 2.8rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 0.2rem;
          background: linear-gradient(135deg, #fff 30%, #F59E0B 70%, #D97706 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero p {
          font-size: 0.85rem;
          color: #aaa;
          margin-bottom: 0.8rem;
        }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 0.8rem;
        }
        .hero-stats div {
          background: rgba(255,255,255,0.04);
          padding: 0.2rem 0.8rem;
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.05);
          font-weight: 600;
          font-size: 0.75rem;
        }
        .hero-stats span { margin-right: 4px; }

        .hero-cta {
          display: inline-block;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border: none;
          padding: 0.5rem 1.6rem;
          border-radius: 60px;
          font-weight: 800;
          font-size: 0.85rem;
          color: #0A0F1E;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
          margin-bottom: 0.8rem;
        }
        .hero-cta:hover { transform: translateY(-2px); }

        .countdown {
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 0.6rem 1rem;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .countdown-label {
          display: block;
          font-size: 0.6rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.2rem;
        }
        .countdown-numbers {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.2rem;
        }
        .countdown-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 35px;
        }
        .cd-value {
          font-size: 1.4rem;
          font-weight: 900;
          color: #F59E0B;
          line-height: 1;
          font-family: 'Courier New', monospace;
        }
        .cd-label {
          font-size: 0.45rem;
          color: #888;
          text-transform: uppercase;
        }
        .cd-separator {
          font-size: 1.2rem;
          font-weight: 900;
          color: #555;
          padding: 0 0.05rem;
        }

        section {
          padding: 1.5rem 1rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 1.2rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 1rem;
          color: #fff;
        }
        .section-title::after {
          content: '';
          display: block;
          width: 40px;
          height: 3px;
          background: linear-gradient(90deg, #F59E0B, #D97706);
          margin: 0.3rem auto 0;
          border-radius: 4px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.6rem;
        }
        .info-card {
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 0.6rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .info-icon { font-size: 1.4rem; display: block; margin-bottom: 0.1rem; }
        .info-card h3 {
          font-size: 0.55rem;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .info-value {
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
        }
        .info-value.highlight { color: #F59E0B; }

        .prize-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.6rem;
        }
        .prize-card {
          background: rgba(255,255,255,0.04);
          border-radius: 14px;
          padding: 0.8rem 0.5rem;
          text-align: center;
          border: 2px solid rgba(255,255,255,0.06);
          transition: transform 0.2s;
        }
        .prize-card:hover { transform: translateY(-3px); }
        .prize-card.gold { border-color: #F59E0B; }
        .prize-card.silver { border-color: #9CA3AF; }
        .prize-card.bronze { border-color: #CD7F32; }
        .prize-rank { font-size: 1.6rem; display: block; }
        .prize-amount {
          display: block;
          font-size: 1.1rem;
          font-weight: 900;
          color: #F59E0B;
        }
        .prize-label {
          display: block;
          font-size: 0.6rem;
          color: #888;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
          max-width: 450px;
          margin: 0 auto;
          position: relative;
          padding-left: 1.2rem;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, #F59E0B, rgba(245,158,11,0.2));
        }
        .timeline-item {
          display: flex;
          gap: 0.6rem;
          padding: 0.3rem 0;
        }
        .timeline-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #F59E0B;
          border: 2px solid #0A0F1E;
          box-shadow: 0 0 12px rgba(245,158,11,0.3);
          flex-shrink: 0;
          margin-top: 0.2rem;
        }
        .timeline-content h3 {
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
        }
        .timeline-content p {
          font-size: 0.65rem;
          color: #888;
        }

        .form-card {
          background: rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 1.2rem 1rem;
          border: 1px solid rgba(255,255,255,0.06);
          max-width: 650px;
          margin: 0 auto;
        }
        .form-header { text-align: center; margin-bottom: 0.8rem; }
        .form-header h3 { font-size: 1.1rem; font-weight: 800; color: #fff; }
        .form-header p { color: #888; font-size: 0.75rem; }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .full-width { grid-column: span 2; }
        .form-group { margin-bottom: 0.1rem; }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 0.6rem;
          color: #ccc;
          margin-bottom: 0.05rem;
        }
        .form-group .required { color: #EF4444; }
        .form-group .optional { color: #666; font-weight: 400; font-size: 0.55rem; }
        .form-group input {
          width: 100%;
          padding: 0.4rem 0.6rem;
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          font-size: 0.75rem;
          background: rgba(255,255,255,0.03);
          color: #fff;
          outline: none;
        }
        .form-group input::placeholder { color: #555; }
        .form-group input:focus {
          border-color: #F59E0B;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
        }

        .player-section {
          margin: 0.6rem 0 0.3rem;
          padding-top: 0.6rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .player-section h3 { font-size: 0.85rem; font-weight: 700; color: #fff; }
        .player-sub { font-size: 0.6rem; color: #666; margin-bottom: 0.3rem; }
        .player-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .checkbox-group {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin: 0.6rem 0;
        }
        .checkbox-group input {
          width: 14px; height: 14px;
          margin-top: 2px;
          accent-color: #F59E0B;
          flex-shrink: 0;
        }
        .checkbox-group label {
          font-size: 0.7rem;
          color: #aaa;
        }
        .checkbox-group label a { color: #F59E0B; text-decoration: none; }
        .form-error {
          color: #EF4444;
          font-size: 0.7rem;
          margin: 0.2rem 0;
        }

        .register-btn {
          width: 100%;
          padding: 0.6rem;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border: none;
          border-radius: 50px;
          font-weight: 800;
          font-size: 0.85rem;
          color: #0A0F1E;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
          letter-spacing: 0.5px;
        }
        .register-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .register-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(10,15,30,0.2);
          border-top-color: #0A0F1E;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .rules-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
        }
        .rule-card {
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          padding: 0.5rem 0.3rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .rule-icon { font-size: 1.2rem; display: block; margin-bottom: 0.1rem; }
        .rule-card h3 {
          font-size: 0.5rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
        }

        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
        }
        .reward-card {
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          padding: 0.5rem 0.3rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
          transition: transform 0.2s;
        }
        .reward-card:hover { transform: translateY(-3px); }
        .reward-card img {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 0.2rem;
        }
        .reward-card h3 {
          font-size: 0.6rem;
          font-weight: 700;
          color: #fff;
        }

        .faq-list {
          max-width: 650px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .faq-item {
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .faq-item.expanded { border-color: rgba(245, 158, 11, 0.3); }
        .faq-question {
          width: 100%;
          padding: 0.5rem 0.8rem;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }
        .faq-question:hover { color: #F59E0B; }
        .faq-icon {
          font-size: 1rem;
          color: #F59E0B;
          font-weight: 300;
          flex-shrink: 0;
          margin-left: 0.6rem;
        }
        .faq-answer {
          padding: 0 0.8rem 0.6rem;
          color: #aaa;
          font-size: 0.7rem;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .site-footer {
          background: rgba(0,0,0,0.3);
          color: #555;
          padding: 1.2rem 1rem;
          border-top: 1px solid rgba(255,255,255,0.03);
          margin-top: 0.5rem;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .footer-section h3 {
          font-size: 0.7rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.2rem;
        }
        .footer-section p {
          font-size: 0.65rem;
          color: #888;
        }
        .footer-section a {
          display: block;
          color: #888;
          text-decoration: none;
          font-size: 0.65rem;
          padding: 0.1rem 0;
          transition: color 0.2s;
        }
        .footer-section a:hover { color: #F59E0B; }
        .social-links {
          display: flex;
          gap: 0.6rem;
          font-size: 1.2rem;
        }
        .social-links a { color: #888; text-decoration: none; transition: color 0.2s; }
        .social-links a:hover { color: #F59E0B; }
        .footer-bottom {
          text-align: center;
          padding-top: 0.8rem;
          margin-top: 0.8rem;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 0.6rem;
          color: #555;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ── WebView Modal ── (already defined inline, but keep for fallback) ── */

        @media (max-width: 768px) {
          .info-grid { grid-template-columns: 1fr 1fr; }
          .prize-grid { grid-template-columns: 1fr; }
          .rules-grid { grid-template-columns: repeat(3, 1fr); }
          .rewards-grid { grid-template-columns: repeat(3, 1fr); }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .form-grid { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
          .player-grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 2rem; }
          .cd-value { font-size: 1.4rem; }
        }
        @media (max-width: 480px) {
          .header-badge { font-size: 0.5rem; padding: 0.1rem 0.5rem; }
          .info-grid { grid-template-columns: 1fr 1fr; }
          .rules-grid { grid-template-columns: repeat(2, 1fr); }
          .rewards-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: 1fr; }
          .cd-value { font-size: 1.2rem; }
          .countdown-item { min-width: 30px; }
          .hero h1 { font-size: 1.6rem; }
          .form-card { padding: 1rem; }
          .section-title { font-size: 1rem; }
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
export default withCampaignMeta(BgmiTournamentRegistration, defaultMeta);