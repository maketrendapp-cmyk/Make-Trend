// pages/groweachother/index.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  FiHeart,
  FiUsers,
  FiPlusCircle,
  FiCheckCircle,
  FiArrowRight,
  FiGithub,
  FiYoutube,
  FiInstagram,
  FiTwitter,
  FiFacebook,
  FiTrendingUp,
  FiShield,
  FiStar
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function GrowTogetherLanding() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/groweachother/grow-feed');
    } else {
      router.push('/login?redirect=/groweachother/grow-feed');
    }
  };

  // ─── Animation Variants ───
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <>
      <Meta
        title="Grow Together – Sub4Sub & Follow4Follow | Make Trend"
        description="Exchange social growth with real people. No coins, no rewards – just fair, mutual help."
      />
      <div className="min-h-screen bg-[#fafcff] font-sans selection:bg-purple-200">

        {/* ── HERO SECTION ── */}
        <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28 px-4 flex flex-col items-center justify-center min-h-[90vh]">
          {/* Background Decor */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            <div className="absolute -top-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-purple-400/10 blur-[100px]" />
            <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/10 blur-[120px]" />
            
            {/* Floating Social Icons */}
            <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-[15%] text-red-500/20 hidden md:block">
              <FiYoutube className="w-16 h-16" />
            </motion.div>
            <motion.div animate={{ y: [0, 25, 0], rotate: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/3 right-[15%] text-pink-500/20 hidden md:block">
              <FiInstagram className="w-12 h-12" />
            </motion.div>
            <motion.div animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/4 left-[20%] text-blue-400/20 hidden md:block">
              <FiTwitter className="w-14 h-14" />
            </motion.div>
          </div>

          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center relative z-10"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-full text-sm font-bold border border-purple-100 shadow-sm mb-8">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              100% Free Organic Growth
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
              Grow Your Audience, <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                Together.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              Join a community of creators helping each other succeed. Exchange subscribers, followers, and likes with real people. No bots. No hidden fees.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-[0_8px_30px_rgb(124,58,237,0.3)] hover:shadow-[0_8px_30px_rgb(124,58,237,0.5)] transition-all hover:-translate-y-1 active:scale-95"
              >
                {isAuthenticated ? 'Enter Your Dashboard' : 'Start Growing for Free'}
                <FiArrowRight className="w-5 h-5" />
              </button>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 font-bold text-lg rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
                >
                  Sign In
                </Link>
              )}
            </motion.div>
            
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><FiCheckCircle className="text-green-500 w-5 h-5" /> Real Humans</span>
              <span className="flex items-center gap-1.5"><FiCheckCircle className="text-green-500 w-5 h-5" /> Zero Coins</span>
              <span className="flex items-center gap-1.5"><FiCheckCircle className="text-green-500 w-5 h-5" /> Fair Exchange</span>
            </motion.div>
          </motion.div>
        </section>

        {/* ── TRUST SIGNALS (STATS) ── */}
        <section className="border-y border-gray-100 bg-white/50 backdrop-blur-sm py-8 px-4">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center sm:justify-between items-center gap-8 sm:gap-4 text-center">
            <div>
              <p className="text-3xl font-black text-gray-900">2.5K+</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Creators</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-200" />
            <div>
              <p className="text-3xl font-black text-gray-900">50K+</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Successful Exchanges</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-200" />
            <div>
              <p className="text-3xl font-black text-gray-900">100%</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Free to Use</p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (CARDS) ── */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-purple-600 font-bold tracking-wider uppercase text-sm mb-2">The Process</h2>
              <h3 className="text-3xl md:text-4xl font-black text-gray-900">How "Grow Together" Works</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: FiUsers,
                  color: "purple",
                  title: "1. Browse the Feed",
                  desc: "Discover public tasks from other creators looking for subscribers, followers, or engagement.",
                  link: "/groweachother/grow-feed",
                  linkText: "View Live Feed"
                },
                {
                  icon: FiPlusCircle,
                  color: "indigo",
                  title: "2. Post Your Task",
                  desc: "Create your own request. Drop your link and specify exactly what growth action you need.",
                  link: "/groweachother/my-tasks",
                  linkText: "Manage Tasks"
                },
                {
                  icon: FiHeart,
                  color: "pink",
                  title: "3. Exchange & Grow",
                  desc: "Help someone complete their task, and they are required to help you back. It's a win-win.",
                  link: "/groweachother/my-exchanges",
                  linkText: "View Exchanges"
                }
              ].map((card, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110`} />
                  <div className={`w-16 h-16 rounded-2xl bg-${card.color}-100 text-${card.color}-600 flex items-center justify-center mb-6 shadow-sm`}>
                    <card.icon className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h4>
                  <p className="text-gray-500 leading-relaxed font-medium mb-6">
                    {card.desc}
                  </p>
                  <Link
                    href={isAuthenticated ? card.link : `/login?redirect=${card.link}`}
                    className={`inline-flex items-center gap-2 text-${card.color}-600 font-bold hover:gap-3 transition-all`}
                  >
                    {card.linkText} <FiArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DETAILED STEPS TIMELINE ── */}
        <section className="py-24 px-4 bg-gray-50/50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-black text-gray-900">Simple Steps to Success</h3>
              <p className="text-gray-500 mt-4 font-medium">A transparent, community-driven exchange system.</p>
            </div>
            
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-200 via-indigo-200 to-transparent -translate-x-1/2 rounded-full" />
              
              <div className="space-y-12">
                {[
                  { step: 1, title: 'Add Your Social Profile', desc: 'Navigate to "My Tasks" and submit your YouTube channel, Instagram page, or Twitter profile.' },
                  { step: 2, title: 'Find a Partner', desc: 'Browse the live feed and click "Help To Grow" on an active task. Choose one of your own tasks to receive help in return.' },
                  { step: 3, title: 'Do Your Part', desc: 'Visit their profile and complete the requested action (Subscribe/Follow), then mark it as Done.' },
                  { step: 4, title: 'Mutual Completion', desc: 'The other user is notified to return the favor. Once they complete your task, the exchange is finalized!' }
                ].map((item, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    key={item.step} 
                    className={`relative flex items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                  >
                    {/* Center Node */}
                    <div className="absolute left-6 md:left-1/2 w-12 h-12 bg-white border-4 border-purple-500 rounded-full flex items-center justify-center -translate-x-1/2 z-10 shadow-md">
                      <span className="text-purple-600 font-black">{item.step}</span>
                    </div>
                    
                    {/* Content Box */}
                    <div className={`ml-16 md:ml-0 w-full md:w-1/2 ${index % 2 === 0 ? 'md:pl-12' : 'md:pr-12 text-left md:text-right'}`}>
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS (Social Proof) ── */}
        <section className="py-24 px-4 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto">
             <div className="text-center mb-16">
              <h2 className="text-indigo-600 font-bold tracking-wider uppercase text-sm mb-2">Wall of Love</h2>
              <h3 className="text-3xl md:text-4xl font-black text-gray-900">What Creators Say</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Sarah J.", role: "YouTuber", text: "Finally a platform that isn't filled with bots! I gained my first 500 organic subscribers here by just helping others out." },
                { name: "Mike T.", role: "Digital Artist", text: "The mutual exchange system is brilliant. No fake coins to buy, just real people supporting real people. Highly recommended." },
                { name: "Elena R.", role: "Twitch Streamer", text: "I use this every day before I stream. The community is super responsive and my follower count has never been healthier!" }
              ].map((review, idx) => (
                <div key={idx} className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 relative">
                  <div className="flex gap-1 text-yellow-400 mb-4">
                    <FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" />
                  </div>
                  <p className="text-gray-600 font-medium italic mb-6">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{review.name}</p>
                      <p className="text-xs text-gray-500 font-medium">{review.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SUPPORTED PLATFORMS ── */}
        <section className="py-16 px-4 bg-[#fafcff] text-center border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Supported Growth Platforms</p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <span className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700 font-bold"><FiYoutube className="w-5 h-5 text-red-600" /> YouTube</span>
              <span className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700 font-bold"><FiInstagram className="w-5 h-5 text-pink-600" /> Instagram</span>
              <span className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700 font-bold"><FiTwitter className="w-5 h-5 text-blue-400" /> Twitter (X)</span>
              <span className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700 font-bold"><FiFacebook className="w-5 h-5 text-blue-700" /> Facebook</span>
              <span className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700 font-bold"><FiGithub className="w-5 h-5 text-gray-900" /> GitHub</span>
            </div>
          </div>
        </section>

        {/* ── POWERFUL CTA ── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto relative rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* CTA Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500 rounded-full blur-[120px] opacity-40" />
            
            <div className="relative z-10 p-12 md:p-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <FiTrendingUp className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
                Ready to Boost Your Stats?
              </h2>
              <p className="text-purple-200 text-lg md:text-xl mb-10 max-w-2xl font-medium">
                Stop waiting for the algorithm. Take control of your growth by joining a community of creators who have your back.
              </p>
              
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-purple-900 font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all hover:-translate-y-1 active:scale-95"
              >
                {isAuthenticated ? 'Open Dashboard' : 'Join the Community Now'}
                <FiArrowRight className="w-6 h-6" />
              </button>
              
              {!isAuthenticated && (
                <p className="mt-6 text-sm font-medium text-purple-300">
                  Already a member?{' '}
                  <Link href="/login" className="text-white hover:underline transition">
                    Sign in here
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
