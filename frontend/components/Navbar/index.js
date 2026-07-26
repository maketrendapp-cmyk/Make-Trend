// components/Navbar/index.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../AuthScreen';
import { useProfile } from '../../lib/queries';
import { useState, useEffect } from 'react';
import MobileNav from './MobileNav';
import DesktopNav from './DesktopNav';
import { FiMenu } from 'react-icons/fi';

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

            {/* ── Desktop Nav ── */}
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

            {/* ── Mobile Menu Button ── */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 flex-shrink-0 -mr-1"
              aria-label="Toggle menu"
            >
              <FiMenu className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

          </div>
        </div>
      </nav>

      {/* ── Mobile Nav ── */}
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