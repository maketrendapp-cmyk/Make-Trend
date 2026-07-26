// components/Navbar/index.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../AuthScreen';
import { useProfile } from '../../lib/queries';
import { useState, useEffect } from 'react';
import MobileNav from './MobileNav';
import DesktopNav from './DesktopNav';
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
} from 'react-icons/fi';

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

            {/* ── Logo ── */}
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

            {/* ── Desktop Nav (hidden on mobile) ── */}
            <div className="hidden md:block">
              <DesktopNav
                isAuthenticated={isAuthenticated}
                isProfileLoading={isProfileLoading}
                displayName={displayName}
                displayUsername={displayUsername}
                avatarUrl={avatarUrl}
                firstLetter={firstLetter}
                isPro={profile?.plan === 'pro' || false}
                handleLogout={handleLogout}
              />
            </div>

            {/* ── Mobile Navbar (visible only on mobile) ── */}
            <div className="flex items-center md:hidden">
              {/* Home Button (mobile) */}
              <Link
                href="/"
                className={`
                  flex items-center gap-1.5 px-3 py-2 mr-0.5
                  rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive('/')
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <FiHome className="w-4 h-4" />
                <span>Home</span>
              </Link>

              {/* ── Auth / User (mobile) ── */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2 py-1.5 ml-0.5
                    bg-gradient-to-r from-purple-50 to-indigo-50
                    border border-purple-200/50 rounded-lg
                    hover:from-purple-100 hover:to-indigo-100
                    transition-all duration-200 group
                    shadow-sm hover:shadow-md
                  "
                >
                  {isProfileLoading ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                      <div className="h-3 w-14 bg-gray-200 animate-pulse rounded" />
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow-sm border border-white">
                        {avatarUrl ? (
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
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition truncate max-w-[60px]">
                        @{displayUsername}
                      </span>
                    </>
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="
                    flex items-center gap-1.5 px-2.5 py-1.5 ml-0.5
                    bg-gradient-to-r from-purple-600 to-indigo-600
                    text-white font-semibold rounded-lg
                    hover:from-purple-700 hover:to-indigo-700
                    transition-all duration-200 shadow-md hover:shadow-lg
                    hover:-translate-y-0.5 active:scale-95
                    text-xs whitespace-nowrap
                  "
                >
                  <FiUser className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </Link>
              )}

              {/* ── Menu Button ── */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 ml-0.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
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