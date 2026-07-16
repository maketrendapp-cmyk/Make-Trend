// pages/rules.js
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import {
  FiChevronRight,
  FiAlertCircle,
  FiShield,
  FiXCircle,
  FiCheckCircle,
  FiFlag,
  FiInfo,
  FiHome,
  FiPlusCircle,
  FiUser,
  FiBookOpen,
  FiMail,
} from 'react-icons/fi';

export default function Rules() {
  const { user } = useAuth();

  const rules = [
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'No Scamming or Fraud',
      description: 'Do not create campaigns or tasks designed to deceive, defraud, or mislead others. This includes fake giveaways, phishing attempts, and false promises.',
    },
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'No Spam or Unsolicited Messages',
      description: 'Do not use Make Trend to send spam, unsolicited promotional content, or excessive repetitive messages. Respect others’ inboxes.',
    },
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'No Manipulation of Shares or Tasks',
      description: 'Do not artificially inflate shares, unlock counts, or completions through bots, fake accounts, or coordinated fake engagement. Authenticity matters.',
    },
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'No Harmful or Illegal Content',
      description: 'Do not create campaigns that promote violence, hate speech, harassment, pornography, illegal activities, or anything that violates applicable laws.',
    },
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'No Impersonation',
      description: 'Do not impersonate other individuals, brands, or organisations. Your username and profile must represent you or your legitimate brand.',
    },
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'No Malicious Links or Malware',
      description: 'Do not include links that lead to malware, viruses, or phishing sites. All shared URLs must be safe and relevant to the campaign.',
    },
    {
      icon: <FiXCircle className="w-5 h-5 text-red-500" />,
      title: 'Respect Privacy and Data',
      description: 'Do not collect or misuse personal data of others without explicit consent. Follow all data protection regulations (e.g., GDPR, CCPA).',
    },
    {
      icon: <FiCheckCircle className="w-5 h-5 text-green-500" />,
      title: 'Be Honest and Transparent',
      description: 'Clearly state the requirements and rewards of your campaigns. Do not mislead participants about what they need to do or what they will receive.',
    },
  ];

  const consequences = [
    'Campaign suspension or deletion',
    'Permanent account ban',
    'Loss of any rewards or earnings',
    'Reporting to relevant authorities if illegal activity is detected',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Navigation ── */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-primary">
              <FiShield className="w-6 h-6" />
              <span>Make Trend</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary transition">
                <FiHome className="w-4 h-4" /> Home
              </Link>
              <Link href="/create" className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary transition">
                <FiPlusCircle className="w-4 h-4" /> Create
              </Link>
              <Link href="/about" className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary transition">
                <FiBookOpen className="w-4 h-4" /> About
              </Link>
              <Link href={user ? '/profile' : '/login'} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary transition">
                <FiUser className="w-4 h-4" /> {user ? 'Profile' : 'Login'}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <circle cx="200" cy="200" r="300" fill="white" />
            <circle cx="800" cy="700" r="350" fill="white" />
            <circle cx="500" cy="500" r="200" fill="white" opacity="0.5" />
          </svg>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <FiShield className="w-20 h-20 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Our Community Rules
          </h1>
          <p className="mt-4 text-xl max-w-3xl mx-auto text-indigo-100">
            We believe in fair, transparent, and safe interactions. These rules help us keep Make Trend a trusted place for creators and participants alike.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/create">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-indigo-50 transition shadow-lg cursor-pointer">
                Explore Templates <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <Link href={user ? '/profile' : '/login'}>
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-white/30 transition border border-white/20 cursor-pointer">
                {user ? 'Your Profile' : 'Get Started'} <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Rules Matter ── */}
      <section className="py-12 bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 text-purple-600">
            <FiInfo className="w-6 h-6" />
            <h2 className="text-2xl font-bold text-gray-900">Why We Have Rules</h2>
          </div>
          <p className="mt-4 text-gray-600 text-lg leading-relaxed">
            Make Trend is built on trust. Every campaign, share, and completion depends on genuine participation.
            These rules protect our community from abuse and ensure that everyone has a positive experience.
          </p>
        </div>
      </section>

      {/* ── Rules Grid ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rules.map((rule, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition flex items-start gap-4">
                <div className="mt-1 flex-shrink-0">{rule.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{rule.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Consequences ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <FiAlertCircle className="w-8 h-8 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Consequences of Violation</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <ul className="space-y-3 text-gray-700">
              {consequences.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <FiXCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-gray-500 border-t border-gray-100 pt-6">
              We reserve the right to take any action we deem appropriate to protect our community, including reporting illegal activity to authorities.
            </p>
          </div>
        </div>
      </section>

      {/* ── Reporting Violations ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FiFlag className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Report a Violation</h2>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            If you encounter a campaign or user that violates these rules, please report it immediately. We take all reports seriously and will investigate promptly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/support">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition cursor-pointer">
                Go to Support <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <a
              href="mailto:support@maketrend.com"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
            >
              <FiMail className="w-4 h-4" /> Email Us
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
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