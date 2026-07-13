// frontend/components/BottomNav.js
import { useRouter } from 'next/router';

export default function BottomNav({ onMenuToggle }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Create', path: '/create', icon: CreateIcon },
    { name: 'Stats', path: '/stats', icon: StatsIcon },
    { name: 'Profile', path: '/profile', icon: ProfileIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        
        {/* Menu Button (Special) */}
        <button 
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center gap-0.5 w-12 text-gray-500 hover:text-primary transition"
        >
          <MenuIcon />
          <span className="text-[10px] font-medium">Menu</span>
        </button>

        {/* Other 4 Navigation Buttons */}
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 w-12 text-gray-500 hover:text-primary transition"
            >
              <item.icon isActive={isActive} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                {item.name}
              </span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}

// --- SVG Icons (Minimal, DeepSeek style) ---

function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function HomeIcon({ isActive }) {
  return (
    <svg className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function CreateIcon({ isActive }) {
  return (
    <svg className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function StatsIcon({ isActive }) {
  return (
    <svg className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ProfileIcon({ isActive }) {
  return (
    <svg className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}