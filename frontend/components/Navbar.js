
// components/Navbar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile } from '../lib/queries';
import { useState, useEffect, useRef } from 'react';
import {
  FiHome,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiPlus,
  FiInfo,
  FiMail,
  FiDownload,
  FiShield,
  FiBook,
  FiMoreHorizontal,
  FiBarChart2,
  FiShare2,
  FiSettings,
  FiChevronDown,
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const moreDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // ── Scroll effect ──
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Click outside to close dropdowns ──
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setIsMoreDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  // ── Navigation links (Restored Original Icons) ──
  const mainNavLinks = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    { href: '/create', label: 'Create', icon: <FiPlus className="w-4 h-4" /> },
    { href: '/stats', label: 'Stats', icon: <FiBarChart2 className="w-4 h-4" /> },
  ];

  const moreNavLinks = [
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4" /> },
    { href: '/contact', label: 'Contact', icon: <FiMail className="w-4 h-4" /> },
    { href: '/download', label: 'Download', icon: <FiDownload className="w-4 h-4" /> },
    { href: '/rules', label: 'Rules', icon: <FiShield className="w-4 h-4" /> },
    { href: '/terms', label: 'Terms', icon: <FiBook className="w-4 h-4" /> },
    { href: '/privacy', label: 'Privacy', icon: <FiShield className="w-4 h-4" /> },
  ];

  const isActive = (path) => router.pathname === path;

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

  return (
    <>
      <nav
        className={`
          sticky top-0 z-50 transition-all duration-300
          ${isScrolled
            ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200'
            : 'bg-white/80 backdrop-blur-sm border-b border-gray-200/50'
          }
        `}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 md:h-20 items-center justify-between">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 md:gap-3 group flex-shrink-0 md:mr-6">
              <img
                src="/favicon.ico"
                alt="Make Trend"
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl shadow-md group-hover:shadow-lg transition-all group-hover:scale-105"
              />
              <span className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight whitespace-nowrap">
                <span className="text-primary md:text-transparent md:bg-clip-text md:bg-gradient-to-r md:from-purple-600 md:to-indigo-600">Make</span>
                <span className="text-gray-900 group-hover:text-primary/80 transition">Trend</span>
              </span>
            </Link>

            {/* ── Desktop Navigation (hidden on mobile, enhanced for PC) ── */}
            <div className="hidden md:flex items-center gap-2 flex-1">
              {mainNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border
                    ${isActive(link.href)
                      ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-purple-50/50 hover:text-purple-700 hover:border-purple-100'
                    }
                  `}
                >
                  <span className={isActive(link.href) ? 'text-purple-600' : 'text-gray-400'}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}

              {/* ── Desktop More Dropdown (⋮ on mobile, text button on PC) ── */}
              <div className="relative ml-1" ref={moreDropdownRef}>
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border
                    ${isMoreDropdownOpen
                      ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-purple-50/50 hover:text-purple-700 hover:border-purple-100'
                    }
                  `}
                  aria-label="More options"
                >
                  More
                  <FiChevronDown className={`w-4 h-4 transition-transform ${isMoreDropdownOpen ? 'rotate-180 text-purple-600' : 'text-gray-400'}`} />
                </button>

                {isMoreDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
                    {moreNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMoreDropdownOpen(false)}
                        className={`
                          flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors duration-150
                          ${isActive(link.href)
                            ? 'bg-purple-50 text-purple-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-purple-600'
                          }
                        `}
                      >
                        <span className={isActive(link.href) ? 'text-purple-600' : 'text-gray-400'}>
                          {link.icon}
                        </span>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right side: Auth / User ── */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">

              {isAuthenticated ? (
                <>
                  {/* ── User Avatar Dropdown ── */}
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className={`
                        flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 group
                        md:pl-2 md:pr-4 md:py-2 md:rounded-full md:border md:bg-white
                        ${isUserDropdownOpen 
                          ? 'md:border-purple-300 md:shadow-sm md:ring-2 md:ring-purple-50' 
                          : 'md:border-gray-200 hover:bg-gray-100 md:hover:bg-white md:hover:border-purple-200'
                        }
                      `}
                    >
                      {isProfileLoading ? (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-200 animate-pulse" />
                      ) : (
                        <div className="relative">
                          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden shadow-sm border-2 border-white md:border-none">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs md:text-sm font-bold';
                                  e.target.parentElement.textContent = firstLetter;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs md:text-sm font-bold">
                                {firstLetter}
                              </div>
                            )}
                          </div>
                          {isPro && (
                            <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1">
                              <FaCrown className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400 drop-shadow-sm" />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Desktop Name/Username layout */}
                      <div className="hidden md:flex flex-col items-start justify-center ml-1">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition leading-none max-w-[90px] truncate">
                          {displayName}
                        </span>
                        <span className="text-[11px] font-medium text-gray-400 leading-tight max-w-[90px] truncate mt-0.5">
                          @{displayUsername}
                        </span>
                      </div>
                      
                      {/* Mobile username layout (Original) */}
                      <span className="hidden sm:inline md:hidden text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition max-w-[80px] truncate">
                        @{displayUsername}
                      </span>
                      
                      <FiChevronDown className="hidden md:block w-4 h-4 text-gray-400 ml-1" />
                    </button>

                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 md:w-60 bg-white rounded-xl md:rounded-2xl shadow-xl md:shadow-2xl border border-gray-100 py-1 z-50 animate-fadeIn">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-500">@{displayUsername}</p>
                          {isPro && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                              <FaCrown className="w-3 h-3" /> PRO
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <Link
                            href="/profile"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          >
                            <FiUser className="w-4 h-4 text-gray-400" />
                            Profile
                          </Link>
                          <Link
                            href="/refer-earn"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          >
                            <FiShare2 className="w-4 h-4 text-gray-400" />
                            Refer & Earn
                          </Link>
                          <Link
                            href="/edit-profile"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          >
                            <FiSettings className="w-4 h-4 text-gray-400" />
                            Edit Profile
                          </Link>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1 pt-2"
                        >
                          <FiLogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ── Get Started Button (Restored original colors, upgraded for PC) ── */
                <Link
                  href="/login"
                  className="
                    flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5
                    md:px-6 md:py-2.5 md:rounded-xl md:border md:border-purple-400/50 md:hover:shadow-[0_8px_20px_rgba(124,58,237,0.25)]
                    bg-gradient-to-r from-purple-600 to-indigo-600
                    text-white font-semibold rounded-lg sm:rounded-xl
                    hover:from-purple-700 hover:to-indigo-700
                    transition-all duration-300 shadow-md hover:shadow-lg
                    hover:-translate-y-0.5 active:scale-95
                    text-sm sm:text-base whitespace-nowrap
                  "
                >
                  <FiUser className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Get Started</span>
                </Link>
              )}
            </div>

            {/* ── Mobile Menu Button ── */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 flex-shrink-0 -mr-1"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <FiMenu className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </button>

          </div>
        </div>
      </nav>

      {/* ── Mobile Menu (drawer) – Unchanged original mobile code ── */}
      <div
        className={`
          md:hidden fixed inset-x-0 top-14 sm:top-16 z-40
          bg-white/95 backdrop-blur-lg border-b border-gray-200
          shadow-xl transition-all duration-300 ease-in-out
          ${isMobileMenuOpen
            ? 'max-h-[calc(100vh-3.5rem)] opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-4 overflow-hidden'
          }
        `}
      >
        <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
          {/* ── All links combined for mobile ── */}
          {[...mainNavLinks, ...moreNavLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
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
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 w-full"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Dropdown animation CSS ── */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </>
  );
}
