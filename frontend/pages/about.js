// pages/about.js
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FiTarget,
  FiZap,
  FiTrendingUp,
  FiUsers,
  FiArrowRight,
  FiChevronRight,
  FiStar,
  FiSend,
  FiUser,
  FiMessageCircle,
  FiSearch,
  FiAward,
  FiHeart,
  FiShield,
  FiGlobe,
  FiBookOpen,
  FiPlus,
  FiMinus,
  FiMapPin,
  FiClock,
  FiMail,
  FiTwitter,
  FiInstagram,
  FiYoutube,
  FiFacebook,
  FiCalendar,
} from 'react-icons/fi';
import { FaRocket, FaChartLine, FaUserFriends, FaLock, FaCrown, FaLinkedin } from 'react-icons/fa';
import { useAuth } from '../components/AuthScreen';
import { useComments, useInvalidateQueries } from '../lib/queries';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

// ── Custom hooks ──
function useFadeUp(threshold = 0.1) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

function useCounter(target, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!startOnView) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView]);
  useEffect(() => {
    if (!isVisible) return;
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    requestAnimationFrame(step);
  }, [target, duration, isVisible]);
  return { count, ref };
}

// ── StarRating component ──
function StarRating({ rating, setRating, readonly = false }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <button
        key={i}
        type="button"
        onClick={() => !readonly && setRating(i)}
        className={`text-2xl transition-all ${i <= rating ? 'text-yellow-400' : 'text-gray-300'} ${!readonly && 'hover:scale-110'}`}
        disabled={readonly}
        aria-label={`Rate ${i} stars`}
      >
        ★
      </button>
    );
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

// ── FAQ Accordion Item ──
function FaqItem({ question, answer, isOpen, toggle }) {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-4 text-left hover:text-purple-600 transition group"
      >
        <span className="font-medium text-gray-800 group-hover:text-purple-600">{question}</span>
        <span className="text-gray-400 group-hover:text-purple-600 transition">
          {isOpen ? <FiMinus className="w-5 h-5" /> : <FiPlus className="w-5 h-5" />}
        </span>
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-600 text-sm leading-relaxed animate-fadeIn">
          {answer}
        </div>
      )}
    </div>
  );
}

