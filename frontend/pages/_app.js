// pages/_app.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/AuthScreen';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import '../styles/globals.css';

// ============================================================
// PAGES WITH NO LAYOUT AT ALL (standalone pages)
// ============================================================
const NO_LAYOUT_PAGES = [
  '/templates/ncell-reward-v1',
  '/ncell-reward-v1',
  '/tasks',
  '/share',
];

// ============================================================
// PAGES WITH ONLY TOP NAVBAR (no bottom nav, no menu)
// ============================================================
const TOP_NAV_ONLY_PAGES = [
  '/about',
  '/rules',
  '/terms',
  '/privacy',
  '/follow',
  '/download',
  '/contact',
  '/login',
];

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = router.pathname;


  const isNoLayout = NO_LAYOUT_PAGES.some((path) => pathname.startsWith(path));
  const isTopNavOnly = TOP_NAV_ONLY_PAGES.some((path) => pathname.startsWith(path));

  // ── No layout (templates, tasks, share) ──
  if (isNoLayout) {
    return (
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  // ── Top navbar only (about, rules, terms, privacy) ──
  if (isTopNavOnly) {
    return (
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <div className="min-h-screen bg-bg">
          <Navbar />
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    );
  }

  // ── Full layout (default) ──
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
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