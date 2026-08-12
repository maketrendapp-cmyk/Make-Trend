// pages/rockyaxis/index.js
import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Meta from '../../components/Meta';
import {
  FiArrowRight,
  FiCpu,
  FiZap,
  FiSmartphone,
  FiGlobe,
  FiServer,
  FiTool,
  FiUsers,
  FiDownload,
  FiLock,
  FiShield,
  FiTrendingUp,
  FiGamepad,
  FiAward,
  FiStar,
  FiCheckCircle,
} from 'react-icons/fi';
import { FaRocket, FaFire } from 'react-icons/fa';

export default function RockyAxis() {
  const router = useRouter();

  return (
    <>
      <Meta
        title="Rocky Axis – Free Fire Tools, Hacks & Gameplay Improvement"
        description="Discover the best Free Fire tools, hacks, sensi gameplay improvement apps, Regedit config files, and cheats for all devices, all servers, and all phones. 100% free!"
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden px-4 py-16 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-transparent to-indigo-600/20" />
          <div className="absolute top-20 right-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm font-medium text-purple-300 mb-6">
              <FaFire className="w-4 h-4 text-orange-400" />
              <span>Free Fire Ultimate Hub</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Rocky Axis
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 mt-4 font-medium">
              Your #1 Source for Free Fire Tools, Hacks & Gameplay Improvement
            </p>
            <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
              Discover the best sensi gameplay improvement apps, Regedit config files, 
              and cheats — available for all devices, all servers, and all phones. 100% free!
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <button
                onClick={() => router.push('/freefiretools')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 transition hover:scale-105 active:scale-95 text-base"
              >
                <FaRocket className="w-5 h-5" />
                Explore Free Fire Tools
                <FiArrowRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-green-400" /> 100% Free
              </span>
              <span className="flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-green-400" /> All Devices
              </span>
              <span className="flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-green-400" /> All Servers
              </span>
              <span className="flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-green-400" /> All Phones
              </span>
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              What You'll Find at <span className="text-purple-400">Rocky Axis</span>
            </h2>
            <p className="text-slate-400 mt-2">Everything you need to level up your Free Fire gameplay</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-purple-500/50 transition hover:bg-slate-800/80 group"
              >
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition">
                  <feature.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Popular Tools Section ── */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Popular <span className="text-purple-400">Tools & Hacks</span>
            </h2>
            <p className="text-slate-400 mt-2">Most downloaded and trusted tools in the community</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTools.map((tool, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center hover:border-purple-500/50 transition hover:bg-slate-800/80"
              >
                <div className="text-3xl mb-3">{tool.icon}</div>
                <h4 className="text-sm font-bold text-white">{tool.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Call to Action ── */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-3xl p-8 sm:p-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm font-medium text-purple-300 mb-4">
              <FiStar className="w-4 h-4 text-yellow-400" />
              <span>Ready to Level Up?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Access All Tools & Hacks Now
            </h2>
            <p className="text-slate-300 mb-6">
              Download sensi gameplay improvement files, Regedit configs, and more — 
              all optimized for your device and server.
            </p>
            <button
              onClick={() => router.push('/freefiretools')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 transition hover:scale-105 active:scale-95 text-base"
            >
              <FiDownload className="w-5 h-5" />
              Explore Free Fire Tools
              <FiArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-slate-500 mt-4">100% free • No registration required</p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-700/50 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <FaFire className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-white">Rocky Axis</span>
              <span className="hidden sm:inline">—</span>
              <span>Free Fire Tools & Hacks</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/')}
                className="hover:text-white transition"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/freefiretools')}
                className="hover:text-white transition"
              >
                Free Fire Tools
              </button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Feature Data ──
const features = [
  {
    icon: FiTool,
    title: 'Hacks & Cheats',
    description: 'Discover the best Free Fire hacks and cheats to enhance your gameplay experience.',
  },
  {
    icon: FiCpu,
    title: 'Sensi Improvement Apps',
    description: 'Optimize your sensitivity settings with our curated apps for better aim and control.',
  },
  {
    icon: FiServer,
    title: 'Regedit Config Files',
    description: 'Download optimized Regedit config files for improved performance and gameplay.',
  },
  {
    icon: FiSmartphone,
    title: 'All Devices Supported',
    description: 'Works on all phones – Android, iOS, and even low-end devices.',
  },
  {
    icon: FiGlobe,
    title: 'All Servers',
    description: 'Compatible with all Free Fire servers worldwide. No region restrictions.',
  },
  {
    icon: FiUsers,
    title: 'Community Tested',
    description: 'All tools and files are tested and trusted by the Free Fire community.',
  },
  {
    icon: FiZap,
    title: 'Performance Boost',
    description: 'Get better FPS, reduced lag, and smoother gameplay with our optimization files.',
  },
  {
    icon: FiShield,
    title: 'Safe & Secure',
    description: 'All files are scanned and verified to be safe for your device.',
  },
  {
    icon: FiTrendingUp,
    title: 'Pro-Level Gameplay',
    description: 'Take your gameplay to the next level with pro tips and tools from Rocky Axis.',
  },
];

// ── Popular Tools Data ──
const popularTools = [
  {
    icon: '🎯',
    name: 'Sensi Config Pro',
    description: 'Optimized sensitivity settings for all devices',
  },
  {
    icon: '⚡',
    name: 'Regedit Optimizer',
    description: 'Windows registry tweaks for better performance',
  },
  {
    icon: '📱',
    name: 'GFX Tool',
    description: 'Graphics optimization for smooth gameplay',
  },
  {
    icon: '🔧',
    name: 'Aim Assist Mod',
    description: 'Improve your aim with smart assist tools',
  },
];