// components/Navbar/DesktopNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect } from 'react';
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
  FiMoreHorizontal,
  FiBarChart2,
  FiShare2,
  FiSettings,
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function DesktopNav({
  isAuthenticated,
  isProfileLoading,
  displayName,
  displayUsername,
  avatarUrl,
  firstLetter,
  isPro,
  handleLogout,
}) {
  const router = useRouter();
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const moreDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

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

  return (
    <div className="hidden md:flex items-center gap-1">
      {mainNavLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`
            flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
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

      {/* More Dropdown */}
      <div className="relative" ref={moreDropdownRef}>
        <button
          onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
          className={`
            p-2 rounded-lg text-sm font-medium transition-all duration-200
            ${isMoreDropdownOpen
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
          aria-label="More options"
        >
          <FiMoreHorizontal className="w-5 h-5" />
        </button>

        {isMoreDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-fadeIn">
            {moreNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMoreDropdownOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
                  ${isActive(link.href)
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
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

      {/* Right side: User / Auth */}
      <div className="ml-2 flex items-center">
        {isAuthenticated ? (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
            >
              {isProfileLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : (
                <div className="relative">
                  <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border-2 border-white">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold';
                          e.target.parentElement.textContent = firstLetter;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {firstLetter}
                      </div>
                    )}
                  </div>
                  {isPro && (
                    <div className="absolute -top-0.5 -right-0.5">
                      <FaCrown className="w-3.5 h-3.5 text-yellow-400 drop-shadow-sm" />
                    </div>
                  )}
                </div>
              )}
              <span className="hidden sm:inline text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition max-w-[80px] truncate">
                @{displayUsername}
              </span>
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-fadeIn">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">@{displayUsername}</p>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                      <FaCrown className="w-3 h-3" /> PRO
                    </span>
                  )}
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FiUser className="w-4 h-4 text-gray-400" />
                  Profile
                </Link>
                <Link
                  href="/refer-earn"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FiShare2 className="w-4 h-4 text-gray-400" />
                  Refer & Earn
                </Link>
                <Link
                  href="/edit-profile"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FiSettings className="w-4 h-4 text-gray-400" />
                  Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1 pt-2"
                >
                  <FiLogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="
              flex items-center gap-1.5 px-3.5 py-2
              bg-gradient-to-r from-purple-600 to-indigo-600
              text-white font-semibold rounded-lg
              hover:from-purple-700 hover:to-indigo-700
              transition-all duration-200 shadow-md hover:shadow-lg
              hover:-translate-y-0.5 active:scale-95
              text-sm whitespace-nowrap
            "
          >
            <FiUser className="w-4 h-4" />
            <span>Get Started</span>
          </Link>
        )}
      </div>
    </div>
  );
}