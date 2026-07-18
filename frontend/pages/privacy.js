// pages/privacy.js
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import { useAppData } from '../lib/useAppData';
import Meta from '../components/Meta';
import {
  FiShield,
  FiChevronRight,
  FiMail,
  FiSend,
  FiUser,
  FiMapPin,
} from 'react-icons/fi';

export default function Privacy() {
  const { user } = useAuth();
const { profile } = useAppData();

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
    window.location.href = 'mailto:maketrendsupport@gmail.com?subject=Make Trend Privacy Inquiry';
  };

  return (
    <>
      <Meta
        title="Privacy Policy | Make Trend"
        description="Learn how Make Trend collects, uses, and protects your personal data."
        url="https://maketrend.vercel.app/privacy"
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
              <FiShield className="w-16 h-16 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Privacy Policy
            </h1>
            <p className="mt-3 text-lg sm:text-xl text-indigo-100 max-w-3xl mx-auto">
              Your privacy matters to us. Read how we protect your data.
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
              <p className="text-sm text-gray-500 mt-1">
                This policy explains how we handle your data. Please take a moment to read it.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8 space-y-8 backdrop-blur-sm">

              {/* 1. Introduction */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">1.</span> Introduction
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  At Make Trend, we respect your privacy and are committed to protecting your personal data.
                  This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
                </p>
              </div>

              {/* 2. Data We Collect */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-150">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">2.</span> What Data We Collect
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">We may collect the following types of information:</p>
                <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                  <li><strong>Account Information:</strong> Username, email address, full name, profile picture.</li>
                  <li><strong>Campaign Data:</strong> Campaigns you create, tasks, shares, unlocks, and engagement metrics.</li>
                  <li><strong>Usage Data:</strong> How you interact with the platform (pages visited, features used, time spent).</li>
                  <li><strong>Device & Technical Data:</strong> IP address, browser type, device identifiers, operating system.</li>
                  <li><strong>Cookies & Tracking:</strong> We use cookies to enhance your experience and analyse usage.</li>
                </ul>
              </div>

              {/* 3. How We Use Your Data */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">3.</span> How We Use Your Data
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">We use your data for the following purposes:</p>
                <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                  <li>To provide, maintain, and improve our services.</li>
                  <li>To personalise your experience and show relevant content.</li>
                  <li>To communicate with you (updates, support, announcements).</li>
                  <li>To analyse platform performance and user behaviour.</li>
                  <li>To detect and prevent fraud, abuse, or illegal activity.</li>
                  <li>To comply with legal obligations.</li>
                </ul>
              </div>

              {/* 4. Data Sharing */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-250">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">4.</span> Data Sharing & Disclosure
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We do not sell or rent your personal data to third parties. We may share data in the following circumstances:
                </p>
                <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                  <li><strong>Service Providers:</strong> We may share data with trusted vendors who help us operate the platform (e.g., hosting, analytics, payment processing).</li>
                  <li><strong>Legal Compliance:</strong> We may disclose data if required by law, court order, or to enforce our terms.</li>
                  <li><strong>Business Transfers:</strong> In case of a merger or acquisition, your data may be transferred to the new entity.</li>
                  <li><strong>Public Content:</strong> Campaigns and content you create may be publicly visible by default.</li>
                </ul>
              </div>

              {/* 5. Data Security */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-300">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">5.</span> Data Security
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your data from unauthorised access, alteration, disclosure, or destruction.
                  However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              {/* 6. Your Rights (GDPR / CCPA) */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-350">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">6.</span> Your Data Rights
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Depending on your location, you may have certain rights regarding your personal data:
                </p>
                <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                  <li><strong>Access:</strong> You can request a copy of the data we hold about you.</li>
                  <li><strong>Rectification:</strong> You can correct any inaccurate or incomplete data.</li>
                  <li><strong>Erasure:</strong> You can ask us to delete your data (subject to legal obligations).</li>
                  <li><strong>Restriction:</strong> You can limit how we use your data.</li>
                  <li><strong>Portability:</strong> You can request a transfer of your data to another service.</li>
                  <li><strong>Objection:</strong> You can object to certain processing activities.</li>
                </ul>
                <p className="mt-2 text-gray-600 text-sm">
                  To exercise these rights, please reach out using the contact options below.
                </p>
              </div>

              {/* 7. Cookies */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-400">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">7.</span> Cookies & Tracking
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We use cookies and similar tracking technologies to enhance your experience, analyse usage, and deliver personalised content.
                  You can control cookie preferences through your browser settings. However, disabling cookies may affect certain features of the platform.
                </p>
              </div>

              {/* 8. Data Retention */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-450">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">8.</span> Data Retention
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We retain your data for as long as your account is active or as needed to provide you with our services.
                  When you delete your account, we will remove or anonymise your personal data within a reasonable timeframe,
                  unless we are required to retain it for legal or compliance reasons.
                </p>
              </div>

              {/* 9. Third‑Party Links */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-500">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">9.</span> Third‑Party Links
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Our platform may contain links to third‑party websites. We are not responsible for the privacy practices or content of those sites.
                  We encourage you to review the privacy policies of any external websites you visit.
                </p>
              </div>

              {/* 10. Children's Privacy */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-550">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">10.</span> Children's Privacy
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  Make Trend is not intended for children under the age of 13. We do not knowingly collect personal data from children under 13.
                  If you believe we have collected data from a child under 13, please contact us and we will take steps to delete that information.
                </p>
              </div>

              {/* 11. Changes to This Policy */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-600">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">11.</span> Changes to This Privacy Policy
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page
                  and updating the “Last updated” date. Your continued use of the platform after changes constitutes acceptance of the new policy.
                </p>
              </div>

              {/* 12. Contact with Email Button & Address */}
              <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-650">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-purple-600">12.</span> Contact Us
                </h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out:
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={handleEmailNow}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5"
                  >
                    <FiSend className="w-4 h-4" />
                    Email Now
                  </button>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span>Or email us directly at:</span>
                    <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-mono text-gray-700 border border-gray-200">
                      maketrendsupport@gmail.com
                    </code>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                    <FiMapPin className="w-4 h-4 text-purple-600" />
                    <span>Kathmandu, Nepal</span>
                  </div>
                </div>
              </div>

              {/* ── Legal footer ── */}
              <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
                <p>
                  This Privacy Policy is part of our commitment to transparency and protecting your rights.
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