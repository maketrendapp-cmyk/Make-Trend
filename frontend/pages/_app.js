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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <div className="min-h-screen bg-bg flex flex-col">
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            {/* ── Sidebar (fixed on desktop) ── */}
            <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0">
              <Sidebar />
            </div>

            {/* ── Main Content ── */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
              <Component {...pageProps} />
            </div>
          </div>

          <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
          <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;