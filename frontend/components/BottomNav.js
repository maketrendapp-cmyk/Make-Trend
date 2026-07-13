// components/BottomNav.js
import { useRouter } from 'next/router';
import {
  FiHome,
  FiPlusCircle,
  FiBarChart2,
  FiUser,
  FiMenu,
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Home', path: '/', icon: FiHome },
  { name: 'Create', path: '/create', icon: FiPlusCircle },
  { name: 'Stats', path: '/stats', icon: FiBarChart2 },
  { name: 'Profile', path: '/profile', icon: FiUser },
];

export default function BottomNav({ onMenuToggle }) {
  const router = useRouter();

  const isActive = (path) => {
    if (path === '/') return router.pathname === '/';
    return router.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-gray-100/80 shadow-[0_-2px_20px_rgba(0,0,0,0.04)] md:hidden">
        <div className="flex items-center justify-around h-[64px] px-2 max-w-md mx-auto">

          {/* Menu Button */}
          <button
            onClick={onMenuToggle}
            className="flex flex-col items-center justify-center gap-0.5 w-12 h-full text-gray-400 hover:text-purple-600 transition-colors group"
            aria-label="Open menu"
          >
            <FiMenu className="w-5 h-5 group-hover:scale-105 transition-transform" />
            <span className="text-[10px] font-medium text-gray-400 group-hover:text-purple-600">
              Menu
            </span>
          </button>

          {/* Navigation Items */}
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center justify-center gap-0.5 w-12 h-full text-gray-400 hover:text-purple-600 transition-colors group relative"
                aria-label={item.name}
              >
                {/* Icon */}
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    active ? 'text-purple-600 scale-105' : 'group-hover:text-gray-600'
                  }`}
                />

                {/* Label */}
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    active ? 'text-purple-600' : 'group-hover:text-gray-600'
                  }`}
                >
                  {item.name}
                </span>

                {/* Active dot indicator */}
                {active && (
                  <motion.div
                    layoutId="bottomNavDot"
                    className="absolute -top-0.5 w-1 h-1 rounded-full bg-purple-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

        </div>
      </nav>

      <div className="h-[64px] md:hidden" />
    </>
  );
}