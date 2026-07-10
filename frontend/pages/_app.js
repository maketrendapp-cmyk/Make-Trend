// frontend/pages/_app.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Loader from '../components/Loader';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // Initial loader
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Route change loader
  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setTimeout(() => setLoading(false), 300);
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      {loading && <Loader />}
      
      <div className="min-h-screen bg-bg pb-20 md:pb-0"> {/* pb-20 adds space for bottom nav on mobile */}
        <Navbar />
        <Component {...pageProps} />
        
        {/* Bottom Navigation - Only visible on mobile */}
        <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
        
        {/* Menu Overlay */}
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </div>
    </>
  );
}

export default MyApp;