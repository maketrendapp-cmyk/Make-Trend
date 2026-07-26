
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

  // ── Navigation links ──
  const mainNavLinks = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4 md:hidden" /> },
    { href: '/create', label: 'Create', icon: <FiPlus className="w-4 h-4 md:hidden" /> },
    { href: '/stats', label: 'Stats', icon: <FiBarChart2 className="w-4 h-4 md:hidden" /> },
  ];

  const moreNavLinks = [
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" /> },
    { href: '/contact', label: 'Contact', icon: <FiMail className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" /> },
    { href: '/download', label: 'Download', icon: <FiDownload className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" /> },
    { href: '/rules', label: 'Rules', icon: <FiShield className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" /> },
    { href: '/terms', label: 'Terms', icon: <FiBook className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" /> },
    { href: '/privacy', label: 'Privacy', icon: <FiShield className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" /> },
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
            ? 'bg-white/80 backdrop-blur-xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border-b border-gray-100/50'
            : 'bg-white md:bg-white/80 md:backdrop-blur-sm border-b border-gray-100'
          }
        `}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 md:h-20 items-center justify-between">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0 mr-4 md:mr-8">
              <img
                src="/favicon.ico"
                alt="Make Trend"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105"
              />
              <span className="text-base sm:text-xl font-extrabold tracking-tight whitespace-nowrap">
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Make</span>
                <span className="text-gray-900 group-hover:text-gray-700 transition-colors duration-300">Trend</span>
              </span>
            </Link>

            {/* ── Desktop Navigation (hidden on mobile) ── */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-1">
              {mainNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-out
                    ${isActive(link.href)
                      ? 'text-purple-700 bg-purple-50/80'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {link.label}
                  {/* Active Indicator Line */}
                  {isActive(link.href) && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-purple-600 rounded-full" />
                  )}
                </Link>
              ))}

              {/* ── Desktop More Dropdown ── */}
              <div className="relative ml-2" ref={moreDropdownRef}>
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-out
                    ${isMoreDropdownOpen
                      ? 'text-gray-900 bg-gray-50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  aria-expanded={isMoreDropdownOpen}
                >
                  More
                  <FiChevronDown 
                    className={`w-4 h-4 transition-transform duration-300 ${isMoreDropdownOpen ? 'rotate-180 text-gray-900' : 'text-gray-400'}`} 
                  />
                </button>

                {isMoreDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-52 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 py-2 z-50 animate-dropdownFast origin-top-left">
                    {moreNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMoreDropdownOpen(false)}
                        className={`
                          group flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200
                          ${isActive(link.href)
                            ? 'text-purple-700 bg-purple-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }
                        `}
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right side: Auth / User ── */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">

              {isAuthenticated ? (
                <>
                  {/* ── User Avatar Dropdown ── */}
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center gap-2.5 p-1.5 md:pr-3 rounded-full hover:bg-gray-50 md:border md:border-transparent md:hover:border-gray-200 transition-all duration-300 group"
                    >
                      {isProfileLoading ? (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 animate-pulse" />
                      ) : (
                        <div className="relative">
                          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-purple-100 transition-all duration-300">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold';
                                  e.target.parentElement.textContent = firstLetter;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                {firstLetter}
                              </div>
                            )}
                          </div>
                          {isPro && (
                            <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5">
                              <FaCrown className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400 drop-shadow-md" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="hidden md:flex flex-col items-start justify-center">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors leading-tight max-w-[100px] truncate">
                          {displayName}
                        </span>
                        <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-500 transition-colors leading-tight max-w-[100px] truncate">
                          @{displayUsername}
                        </span>
                      </div>
                      <FiChevronDown className={`hidden md:block w-4 h-4 text-gray-400 ml-1 transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180 text-gray-700' : ''}`} />
                    </button>

                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 py-2 z-50 animate-dropdownFast origin-top-right">
                        
                        {/* Mobile Header (Desktop already shows name, but good for consistency) */}
                        <div className="md:hidden px-5 py-3.5 border-b border-gray-50 mb-2">
                          <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">@{displayUsername}</p>
                          {isPro && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-yellow-700 bg-yellow-100/80 px-2 py-0.5 rounded-full">
                              <FaCrown className="w-3 h-3" /> PRO MEMBER
                            </span>
                          )}
                        </div>

                        {isPro && (
                          <div className="hidden md:flex px-5 py-2 mb-1">
                             <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-100/80 px-2.5 py-1 rounded-full w-full justify-center">
                              <FaCrown className="w-3 h-3" /> PRO MEMBER
                            </span>
                          </div>
                        )}

                        <div className="px-2 space-y-0.5">
                          <Link
                            href="/profile"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-white text-gray-400 group-hover:text-purple-600 transition-colors shadow-sm border border-transparent group-hover:border-gray-100">
                              <FiUser className="w-4 h-4" />
                            </div>
                            Profile
                          </Link>
                          <Link
                            href="/refer-earn"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-white text-gray-400 group-hover:text-green-500 transition-colors shadow-sm border border-transparent group-hover:border-gray-100">
                              <FiShare2 className="w-4 h-4" />
                            </div>
                            Refer & Earn
                          </Link>
                          <Link
                            href="/edit-profile"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-white text-gray-400 group-hover:text-blue-500 transition-colors shadow-sm border border-transparent group-hover:border-gray-100">
                              <FiSettings className="w-4 h-4" />
                            </div>
                            Edit Profile
                          </Link>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-50 px-2">
                          <button
                            onClick={handleLogout}
                            className="group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-red-100 text-gray-400 group-hover:text-red-600 transition-colors">
                              <FiLogOut className="w-4 h-4" />
                            </div>
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ── Get Started Button ── */
                <Link
                  href="/login"
                  className="
                    relative overflow-hidden group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5
                    bg-gray-900 text-white font-semibold rounded-full
                    hover:bg-gray-800 transition-all duration-300 
                    shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]
                    hover:-translate-y-0.5 active:translate-y-0
                    text-sm sm:text-base whitespace-nowrap
                  "
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <FiUser className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                  <span className="relative z-10">Get Started</span>
                </Link>
              )}
            </div>

            {/* ── Mobile Menu Button (unchanged) ── */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 sm:p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 flex-shrink-0 ml-1"
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

      {/* ── Mobile Menu (drawer) – unchanged functionality, preserved style ── */}
      <div
        className={`
          md:hidden fixed inset-x-0 top-14 sm:top-16 z-40
          bg-white/95 backdrop-blur-xl border-b border-gray-200
          shadow-2xl transition-all duration-300 ease-in-out
          ${isMobileMenuOpen
            ? 'max-h-[calc(100vh-3.5rem)] opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-4 overflow-hidden'
          }
        `}
      >
        <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
          {[...mainNavLinks, ...moreNavLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${isActive(link.href)
                  ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <span className={isActive(link.href) ? 'text-purple-600' : 'text-gray-400'}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}

          <div className="pt-4 pb-2 border-t border-gray-100 mt-4">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 w-full"
              >
                <FiLogOut className="w-4 h-4" />
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center px-4 py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all duration-200 w-full shadow-md"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Dropdown animation CSS ── */}
      <style jsx>{`
        @keyframes dropdownFast {
          0% { opacity: 0; transform: scale(0.95) translateY(-10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-dropdownFast {
          animation: dropdownFast 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}