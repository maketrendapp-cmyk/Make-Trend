// pages/_app.js
import { useState } from 'react';
import { AuthProvider } from '../components/AuthScreen';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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