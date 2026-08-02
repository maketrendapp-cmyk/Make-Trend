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
import { refreshDeviceId } from '../utils/deviceId'; // still exported
import '../styles/globals.css';

const DeviceIdContext = createContext(null);
export const useDeviceId = () => useContext(DeviceIdContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ... (NO_LAYOUT_PAGES and TOP_NAV_ONLY_PAGES remain unchanged) ...

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const router = useRouter();
  const pathname = router.pathname;

  // ── Start fingerprint generation in the background ──
  useEffect(() => {
    refreshDeviceId()
      .then((id) => {
        setDeviceId(id);
        console.log('🆔 Device ID ready:', id);
      })
      .catch(() => {
        // Fallback – shouldn't happen as generateFingerprint always returns something
        const fallback = 'fallback-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
        setDeviceId(fallback);
      });
  }, []);

  // ── No loading screen – render immediately ──
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
              <div className="flex-shrink-0 z-40 relative">
                <Navbar />
              </div>
              <div className="flex flex-1 overflow-hidden relative">
                <div className="hidden md:block flex-shrink-0 h-full z-30">
                  <Sidebar />
                </div>
                <div className="flex-1 min-w-0 h-full overflow-y-auto pb-20 md:pb-0">
                  <Component {...pageProps} />
                </div>
              </div>
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