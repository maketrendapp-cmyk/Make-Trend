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
} from 'react-icons/fi';
import { FaXTwitter } from 'react-icons/fa6';

const platformIcons = {
  twitter: FaXTwitter,
  github: FiGithub,
  linkedin: FiLinkedin,
  youtube: FiYoutube,
  instagram: FiInstagram,
  facebook: FiFacebook,
  website: FiGlobe,
  email: FiMail,
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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-200" />
          <div className="px-6 pb-6 relative">
            <div className="flex justify-center -mt-16 mb-4">
              <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
            <div className="mt-4 h-4 bg-gray-200 rounded w-64 mx-auto" />
            <div className="mt-6 flex justify-center gap-4">
              <div className="h-8 bg-gray-200 rounded-full w-24" />
              <div className="h-8 bg-gray-200 rounded-full w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found
  if (isError || !profileUser) {
    const isNotFound = error?.response?.status === 404;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            {isNotFound ? 'User not found' : 'Something went wrong'}
          </h2>
          <p className="text-red-600">
            {isNotFound
              ? 'The profile you are looking for does not exist.'
              : 'Failed to load profile. Please try again later.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const user = profileUser;

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper: render field with fallback
  const renderField = (value, fallback = 'Not provided') => {
    return value ? value : <span className="text-gray-400 italic">{fallback}</span>;
  };

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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <FiArrowLeft size={20} />
          Back
        </button>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Cover */}
          <div className="h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
            {/* Optional: future cover image */}
          </div>

          {/* Profile content */}
          <div className="px-6 pb-6 relative">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-4">
              <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.fullname || user.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl font-medium">
                    {user.fullname?.[0] || user.username?.[0] || '?'}
                  </div>
                )}
              </div>
            </div>

            {/* Name & username */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.fullname || user.username}
              </h1>
              {user.fullname && (
                <p className="text-sm text-gray-500">@{user.username}</p>
              )}
            </div>

            {/* Edit button – only for owner */}
            {isOwner && (
              <div className="mt-4 text-center">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <FiEdit2 size={18} />
                  Edit Profile
                </Link>
              </div>
            )}

            {/* Bio */}
            <div className="mt-4 text-center text-gray-700">
              <p>{renderField(user.bio, 'No bio added yet')}</p>
            </div>

            {/* Location & Gender chips */}
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
              {user.country ? (
                <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                  <FiMapPin size={16} />
                  {user.country}
                </span>
              ) : null}
              {user.gender ? (
                <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                  <FiUser size={16} />
                  {user.gender}
                </span>
              ) : null}
              {!user.country && !user.gender && (
                <span className="text-gray-400 italic text-sm">
                  No location or gender info
                </span>
              )}
            </div>

            {/* Skills */}
            {user.skills?.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FiTag size={16} />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {user.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center text-gray-400 italic text-sm">
                No skills listed
              </div>
            )}

            {/* Social Links */}
            {user.socialLinks?.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FiLink size={16} />
                  Connect
                </h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {user.socialLinks.map((link, index) => {
                    const platform = link.platform?.toLowerCase();
                    const Icon = platformIcons[platform] || FiGlobe;
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition"
                      >
                        <Icon size={16} />
                        <span>{link.platform || 'Link'}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-gray-400 italic text-sm">
                No social links added
              </div>
            )}

            {/* Websites */}
            {user.websites?.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FiGlobe size={16} />
                  Websites
                </h3>
                <ul className="space-y-2 text-center">
                  {user.websites.map((site, index) => (
                    <li key={index}>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center justify-center gap-2"
                      >
                        <FiGlobe size={16} />
                        {site.label || site.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-8 text-center text-gray-400 italic text-sm">
                No websites added
              </div>
            )}

            {/* Joined date */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center">
              <span className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <FiCalendar size={14} />
                {user.createdAt ? `Joined ${formatDate(user.createdAt)}` : 'Joined date unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}