// pages/userinfo/[id].js
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { usePublicUser } from '../../lib/queries';
import { useAuth } from '../../components/AuthScreen';
import {
  FiGlobe,
  FiTwitter,
  FiGithub,
  FiLinkedin,
  FiYoutube,
  FiInstagram,
  FiFacebook,
  FiMail,
  FiMapPin,
  FiUser,
  FiCalendar,
  FiLink,
  FiTag,
  FiEdit2,
  FiArrowLeft,
  FiPhone,
  FiAward,
  FiShare2,
  FiExternalLink,
} from 'react-icons/fi';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaLinkedin,
  FaGithub,
  FaTwitch,
  FaTiktok,
  FaSnapchat,
  FaPinterest,
  FaReddit,
  FaUsers,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

// ── Platform icons mapping ──
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
  youtube: 'text-red-600 bg-red-50 border-red-100',
  facebook: 'text-blue-700 bg-blue-50 border-blue-100',
  twitter: 'text-blue-400 bg-blue-50 border-blue-100',
  instagram: 'text-pink-600 bg-pink-50 border-pink-100',
  linkedin: 'text-blue-600 bg-blue-50 border-blue-100',
  github: 'text-gray-800 bg-gray-100 border-gray-200',
  twitch: 'text-purple-600 bg-purple-50 border-purple-100',
  tiktok: 'text-black bg-gray-100 border-gray-200',
  snapchat: 'text-yellow-500 bg-yellow-50 border-yellow-100',
  pinterest: 'text-red-500 bg-red-50 border-red-100',
  reddit: 'text-orange-500 bg-orange-50 border-orange-100',
};

// ── Helper to get favicon ──
const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
};

