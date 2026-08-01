// components/Navbar/DesktopNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiUser, FiLogOut } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
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
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset avatar error when URL changes
  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  const isActive = (path) => router.pathname === path;

  return (
    <div className="flex items-center gap-3">
      {/* ── Home Button ── */}
      <Link
        href="/"
        className={`
          flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${isActive('/')
            ? 'bg-purple-100 text-purple-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }
        `}
      >
        <FiHome className="w-4 h-4" />
        <span>Home</span>
      </Link>

      {/* ── Get Started / User Avatar ── */}
      {isAuthenticated ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
          >
            {isProfileLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : (
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border-2 border-white">
                  {avatarUrl && !avatarError ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
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
            <span className="hidden lg:inline text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition max-w-[80px] truncate">
              @{displayUsername}
            </span>
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-fadeIn">
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
              <button
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  handleLogout();
                }}
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
  );
}