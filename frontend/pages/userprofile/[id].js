// pages/userprofile/[id].js
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { usePublicUser } from '../../lib/queries'; // ✅ relative path
import {
  FiGlobe,
  FiTwitter,
  FiGithub,
  FiLinkedin,
  FiYoutube,
  FiInstagram,
  FiFacebook,
  FiMail,
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

export default function PublicProfile() {
  const router = useRouter();
  const { id } = router.query;

  const { data: user, isLoading, isError, error } = usePublicUser(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (isError || !user) {
    const isNotFound = error?.response?.status === 404;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
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
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const renderSocialLinks = () => {
    if (!user.socialLinks?.length) return null;
    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-3">
          Connect
        </h3>
        <div className="flex flex-wrap gap-3">
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
    );
  };

  const renderWebsites = () => {
    if (!user.websites?.length) return null;
    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-3">
          Websites
        </h3>
        <ul className="space-y-2">
          {user.websites.map((site, index) => (
            <li key={index}>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {site.label || site.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Helper to format date from Firestore timestamp or string
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

  return (
    <>
      <Head>
        <title>{user.fullname || user.username} – Make Trend Profile</title>
        <meta
          name="description"
          content={user.bio || `Profile of ${user.fullname || user.username}`}
        />
        <meta
          property="og:title"
          content={`${user.fullname || user.username} on Make Trend`}
        />
        <meta property="og:description" content={user.bio || ''} />
        <meta property="og:image" content={user.avatar || '/default-avatar.png'} />
        <meta
          property="og:url"
          content={`https://maketrend.app/userprofile/${user.uid}`}
        />
        <meta name="twitter:card" content="summary" />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500" />

          <div className="px-6 pb-6 relative">
            <div className="flex justify-center -mt-12 mb-4">
              <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.fullname || user.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl font-medium">
                    {user.fullname?.[0] || user.username?.[0] || '?'}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.fullname || user.username}
              </h1>
              {user.fullname && (
                <p className="text-sm text-gray-500">@{user.username}</p>
              )}
            </div>

            {user.bio && (
              <div className="mt-4 text-center text-gray-700">
                <p>{user.bio}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              {user.country && (
                <span className="flex items-center gap-1">
                  <FiGlobe size={16} />
                  {user.country}
                </span>
              )}
              {user.gender && <span className="text-gray-500">{user.gender}</span>}
            </div>

            {user.skills?.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {user.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {renderSocialLinks()}
            {renderWebsites()}

            {user.createdAt && (
              <div className="mt-6 text-center text-xs text-gray-400">
                Joined {formatDate(user.createdAt)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}