// ── Milestone card ──
function Milestone({ year, title, description, icon }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl">
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-purple-600">{year}</div>
        <h4 className="font-bold text-gray-800">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

export default function About() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: comments = [], isLoading: commentsLoading } = useComments();
  const { invalidateComments } = useInvalidateQueries();
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const loadingComments = commentsLoading;

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // ── Fade‑up hooks ──
  const heroFade = useFadeUp(0.1);
  const storyFade = useFadeUp(0.1);
  const missionFade = useFadeUp(0.1);
  const valuesFade = useFadeUp(0.1);
  const featuresFade = useFadeUp(0.1);
  const milestonesFade = useFadeUp(0.1);
  const statsFade = useFadeUp(0.1);
  const partnersFade = useFadeUp(0.1);
  const testimonialsFade = useFadeUp(0.1);
  const faqFade = useFadeUp(0.1);
  const ctaFade = useFadeUp(0.1);

  // ── Stats counters ──
  const stats = [
    { label: 'Campaigns Launched', target: 1200, suffix: '+' },
    { label: 'Active Users', target: 500, suffix: '+' },
    { label: 'Templates Available', target: 50, suffix: '+' },
    { label: 'Total Shares', target: 10000, suffix: '+' },
  ];
  const counters = stats.map(s => useCounter(s.target));

  // ── Submit comment ──
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    setSubmitMessage('');
    if (commentName.trim().length < 2) {
      setSubmitMessage('Please enter your name (at least 2 characters).');
      return;
    }
    if (commentText.trim().length < 3) {
      setSubmitMessage('Please enter a comment (at least 3 characters).');
      return;
    }
    if (commentRating < 1 || commentRating > 5) {
      setSubmitMessage('Please select a rating.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { name: commentName.trim(), comment: commentText.trim(), rating: commentRating };
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMessage('✅ Thank you for your feedback!');
        setCommentName(''); setCommentText(''); setCommentRating(5);
        await invalidateComments();
        setTimeout(() => setSubmitMessage(''), 5000);
      } else {
        setSubmitMessage(data.error || 'Failed to submit comment.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Search ──
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/create?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/create');
    }
  };

  // ── Data ──
  const coreValues = [
    { icon: <FiHeart className="w-5 h-5" />, title: 'User‑First', description: 'We build everything with our users in mind.' },
    { icon: <FiZap className="w-5 h-5" />, title: 'Innovation', description: 'We constantly improve and adapt to trends.' },
    { icon: <FiShield className="w-5 h-5" />, title: 'Trust & Transparency', description: 'Your data is safe and we communicate openly.' },
    { icon: <FiGlobe className="w-5 h-5" />, title: 'Global Community', description: 'We connect creators from all over the world.' },
  ];

  const features = [
    { icon: <FaRocket className="w-5 h-5" />, title: 'Launch Campaigns Instantly', description: 'Choose from professionally designed templates and launch in under 60 seconds.' },
    { icon: <FaChartLine className="w-5 h-5" />, title: 'Real‑Time Analytics', description: 'Track views, unlocks, shares, and completions – all in one dashboard.' },
    { icon: <FaUserFriends className="w-5 h-5" />, title: 'Referral & Affiliate System', description: 'Grow your network with built‑in referral tracking and rewards.' },
    { icon: <FaLock className="w-5 h-5" />, title: 'Secure & Private', description: 'Your data is encrypted and protected. We never share with third parties.' },
    { icon: <FaCrown className="w-5 h-5" />, title: 'Pro Features', description: 'Unlock advanced templates, priority support, and more.' },
    { icon: <FiTrendingUp className="w-5 h-5" />, title: 'Trending Insights', description: 'Discover what’s trending and optimise your campaigns.' },
  ];

  const milestones = [
    { year: '2025', title: 'Platform Launch', description: 'Make Trend goes live with 20+ templates and share‑to‑unlock campaigns.', icon: '🚀' },
    { year: '2025', title: '1,000 Campaigns Created', description: 'Users launched over 1,000 campaigns in the first month.', icon: '📈' },
    { year: '2025', title: 'Pro Plan Released', description: 'Advanced templates, analytics, and priority support for pro users.', icon: '👑' },
    { year: '2026', title: '10K+ Shares', description: 'Total shares across all campaigns hit 10,000.', icon: '🌟' },
  ];

  const faqs = [
    { question: 'What is Make Trend?', answer: 'Make Trend is a platform that lets you create share‑to‑unlock campaigns for social media growth. You choose a template, customise it, share your unique link, and track metrics like views, shares, and unlocks – all in minutes.' },
    { question: 'Do I need to pay to use Make Trend?', answer: 'No! Make Trend offers a free plan with access to many templates and features. Pro plans unlock advanced templates, priority support, and additional analytics for power users.' },
    { question: 'How do I create a campaign?', answer: 'Simply browse our template library, select one, customise the title, description, reward, and features (share count, tasks, redirect URL), then click "Create Campaign". You’ll get a unique link to share with your audience.' },
    { question: 'Is my data safe?', answer: 'Absolutely. We use Firebase Authentication and Firestore with strict security rules. Your personal information is never shared with third parties without your explicit consent.' },
    { question: 'Can I track my campaign performance?', answer: 'Yes! Our dashboard shows real‑time stats: total campaigns, views, shares, unlocks, completions, and success rates. You can also copy share links directly from the dashboard.' },
    { question: 'What platforms does Make Trend support?', answer: 'Our templates are optimised for TikTok, Instagram, YouTube, Facebook, and more. You can also customise campaigns for any platform by editing the tasks and redirect URLs.' },
  ];

  const partners = [
    { name: 'TikTok', logo: 'https://via.placeholder.com/80x40?text=TikTok' },
    { name: 'Instagram', logo: 'https://via.placeholder.com/80x40?text=Instagram' },
    { name: 'YouTube', logo: 'https://via.placeholder.com/80x40?text=YouTube' },
    { name: 'Facebook', logo: 'https://via.placeholder.com/80x40?text=Facebook' },
    { name: 'Twitter', logo: 'https://via.placeholder.com/80x40?text=Twitter' },
  ];

  const usps = [
    { title: 'Free to Start', description: 'Create campaigns without any upfront cost.' },
    { title: 'No Coding Needed', description: 'Drag, drop, and customise – no technical skills required.' },
    { title: 'Real‑Time Data', description: 'See your metrics update instantly as your campaign goes live.' },
    { title: 'Global Reach', description: 'Share your campaigns with anyone, anywhere.' },
  ];

  // ── Current year for "last updated" ──
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* ── META for SEO + SSR ── */}
      <Meta
        title="About Make Trend – Viral Campaign Platform"
        description="Make Trend helps creators launch viral share‑to‑unlock campaigns in minutes. Free templates, real‑time analytics, and built‑in referral tracking. Built by Rocky Axis."
        image="https://maketrend.vercel.app/og-about.jpg"
        url="https://maketrend.vercel.app/about"
      />

      <div className="min-h-screen bg-white">
        {/* ── Hero ── */}
        <section
          ref={heroFade.ref}
          className={`relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white py-16 sm:py-20 transition-all duration-700 ${
            heroFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <circle cx="200" cy="200" r="300" fill="white" />
              <circle cx="800" cy="700" r="350" fill="white" />
              <circle cx="500" cy="500" r="200" fill="white" opacity="0.5" />
            </svg>
          </div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto mb-6">
              <form onSubmit={handleSearch} className="flex items-center bg-white/20 backdrop-blur-sm rounded-full p-1 border border-white/20">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="flex-1 bg-transparent px-4 py-2 text-white placeholder-white/70 outline-none text-sm"
                />
                <button type="submit" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition" aria-label="Search">
                  <FiSearch className="w-4 h-4" />
                </button>
              </form>
            </div>
            <div className="text-center">
              {/* ── Est. & Last Updated badges ── */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                  <FiCalendar className="w-3.5 h-3.5" />
                  Est. 2025
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                  <FiClock className="w-3.5 h-3.5" />
                  Updated {currentYear}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
                About{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                  Make Trend
                </span>
              </h1>
              <p className="mt-4 text-lg sm:text-xl max-w-3xl mx-auto text-indigo-100">
                We empower creators, marketers, and entrepreneurs to launch viral campaigns that drive real results.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/create">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 font-semibold rounded-full hover:bg-gray-100 transition shadow-lg cursor-pointer text-sm">
                    Start Creating <FiArrowRight className="w-4 h-4" />
                  </span>
                </Link>
                <Link href="/">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-800/40 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-purple-800/60 transition border border-white/20 cursor-pointer text-sm">
                    Home
                  </span>
                </Link>
                <Link href="/follow">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-800/40 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-purple-800/60 transition border border-white/20 cursor-pointer text-sm">
                    Follow Us
                  </span>
                </Link>
                <Link href="/support">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-800/40 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-purple-800/60 transition border border-white/20 cursor-pointer text-sm">
                    Support
                  </span>
                </Link>
                {!user && (
                  <Link href="/login">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-800/40 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-purple-800/60 transition border border-white/20 cursor-pointer text-sm">
                      Login
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Our Story ── */}
        <section
          ref={storyFade.ref}
          className={`py-12 bg-white transition-all duration-700 ${
            storyFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FiBookOpen className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-600 text-base leading-relaxed max-w-2xl mx-auto">
              Make Trend was born from a simple idea: <strong>campaign creation should be easy, fast, and effective</strong>.
              We saw creators struggling with complex tools and expensive agencies, so we built a platform that gives anyone the power to launch share‑to‑unlock campaigns in minutes.
              Today, we’re proud to help thousands of users grow their audience and turn their ideas into movements.
            </p>

            {/* ── Developer credit (authority signal) ── */}
            <div className="mt-6 pt-6 border-t border-gray-200 max-w-md mx-auto">
              <p className="text-sm text-gray-500">
                Built with ❤️ by{' '}
                <a
                  href="https://youtube.com/@rockyxsiyu?si=lk_b1rkizInBvZu8"
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="text-purple-600 hover:underline font-medium"
                >
                  Rocky Axis
                </a>
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <a
                  href="https://youtube.com/@rockyxsiyu?si=lk_b1rkizInBvZu8"
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="text-gray-400 hover:text-red-600 transition"
                  aria-label="YouTube"
                >
                  <FiYoutube className="w-5 h-5" />
                </a>
                <span className="text-xs text-gray-300">|</span>
                <a
                  href="https://youtube.com/@rockyxsiyu?si=lk_b1rkizInBvZu8"
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="text-xs text-gray-400 hover:text-purple-600 transition"
                >
                  Subscribe on YouTube
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mission & Vision ── */}
        <section
          ref={missionFade.ref}
          className={`py-12 bg-gray-50 transition-all duration-700 ${
            missionFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <FiTarget className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
                </div>
                <p className="text-gray-600 text-base leading-relaxed">
                  To democratise campaign creation – giving everyone, from individuals to enterprises,
                  the tools they need to tell their story and grow their audience without technical complexity.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <FiZap className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
                </div>
                <p className="text-gray-600 text-base leading-relaxed">
                  A world where every idea can become a trending movement. We envision a platform where creativity meets data – and everyone wins.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Core Values ── */}
        <section
          ref={valuesFade.ref}
          className={`py-12 bg-white transition-all duration-700 ${
            valuesFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Our Core Values</h2>
            <p className="text-center text-gray-500 mb-8 max-w-2xl mx-auto">The principles that guide everything we do.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {coreValues.map((val, idx) => (
                <div key={idx} className="text-center p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition hover:-translate-y-1">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    {val.icon}
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">{val.title}</h4>
                  <p className="text-gray-500 text-xs mt-1">{val.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What We Do (Features) ── */}
        <section
          ref={featuresFade.ref}
          className={`py-12 bg-gray-50 transition-all duration-700 ${
            featuresFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">What We Do</h2>
            <p className="text-center text-gray-500 mb-8 max-w-2xl mx-auto">Everything you need to create, launch, and grow campaigns.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition hover:-translate-y-0.5">
                  <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Milestones ── */}
        <section
          ref={milestonesFade.ref}
          className={`py-12 bg-white transition-all duration-700 ${
            milestonesFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Our Journey</h2>
            <p className="text-center text-gray-500 mb-8 max-w-2xl mx-auto">Key milestones in our story.</p>
            <div className="space-y-6 relative before:absolute before:left-6 before:top-0 before:h-full before:w-0.5 before:bg-purple-200 before:content-[''] pl-8">
              {milestones.map((m, idx) => (
                <Milestone key={idx} year={m.year} title={m.title} description={m.description} icon={m.icon} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section
          ref={statsFade.ref}
          className={`py-12 bg-gray-50 transition-all duration-700 ${
            statsFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Make Trend in Numbers</h2>
            <p className="text-center text-gray-500 mb-8 max-w-2xl mx-auto">Real metrics from real creators.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((stat, idx) => {
                const { count, ref } = counters[idx];
                const displayValue = stat.label === 'Total Shares' ? (count / 1000).toFixed(1) + 'K' : count + stat.suffix;
                return (
                  <div key={idx} ref={ref} className="text-center p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <p className="text-3xl font-extrabold text-purple-600">{displayValue}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
                    <div className="w-12 h-0.5 mx-auto mt-2 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Partners / Trusted By ── */}
        <section
          ref={partnersFade.ref}
          className={`py-12 bg-white transition-all duration-700 ${
            partnersFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Trusted by Creators Worldwide</h2>
            <p className="text-gray-500 text-sm mb-6">Used by marketers, influencers, and entrepreneurs everywhere.</p>
            <div className="flex flex-wrap justify-center items-center gap-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              {partners.map((p, idx) => (
                <div key={idx} className="text-gray-400 font-bold text-lg">{p.name}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Choose Us (USPs) ── */}
        <section className="py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Why Choose Make Trend</h2>
            <p className="text-center text-gray-500 mb-8 max-w-2xl mx-auto">The smart choice for modern campaign creators.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {usps.map((usp, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiAward className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-gray-800">{usp.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{usp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials (Comments) ── */}
        <section
          ref={testimonialsFade.ref}
          className={`py-12 bg-white transition-all duration-700 ${
            testimonialsFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">What Our Users Say</h2>
            <p className="text-center text-gray-500 mb-6">Real stories from real creators.</p>

            {/* Comment Form */}
            <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Leave a Review</h3>
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Comment *</label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your experience with Make Trend..."
                    rows="3"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <StarRating rating={commentRating} setRating={setCommentRating} />
                </div>
                {submitMessage && (
                  <div className={`text-sm ${submitMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {submitMessage}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
                >
                  <FiSend className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>

            {/* Comments List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiMessageCircle className="w-5 h-5 text-purple-600" />
                Latest Reviews ({comments?.length || 0})
              </h3>
              {loadingComments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse">
                      <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-2/3 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : comments && comments.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500">No reviews yet. Be the first!</p>
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                            {c.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-800 text-sm">{c.name || 'Anonymous'}</span>
                        </div>
                        <StarRating rating={c.rating || 5} readonly />
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{c.comment || ''}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {c.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          ref={faqFade.ref}
          className={`py-12 bg-gray-50 transition-all duration-700 ${
            faqFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-center text-gray-500 mb-8">Got questions? We’ve got answers.</p>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              {faqs.map((faq, idx) => (
                <FaqItem
                  key={idx}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFaqIndex === idx}
                  toggle={() => toggleFaq(idx)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Careers / Join Us ── */}
        <section className="py-12 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FiUsers className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Join Our Team</h2>
            <p className="text-gray-500 text-sm max-w-2xl mx-auto mt-2">
              We’re always looking for passionate people to help us build the future of campaign creation.
              If you’re a developer, designer, or creator, we’d love to hear from you.
            </p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition shadow-sm text-sm">
                Join Us <FiArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          ref={ctaFade.ref}
          className={`py-12 bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-700 ${
            ctaFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 className="text-3xl font-bold">Ready to Make Your Trend?</h2>
            <p className="mt-2 text-indigo-100 max-w-2xl mx-auto">
              Join thousands of creators who are already launching successful campaigns with Make Trend.
            </p>
            <div className="mt-6">
              <Link href="/create">
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-semibold rounded-full hover:bg-gray-50 transition shadow-lg cursor-pointer text-sm">
                  Get Started Free <FiArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-200/60 py-6 px-4 bg-white/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Make Trend. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/terms"><span className="hover:text-slate-700 transition">Terms</span></Link>
              <Link href="/privacy"><span className="hover:text-slate-700 transition">Privacy</span></Link>
              <Link href="/support"><span className="hover:text-slate-700 transition">Support</span></Link>
              <Link href="/contact"><span className="hover:text-slate-700 transition">Contact</span></Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}