// pages/download.js
import React from 'react';
import Link from 'next/link';
import { FiChevronRight, FiSmartphone, FiZap, FiShield, FiUsers, FiDownload, FiStar, FiTrendingUp } from 'react-icons/fi';
import { FaApple, FaGooglePlay } from 'react-icons/fa';

export default function Download() {
  const features = [
    {
      icon: <FiZap className="w-6 h-6" />,
      title: 'Launch in Seconds',
      description: 'Create and share campaigns from anywhere – directly from your phone.',
    },
    {
      icon: <FiSmartphone className="w-6 h-6" />,
      title: 'Real‑Time Notifications',
      description: 'Get instant alerts when your campaign gets shared, unlocked, or completed.',
    },
    {
      icon: <FiShield className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Your data is encrypted. Log in with biometrics for extra security.',
    },
    {
      icon: <FiUsers className="w-6 h-6" />,
      title: 'Connect with Creators',
      description: 'Discover trending campaigns and collaborate with other creators on the go.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
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
            <FiSmartphone className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            Download the App
          </h1>
          <p className="mt-4 text-xl max-w-3xl mx-auto text-indigo-100">
            Take Make Trend with you everywhere. Create, track, and share campaigns on the go.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/profile">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-white/30 transition border border-white/20 cursor-pointer">
                Back to Profile <FiChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Get the App?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition text-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-500 text-sm mt-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download Buttons & QR ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: Store Buttons */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Get the App</h2>
              <p className="mt-2 text-gray-500">
                Available for iOS and Android. Scan the QR code or click a button below to download.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition shadow-sm"
                >
                  <FaApple className="w-6 h-6" />
                  <div className="text-left">
                    <span className="block text-xs">Download on the</span>
                    <span className="block text-sm font-semibold">App Store</span>
                  </div>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition shadow-sm"
                >
                  <FaGooglePlay className="w-6 h-6" />
                  <div className="text-left">
                    <span className="block text-xs">Get it on</span>
                    <span className="block text-sm font-semibold">Google Play</span>
                  </div>
                </a>
              </div>
              <p className="mt-4 text-sm text-gray-400 flex items-center gap-1">
                <FiDownload className="w-4 h-4" />
                Coming soon – stay tuned!
              </p>
            </div>
            {/* Right: QR Code Placeholder */}
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-200 rounded-2xl border-4 border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                <div className="text-center">
                  <FiSmartphone className="w-12 h-12 mx-auto text-gray-400" />
                  <span className="mt-1 block">QR Code</span>
                  <span className="text-xs">(coming soon)</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">Scan to download</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial / Trust ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <FiStar className="w-8 h-8 text-yellow-500" />
            <FiStar className="w-8 h-8 text-yellow-500" />
            <FiStar className="w-8 h-8 text-yellow-500" />
            <FiStar className="w-8 h-8 text-yellow-500" />
            <FiStar className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-lg text-gray-700 italic max-w-2xl mx-auto">
            “Make Trend has completely changed how I launch campaigns. Having it on my phone makes it even better.”
          </p>
          <p className="mt-2 text-sm text-gray-500">— A happy creator</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to Go Mobile?</h2>
          <p className="mt-4 text-lg text-indigo-100">
            Join the community and start building your audience from anywhere.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/create">
              <span className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-700 font-semibold rounded-xl hover:bg-gray-100 transition shadow-lg cursor-pointer">
                Start Creating <FiChevronRight className="w-5 h-5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© {new Date().getFullYear()} Make Trend. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-xs mt-2">
            <Link href="/terms"><span className="hover:text-white cursor-pointer">Terms</span></Link>
            <Link href="/privacy"><span className="hover:text-white cursor-pointer">Privacy</span></Link>
            <Link href="/support"><span className="hover:text-white cursor-pointer">Support</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}