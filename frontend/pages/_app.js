// frontend/pages/_app.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // List of pages where bottom nav should be hidden (optional)
  // const hideBottomNav = ['/auth/login', '/auth/register'];
  // const shouldHideBottomNav = hideBottomNav.includes(router.pathname);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg pb-20 md:pb-0">
        {/* Navbar - visible on all pages */}
        <Navbar />
        
        {/* Main page content */}
        <Component {...pageProps} />
        
        {/* Bottom Navigation - visible on all pages except auth pages */}
        <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
        
        {/* Slide-in Menu */}
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </div>
    </AuthProvider>
  );
}

export default MyApp;