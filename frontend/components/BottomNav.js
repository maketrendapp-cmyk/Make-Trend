// components/BottomNav.js
import { useRouter } from 'next/router';
import {
  FiHome,
  FiPlusCircle,
  FiBarChart2,
  FiUser,
  FiMenu,
} from 'react-icons/fi';
// 💡 Alternative: use Fa icons (solid) – uncomment below and comment out the Fi imports
// import { FaHome, FaPlusCircle, FaChartBar, FaUser, FaBars } from 'react-icons/fa';
import { motion } from 'framer-motion';

// Define nav items – you can swap icon sets here
const navItems = [
  { name: 'Home', path: '/', icon: FiHome },   // or FaHome
  { name: 'Create', path: '/create', icon: FiPlusCircle }, // or FaPlusCircle
  { name: 'Stats', path: '/stats', icon: FiBarChart2 },    // or FaChartBar
  { name: 'Profile', path: '/profile', icon: FiUser },     // or FaUser
];

export default function BottomNav({ onMenuToggle }) {
  const router = useRouter();

  const isActive = (path) => {
    if (path === '/') return router.pathname === '/';
    return router.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-4px_30px_rgba(0,0,0,0.06)] md:hidden">
        <div className="flex items-center justify-around h-[72px] px-2 max-w-md mx-auto">

          {/* Menu Button */}
          <button
            onClick={onMenuToggle}
            className="relative flex flex-col items-center justify-center gap-1 w-14 h-full text-gray-500 hover:text-purple-600 transition-colors group"
            aria-label="Open menu"
          >
            <FiMenu className="w-7 h-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
            {/* If using Fa: <FaBars className="w-7 h-7 group-hover:scale-110 transition-transform" /> */}
            <span className="text-[11px] font-bold tracking-wide text-gray-400 group-hover:text-purple-600">
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
                className="relative flex flex-col items-center justify-center gap-1 w-14 h-full text-gray-500 hover:text-purple-600 transition-colors group"
                aria-label={item.name}
              >
                {/* Active background pill (soft glow) */}
                {active && (
                  <motion.div
                    layoutId="bottomNavPill"
                    className="absolute inset-0 mx-auto w-12 h-12 rounded-full bg-purple-100/80 -z-0"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                )}

                {/* Icon – with bolder stroke (2.5) */}
                <Icon
                  className={`w-7 h-7 stroke-[2.5] relative z-10 transition-all duration-200 ${
                    active
                      ? 'text-purple-600 scale-110'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />

                {/* Label – bold and tight */}
                <span
                  className={`text-[11px] font-bold tracking-wide relative z-10 transition-colors duration-200 ${
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

      {/* Spacer */}
      <div className="h-[72px] md:hidden" />
    </>
  );
}