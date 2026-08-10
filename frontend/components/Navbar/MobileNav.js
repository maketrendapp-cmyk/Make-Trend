// components/Navbar/MobileNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiPlus,
  FiInfo,
  FiBell,
  FiUsers,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

export default function MobileNav({
  isOpen,
  onClose,
  isAuthenticated,
  isProfileLoading,
  displayUsername,
  avatarUrl,
  firstLetter,
  handleLogout,
}) {
  const router = useRouter();

  // ── Only the requested items ──
  const navLinks = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    ...(isAuthenticated ? [{ href: '/notifications', label: 'Notifications', icon: <FiBell className="w-4 h-4" /> }] : []),
    { href: '/create', label: 'Browse Templates', icon: <FiPlus className="w-4 h-4" /> },
    { href: '/community', label: 'Community', icon: <FiUsers className="w-4 h-4" /> },
    { href: '/groweachother', label: 'Grow Together', icon: <FiUsers className="w-4 h-4" /> },
    { href: '/productstrend', label: 'Launch Products', icon: <FaRocket className="w-4 h-4" /> },
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4" /> },
  ];

  const isActive = (path) => router.pathname === path || router.pathname.startsWith(path + '/');

  return (
    <div
      className={`
        md:hidden fixed inset-x-0 top-14 sm:top-16 z-40 
        bg-white/95 backdrop-blur-lg border-b border-gray-200
        shadow-xl transition-all duration-300 ease-in-out
        ${isOpen
          ? 'max-h-[calc(100vh-3.5rem)] opacity-100 translate-y-0' 
          : 'max-h-0 opacity-0 -translate-y-4 overflow-hidden'
        }
      `}
    >
      <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
        {/* User Info (only if authenticated) */}
        {isAuthenticated && (
          <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden flex-shrink-0">
              {isProfileLoading ? (
                <div className="w-full h-full animate-pulse bg-gray-300" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={displayUsername} className="w-full h-full object-cover" />
              ) : (
                firstLetter
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {isProfileLoading ? 'Loading...' : displayUsername}
              </p>
              <p className="text-xs text-gray-500 truncate">@{displayUsername}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg sm:rounded-xl text-sm font-medium transition-all duration-200
              ${isActive(link.href)
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <span className={isActive(link.href) ? 'text-purple-600' : 'text-gray-400'}>
              {link.icon}
            </span>
            {link.label}
          </Link>
        ))}

        {/* Logout (only if authenticated) */}
        {isAuthenticated && (
          <div className="pt-3 border-t border-gray-100 mt-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {/* Get Started (only if NOT authenticated) */}
        {!isAuthenticated && (
          <div className="pt-3 border-t border-gray-100 mt-2">
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 w-full"
            >
              <FiUser className="w-4 h-4" />
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}