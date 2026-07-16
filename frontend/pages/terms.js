// pages/terms.js
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import { FiBook, FiChevronRight, FiAlertCircle, FiMail } from 'react-icons/fi';

export default function Terms() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero (compact, like rules page) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white py-12 sm:py-16">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <circle cx="200" cy="200" r="300" fill="white" />
            <circle cx="800" cy="700" r="350" fill="white" />
            <circle cx="500" cy="500" r="200" fill="white" opacity="0.5" />
          </svg>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-3">
            <FiBook className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Terms & Conditions
          </h1>
          <p className="mt-2 text-lg max-w-3xl mx-auto text-indigo-100">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/create">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 font-bold rounded-xl hover:bg-indigo-50 transition shadow-lg cursor-pointer text-sm">
                Explore Templates <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <Link href={user ? '/profile' : '/login'}>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-white/30 transition border border-white/20 cursor-pointer text-sm">
                {user ? 'Your Profile' : 'Get Started'} <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-8">

            {/* 1. Introduction */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">1.</span> Introduction
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                Welcome to Make Trend. By using our platform, you agree to comply with and be bound by the following terms and conditions.
                If you do not agree to these terms, please do not use our services.
              </p>
            </div>

            {/* 2. Acceptance of Terms */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">2.</span> Acceptance of Terms
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                By creating an account, accessing, or using Make Trend, you acknowledge that you have read, understood,
                and agree to be bound by these terms, our Privacy Policy, and any additional guidelines or rules we may post.
              </p>
            </div>

            {/* 3. User Accounts */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">3.</span> User Accounts & Responsibilities
              </h2>
              <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                <li>You must be at least 13 years old to use Make Trend.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You are solely responsible for all content you post, including campaigns, tasks, and descriptions.</li>
                <li>You must not share your account with others or use another user’s account without permission.</li>
                <li>You agree to provide accurate and up‑to‑date information during registration.</li>
              </ul>
            </div>

            {/* 4. Prohibited Uses */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">4.</span> Prohibited Uses
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                You agree not to use Make Trend for any unlawful or prohibited purpose, including but not limited to:
              </p>
              <ul className="mt-2 space-y-2 text-gray-600 text-sm list-disc pl-5">
                <li>Engaging in any fraudulent, deceptive, or misleading activities.</li>
                <li>Distributing spam, viruses, or malicious software.</li>
                <li>Impersonating any person or entity.</li>
                <li>Posting content that is defamatory, obscene, or harassing.</li>
                <li>Attempting to manipulate shares, unlocks, or engagement metrics artificially.</li>
                <li>Using the platform for any illegal or unethical purposes.</li>
              </ul>
            </div>

            {/* 5. Intellectual Property */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">5.</span> Intellectual Property
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                All content on Make Trend, including templates, logos, designs, and code, is the property of Make Trend or its licensors.
                You may not reproduce, distribute, or create derivative works without our explicit written permission.
                Content you create (campaigns, tasks, etc.) remains your property, but you grant us a non‑exclusive, worldwide,
                royalty‑free license to display and promote it on our platform.
              </p>
            </div>

            {/* 6. Termination */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">6.</span> Termination
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, without notice, for conduct that we believe violates
                these terms or is harmful to the platform or its users. You may also delete your account at any time via your profile settings.
              </p>
            </div>

            {/* 7. Disclaimer of Warranties */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">7.</span> Disclaimer of Warranties
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                Make Trend is provided “as is” and “as available.” We do not warrant that the service will be uninterrupted, error‑free,
                or secure. We disclaim all warranties, express or implied, to the fullest extent permitted by law.
              </p>
            </div>

            {/* 8. Limitation of Liability */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">8.</span> Limitation of Liability
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                To the maximum extent permitted by law, Make Trend and its owners, employees, and affiliates shall not be liable for any
                direct, indirect, incidental, consequential, or punitive damages arising out of your use of the platform.
              </p>
            </div>

            {/* 9. Governing Law */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">9.</span> Governing Law
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in India.
              </p>
            </div>

            {/* 10. Changes to Terms */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">10.</span> Changes to These Terms
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                We may update these terms from time to time. We will notify you of any significant changes by posting the new terms on this page
                and updating the “Last updated” date. Your continued use of the platform after changes constitutes acceptance of the new terms.
              </p>
            </div>

            {/* 11. Contact */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">11.</span> Contact Us
              </h2>
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                If you have any questions about these terms, please contact us at{' '}
                <a href="mailto:support@maketrend.com" className="text-purple-600 hover:underline">
                  support@maketrend.com
                </a>
                .
              </p>
            </div>

            {/* ── Legal footer ── */}
            <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
              <p>
                This document is a legal agreement between you and Make Trend.
                By using the platform, you accept these terms in full.
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
  );
}