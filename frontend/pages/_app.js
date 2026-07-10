// frontend/pages/_app.js
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import Menu from '../components/Menu';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // NO LOADER! Just render the app instantly.
  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-0">
      <Navbar />
      <Component {...pageProps} /> {/* Pages swap instantly here */}
      <BottomNav onMenuToggle={() => setIsMenuOpen(true)} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}

export default MyApp;