// ── Format date from Firestore timestamp ──
const formatDate = (timestamp) => {
  if (!timestamp) return null;
  try {
    let date;
    if (timestamp.seconds !== undefined) {
      date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return null;
    }
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

export default function UserInfoPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: currentUser, isAuthenticated } = useAuth();

  const {
    data: profileUser,
    isLoading,
    isError,
    error,
  } = usePublicUser(id);

  const isOwner = isAuthenticated && currentUser?.uid === id;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied!');
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

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="h-44 bg-gray-200" />
          <div className="px-6 pb-8 relative">
            <div className="flex justify-center -mt-16 mb-4">
              <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
            <div className="mt-4 h-4 bg-gray-200 rounded w-64 mx-auto" />
            <div className="mt-6 flex justify-center gap-4">
              <div className="h-9 bg-gray-200 rounded-xl w-28" />
              <div className="h-9 bg-gray-200 rounded-xl w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──
  if (isError || !profileUser) {
    const isNotFound = error?.response?.status === 404;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-3">👤</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isNotFound ? 'User not found' : 'Something went wrong'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isNotFound
              ? 'The profile you are looking for does not exist.'
              : 'Failed to load profile. Please try again later.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white font-medium text-sm rounded-xl hover:bg-purple-700 transition shadow-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const user = profileUser;
  const joinedDate = formatDate(user.createdAt);

  return (
    <>
      <Head>
        <title>{user.fullname || user.username} – Make Trend</title>
        <meta
          name="description"
          content={user.bio || `Profile of ${user.fullname || user.username}`}
        />
        <meta property="og:title" content={`${user.fullname || user.username} on Make Trend`} />
        <meta property="og:description" content={user.bio || ''} />
        <meta property="og:image" content={user.avatar || '/default-avatar.png'} />
        <meta property="og:url" content={`https://maketrend.app/userinfo/${user.uid}`} />
        <meta name="twitter:card" content="summary" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* ── Top Navigation & Share ── */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition font-medium text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition font-medium text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200"
            >
              <FiShare2 className="w-4 h-4" /> Share
            </button>
          </div>

          {/* ── Main Card ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
            {/* Cover Banner */}
            <div className="h-44 sm:h-52 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 relative" />

            {/* Profile Content */}
            <div className="px-6 pb-8 pt-0 relative">
              {/* Avatar */}
              <div className="flex justify-center -mt-16 mb-4">
                <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex-shrink-0">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.fullname || user.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-700 text-3xl font-bold">
                      {user.fullname?.[0] || user.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </div>

              {/* Name & username */}
              <div className="text-center">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {user.fullname || user.username || 'Community Member'}
                </h1>
                {user.username && (
                  <p className="text-sm font-semibold text-gray-500 mt-0.5">@{user.username}</p>
                )}
              </div>

              {/* Edit button – only for owner */}
              {isOwner && (
                <div className="mt-4 text-center">
                  <Link
                    href="/edit-profile"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow transition"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    Edit Profile
                  </Link>
                </div>
              )}

              {/* ── Bio ── */}
              <div className="mt-4 max-w-lg mx-auto text-center text-gray-600 text-sm leading-relaxed font-medium">
                {user.bio ? (
                  <p>{user.bio}</p>
                ) : (
                  <p className="text-gray-400 italic">No bio added yet.</p>
                )}
              </div>

              {/* ── Details chips ── */}
              <div className="mt-6 flex flex-wrap justify-center gap-2.5 text-xs font-semibold">
                {user.country && (
                  <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/70 text-gray-700 px-3 py-1.5 rounded-xl shadow-xs">
                    <FiMapPin className="w-3.5 h-3.5 text-purple-600" />
                    {user.country}
                  </span>
                )}
                {user.gender && (
                  <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/70 text-gray-700 px-3 py-1.5 rounded-xl shadow-xs">
                    <FiUser className="w-3.5 h-3.5 text-purple-600" />
                    {user.gender}
                  </span>
                )}
                {user.age && (
                  <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/70 text-gray-700 px-3 py-1.5 rounded-xl shadow-xs">
                    <FiAward className="w-3.5 h-3.5 text-purple-600" />
                    {user.age} years old
                  </span>
                )}
                {user.phone && isAuthenticated && (
                  <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/70 text-gray-700 px-3 py-1.5 rounded-xl shadow-xs">
                    <FiPhone className="w-3.5 h-3.5 text-purple-600" />
                    {user.phone}
                  </span>
                )}
                {joinedDate && (
                  <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/70 text-gray-700 px-3 py-1.5 rounded-xl shadow-xs">
                    <FiCalendar className="w-3.5 h-3.5 text-purple-600" />
                    Joined {joinedDate}
                  </span>
                )}
              </div>

              {/* ── Skills ── */}
              {user.skills?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <FiTag className="w-4 h-4 text-purple-600" />
                    Skills & Expertise
                  </h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {user.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Social Links ── */}
              {user.socialLinks?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <FaUsers className="w-4 h-4 text-purple-600" />
                    Social Channels
                  </h3>
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    {user.socialLinks.map((link, index) => {
                      const platform = link.platform?.toLowerCase();
                      const Icon = PLATFORM_ICONS[platform] || FiLink;
                      const colorClass = PLATFORM_COLORS[platform] || 'text-purple-600 bg-purple-50 border-purple-100';
                      return (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/70 rounded-xl text-xs font-bold text-gray-700 transition shadow-sm"
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${colorClass}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span>{link.platform || 'Link'}</span>
                          <FiExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Websites ── */}
              {user.websites?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <FiGlobe className="w-4 h-4 text-purple-600" />
                    Websites & Portfolios
                  </h3>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {user.websites.map((site, index) => {
                      const favicon = getFavicon(site.url);
                      return (
                        <a
                          key={index}
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/70 rounded-xl text-xs font-bold text-blue-600 transition shadow-sm group"
                        >
                          {favicon ? (
                            <img src={favicon} alt="" className="w-4 h-4 rounded" />
                          ) : (
                            <FiGlobe className="w-4 h-4" />
                          )}
                          <span>{site.label || site.url}</span>
                          <FiExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Join date fallback if not shown in chips ── */}
              {!joinedDate && (
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <span className="text-xs text-gray-400 font-medium">
                    <FiCalendar className="inline w-3.5 h-3.5 mr-1" />
                    Joined Unknown
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Non‑authenticated prompt ── */}
          {!isAuthenticated && (
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/60 rounded-3xl p-6 text-center shadow-sm">
              <h3 className="text-base font-bold text-gray-900">
                Want to connect with {user.fullname || user.username}?
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4 font-medium">
                Sign in or create a free account to interact with platform members.
              </p>
              <Link
                href={`/login?redirect=/userinfo/${id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition shadow-sm"
              >
                <FiShare2 className="w-4 h-4" /> Sign In to Connect
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}