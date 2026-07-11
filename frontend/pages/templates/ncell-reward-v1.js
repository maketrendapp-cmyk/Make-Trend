// pages/templates/ncell-reward-v1.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function NcellRewardV1() {
  const router = useRouter();
  const { id } = router.query;

  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [confirmedNumber, setConfirmedNumber] = useState('');
  const [refSuffix, setRefSuffix] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setMobileNumber(val);
    if (error) setError('');
  };

  const validateNcellNumber = (num) => {
    return /^(98|97)\d{8}$/.test(num);
  };

  const handleClaim = () => {
    if (!validateNcellNumber(mobileNumber)) {
      setError('Please enter a valid 10-digit Ncell number starting with 98 or 97.');
      return;
    }
    setStep(2);
    setIsLoading(true);
    setTimeout(() => {
      setConfirmedNumber('+977 ' + mobileNumber);
      const random = Math.floor(1000 + Math.random() * 9000);
      setRefSuffix(String(random));
      setStep(3);
      setIsLoading(false);
    }, 1800);
  };

  const handleContinueToReward = () => {
    if (id) {
      router.push(`/tasks?id=${id}`);
    } else {
      alert('Missing campaign ID. Please check the link.');
    }
  };

  return (
    <>
      <Head>
        <title>Ncell Axiata • Reward Verification Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <div className="page-wrapper">
        {/* Header */}
        <header className="site-header">
          <div className="header-logo">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Ncell_logo.svg/2560px-Ncell_logo.svg.png"
              alt="Ncell Axiata Limited"
              loading="eager"
              width="140"
              height="38"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"%3E%3Crect fill="%23702082" width="200" height="50" rx="8"/%3E%3Ctext x="100" y="32" text-anchor="middle" fill="white" font-size="18" font-weight="bold"%3ENcell%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
          <div className="header-badge">
            <span className="pulse-dot"></span> Official Campaign
          </div>
        </header>

        {/* Hero */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-icon"><i className="fas fa-gift"></i></div>
            <h1>Digital Reward Program 2026</h1>
            <p>Celebrating our valued prepaid users across Nepal with an exclusive instant cashback reward.</p>
            <div className="hero-badge-row">
              <span><i className="fas fa-bolt"></i> Instant</span>
              <span><i className="fas fa-shield-halved"></i> Secure</span>
              <span><i className="fas fa-users"></i> Exclusive</span>
            </div>
          </div>
        </section>

        {/* Main Card */}
        <main className="main-card-wrapper">
          <div className="reward-card">
            {/* Step Indicators */}
            <div className="step-indicator">
              <div className={`step-dot ${step >= 2 ? 'completed' : 'active'}`}>
                {step > 1 ? <i className="fas fa-check"></i> : 1}
              </div>
              <div className={`step-dot ${step >= 3 ? 'completed' : step === 2 ? 'active' : ''}`}>
                {step > 2 ? <i className="fas fa-check"></i> : 2}
              </div>
              <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>
                {step > 3 ? <i className="fas fa-check"></i> : 3}
              </div>
            </div>

            {/* Step 1: Enter Mobile */}
            {step === 1 && (
              <div className="panel">
                <div className="text-center">
                  <span className="reward-tag">Limited Time Promotion</span>
                  <div className="cash-amount"><span className="currency">Rs.</span>100</div>
                  <p className="benefit-text">
                    Congratulations! Your Ncell profile has been pre-selected for an instant <strong>Rs. 100 main balance cashback</strong>. Verify your number to claim.
                  </p>
                </div>
                <div className="input-group">
                  <div className={`input-wrapper ${error ? 'error' : ''}`}>
                    <span className="prefix">
                      <img src="https://flagcdn.com/w20/np.png" alt="Nepal" width="22" height="15" />
                      +977
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="98XXXXXXXX"
                      maxLength="10"
                      value={mobileNumber}
                      onChange={handleMobileChange}
                      onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleClaim()}
                    />
                  </div>
                  {error && <p className="error-msg">{error}</p>}
                </div>
                <button className="btn-primary" onClick={handleClaim} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Continue to Claim'} <i className="fas fa-arrow-right"></i>
                </button>
                <div className="trust-badges">
                  <span><i className="fas fa-user-shield"></i> Verified</span>
                  <span><i className="fas fa-bolt"></i> Instant</span>
                  <span><i className="fas fa-lock"></i> Encrypted</span>
                </div>
              </div>
            )}

            {/* Step 2: Loading */}
            {step === 2 && (
              <div className="panel text-center">
                <div className="loading-spinner"></div>
                <h3>Verifying MSISDN</h3>
                <p>Checking eligibility with Axiata Central Systems…</p>
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="panel text-center">
                <div className="success-icon"><i className="fas fa-check"></i></div>
                <h2>Reward Confirmed!</h2>
                <p>The <strong>Rs. 100 Cashback</strong> has been approved for</p>
                <p className="confirmed-number">{confirmedNumber}</p>
                <div className="ref-box">
                  Reference ID: <strong>NC-TXN-2026-{refSuffix}</strong>
                </div>
                <p className="note-text">Your cashback will reflect in your main balance within <strong>15 minutes</strong>.</p>
                <button className="btn-outline" onClick={handleContinueToReward}>
                  <i className="fas fa-gift"></i> Continue to Reward
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Trust Cards */}
        <div className="trust-cards">
          <div><i className="fas fa-bolt"></i><span>Instant Processing</span></div>
          <div><i className="fas fa-shield-halved"></i><span>Safe & Secure</span></div>
          <div><i className="fas fa-headset"></i><span>24/7 Support</span></div>
          <div><i className="fas fa-circle-check"></i><span>Ncell Official</span></div>
        </div>

        {/* Info Sections */}
        <div className="info-sections">
          <div className="info-block">
            <h3><i className="fas fa-circle-info"></i> Campaign Overview</h3>
            <p>The Ncell Axiata <strong>"Digital First" Reward Campaign 2026</strong> is designed to encourage prepaid users to verify their mobile identities and transition towards digital self-service. This promotion is strictly limited to verified Ncell Prepaid users within Nepal.</p>
          </div>
          <div className="info-block">
            <h3><i className="fas fa-file-contract"></i> Terms & Conditions</h3>
            <ul>
              <li>The <strong>Rs. 100 cashback</strong> is a one-time reward per unique mobile number and is credited to the main balance.</li>
              <li>Eligibility is determined automatically based on account activity, tenure, and registration validity.</li>
              <li>Cashback funds can be used for voice calls, SMS, data packages, and other standard Ncell services.</li>
              <li>Verification requires a <strong>valid 10-digit Ncell number</strong> starting with '98' or '97'.</li>
              <li>Ncell Axiata Limited reserves the right to modify or terminate this offer at any time.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="site-footer">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Ncell_logo.svg/2560px-Ncell_logo.svg.png"
            alt="Ncell Logo"
            width="120"
            height="28"
          />
          <p>© 2026 Ncell Axiata Limited. All Rights Reserved. Ncell Axiata Limited is the first private sector mobile service provider in Nepal, committed to delivering world-class mobile connectivity and digital services to millions of Nepali users.</p>
          <p className="footer-contact">Kathmandu, Nepal &nbsp;|&nbsp; Customer Support: 9005 &nbsp;|&nbsp; www.ncell.axiata.com</p>
        </footer>
      </div>

      {/* ===== ALL STYLES EMBEDDED ===== */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ===== RESET ===== */
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fdfaff; color: #1f2937; line-height: 1.6; min-height: 100vh; }
        .page-wrapper { max-width: 100%; overflow-x: hidden; }

        /* ===== HEADER ===== */
        .site-header { position: sticky; top:0; z-index:100; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(112,32,130,0.08); padding: 0.7rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        .header-logo img { height: 38px; width: auto; }
        .header-badge { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #006b3f; background: #e6f7f0; padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(0,107,63,0.15); }
        .pulse-dot { width: 8px; height: 8px; background: #00965f; border-radius: 50%; animation: pulseDot 2s infinite; }
        @keyframes pulseDot { 0%,100% { box-shadow: 0 0 0 0 rgba(0,150,95,0.5); } 50% { box-shadow: 0 0 0 10px rgba(0,150,95,0); } }

        /* ===== HERO ===== */
        .hero-section { position: relative; width: 100%; min-height: 280px; background: linear-gradient(155deg, rgba(112,32,130,0.88), rgba(74,16,88,0.9), rgba(142,60,168,0.78)), url('https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=1200&auto=format&fit=crop') center/cover no-repeat; display: flex; align-items: center; justify-content: center; text-align: center; color: white; padding: 3rem 1.5rem; }
        .hero-icon { display: inline-block; width: 64px; height: 64px; background: rgba(255,255,255,0.15); border-radius: 22px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 1rem; }
        .hero-content h1 { font-size: clamp(1.5rem, 3.5vw, 2.2rem); font-weight: 900; letter-spacing: -0.5px; margin-bottom: 0.5rem; }
        .hero-content p { font-size: 0.95rem; opacity: 0.9; font-weight: 500; max-width: 420px; margin: 0 auto; }
        .hero-badge-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 1.2rem; }
        .hero-badge-row span { background: rgba(255,255,255,0.15); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.25); padding: 6px 14px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }

        /* ===== MAIN CARD ===== */
        .main-card-wrapper { max-width: 480px; margin: -55px auto 2rem; padding: 0 1rem; position: relative; z-index: 10; }
        .reward-card { background: #ffffff; border-radius: 36px; padding: 2.2rem 1.8rem; box-shadow: 0 24px 56px rgba(0,0,0,0.12), 0 12px 32px rgba(112,32,130,0.18); border: 1px solid rgba(112,32,130,0.06); }

        /* ===== STEP INDICATOR ===== */
        .step-indicator { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; position: relative; padding: 0 10px; }
        .step-indicator::before { content: ''; position: absolute; top: 50%; left: 28px; right: 28px; height: 3px; background: #e5e7eb; border-radius: 99px; z-index: 0; transform: translateY(-50%); }
        .step-dot { width: 38px; height: 38px; border-radius: 50%; background: white; border: 3px solid #d1d5db; z-index: 1; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; color: #9ca3af; transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .step-dot.active { border-color: #702082; color: #702082; box-shadow: 0 0 0 8px rgba(112,32,130,0.08); }
        .step-dot.completed { background: #702082; border-color: #702082; color: white; box-shadow: 0 4px 14px rgba(112,32,130,0.3); }
        .step-dot i { font-size: 0.7rem; }

        /* ===== PANELS ===== */
        .panel { animation: fadeSlide 0.45s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes fadeSlide { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform: translateY(0); } }
        .text-center { text-align: center; }

        /* ===== STEP 1 ===== */
        .reward-tag { display: inline-block; background: #fdf0f7; color: #e11a81; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; padding: 7px 16px; border-radius: 99px; margin-bottom: 1rem; border: 1px solid rgba(225,26,129,0.2); }
        .cash-amount { font-size: 3.8rem; font-weight: 950; color: #111827; letter-spacing: -2px; line-height: 1; margin: 0.5rem 0 0.3rem; }
        .cash-amount .currency { font-size: 1.4rem; color: #00965f; vertical-align: super; margin-right: 2px; font-weight: 800; }
        .benefit-text { font-size: 0.9rem; color: #6b7280; margin-bottom: 1.6rem; font-weight: 500; }
        .input-group { margin-bottom: 1.2rem; }
        .input-wrapper { background: #f9fafb; border: 2.5px solid #e5e7eb; border-radius: 20px; display: flex; align-items: center; padding: 4px 16px; transition: all 0.3s ease; }
        .input-wrapper:focus-within { border-color: #702082; background: white; box-shadow: 0 0 0 6px rgba(112,32,130,0.06); }
        .input-wrapper.error { border-color: #ef4444 !important; box-shadow: 0 0 0 6px rgba(239,68,68,0.06) !important; }
        .prefix { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #374151; padding-right: 14px; border-right: 2px solid #e5e7eb; font-size: 0.95rem; }
        .prefix img { width: 22px; height: auto; border-radius: 3px; }
        .input-wrapper input { flex: 1; border: none; background: transparent; padding: 1rem 0.8rem; font-size: 1.2rem; font-weight: 700; color: #111827; outline: none; letter-spacing: 0.5px; font-family: inherit; }
        .input-wrapper input::placeholder { color: #9ca3af; font-weight: 500; }
        .error-msg { display: block; font-size: 0.75rem; color: #ef4444; margin-top: 6px; padding-left: 4px; font-weight: 600; }

        /* ===== BUTTONS ===== */
        .btn-primary { width: 100%; background: linear-gradient(135deg, #702082 0%, #4a1058 100%); color: white; border: none; padding: 1.1rem; border-radius: 20px; font-size: 1.05rem; font-weight: 800; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 12px 32px rgba(112,32,130,0.18); display: flex; align-items: center; justify-content: center; gap: 10px; letter-spacing: 0.3px; font-family: inherit; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(112,32,130,0.35); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .btn-outline { width: 100%; background: white; color: #702082; border: 2.5px solid #702082; padding: 1rem; border-radius: 20px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.3s ease; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 1.2rem; }
        .btn-outline:hover { background: rgba(112,32,130,0.04); box-shadow: 0 8px 24px rgba(112,32,130,0.12); }

        /* ===== TRUST BADGES ===== */
        .trust-badges { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 1.8rem; padding-top: 1.4rem; border-top: 1px solid #f3f4f6; }
        .trust-badges span { text-align: center; font-size: 0.65rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }
        .trust-badges i { display: block; font-size: 1.3rem; color: #702082; margin-bottom: 5px; }

        /* ===== LOADING ===== */
        .loading-spinner { width: 72px; height: 72px; border: 5px solid #e5e7eb; border-top-color: #702082; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-dots { display: flex; justify-content: center; gap: 6px; margin-top: 1rem; }
        .loading-dots span { width: 8px; height: 8px; background: #8e3ca8; border-radius: 50%; animation: dotBounce 1.4s infinite ease-in-out; }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotBounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.3); opacity: 1; } }

        /* ===== SUCCESS ===== */
        .success-icon { width: 80px; height: 80px; background: #e6f7f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; animation: successPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes successPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .success-icon i { font-size: 2.2rem; color: #00965f; }
        .confirmed-number { font-weight: 800; color: #111827; font-size: 1.1rem; margin: 0.4rem 0; }
        .ref-box { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 12px; padding: 1rem; margin: 1.2rem 0; font-size: 0.8rem; color: #6b7280; }
        .ref-box strong { color: #111827; letter-spacing: 0.5px; }
        .note-text { font-size: 0.78rem; color: #6b7280; }

        /* ===== TRUST CARDS ===== */
        .trust-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; max-width: 700px; margin: 0 auto 2rem; padding: 0 1.5rem; }
        .trust-cards div { background: white; border-radius: 28px; padding: 1.4rem; text-align: center; border: 1px solid #f3f4f6; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.3s ease; }
        .trust-cards div:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .trust-cards i { font-size: 1.6rem; color: #702082; margin-bottom: 8px; display: block; }
        .trust-cards span { font-size: 0.72rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }

        /* ===== INFO SECTIONS ===== */
        .info-sections { max-width: 700px; margin: 2rem auto 2rem; padding: 0 1.5rem; }
        .info-block { background: white; border-radius: 28px; padding: 1.8rem; margin-bottom: 1.5rem; border: 1px solid #f3f4f6; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.3s ease; }
        .info-block:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .info-block h3 { font-size: 1rem; font-weight: 800; color: #111827; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 10px; }
        .info-block h3 i { color: #702082; font-size: 1.1rem; }
        .info-block p { font-size: 0.85rem; color: #6b7280; line-height: 1.7; }
        .info-block ul { list-style: none; padding: 0; }
        .info-block ul li { font-size: 0.83rem; color: #6b7280; padding: 7px 0 7px 22px; position: relative; line-height: 1.6; }
        .info-block ul li::before { content: '▸'; position: absolute; left: 0; color: #702082; font-weight: 700; }

        /* ===== FOOTER ===== */
        .site-footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 2.5rem 1.5rem; text-align: center; }
        .site-footer img { height: 28px; opacity: 0.45; margin-bottom: 1.2rem; transition: opacity 0.2s; }
        .site-footer img:hover { opacity: 0.7; }
        .site-footer p { font-size: 0.7rem; color: #9ca3af; max-width: 550px; margin: 0 auto; line-height: 1.7; }
        .footer-contact { font-weight: 700; color: #6b7280; margin-top: 0.6rem; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 520px) {
          .hero-section { min-height: 220px; padding: 2rem 1rem; }
          .hero-content h1 { font-size: 1.3rem; }
          .hero-content p { font-size: 0.8rem; }
          .hero-icon { width: 48px; height: 48px; font-size: 1.3rem; border-radius: 16px; }
          .main-card-wrapper { margin-top: -40px; padding: 0 0.7rem; }
          .reward-card { padding: 1.5rem 1.1rem; border-radius: 28px; }
          .cash-amount { font-size: 2.8rem; }
          .step-dot { width: 32px; height: 32px; font-size: 0.7rem; }
          .step-indicator::before { top: 50%; left: 22px; right: 22px; }
          .input-wrapper input { font-size: 1rem; padding: 0.8rem 0.5rem; }
          .btn-primary { padding: 0.95rem; font-size: 0.95rem; border-radius: 16px; }
          .trust-badges { gap: 6px; }
          .trust-badges span { font-size: 0.6rem; }
          .trust-badges i { font-size: 1.1rem; }
          .info-sections { padding: 0 0.8rem; }
          .info-block { padding: 1.2rem; border-radius: 20px; }
          .trust-cards { grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 0.8rem; }
          .site-header { padding: 0.6rem 1rem; }
          .header-logo img { height: 30px; }
          .header-badge { font-size: 0.6rem; padding: 5px 10px; gap: 5px; }
        }
        @media (max-width: 360px) {
          .cash-amount { font-size: 2.3rem; }
          .reward-card { padding: 1.2rem 0.9rem; }
          .step-dot { width: 28px; height: 28px; font-size: 0.65rem; }
          .step-indicator::before { top: 50%; left: 18px; right: 18px; }
        }
      `}} />
    </>
  );
}