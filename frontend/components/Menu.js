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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Menu */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-6 pb-8 animate-slide-up">
        <div className="mx-auto w-12 h-1 bg-gray-300 rounded-full mb-6" /> {/* Drag handle */}
        
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu</h2>
        
        <div className="space-y-3">
          <MenuItem href="/" label="Home" icon="🏠" onClick={onClose} />
          <MenuItem href="/create" label="Create Campaign" icon="✨" onClick={onClose} />
          <MenuItem href="/stats" label="Analytics" icon="📊" onClick={onClose} />
          <MenuItem href="/profile" label="Profile" icon="👤" onClick={onClose} />
          <div className="border-t border-border my-3" />
          <MenuItem href="/settings" label="Settings" icon="⚙️" onClick={onClose} />
          <button 
            className="w-full text-left text-red-500 font-medium py-2 px-4 rounded-lg hover:bg-red-50 transition"
            onClick={() => { alert('Logout clicked'); onClose(); }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

function MenuItem({ href, label, icon, onClick }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
    >
      <span className="text-xl">{icon}</span>
      {label}
    </Link>
  );
}