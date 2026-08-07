// components/Navbar/MobileNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiPlus,
  FiInfo,
  FiMail,
  FiDownload,
  FiShield,
  FiBook,
  FiBell,
} from 'react-icons/fi';

export default function MobileNav({
  isOpen,
  onClose,
  isAuthenticated,
  isProfileLoading,
  displayUsername,
  avatarUrl,
  firstLetter,
  handleLogout,
  unreadCount = 0,
}) {
  const router = useRouter();

  const navLinks = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    ...(isAuthenticated ? [{ href: '/notifications', label: 'Notifications', icon: <FiBell className="w-4 h-4" /> }] : []),
    { href: '/create', label: 'Create', icon: <FiPlus className="w-4 h-4" /> },
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4" /> },
    { href: '/contact', label: 'Contact', icon: <FiMail className="w-4 h-4" /> },
    { href: '/download', label: 'Download', icon: <FiDownload className="w-4 h-4" /> },
    { href: '/rules', label: 'Rules', icon: <FiShield className="w-4 h-4" /> },
    { href: '/terms', label: 'Terms', icon: <FiBook className="w-4 h-4" /> },
    { href: '/privacy', label: 'Privacy', icon: <FiShield className="w-4 h-4" /> },
  ];

  const isActive = (path) => router.pathname === path;

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
    </div>
  );
}