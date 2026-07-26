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
  FiSettings,
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
      { href: '/edit-profile', label: 'Edit Profile', icon: <FiSettings className="w-4 h-4" /> },
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
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-sm border-r border-gray-200">
      {/* ── Navigation Links (scrollable, with reduced spacing) ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200
              ${isActive(item.href)
                ? 'bg-purple-50 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <span className={isActive(item.href) ? 'text-purple-600' : 'text-gray-400'}>
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
            {isActive(item.href) && (
              <span className="ml-auto w-1 h-5 rounded-full bg-purple-600" />
            )}
          </Link>
        ))}
      </nav>

      {/* ── User Info + Logout (always visible at bottom) ── */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-gray-50/50">
        {isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden flex-shrink-0">
                {profileLoading ? (
                  <div className="w-full h-full animate-pulse bg-gray-300" />
                ) : displayAvatar ? (
                  <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  firstLetter
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-xs truncate">
                  {profileLoading ? (
                    <span className="animate-pulse bg-gray-200 px-3 py-0.5 rounded">Loading...</span>
                  ) : (
                    displayName
                  )}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {profileLoading ? (
                    <span className="animate-pulse bg-gray-200 px-2 py-0.5 rounded">Loading...</span>
                  ) : (
                    displayEmail
                  )}
                </p>
              </div>
              {isPro && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <FaCrown className="w-2.5 h-2.5" /> PRO
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-all duration-200 border border-red-100 hover:border-red-200"
            >
              <FiLogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs hover:shadow-lg transition-all duration-200"
          >
            <FiUser className="w-3.5 h-3.5" />
            Sign In
          </Link>
        )}
        <p className="text-[9px] text-gray-400 text-center mt-2">v2.0.0</p>
      </div>
    </div>
  );
}