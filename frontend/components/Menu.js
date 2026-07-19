// frontend/components/Menu.js
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './AuthScreen';
import { useProfile } from '../lib/queries';
import {
  FiX,
  FiHome,
  FiPlus,
  FiBarChart2,
  FiUser,
  FiSettings,
  FiLogOut,
  FiHeart,
  FiDownload,
  FiInfo,
  FiMail,
  FiShield,
  FiBook,
  FiTrendingUp,
  FiUsers,
  FiAward,
  FiGrid,
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Menu({ isOpen, onClose }) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    onClose();
    router.push('/');
  };

  if (!isOpen) return null;

  // ── Get user data from profile or fallback to auth user ──
  const displayName = profile?.fullname || profile?.name || user?.fullName || user?.fullname || user?.displayName || 'User';
  const displayEmail = profile?.email || user?.email || 'user@example.com';
  const displayAvatar = profile?.avatar || profile?.profilePic || user?.photoURL || null;
  const isPro = profile?.plan === 'pro' || user?.plan === 'pro' || false;
  const firstLetter = displayName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 z-50 h-full w-[75%] max-w-sm bg-white shadow-2xl animate-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">
              Make<span className="text-purple-600">Trend</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">
              Viral campaign builder
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* User Info (if authenticated) */}
        {isAuthenticated && (
          <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50">
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

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Section */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Main
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/"
                icon={<FiHome className="w-4 h-4" />}
                label="Home"
                isActive={router.pathname === '/'}
                onClick={onClose}
              />
              <NavItem
                href="/create"
                icon={<FiPlus className="w-4 h-4" />}
                label="Create Campaign"
                isActive={router.pathname === '/create'}
                onClick={onClose}
              />
              {isAuthenticated && (
                <>
                  <NavItem
                    href="/stats"
                    icon={<FiBarChart2 className="w-4 h-4" />}
                    label="Dashboard"
                    isActive={router.pathname === '/stats'}
                    onClick={onClose}
                  />
                  <NavItem
                    href="/profile"
                    icon={<FiUser className="w-4 h-4" />}
                    label="Profile"
                    isActive={router.pathname === '/profile'}
                    onClick={onClose}
                  />
                </>
              )}
            </div>
          </div>

          {/* Community Section */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Community
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/follow"
                icon={<FiHeart className="w-4 h-4" />}
                label="Follow Us"
                isActive={router.pathname === '/follow'}
                onClick={onClose}
              />
              <NavItem
                href="/refer-earn"
                icon={<FiAward className="w-4 h-4" />}
                label="Refer & Earn"
                isActive={router.pathname === '/refer-earn'}
                onClick={onClose}
              />
            </div>
          </div>

          {/* Legal & Support Section */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Legal & Support
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/about"
                icon={<FiInfo className="w-4 h-4" />}
                label="About"
                isActive={router.pathname === '/about'}
                onClick={onClose}
              />
              <NavItem
                href="/contact"
                icon={<FiMail className="w-4 h-4" />}
                label="Contact"
                isActive={router.pathname === '/contact'}
                onClick={onClose}
              />
              <NavItem
                href="/support"
                icon={<FiShield className="w-4 h-4" />}
                label="Support"
                isActive={router.pathname === '/support'}
                onClick={onClose}
              />
              <NavItem
                href="/download"
                icon={<FiDownload className="w-4 h-4" />}
                label="Download App"
                isActive={router.pathname === '/download'}
                onClick={onClose}
              />
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Legal
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/terms"
                icon={<FiBook className="w-4 h-4" />}
                label="Terms & Conditions"
                isActive={router.pathname === '/terms'}
                onClick={onClose}
              />
              <NavItem
                href="/privacy"
                icon={<FiShield className="w-4 h-4" />}
                label="Privacy Policy"
                isActive={router.pathname === '/privacy'}
                onClick={onClose}
              />
              <NavItem
                href="/rules"
                icon={<FiGrid className="w-4 h-4" />}
                label="Community Rules"
                isActive={router.pathname === '/rules'}
                onClick={onClose}
              />
            </div>
          </div>
        </nav>

        {/* Footer with Logout */}
        <div className="border-t border-gray-100 px-3 py-4">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 group"
            >
              <FiLogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:shadow-lg transition-all duration-200"
            >
              <FiUser className="w-4 h-4" />
              Sign In
            </Link>
          )}
          <p className="text-[10px] text-gray-400 text-center mt-3">v2.0.0</p>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
}

// Reusable NavItem component
function NavItem({ href, icon, label, isActive, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
        ${isActive
          ? 'bg-purple-50 text-purple-700 shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
    >
      <span className={isActive ? 'text-purple-600' : 'text-gray-400'}>
        {icon}
      </span>
      <span>{label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
      )}
    </Link>
  );
}