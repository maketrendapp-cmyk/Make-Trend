// components/Navbar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useState, useEffect } from 'react';
import {
  FiHome,
  FiPlus,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiMail,
  FiDownload,
  FiHeart,
  FiTrendingUp,
  FiInfo,
  FiShield,
  FiBook,
} from 'react-icons/fi';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ── Detect scroll for shadow effect ──
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

  const navLinks = [
    { href: '/', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    { href: '/create', label: 'Create', icon: <FiPlus className="w-4 h-4" /> },
    { href: '/about', label: 'About', icon: <FiInfo className="w-4 h-4" /> },
    { href: '/contact', label: 'Contact', icon: <FiMail className="w-4 h-4" /> },
    { href: '/download', label: 'Download', icon: <FiDownload className="w-4 h-4" /> },
    { href: '/rules', label: 'Rules', icon: <FiShield className="w-4 h-4" /> },
    { href: '/terms', label: 'Terms', icon: <FiBook className="w-4 h-4" /> },
    { href: '/privacy', label: 'Privacy', icon: <FiShield className="w-4 h-4" /> },
  ];

  // ── Navigation links for desktop (filtered) ──
  const desktopNavLinks = [
    { href: '/', label: 'Home' },
    { href: '/create', label: 'Create' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/download', label: 'Download' },
  ];

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                <span className="text-white text-sm font-black">MT</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-purple-600">Make</span>
                <span className="text-gray-900 group-hover:text-purple-600/80 transition">Trend</span>
              </span>
            </Link>

            {/* ── Desktop Navigation Links ── */}
            <div className="hidden md:flex items-center gap-1">
              {desktopNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive(link.href)
                      ? 'bg-purple-100 text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* ── Right side: Auth / User ── */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {/* User Profile Button */}
                  <Link
                    href="/profile"
                    className="
                      flex items-center gap-2 px-4 py-2 
                      bg-gradient-to-r from-purple-50 to-indigo-50 
                      border border-purple-200/50 rounded-xl 
                      hover:from-purple-100 hover:to-indigo-100 
                      transition-all duration-200 group
                      shadow-sm hover:shadow-md
                    "
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {user?.fullname?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition">
                      @{user?.username || user?.fullname?.split(' ')[0]?.toLowerCase() || 'user'}
                    </span>
                  </Link>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="
                      flex items-center gap-1.5 px-3.5 py-2 
                      text-sm font-medium text-gray-600 
                      hover:text-red-600 hover:bg-red-50 
                      rounded-xl transition-all duration-200
                      border border-transparent hover:border-red-200
                    "
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="
                      px-4 py-2 text-sm font-medium text-gray-600 
                      hover:text-gray-900 hover:bg-gray-100 
                      rounded-xl transition-all duration-200
                    "
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="
                      flex items-center gap-1.5 px-5 py-2.5 
                      bg-gradient-to-r from-purple-600 to-indigo-600 
                      text-white font-semibold rounded-xl 
                      hover:from-purple-700 hover:to-indigo-700 
                      transition-all duration-200 shadow-md hover:shadow-lg 
                      hover:-translate-y-0.5 active:scale-95
                      text-sm
                    "
                  >
                    <FiUser className="w-4 h-4" />
                    Get Started
                  </Link>
                </div>
              )}

              {/* ── Mobile Menu Button ── */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <FiX className="w-6 h-6" />
                ) : (
                  <FiMenu className="w-6 h-6" />
                )}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ── Mobile Menu ── */}
      <div
        className={`
          md:hidden fixed inset-x-0 top-16 z-40 
          bg-white/95 backdrop-blur-lg border-b border-gray-200
          shadow-xl transition-all duration-300 ease-in-out
          ${isMobileMenuOpen 
            ? 'max-h-[calc(100vh-4rem)] opacity-100 translate-y-0' 
            : 'max-h-0 opacity-0 -translate-y-4 overflow-hidden'
          }
        `}
      >
        <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive(link.href)
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className={`${isActive(link.href) ? 'text-purple-600' : 'text-gray-400'}`}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}

          {/* Mobile Auth Actions */}
          <div className="pt-2 border-t border-gray-100 mt-2">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200 w-full"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 w-full"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}