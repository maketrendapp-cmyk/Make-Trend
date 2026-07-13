// components/BottomNav.js
import { useRouter } from 'next/router';
import {
  FiHome,
  FiPlusCircle,
  FiBarChart2,
  FiUser,
  FiMenu,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { name: 'Home', path: '/', icon: FiHome },
  { name: 'Create', path: '/create', icon: FiPlusCircle },
  { name: 'Stats', path: '/stats', icon: FiBarChart2 },
  { name: 'Profile', path: '/profile', icon: FiUser },
];

export default function BottomNav({ onMenuToggle }) {
  const router = useRouter();

  // Check if the current path matches (or starts with) the item's path
  const isActive = (path) => {
    if (path === '/') return router.pathname === '/';
    return router.pathname.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-4px_30px_rgba(0,0,0,0.05)] md:hidden">
        <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">

          {/* Menu Button (Left) */}
          <button
            onClick={onMenuToggle}
            className="relative flex flex-col items-center justify-center gap-0.5 w-12 h-full text-gray-500 hover:text-purple-600 transition-colors group"
            aria-label="Open menu"
          >
            <FiMenu className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>

          {/* Navigation Items */}
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className="relative flex flex-col items-center justify-center gap-0.5 w-12 h-full text-gray-500 hover:text-purple-600 transition-colors group"
                aria-label={item.name}
              >
                {/* Active indicator (pill) */}
                {active && (
                  <motion.div
                    layoutId="bottomNavPill"
                    className="absolute -top-0.5 w-8 h-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <item.icon
                  className={`w-6 h-6 transition-all duration-200 ${
                    active
                      ? 'text-purple-600 scale-110'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />

                {/* Label */}
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  {item.name}
                </span>
              </button>
            );
          })}

        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind the nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}