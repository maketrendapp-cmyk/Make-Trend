// pages/terms.js
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import { useProfile } from '../lib/queries';
import Meta from '../components/Meta';
import {
  FiBook,
  FiChevronRight,
  FiAlertCircle,
  FiMail,
  FiSend,
  FiUser,
  FiShield,
  FiDollarSign,
  FiUsers,
  FiGrid,
} from 'react-icons/fi';

export default function Terms() {
  const { user, isAuthenticated } = useAuth();
const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

  // ── Get username for welcome message ──
  const username = profile?.username || user?.username || user?.email?.split('@')[0] || 'User';
  const displayName = profile?.fullname || user?.fullName || user?.displayName || 'User';

  // ── Intersection Observer for scroll animations ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Email handler ──
  const handleEmailNow = () => {
    window.location.href = 'mailto:maketrendsupport@gmail.com?subject=Make Trend Support Inquiry';
  };

  return (
    <>
      <Meta
        title="Terms & Conditions | Make Trend"
        description="Read the terms and conditions that govern your use of Make Trend."
        url="https://maketrend.vercel.app/terms"
      />
      <div className="min-h-screen bg-white">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white py-16 sm:py-20">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <circle cx="200" cy="200" r="300" fill="white" />
              <circle cx="800" cy="700" r="350" fill="white" />
              <circle cx="500" cy="500" r="200" fill="white" opacity="0.5" />
            </svg>
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-4">
              <FiBook className="w-16 h-16 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Terms & Conditions
            </h1>
            <p className="mt-3 text-lg sm:text-xl text-indigo-100 max-w-3xl mx-auto">
              Please read these terms carefully before using Make Trend.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/create">
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-bold rounded-full hover:bg-gray-50 transition shadow-lg cursor-pointer text-sm">
                  Explore Templates <FiChevronRight className="w-4 h-4" />
                </span>
              </Link>
              <Link href={user ? '/profile' : '/login'}>
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-medium rounded-full hover:bg-white/30 transition border border-white/20 cursor-pointer text-sm">
                  {user ? 'Your Profile' : 'Get Started'} <FiChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Content ── */}
        <section className="py-12 bg-gray-50/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* ── Welcome Message ── */}
            <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 bg-white rounded-2xl shadow-md border border-gray-100/60 p-6 mb-8 text-center">
              {profileLoading || (user && !profile) ? (
                <div className="flex items-center justify-center gap-3 text-gray-700 animate-pulse">
                  <div className="w-6 h-6 bg-purple-200 rounded-full" />
                  <div className="h-6 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded ml-1" />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 text-gray-700">
                  <FiUser className="w-6 h-6 text-purple-600" />
                  <span className="text-lg font-medium">
                    Welcome,{' '}
                    <span className="font-bold text-purple-700">
                      @{user ? username : 'User'}
                    </span>
                    {user && (
                      <span className="text-gray-400 text-sm ml-1">
                        ({displayName})
                      </span>
                    )}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">
                These terms apply to your use of Make Trend. Please review them thoroughly.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8 space-y-8 backdrop-blur-sm">

              {/* 1. Introduction */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">1.</span> Introduction
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Welcome to Make Trend. By using our platform, you agree to comply with and be bound by the following terms and conditions.
                  If you do not agree to these terms, please do not use our services.
                </p>
              </div>

              {/* 1.1 What is MakeTrend? (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-120">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">1.1</span> What is MakeTrend?
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend is a smart campaign-building platform designed for creators, marketers, gaming communities, and online businesses who want to create engaging share-based campaigns without starting from scratch. Instead of building everything manually, users can choose from ready-made templates, customize the campaign details, set a share target, add tasks, and define a final redirect link. It turns a simple idea into an interactive campaign that people can actually participate in and share.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  For creators, MakeTrend saves time and makes promotion much easier. A creator can launch a campaign in minutes using templates like Thunder Game, Quiz Challenge, Spin & Win, Lucky Draw, or other custom styles. This means they do not need advanced design skills or coding knowledge. They can focus on the message, the reward, and the goal of the campaign while the platform handles the structure and user flow. The real benefit is not just a page that looks good, but a system that encourages people to engage, share, and help the campaign spread further.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend can be used for many different purposes – gaming events, audience growth, product promotion, community engagement, and more. It is flexible enough for entertainment, marketing, social growth, and promotional campaigns.
                </p>
              </div>

              {/* 2. Acceptance of Terms */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-150">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">2.</span> Acceptance of Terms
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  By creating an account, accessing, or using Make Trend, you acknowledge that you have read, understood,
                  and agree to be bound by these terms, our Privacy Policy, and any additional guidelines or rules we may post.
                </p>
              </div>

              {/* 3. Templates, Demonstrations & Simulated Experiences (NEW - mirrors Privacy) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-170">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">3.</span> Templates, Demonstrations &amp; Simulated Experiences
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <FiGrid className="text-purple-400" />
                  <span>Applies to all templates and interactive pages on MakeTrend</span>
                </div>

                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  MakeTrend is a platform for creating and customizing interactive web templates. Some templates available on MakeTrend may be designed to visually represent experiences such as promotional campaigns, giveaways, rewards, contests, surveys, registration forms, verification screens, gaming-related offers, or other interactive webpages.
                </p>

                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  These templates are provided primarily for design, demonstration, customization, and campaign-building purposes. The appearance and behavior of a template should not automatically be interpreted as proof that the promotion, reward, prize, offer, verification process, transaction, or service shown on the page is real or currently available.
                </p>

                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  Some templates may use simulated interactions, sample information, generated results, placeholder content, or visual effects to demonstrate how a particular webpage could look and behave. Unless a template or campaign explicitly states otherwise, these demonstrations do not provide real rewards, cashback, prizes, purchases, transactions, account verification, or other real-world services.
                </p>

                <h3 className="mt-4 font-semibold text-gray-800 text-sm">Information Entered Into Templates</h3>
                <p className="mt-1 text-gray-600 text-sm leading-relaxed">
                  Some templates may contain fields requesting information such as a name, email address, phone number, username, or other information. Depending on the particular template and its configuration, this information may be used temporarily to display or operate the on-page interface.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend does not intend for information entered into a standard template demonstration to be treated as a stored customer record. Unless clearly stated otherwise for a specific MakeTrend feature or campaign, information entered into a template demonstration is not stored or retained by MakeTrend.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Users should therefore avoid assuming that submitting information to a template demonstration creates an account, registers them for a real promotion, verifies their identity, qualifies them for a reward, or submits an actual application or claim.
                </p>

                <h3 className="mt-4 font-semibold text-gray-800 text-sm">Third-Party Brands and Content</h3>
                <p className="mt-1 text-gray-600 text-sm leading-relaxed">
                  A template may contain the names, logos, images, trademarks, or visual styles associated with third-party companies, products, games, or services. Such references may be included for demonstration, design, educational, or customization purposes and do not necessarily indicate that the template is officially connected with, sponsored by, endorsed by, or authorized by the referenced organization.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend does not represent a template as an official third-party promotion or service unless an official relationship or authorization is explicitly stated.
                </p>

                <h3 className="mt-4 font-semibold text-gray-800 text-sm">Important Notice</h3>
                <p className="mt-1 text-gray-600 text-sm leading-relaxed">
                  If a page is presented as a template or demonstration, visitors should consider the page's stated purpose and any accompanying notices before relying on its content. A visual representation of a reward, offer, verification, transaction, contest result, or promotional campaign does not by itself mean that the represented benefit or service is actually being provided.
                </p>
              </div>

              {/* 4. MT Coins & Withdrawals (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">4.</span> MT Coins &amp; Withdrawals
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2">Earnings</span>
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <FiDollarSign className="text-amber-500" />
                  <span>Applies to all earnings and withdrawal requests</span>
                </div>

                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  MakeTrend rewards users with <strong>MT Coins</strong> for campaign engagement. MT Coins are earned when your campaigns receive views, shares, unlocks, and completions – one MT Coin is awarded when all four actions are completed.
                </p>

                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Users may request withdrawals of accumulated MT Coins subject to:
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-600 text-sm list-disc pl-5">
                  <li>Meeting the minimum withdrawal threshold (currently 2,500 MT Coins = $15.00).</li>
                  <li>Providing accurate and complete payment details for the selected withdrawal method.</li>
                  <li>Compliance with all applicable laws and anti‑fraud measures.</li>
                  <li>No pending disputes or violations of these Terms.</li>
                </ul>

                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  <strong>Important:</strong> MT Coins have no cash value outside the MakeTrend platform. They are promotional rewards earned through user engagement. Withdrawals are processed after verification and are subject to a review period. MakeTrend reserves the right to:
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-600 text-sm list-disc pl-5">
                  <li>Suspend or cancel withdrawals if fraud, abuse, or violations are detected.</li>
                  <li>Adjust the withdrawal threshold or rules at any time (with reasonable notice).</li>
                  <li>Require identity verification for large or suspicious withdrawals.</li>
                </ul>

                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <FiAlertCircle className="inline mr-1.5" />
                  <strong>No guaranteed earnings:</strong> MT Coin earnings depend on campaign performance. MakeTrend does not guarantee any specific amount of earnings.
                </div>
              </div>

              {/* 5. Referral Program (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-220">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">5.</span> Referral Program
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Invite & Earn</span>
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <FiUsers className="text-blue-500" />
                  <span>Applies to all referral activities</span>
                </div>

                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  MakeTrend offers a referral program where users can invite others to join the platform. Referral rewards are granted as follows:
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-600 text-sm list-disc pl-5">
                  <li>When a referred user creates an account and completes their profile, the referrer earns one referral credit.</li>
                  <li>For every <strong>5</strong> successful referrals, the referrer receives <strong>24 hours of PRO access</strong> at no cost.</li>
                  <li>Referral credits are tracked automatically and are non‑transferable.</li>
                </ul>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  <strong>Self‑referral is prohibited.</strong> Creating multiple accounts or using the same device to refer yourself will result in forfeiture of rewards and potential account suspension.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend reserves the right to modify or terminate the referral program at any time with reasonable notice.
                </p>
              </div>

              {/* 6. User Accounts & Responsibilities (revised) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-250">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">6.</span> User Accounts &amp; Responsibilities
                </h2>
                <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                  <li>You must be <strong>at least 13 years old</strong> to create an account.</li>
                  <li>You must be <strong>at least 18 years old</strong> to request withdrawals or participate in financial features.</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>You are solely responsible for all content you post, including campaigns, tasks, and descriptions.</li>
                  <li>You must not share your account with others or use another user's account without permission.</li>
                  <li>You agree to provide accurate and up‑to‑date information during registration and withdrawal requests.</li>
                  <li>You are responsible for all activity that occurs under your account.</li>
                </ul>
              </div>

              {/* 7. User Content & Responsibility (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-280">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">7.</span> User Content &amp; Responsibility
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  You retain ownership of all content you create on MakeTrend, including campaigns, tasks, descriptions, and customisations. However, by publishing content on the platform, you grant MakeTrend a non‑exclusive, worldwide, royalty‑free license to display, promote, and distribute your content in connection with our services.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  You are <strong>solely responsible</strong> for:
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-600 text-sm list-disc pl-5">
                  <li>Ensuring your content does not violate any third‑party rights (copyright, trademark, privacy).</li>
                  <li>Ensuring your content is not defamatory, obscene, or otherwise unlawful.</li>
                  <li>Ensuring your tasks and redirects do not direct users to harmful or deceptive content.</li>
                  <li>Any claims, disputes, or damages arising from your content.</li>
                </ul>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend reserves the right to remove any content that violates these terms or is otherwise harmful to the platform or its users.
                </p>
              </div>

              {/* 8. Prohibited Uses (revised) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-300">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">8.</span> Prohibited Uses
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  You agree not to use Make Trend for any unlawful or prohibited purpose, including but not limited to:
                </p>
                <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                  <li>Engaging in any fraudulent, deceptive, or misleading activities.</li>
                  <li>Distributing spam, viruses, or malicious software.</li>
                  <li>Impersonating any person or entity.</li>
                  <li>Posting content that is defamatory, obscene, or harassing.</li>
                  <li><strong>Attempting to manipulate shares, unlocks, or engagement metrics artificially</strong> (e.g., bots, fake accounts, automated scripts).</li>
                  <li>Using the platform for any illegal or unethical purposes.</li>
                  <li>Creating campaigns that promote violence, illegal activities, or hate speech.</li>
                  <li>Phishing, scamming, or attempting to collect user data fraudulently.</li>
                  <li>Reverse‑engineering, decompiling, or attempting to extract the platform's source code.</li>
                </ul>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Violation of these terms may result in immediate account suspension, forfeiture of earnings, and legal action where applicable.
                </p>
              </div>

              {/* 9. Intellectual Property */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-350">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">9.</span> Intellectual Property
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  All content on Make Trend, including templates, logos, designs, and code, is the property of Make Trend or its licensors.
                  You may not reproduce, distribute, or create derivative works without our explicit written permission.
                  Content you create (campaigns, tasks, etc.) remains your property, but you grant us a non‑exclusive, worldwide,
                  royalty‑free license to display and promote it on our platform.
                </p>
              </div>

              {/* 10. Indemnification (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-380">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">10.</span> Indemnification
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  You agree to indemnify, defend, and hold harmless MakeTrend, its owners, employees, and affiliates from and against any and all claims, liabilities, damages, losses, costs, or expenses (including reasonable legal fees) arising out of or related to:
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-600 text-sm list-disc pl-5">
                  <li>Your use of the platform.</li>
                  <li>Your violation of these Terms.</li>
                  <li>Your infringement of any third‑party rights.</li>
                  <li>Your content, campaigns, or tasks.</li>
                </ul>
              </div>

              {/* 11. Disclaimer of Warranties */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-400">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">11.</span> Disclaimer of Warranties
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Make Trend is provided "as is" and "as available." We do not warrant that the service will be uninterrupted, error‑free,
                  or secure. We disclaim all warranties, express or implied, to the fullest extent permitted by law.
                </p>
              </div>

              {/* 12. Limitation of Liability */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-450">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">12.</span> Limitation of Liability
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  To the maximum extent permitted by law, Make Trend and its owners, employees, and affiliates shall not be liable for any
                  direct, indirect, incidental, consequential, or punitive damages arising out of your use of the platform.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  In no event shall our total liability exceed the amount paid by you to MakeTrend (if any) in the six months preceding the claim.
                </p>
              </div>

              {/* 13. Refund & Cancellation Policy (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-480">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">13.</span> Refund &amp; Cancellation Policy
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend is a free‑to‑use platform. No payments are required to create campaigns or earn MT Coins. As such:
                </p>
                <ul className="mt-2 space-y-1.5 text-gray-600 text-sm list-disc pl-5">
                  <li>There are <strong>no fees or subscriptions</strong> charged by MakeTrend, so refunds do not apply.</li>
                  <li>Withdrawals of MT Coins are subject to the terms in Section 4 and are processed after verification.</li>
                  <li>Once a withdrawal is approved, funds are sent to the provided payment details and cannot be reversed.</li>
                  <li>If an error occurs, please contact support for investigation.</li>
                </ul>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Users may delete their account at any time via profile settings. Deleted accounts forfeit any unused MT Coins.
                </p>
              </div>

              {/* 14. Termination */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-500">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">14.</span> Termination
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We reserve the right to suspend or terminate your account at any time, without notice, for conduct that we believe violates
                  these terms or is harmful to the platform or its users. You may also delete your account at any time via your profile settings.
                </p>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Upon termination, your access to the platform will be revoked, and any pending withdrawal requests may be cancelled.
                </p>
              </div>

              {/* 15. Force Majeure (NEW) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-530">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">15.</span> Force Majeure
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  MakeTrend shall not be liable for any delay or failure to perform its obligations where such delay or failure arises from circumstances beyond our reasonable control, including but not limited to natural disasters, pandemics, war, terrorism, strikes, or government actions.
                </p>
              </div>

              {/* 16. Governing Law */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-550">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">16.</span> Governing Law
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  These terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                  Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in India.
                </p>
              </div>

              {/* 17. Changes to Terms */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-600">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">17.</span> Changes to These Terms
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We may update these terms from time to time. We will notify you of any significant changes by posting the new terms on this page
                  and updating the "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the new terms.
                </p>
              </div>

              {/* 18. Contact with Email Button */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-650">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">18.</span> Contact Us
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  If you have any questions about these terms, please reach out to us:
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleEmailNow}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5"
                  >
                    <FiSend className="w-4 h-4" />
                    Email Now
                  </button>
                  <span className="text-sm text-gray-500">or directly at</span>
                  <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-mono text-gray-700 border border-gray-200">
                    maketrendsupport@gmail.com
                  </code>
                </div>
              </div>

              {/* ── Legal footer ── */}
              <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
                <p>
                  This document is a legal agreement between you and Make Trend.
                  By using the platform, you accept these terms in full.
                </p>
                <p className="mt-1">
                  <span className="inline-flex items-center gap-1">
                    <FiShield className="text-purple-400" />
                    Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-gray-50 border-t border-gray-200 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Make Trend. All rights reserved.</p>
            <div className="flex gap-4 mt-2 sm:mt-0">
              <Link href="/terms"><span className="hover:text-primary cursor-pointer">Terms</span></Link>
              <Link href="/privacy"><span className="hover:text-primary cursor-pointer">Privacy</span></Link>
              <Link href="/rules"><span className="hover:text-primary cursor-pointer">Rules</span></Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}