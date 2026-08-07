// pages/community/index.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/AuthScreen';
import Meta from '../../components/Meta';
import {
  FiUsers,
  FiMessageCircle,
  FiHeart,
  FiShare2,
  FiPlus,
  FiTrendingUp,
  FiGrid,
  FiUserPlus,
  FiRocket,
  FiBriefcase,
  FiHelpCircle,
  FiCalendar,
  FiGift,
  FiArrowRight,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

const FEATURES = [
  {
    icon: <FiRocket className="w-6 h-6" />,
    title: 'Launch Products',
    description: 'Share your latest creations with the community. Get feedback, gain traction, and find your first users.',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    icon: <FiMessageCircle className="w-6 h-6" />,
    title: 'Ask Questions',
    description: 'Stuck on a problem? The community is here to help. Ask anything and get answers from fellow creators.',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    icon: <FiBriefcase className="w-6 h-6" />,
    title: 'Find Collaborators',
    description: 'Looking for a developer, designer, or marketer? Post opportunities and connect with like-minded people.',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    icon: <FiTrendingUp className="w-6 h-6" />,
    title: 'Share Updates',
    description: 'Keep the community posted on your journey. Share wins, lessons, and behind-the-scenes content.',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    icon: <FiCalendar className="w-6 h-6" />,
    title: 'Events & Meetups',
    description: 'Host or join virtual events, workshops, and meetups. Connect with creators in real-time.',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    icon: <FiGift className="w-6 h-6" />,
    title: 'Promotions & Deals',
    description: 'Share exclusive offers, discounts, and promotions. Support fellow creators by promoting their work.',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
];

const STATS = [
  { label: 'Community Members', value: '1,248+', icon: <FiUsers className="w-5 h-5" /> },
  { label: 'Posts Shared', value: '3,156+', icon: <FiMessageCircle className="w-5 h-5" /> },
  { label: 'Likes Given', value: '12,843+', icon: <FiHeart className="w-5 h-5" /> },
  { label: 'Products Launched', value: '426+', icon: <FaRocket className="w-5 h-5" /> },
];

const POST_TYPES = [
  { type: 'general', label: 'General', icon: '📌', color: 'bg-slate-100 text-slate-700' },
  { type: 'launch', label: 'Product Launch', icon: '🚀', color: 'bg-purple-100 text-purple-700' },
  { type: 'update', label: 'Update', icon: '📢', color: 'bg-blue-100 text-blue-700' },
  { type: 'job', label: 'Job / Hiring', icon: '💼', color: 'bg-emerald-100 text-emerald-700' },
  { type: 'question', label: 'Question', icon: '❓', color: 'bg-amber-100 text-amber-700' },
  { type: 'event', label: 'Event', icon: '📅', color: 'bg-rose-100 text-rose-700' },
  { type: 'promotional', label: 'Promotional', icon: '💎', color: 'bg-orange-100 text-orange-700' },
];

const CATEGORIES = [
  { label: 'Web Development', emoji: '💻' },
  { label: 'Design', emoji: '🎨' },
  { label: 'AI & ML', emoji: '🤖' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Content Creation', emoji: '👑' },
  { label: 'Startups', emoji: '🚀' },
  { label: 'Social Media', emoji: '📱' },
  { label: 'Programming', emoji: '💻' },
  { label: 'Marketing', emoji: '📊' },
];

export default function CommunityLanding() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Meta
        title="Community – Make Trend"
        description="Join the Make Trend Community – a space for creators, entrepreneurs, and makers to share, connect, and grow together."
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/20">

        {/* ── Hero Section ── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-indigo-600/5" />
          <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <FiUsers className="w-4 h-4" />
                Welcome to the Community
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
                Where Creators{' '}
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Connect & Grow
                </span>
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto">
                Share your journey, launch products, ask questions, and find collaborators. Join thousands of makers building the future.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/community/feed"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition shadow-sm font-medium"
                >
                  <FiGrid className="w-5 h-5" /> Browse Feed
                </Link>
                {isAuthenticated ? (
                  <Link
                    href="/community/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition font-medium"
                  >
                    <FiPlus className="w-5 h-5" /> Create Post
                  </Link>
                ) : (
                  <Link
                    href="/login?redirect=/community"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition font-medium"
                  >
                    <FiUserPlus className="w-5 h-5" /> Join the Community
                  </Link>
                )}
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {STATS.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center justify-center text-purple-600 mb-2">
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── What You Can Do ── */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">What You Can Do</h2>
            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
              Everything you need to share, connect, and grow in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl border p-6 hover:shadow-lg transition shadow-sm ${feature.color.replace('text-', 'border-').replace('bg-', '')}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Post Types & Categories ── */}
        <div className="max-w-6xl mx-auto px-4 py-16 border-t border-slate-200/60">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Post Types */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FiMessageCircle className="text-purple-600" /> Post Types
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Choose the right format for your message.
              </p>
              <div className="flex flex-wrap gap-2">
                {POST_TYPES.map((type) => (
                  <span
                    key={type.type}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${type.color}`}
                  >
                    {type.icon} {type.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FiGrid className="text-purple-600" /> Categories
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Filter posts by category to find what matters to you.
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <span
                    key={cat.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                  >
                    {cat.emoji} {cat.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div className="max-w-6xl mx-auto px-4 py-16 border-t border-slate-200/60">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Get Started</h2>
            <p className="text-slate-500 text-sm">Join the conversation in just a few clicks.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/community/feed"
              className="group bg-white rounded-2xl border border-slate-200 p-5 text-center hover:shadow-lg transition hover:border-purple-200"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mx-auto mb-3 group-hover:scale-110 transition">
                <FiGrid className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-900">Browse Feed</h4>
              <p className="text-xs text-slate-400 mt-1">See what's trending</p>
            </Link>

            <Link
              href="/community/create"
              className="group bg-white rounded-2xl border border-slate-200 p-5 text-center hover:shadow-lg transition hover:border-purple-200"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mx-auto mb-3 group-hover:scale-110 transition">
                <FiPlus className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-900">Create Post</h4>
              <p className="text-xs text-slate-400 mt-1">Share your story</p>
            </Link>

            <Link
              href="/community/feed?category=startup"
              className="group bg-white rounded-2xl border border-slate-200 p-5 text-center hover:shadow-lg transition hover:border-purple-200"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mx-auto mb-3 group-hover:scale-110 transition">
                <FaRocket className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-900">Explore Startups</h4>
              <p className="text-xs text-slate-400 mt-1">See what's being built</p>
            </Link>

            <Link
              href="/community/feed?category=general"
              className="group bg-white rounded-2xl border border-slate-200 p-5 text-center hover:shadow-lg transition hover:border-purple-200"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-3 group-hover:scale-110 transition">
                <FiMessageCircle className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-900">Ask Questions</h4>
              <p className="text-xs text-slate-400 mt-1">Get help from the community</p>
            </Link>
          </div>
        </div>

        {/* ── Call to Action ── */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Ready to join the community?
            </h2>
            <p className="mt-2 text-purple-100 max-w-xl mx-auto">
              Connect with creators, share your work, and grow together. It all starts with one post.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  href="/community/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-xl font-medium hover:shadow-lg transition"
                >
                  <FiPlus className="w-5 h-5" /> Create Your First Post
                </Link>
              ) : (
                <Link
                  href="/login?redirect=/community"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-xl font-medium hover:shadow-lg transition"
                >
                  <FiUserPlus className="w-5 h-5" /> Join Now – It's Free
                </Link>
              )}
              <Link
                href="/community/feed"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl font-medium hover:bg-white/30 transition"
              >
                Browse Feed <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}