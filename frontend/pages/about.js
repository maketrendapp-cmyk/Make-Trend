// pages/about.js
import React from 'react';
import Link from 'next/link';
import { FiChevronRight, FiTarget, FiZap, FiTrendingUp, FiUsers, FiShield, FiAward, FiArrowRight } from 'react-icons/fi';
import { FaRocket, FaChartLine, FaUserFriends, FaLock, FaCrown } from 'react-icons/fa';

export default function About() {
  const features = [
    {
      icon: <FaRocket className="w-6 h-6" />,
      title: 'Launch Campaigns Instantly',
      description: 'Choose from professionally designed templates and launch your campaign in under 60 seconds.',
    },
    {
      icon: <FaChartLine className="w-6 h-6" />,
      title: 'Real‑Time Analytics',
      description: 'Track views, unlocks, shares, and completions – all in one beautiful dashboard.',
    },
    {
      icon: <FaUserFriends className="w-6 h-6" />,
      title: 'Referral & Affiliate System',
      description: 'Grow your network with built‑in referral tracking and rewards for every friend you invite.',
    },
    {
      icon: <FaLock className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected. We never share your information with third parties.',
    },
    {
      icon: <FaCrown className="w-6 h-6" />,
      title: 'Pro Features',
      description: 'Unlock advanced templates, priority support, and more with our Pro plan.',
    },
    {
      icon: <FiTrendingUp className="w-6 h-6" />,
      title: 'Trending Insights',
      description: 'Discover what’s trending in your niche and optimise your campaigns for maximum impact.',
    },
  ];

  const stats = [
    { label: 'Campaigns Launched', value: '1,200+' },
    { label: 'Active Users', value: '500+' },
    { label: 'Templates Available', value: '50+' },
    { label: 'Total Shares', value: '10K+' },
  ];

  const team = [
    {
      name: 'Pankaj Sah',
      role: 'Founder & CEO',
      image: 'https://ui-avatars.com/api/?name=Pankaj+Sah&background=6c5ce7&color=fff&size=100',
      bio: 'Passionate about empowering creators to build their audience.',
    },
    {
      name: 'Make Trend Team',
      role: 'Developers & Designers',
      image: 'https://ui-avatars.com/api/?name=MT&background=6c5ce7&color=fff&size=100',
      bio: 'A dedicated team building the future of campaign creation.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <circle cx="200" cy="200" r="300" fill="white" />
            <circle cx="800" cy="700" r="350" fill="white" />
            <circle cx="500" cy="500" r="200" fill="white" opacity="0.5" />
          </svg>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            About{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
              Make Trend
            </span>
          </h1>
          <p className="mt-4 text-xl sm:text-2xl max-w-3xl mx-auto text-indigo-100">
            We empower creators, marketers, and entrepreneurs to launch viral campaigns that drive real results.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/create">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl hover:bg-gray-100 transition shadow-lg cursor-pointer">
                Start Creating <FiArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link href="/profile">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-purple-800/40 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-purple-800/60 transition border border-white/20 cursor-pointer">
                Back to Profile <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FiTarget className="w-8 h-8 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                To democratise campaign creation – giving everyone, from individuals to enterprises,
                the tools they need to tell their story and grow their audience without technical complexity.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FiZap className="w-8 h-8 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                A world where every idea can become a trending movement.
                We envision a platform where creativity meets data – and everyone wins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Make Trend in Numbers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-3xl font-extrabold text-purple-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Make Trend</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-500 text-sm mt-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Meet the Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {team.map((member, idx) => (
              <div key={idx} className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-purple-200"
                />
                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-purple-600 font-medium">{member.role}</p>
                <p className="text-sm text-gray-500 mt-2">{member.bio}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 text-gray-400 text-sm">
            ... and a growing community of creators and contributors.
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to Make Your Trend?</h2>
          <p className="mt-4 text-lg text-indigo-100">
            Join thousands of creators who are already launching successful campaigns with Make Trend.
          </p>
          <div className="mt-8">
            <Link href="/create">
              <span className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-700 font-semibold rounded-xl hover:bg-gray-100 transition shadow-lg cursor-pointer">
                Get Started Free <FiArrowRight className="w-5 h-5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer / Trust ── */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p className="mb-2">© {new Date().getFullYear()} Make Trend. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/terms"><span className="hover:text-white cursor-pointer">Terms</span></Link>
            <Link href="/privacy"><span className="hover:text-white cursor-pointer">Privacy</span></Link>
            <Link href="/support"><span className="hover:text-white cursor-pointer">Support</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}