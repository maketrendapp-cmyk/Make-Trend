// frontend/components/Menu.js
import { useEffect } from 'react';
import Link from 'next/link';

export default function Menu({ isOpen, onClose }) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (dark overlay) */}
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Left Side Drawer - covers about 75% of screen width on mobile */}
      <div className="fixed left-0 top-0 z-50 h-full w-[75%] max-w-sm bg-white shadow-2xl animate-slide-in px-6 py-6">
        
        {/* Close Button (X) */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand / Logo at top */}
        <div className="mb-8 mt-2">
          <h1 className="text-2xl font-bold text-primary">
            Make<span className="text-gray-900">Trend</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Viral campaign builder</p>
        </div>

        {/* Menu Items */}
        <div className="space-y-1">
          <MenuItem href="/" label="🏠 Home" onClick={onClose} />
          <MenuItem href="/create" label="✨ Create Campaign" onClick={onClose} />
          <MenuItem href="/stats" label="📊 Analytics" onClick={onClose} />
          <MenuItem href="/profile" label="👤 Profile" onClick={onClose} />
          
          <div className="my-4 border-t border-border" />
          
          <MenuItem href="/settings" label="⚙️ Settings" onClick={onClose} />
          
          <button 
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            onClick={() => { alert('Logout clicked'); onClose(); }}
          >
            🚪 Logout
          </button>
        </div>

        {/* Footer / Version */}
        <div className="absolute bottom-6 left-6 right-6">
          <p className="text-xs text-gray-400">v2.0.0 • Made with ❤️</p>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

// Reusable Menu Item component
function MenuItem({ href, label, onClick }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className="flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition"
    >
      <span className="text-lg">{label.split(' ')[0]}</span>
      <span>{label.split(' ').slice(1).join(' ')}</span>
    </Link>
  );
}