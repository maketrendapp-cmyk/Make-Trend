
// pages/_app.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/AuthScreen';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import Sidebar from '../components/Sidebar';
import '../styles/globals.css';

// ── React Query client ──
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const NO_LAYOUT_PAGES = [
  '/templates/ncell-reward-v1',
  '/templates/student-scholarship-nepal-v1',
  '/templates/freefire-free-diamond-shop-v1',
  '/templates/freefire-exclusive-rewards-v1',
  '/templates/tonde-gamer-lucky-spin-v1',
  '/templates/youtube-booster-v1',
  '/ncell-reward-v1',
'/templates/pubg-uc-giveaway-v1',
'/templates/quiz-challenge-win-cash-v1',
'/templates/spin-win-daraz-discount-v1',
'/templates/lucky-draw-premium-prizes-v1',
'/templates/gaming-clip-contest',
'/templates/photography-contest',

  '/tasks',
  '/share',
];

const TOP_NAV_ONLY_PAGES = [
  '/about',
  '/rules',
  '/terms',
  '/privacy',
  '/follow',
  '/download',
  '/contact',
  '/login',
  '/signup',
];

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = router.pathname;

  const isNoLayout = NO_LAYOUT_PAGES.some((path) => pathname.startsWith(path));
  const isTopNavOnly = TOP_NAV_ONLY_PAGES.some((path) => pathname.startsWith(path));

  if (isNoLayout) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
          <Component {...pageProps} />
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  if (isTopNavOnly) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
          <div className="min-h-screen bg-bg">
            <Navbar />
            <Component {...pageProps} />
          </div>
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  // ── Full layout (default) ──
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        
        {/* CRITICAL FIX: The entire app wrapper is now strictly h-screen, no overflow allowed on the body */}
        <div className="h-screen bg-bg flex flex-col overflow-hidden">
          
          {/* Header stays locked at the top */}
          <div className="flex-shrink-0 z-40 relative">
            <Navbar />
          </div>

          {/* This wrapper holds the Sidebar and Main Content and splits the remaining height */}
          <div className="flex flex-1 overflow-hidden relative">
            
            {/* ── Sidebar (Fixed in place, matches remaining height exactly) ── */}
            <div className="hidden md:block flex-shrink-0 h-full z-30">
              <Sidebar />
            </div>

            {/* ── Main Content (This is the ONLY part that scrolls!) ── */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto pb-20 md:pb-0">
              <Component {...pageProps} />
            </div>
            
          </div>

          {/* ── Bottom Navigation (mobile) ── */}
          <div className="md:hidden flex-shrink-0 relative z-40">
            <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
          </div>

          <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
        
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;