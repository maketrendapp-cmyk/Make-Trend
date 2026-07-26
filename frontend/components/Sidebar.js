// components/Sidebar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './AuthScreen';
import { useProfile } from '../lib/queries';
import {
  FiHome,
  FiPlus,
  FiBarChart2,
  FiUser,
  FiHeart,
  FiAward,
  FiInfo,
  FiMail,
  FiShield,
  FiBook,
  FiDownload,
  FiGrid,
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Sidebar() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

  const displayName = profile?.fullname || profile?.name || user?.fullName || user?.fullname || user?.displayName || 'User';
  const displayEmail = profile?.email || user?.email || 'user@example.com';
  const displayAvatar = profile?.avatar || profile?.profilePic || user?.photoURL || null;
  const isPro = profile?.plan === 'pro' || user?.plan === 'pro' || false;
  const firstLetter = displayName?.charAt(0)?.toUpperCase() || 'U';

  const navItems = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    { href: '/create', label: 'Create', icon: <FiPlus className="w-4 h-4" /> },
    ...(isAuthenticated ? [
      { href: '/stats', label: 'Dashboard', icon: <FiBarChart2 className="w-4 h-4" /> },
      { href: '/profile', label: 'Profile', icon: <FiUser className="w-4 h-4" /> },
    ] : []),
    { href: '/follow', label: 'Follow Us', icon: <FiHeart className="w-4 h-4" /> },
    { href: '/refer-earn', label: 'Refer & Earn', icon: <FiAward className="w-4 h-4" /> },
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4" /> },
    { href: '/contact', label: 'Contact', icon: <FiMail className="w-4 h-4" /> },
    { href: '/support', label: 'Support', icon: <FiShield className="w-4 h-4" /> },
    { href: '/download', label: 'Download', icon: <FiDownload className="w-4 h-4" /> },
    { href: '/terms', label: 'Terms', icon: <FiBook className="w-4 h-4" /> },
    { href: '/privacy', label: 'Privacy', icon: <FiShield className="w-4 h-4" /> },
    { href: '/rules', label: 'Rules', icon: <FiGrid className="w-4 h-4" /> },
  ];

  const isActive = (path) => router.pathname === path;

  return (
    <div className="flex flex-col h-full py-4 px-3">
      {/* ── User card (if authenticated) ── */}
      {isAuthenticated && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden flex-shrink-0">
              {profileLoading ? (
                <div className="w-full h-full animate-pulse bg-gray-300" />
              ) : displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                firstLetter
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {profileLoading ? (
                  <span className="animate-pulse bg-gray-200 px-4 py-0.5 rounded">Loading...</span>
                ) : (
                  displayName
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profileLoading ? (
                  <span className="animate-pulse bg-gray-200 px-3 py-0.5 rounded">Loading...</span>
                ) : (
                  displayEmail
                )}
              </p>
            </div>
            {isPro && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full flex-shrink-0">
                <FaCrown className="w-3 h-3" /> PRO
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
              ${isActive(item.href)
                ? 'bg-purple-50 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <span className={isActive(item.href) ? 'text-purple-600' : 'text-gray-400'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {isActive(item.href) && (
              <span className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
            )}
          </Link>
        ))}
      </nav>

      {/* ── Version footer ── */}
      <div className="pt-4 mt-4 border-t border-gray-100 text-center text-[10px] text-gray-400">
        v2.0.0
      </div>
    </div>
  );
}