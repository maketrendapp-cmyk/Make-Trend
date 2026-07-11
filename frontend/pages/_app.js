// pages/_app.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../components/AuthScreen';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import '../styles/globals.css';

// ============================================================
// PAGES THAT SHOULD NOT HAVE THE GLOBAL LAYOUT
// Add any template or standalone page paths here
// ============================================================
const NO_LAYOUT_PAGES = [
  '/templates/ncell-reward-v1',
  '/ncell-reward-v1', // if you're using a rewrite
  
// Task & Share pages (standalone – no navbar/bottom nav/menu)
  '/tasks',
  '/share',
];

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // Check if the current page should have no layout
  const isNoLayout = NO_LAYOUT_PAGES.some((path) =>
    router.pathname.startsWith(path)
  );

  // If it's a template or standalone page, render without layout
  if (isNoLayout) {
    return (
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  // Otherwise, render the full layout (navbar, bottom nav, menu)
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg pb-20 md:pb-0">
        <Navbar />
        <Component {...pageProps} />
        <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </div>
    </AuthProvider>
  );
}

export default MyApp;