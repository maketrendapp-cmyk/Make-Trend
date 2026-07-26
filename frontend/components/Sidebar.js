
// components/Sidebar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './AuthScreen';
import { useProfile } from '../lib/queries';
import {
  FiHome,
  FiPlus,
  FiBarChart2,
  FiUser,
  FiHeart,
  FiAward,
  FiInfo,
  FiMail,
  FiShield,
  FiBook,
  FiDownload,
  FiGrid,
  FiLogOut,
  FiSettings,
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Sidebar() {
  const router = useRouter();
  // Safe fallbacks for hooks in case they are undefined during render
  const auth = useAuth() || {};
  const { user, isAuthenticated, logout } = auth;
  
  const profileQuery = useProfile(isAuthenticated) || {};
  const { data: profile, isLoading: profileLoading } = profileQuery;

  const displayName = profile?.fullname || profile?.name || user?.fullName || user?.fullname || user?.displayName || 'User';
  const displayEmail = profile?.email || user?.email || 'user@example.com';
  const displayAvatar = profile?.avatar || profile?.profilePic || user?.photoURL || null;
  const isPro = profile?.plan === 'pro' || user?.plan === 'pro' || false;
  const firstLetter = displayName?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = async () => {
    if (logout) {
      await logout();
      router.push('/');
    }
  };

  const isActive = (path) => router.pathname === path;

  const menuGroups = [
    {
      title: 'Main Menu',
      items: [
        { href: '/', label: 'Home', icon: FiHome },
        { href: '/create', label: 'Create', icon: FiPlus },
        ...(isAuthenticated
          ? [
              { href: '/stats', label: 'Dashboard', icon: FiBarChart2 },
              { href: '/profile', label: 'Profile', icon: FiUser },
              { href: '/edit-profile', label: 'Settings', icon: FiSettings },
            ]
          : []),
      ],
    },
    {
      title: 'Community',
      items: [
        { href: '/follow', label: 'Follow Us', icon: FiHeart },
        { href: '/refer-earn', label: 'Refer & Earn', icon: FiAward },
      ],
    },
    {
      title: 'Resources',
      items: [
        { href: '/about', label: 'About', icon: FiInfo },
        { href: '/contact', label: 'Contact', icon: FiMail },
        { href: '/support', label: 'Support', icon: FiShield },
        { href: '/download', label: 'Download', icon: FiDownload },
      ],
    },
    {
      title: 'Legal',
      items: [
        { href: '/terms', label: 'Terms', icon: FiBook },
        { href: '/privacy', label: 'Privacy', icon: FiShield },
        { href: '/rules', label: 'Rules', icon: FiGrid },
      ],
    },
  ];

  return (
    <aside 
      className="sticky top-0 self-start flex flex-col w-[260px] h-screen flex-shrink-0 bg-white border-r border-gray-200 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] z-40"
      /* NOTE: If your header is fixed at the top (e.g. 64px height), change the classes above to:
         sticky top-[64px] h-[calc(100vh-64px)] 
         so it sits perfectly underneath your header. */
    >
      
      {/* ── Scrollable Navigation ── */}
      {/* flex-1 allows it to take remaining space, overflow-y-auto lets it scroll internally */}
      <nav 
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className={`px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${idx > 0 ? 'mt-2' : ''}`}>
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon 
                      className={`w-[18px] h-[18px] transition-colors ${
                        active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`} 
                    />
                    <span>{item.label}</span>
                    
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Fixed Footer: User Info + Logout ── */}
      {/* flex-shrink-0 ensures this bottom block never gets squished or hidden by the scroll */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
        {isAuthenticated ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden flex-shrink-0 border-2 border-white ring-1 ring-gray-100">
                {profileLoading ? (
                  <div className="w-full h-full animate-pulse bg-gray-300" />
                ) : displayAvatar ? (
                  <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  firstLetter
                )}
                {isPro && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <div className="bg-yellow-400 text-white rounded-full p-[1px]">
                      <FaCrown className="w-2 h-2" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate leading-tight">
                  {profileLoading ? (
                    <span className="inline-block w-20 h-4 animate-pulse bg-gray-200 rounded" />
                  ) : (
                    displayName
                  )}
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {profileLoading ? (
                    <span className="inline-block w-24 h-3 animate-pulse bg-gray-200 rounded" />
                  ) : (
                    displayEmail
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="group flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 border border-gray-200 hover:border-red-100"
            >
              <FiLogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 hover:shadow-md hover:shadow-purple-200 transition-all duration-200"
          >
            <FiUser className="w-[18px] h-[18px]" />
            Sign In to Account
          </Link>
        )}
      </div>
    </aside>
  );
}
