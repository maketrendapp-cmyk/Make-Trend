// pages/_app.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../components/AuthScreen';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import Cookies from 'cookies';
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

// ── SSR: read token from cookie ──
MyApp.getInitialProps = async (ctx) => {
  let initialUser = null;
  const { req } = ctx.ctx; // ✅ FIX – correct nesting for _app.js

  if (req) {
    try {
      const cookies = new Cookies(req);
      const token = cookies.get('token') || null;

      if (token) {
        // Pass the token to the client for instant JWT decoding
        initialUser = { token };
      }
    } catch (err) {
      console.warn('Cookie read error:', err);
    }
  }

  return {
    initialUser,
    // ── Preserve any existing pageProps ──
    ...(ctx.ctx?.query || {}),
  };
};

function MyApp({ Component, pageProps, initialUser }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const pathname = router.pathname;

  // Check if current page matches any of the lists
  const isNoLayout = NO_LAYOUT_PAGES.some((path) => pathname.startsWith(path));
  const isTopNavOnly = TOP_NAV_ONLY_PAGES.some((path) => pathname.startsWith(path));

  // ── No layout (templates, tasks, share) ──
  if (isNoLayout) {
    return (
      <AuthProvider initialUser={initialUser}>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  // ── Top navbar only (about, rules, terms, privacy) ──
  if (isTopNavOnly) {
    return (
      <AuthProvider initialUser={initialUser}>
        <div className="min-h-screen bg-bg">
          <Navbar />
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    );
  }

  // ── Full layout (default) ──
  return (
    <AuthProvider initialUser={initialUser}>
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