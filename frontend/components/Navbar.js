//components/Navbar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useState, useEffect } from 'react';
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
} from 'react-icons/fi';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
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

            {/* ── Home + Auth Buttons (Tightly Packed) ── */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Home Button */}
              <Link
                href="/"
                className={`
                  flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5
                  rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all duration-200
                  ${isActive('/')
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                  flex-shrink-0
                `}
              >
                <FiHome className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Home</span>
              </Link>

              {/* ── Auth / User ── */}
              {isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    className="
                      flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5
                      bg-gradient-to-r from-purple-50 to-indigo-50 
                      border border-purple-200/50 rounded-lg sm:rounded-xl 
                      hover:from-purple-100 hover:to-indigo-100 
                      transition-all duration-200 group
                      shadow-sm hover:shadow-md
                      flex-shrink-0
                    "
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shadow-sm flex-shrink-0">
                      {user?.fullname?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-gray-700 group-hover:text-gray-900 transition truncate max-w-[80px] sm:max-w-[130px]">
                      @{user?.username || user?.fullname?.split(' ')[0]?.toLowerCase() || 'user'}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="
                      hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 
                      text-sm sm:text-base font-medium text-gray-600 
                      hover:text-red-600 hover:bg-red-50 
                      rounded-lg sm:rounded-xl transition-all duration-200
                      border border-transparent hover:border-red-200
                      flex-shrink-0
                    "
                  >
                    <FiLogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="
                    flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 
                    bg-gradient-to-r from-purple-600 to-indigo-600 
                    text-white font-semibold rounded-lg sm:rounded-xl 
                    hover:from-purple-700 hover:to-indigo-700 
                    transition-all duration-200 shadow-md hover:shadow-lg 
                    hover:-translate-y-0.5 active:scale-95
                    text-sm sm:text-base whitespace-nowrap
                    flex-shrink-0
                  "
                >
                  <FiUser className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Get Started</span>
                </Link>
              )}
            </div>

            {/* ── Menu Button ── */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 flex-shrink-0 -mr-1"
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

      {/* ── Mobile Menu ── */}
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
          {navLinks.map((link) => (
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
    </>
  );
}