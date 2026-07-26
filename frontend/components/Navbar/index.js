// components/Navbar/index.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../AuthScreen';
import { useProfile } from '../../lib/queries';
import { useState, useEffect } from 'react';
import MobileNav from './MobileNav';
import DesktopNav from './DesktopNav';
import { FiMenu, FiHome, FiUser, FiX } from 'react-icons/fi';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  // ── User details ──
  const displayName = profile?.fullname ||
    profile?.name ||
    user?.fullName ||
    user?.fullname ||
    user?.displayName ||
    'User';

  const displayUsername = profile?.username ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'user';

  const avatarUrl = profile?.avatar ||
    profile?.profilePic ||
    user?.photoURL ||
    user?.avatar ||
    null;

  const firstLetter = displayName?.charAt(0)?.toUpperCase() || 'U';
  const isPro = profile?.plan === 'pro' || false;
  const isProfileLoading = profileLoading || (user && !profile);

  const isActive = (path) => router.pathname === path;

  return (
    <>
      <nav
        className={`
          sticky top-0 z-50 transition-all duration-300
          ${isScrolled
            ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-100'
            : 'bg-white/80 backdrop-blur-sm border-b border-gray-200/50'
          }
        `}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">

            {/* ── Logo (left) ── */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <img
                src="/favicon.ico"
                alt="Make Trend"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-md group-hover:shadow-lg transition-all group-hover:scale-105"
              />
              <span className="text-base sm:text-xl font-extrabold tracking-tight whitespace-nowrap">
                <span className="text-primary">Make</span>
                <span className="text-gray-900 group-hover:text-primary/80 transition">Trend</span>
              </span>
            </Link>

            {/* ── Desktop Nav (right) ── */}
            <div className="hidden md:block">
              <DesktopNav
                isAuthenticated={isAuthenticated}
                isProfileLoading={isProfileLoading}
                displayName={displayName}
                displayUsername={displayUsername}
                avatarUrl={avatarUrl}
                firstLetter={firstLetter}
                isPro={isPro}
                handleLogout={handleLogout}
              />
            </div>

            {/* ── Mobile Header (visible only on mobile) ── */}
            <div className="flex items-center gap-1 md:hidden">
              {/* Home Button */}
              <Link
                href="/"
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive('/')
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <FiHome className="w-4 h-4" />
                <span className="text-xs">Home</span>
              </Link>

              {/* User / Get Started */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden shadow-sm border border-white">
                    {isProfileLoading ? (
                      <div className="w-full h-full animate-pulse bg-gray-300" />
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[8px] font-bold';
                          e.target.parentElement.textContent = firstLetter;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[8px] font-bold">
                        {firstLetter}
                      </div>
                    )}
                  </div>
                  {isPro && (
                    <span className="absolute -top-0.5 -right-0.5">
                      <FaCrown className="w-2.5 h-2.5 text-yellow-400" />
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm text-xs whitespace-nowrap"
                >
                  <FiUser className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </Link>
              )}

              {/* Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        isProfileLoading={isProfileLoading}
        displayUsername={displayUsername}
        avatarUrl={avatarUrl}
        firstLetter={firstLetter}
        handleLogout={handleLogout}
      />
    </>
  );
}