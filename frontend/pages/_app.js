// pages/_app.js
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/AuthScreen';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import Sidebar from '../components/Sidebar';
import { refreshDeviceId } from '../utils/deviceId'; // ✅ changed from getDeviceId
import '../styles/globals.css';

// ── Create Device ID Context ──
const DeviceIdContext = createContext(null);
export const useDeviceId = () => useContext(DeviceIdContext);

// ── React Query client ──
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
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
  '/templates/bgmi-tournament-registration',
  '/templates/',
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
'/groweachother',
'/productstrend',

];

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const router = useRouter();
  const pathname = router.pathname;

  // ── Generate Device ID in background ── (updated)
  useEffect(() => {
    console.log('🔄 Initializing device ID...');
    refreshDeviceId()
      .then((id) => {
        console.log('✅ Final device ID:', id);
        setDeviceId(id);
      })
      .catch((err) => {
        console.error('❌ Device ID error:', err);
        // Fallback – should not happen because generateFingerprint always returns something
        const fallback = 'fallback-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
        console.warn('⚠️ Using fallback ID:', fallback);
        setDeviceId(fallback);
      });
  }, []);

  const isNoLayout = NO_LAYOUT_PAGES.some((path) => pathname.startsWith(path));
  const isTopNavOnly = TOP_NAV_ONLY_PAGES.some((path) => pathname.startsWith(path));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DeviceIdContext.Provider value={deviceId}>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

          {isNoLayout ? (
            <Component {...pageProps} />
          ) : isTopNavOnly ? (
            <div className="min-h-screen bg-bg">
              <Navbar />
              <Component {...pageProps} />
            </div>
          ) : (
            <div className="h-screen bg-bg flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 z-40 relative">
                <Navbar />
              </div>

              {/* Main Content */}
              <div className="flex flex-1 overflow-hidden relative">
                <div className="hidden md:block flex-shrink-0 h-full z-30">
                  <Sidebar />
                </div>
                <div className="flex-1 min-w-0 h-full overflow-y-auto pb-20 md:pb-0">
                  <Component {...pageProps} />
                </div>
              </div>

              {/* Bottom Navigation (mobile) */}
              <div className="md:hidden flex-shrink-0 relative z-40">
                <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
              </div>

              <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            </div>
          )}

          <ReactQueryDevtools initialIsOpen={false} />
        </DeviceIdContext.Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;