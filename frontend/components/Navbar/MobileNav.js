// components/Navbar/MobileNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiX,
  FiPlus,
  FiInfo,
  FiMail,
  FiDownload,
  FiShield,
  FiBook,
  FiBarChart2,
} from 'react-icons/fi';

export default function MobileNav({ isOpen, onClose, isAuthenticated, isProfileLoading, displayUsername, avatarUrl, firstLetter, handleLogout }) {
  const router = useRouter();

  const navLinks = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    { href: '/create', label: 'Create', icon: <FiPlus className="w-4 h-4" /> },
    { href: '/stats', label: 'Stats', icon: <FiBarChart2 className="w-4 h-4" /> },
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4" /> },
    { href: '/contact', label: 'Contact', icon: <FiMail className="w-4 h-4" /> },
    { href: '/download', label: 'Download', icon: <FiDownload className="w-4 h-4" /> },
    { href: '/rules', label: 'Rules', icon: <FiShield className="w-4 h-4" /> },
    { href: '/terms', label: 'Terms', icon: <FiBook className="w-4 h-4" /> },
    { href: '/privacy', label: 'Privacy', icon: <FiShield className="w-4 h-4" /> },
  ];

  const isActive = (path) => router.pathname === path;

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className={`
          md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* ── Drawer ── */}
      <div
        className={`
          md:hidden fixed inset-x-0 top-0 z-50 h-screen bg-white shadow-2xl
          transition-all duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                Make<span className="text-purple-600">Trend</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">Viral campaign builder</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close menu"
            >
              <FiX className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* User Info (if authenticated) */}
          {isAuthenticated && (
            <div className="px-4 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50">
              <div className="flex items-center gap-3">
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
                    {isProfileLoading ? (
                      <span className="animate-pulse bg-gray-200 px-4 py-0.5 rounded">Loading...</span>
                    ) : (
                      displayUsername
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isProfileLoading ? (
                      <span className="animate-pulse bg-gray-200 px-3 py-0.5 rounded">Loading...</span>
                    ) : (
                      `@${displayUsername}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
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

            <div className="pt-3 border-t border-gray-100 mt-2">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
                >
                  <FiLogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 w-full"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>

          <div className="p-4 text-center text-[10px] text-gray-400 border-t border-gray-100">
            v2.0.0
          </div>
        </div>
      </div>
    </>
  );
}