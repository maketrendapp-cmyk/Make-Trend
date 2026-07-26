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
  FiLogOut,
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Sidebar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

  const displayName = profile?.fullname || profile?.name || user?.fullName || user?.fullname || user?.displayName || 'User';
  const displayEmail = profile?.email || user?.email || 'user@example.com';
  const displayAvatar = profile?.avatar || profile?.profilePic || user?.photoURL || null;
  const isPro = profile?.plan === 'pro' || user?.plan === 'pro' || false;
  const firstLetter = displayName?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
    <div className="flex flex-col h-screen sticky top-0 overflow-hidden bg-white/80 backdrop-blur-sm border-r border-gray-200">
      {/* ── User Profile (Top) ── */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden flex-shrink-0">
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
                  <span className="animate-pulse bg-gray-200 px-3 py-0.5 rounded">Loading...</span>
                ) : (
                  displayName
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profileLoading ? (
                  <span className="animate-pulse bg-gray-200 px-2 py-0.5 rounded">Loading...</span>
                ) : (
                  displayEmail
                )}
              </p>
              {isPro && (
                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                  <FaCrown className="w-3 h-3" /> PRO
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Welcome to</p>
            <p className="text-lg font-extrabold text-gray-900">
              Make<span className="text-purple-600">Trend</span>
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* ── Navigation (Middle) ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
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

      {/* ── Bottom Section (Logout / Version) ── */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 group"
          >
            <FiLogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Logout</span>
          </button>
        ) : (
          <div className="text-center">
            <p className="text-[10px] text-gray-400">v2.0.0</p>
          </div>
        )}
        {isAuthenticated && (
          <p className="text-center text-[10px] text-gray-400 mt-2">v2.0.0</p>
        )}
      </div>
    </div>
  );
}