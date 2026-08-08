// pages/userinfo/[id].js
import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { usePublicProfile } from '../../lib/queries';
import {
  FiArrowLeft,
  FiUser,
  FiClock,
  FiGlobe,
  FiUsers,
  FiLink,
  FiBookmark,
  FiLoader,
  FiEdit2,
  FiShare2,
  FiLogIn,
  FiMail,
} from 'react-icons/fi';
import {
  FaYoutube,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaGithub,
  FaTwitch,
  FaTiktok,
  FaSnapchat,
  FaPinterest,
  FaReddit,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

// ── Platform icon mapping ──
const PLATFORM_ICONS = {
  youtube: FaYoutube,
  facebook: FaFacebook,
  twitter: FaTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  github: FaGithub,
  twitch: FaTwitch,
  tiktok: FaTiktok,
  snapchat: FaSnapchat,
  pinterest: FaPinterest,
  reddit: FaReddit,
};

const PLATFORM_COLORS = {
  youtube: 'text-red-600',
  facebook: 'text-blue-700',
  twitter: 'text-blue-400',
  instagram: 'text-pink-600',
  linkedin: 'text-blue-600',
  github: 'text-gray-800',
  twitch: 'text-purple-600',
  tiktok: 'text-black',
  snapchat: 'text-yellow-500',
  pinterest: 'text-red-500',
  reddit: 'text-orange-500',
};

function detectPlatformFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('twitch.tv')) return 'twitch';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('snapchat.com')) return 'snapchat';
    if (hostname.includes('pinterest.com')) return 'pinterest';
    if (hostname.includes('reddit.com')) return 'reddit';
    return null;
  } catch {
    return null;
  }
}

function getSocialIcon(link) {
  const platform = link.platform?.toLowerCase() || detectPlatformFromUrl(link.url) || 'link';
  const Icon = PLATFORM_ICONS[platform] || FiLink;
  const color = PLATFORM_COLORS[platform] || 'text-purple-600';
  return { Icon, color, platform };
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

export default function UserInfo() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();

  // ── FIX: Guard prevents hook from running during SSR with undefined id ──
  if (!id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-slate-800">Loading Profile...</h2>
          <div className="mt-6 flex justify-center">
            <FiLoader className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </div>
      </div>
    );
  }

  // ── Hook is now SAFE to call (id exists) ──
  const { data: profile, isLoading, isError, error } = usePublicProfile(id);

  // ── Debug: log error if any ──
  if (isError && error) {
    console.error('Profile fetch error:', error);
  }

  const isOwnProfile = isAuthenticated && user?.uid === id;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      } else if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Profile link copied!');
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <>
        <Meta title="User Profile | Make Trend" />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500">
              <FiLoader className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading profile...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Error ──
  if (isError || !profile) {
    return (
      <>
        <Meta title="User Not Found | Make Trend" />
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-red-600 font-medium text-lg">User not found.</p>
            <p className="text-slate-500 text-sm mt-1">The profile you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/community/feed')}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Render Profile ──
  return (
    <>
      <Meta title={`${profile.fullname || profile.username || 'User'} – Make Trend`} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/community/feed"
                className="text-slate-400 hover:text-slate-600 transition p-2 rounded-lg hover:bg-slate-100"
              >
                <FiArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Profile</h1>
            </div>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
            >
              <FiShare2 className="w-4 h-4" /> Share
            </button>
          </div>

          {/* ── Profile Card ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-purple-50/30 p-6 sm:p-8 transition-all hover:shadow-2xl hover:shadow-purple-50/40">
            <div className="flex flex-col items-center sm:flex-row gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex items-center justify-center shadow-inner border-4 border-white shadow-md transition-all duration-300 group-hover:shadow-xl">
                  {profile.avatar ? (
                    <Image
                      src={profile.avatar}
                      alt={profile.fullname || 'User'}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl font-bold">
                      {profile.fullname?.[0] || profile.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </div>

              {/* User info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-extrabold text-slate-900">{profile.fullname || profile.username || 'Anonymous'}</h2>
                {profile.username && (
                  <p className="text-sm text-slate-500">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-md mx-auto sm:mx-0">
                    {profile.bio}
                  </p>
                )}
                {profile.createdAt && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-2 justify-center sm:justify-start">
                    <FiClock className="w-3 h-3" /> Joined {formatDate(profile.createdAt)}
                  </p>
                )}
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {isOwnProfile ? (
                <Link
                  href="/edit-profile"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition shadow-md hover:shadow-purple-200 text-sm font-medium"
                >
                  <FiEdit2 className="w-4 h-4" /> Edit Profile
                </Link>
              ) : isAuthenticated ? (
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition text-sm font-medium">
                  <FiMail className="w-4 h-4" /> Send Message
                </button>
              ) : (
                <Link
                  href={`/login?redirect=/userinfo/${id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition shadow-md hover:shadow-purple-200 text-sm font-medium"
                >
                  <FiLogIn className="w-4 h-4" /> Sign in to Connect
                </Link>
              )}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
              >
                <FiShare2 className="w-4 h-4" /> Share Profile
              </button>
            </div>

            {/* ── Details Grid ── */}
            {(profile.country || profile.gender) && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                {profile.country && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-xl">
                    <FiGlobe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>{profile.country}</span>
                  </div>
                )}
                {profile.gender && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-xl">
                    <FiUser className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>{profile.gender}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Skills ── */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                  <FiBookmark className="w-4 h-4 text-purple-500" /> Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, idx) => (
                    <span key={idx} className="bg-purple-100 text-purple-700 text-xs px-3 py-1.5 rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Social Links ── */}
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                  <FiUsers className="w-4 h-4 text-purple-500" /> Social Links
                </h3>
                <div className="flex flex-wrap gap-3">
                  {profile.socialLinks.map((link, idx) => {
                    const { Icon, color, platform } = getSocialIcon(link);
                    return (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-sm hover:underline underline-offset-2 transition ${color}`}
                        title={link.channelName || platform || link.url}
                      >
                        <Icon className="w-4 h-4" />
                        {link.channelName || platform || 'Link'}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Websites ── */}
            {profile.websites && profile.websites.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                  <FiLink className="w-4 h-4 text-purple-500" /> Websites
                </h3>
                <div className="flex flex-wrap gap-4">
                  {profile.websites.map((site, idx) => {
                    const favicon = getFavicon(site.url);
                    return (
                      <a
                        key={idx}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition underline-offset-2 hover:underline"
                      >
                        {favicon && (
                          <img src={favicon} alt="" className="w-4 h-4 rounded" />
                        )}
                        {site.label || site.url}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sign-in CTA ── */}
          {!isAuthenticated && (
            <div className="mt-8 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-2xl border border-purple-100/60 p-6 text-center shadow-sm">
              <h3 className="text-lg font-bold text-slate-800">👋 Want to connect?</h3>
              <p className="text-sm text-slate-600 mt-1">Sign in to send a message or follow this user.</p>
              <Link
                href={`/login?redirect=/userinfo/${id}`}
                className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-md"
              >
                <FiLogIn className="w-4 h-4" /> Sign In / Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}