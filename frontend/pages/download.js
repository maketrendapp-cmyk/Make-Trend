// pages/download.js
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import Meta from '../components/Meta';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  FiDownload,
  FiCheckCircle,
  FiInfo,
  FiArrowLeft,
  FiSmartphone,
  FiAlertCircle,
  FiChrome,
  FiHeart,
  FiZap,
  FiShield,
  FiStar,
} from 'react-icons/fi';

export default function Download() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [platform, setPlatform] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [installCheckDone, setInstallCheckDone] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.5]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  // ── Detect platform and browser support ──
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/android/i.test(ua)) setPlatform('android');
    else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) setPlatform('ios');
    else if (/windows/i.test(ua)) setPlatform('windows');
    else if (/mac/i.test(ua)) setPlatform('mac');
    else setPlatform('other');

    const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua);
    const isEdge = /edg/i.test(ua);
    const isSamsung = /samsung/i.test(ua);
    const isSupportedBrowser = isChrome || isEdge || isSamsung;
    
    setIsSupported(isSupportedBrowser);
    setInstallCheckDone(true);
  }, []);

  // ── Check if already installed ──
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    setIsInstalled(isStandalone);
  }, []);

  // ── Listen for PWA install prompt ──
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setToastMessage('🎉 Make Trend is now installed on your device!');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // ── Install handler ──
  const handleInstall = useCallback(async () => {
    if (isInstalled) {
      setToastMessage('✅ App is already installed!');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    if (!deferredPrompt) {
      if (isSupported) {
        setToastMessage('Install prompt not available. Try refreshing the page.');
        setToastType('info');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      } else {
        setToastMessage('Open this page in Chrome or Edge to install the app.');
        setToastType('info');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
      return;
    }

    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setToastMessage('✅ Make Trend is now installed on your device!');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      } else {
        setToastMessage('Installation cancelled. You can try again anytime.');
        setToastType('info');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install error:', err);
      setToastMessage('Something went wrong. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  }, [deferredPrompt, isSupported, isInstalled]);

  // ── Get platform instructions ──
  const getInstructions = () => {
    if (isInstalled) return null;
    
    if (!isSupported) {
      return {
        title: '🌐 Browser Not Supported',
        description: 'Installation is only available in Chrome, Edge, or Samsung Internet.',
        steps: [
          'Open this page in Google Chrome or Microsoft Edge',
          'Look for the install icon (📥) in the address bar',
          'Click it and select "Install"',
        ],
        showDownloadLink: true,
        icon: <FiChrome className="w-6 h-6" />,
      };
    }

    switch (platform) {
      case 'android':
        return {
          title: '📱 Install on Android',
          steps: [
            'Open Chrome browser',
            'Tap the "Add to Home Screen" banner at the bottom',
            'Or tap the menu (⋮) → "Install app"',
            'Tap "Install" to add to your home screen',
          ],
          icon: <FiSmartphone className="w-6 h-6" />,
        };
      case 'ios':
        return {
          title: '📱 Install on iPhone/iPad',
          steps: [
            'Open Safari browser',
            'Tap the Share button (📤) at the bottom',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" – the app will appear on your home screen',
          ],
          icon: <FiSmartphone className="w-6 h-6" />,
        };
      case 'windows':
        return {
          title: '💻 Install on Windows',
          steps: [
            'Open Chrome or Edge browser',
            'Look for the install icon (📥) in the address bar',
            'Click it and select "Install"',
            'Make Trend will be added to your apps list',
          ],
          icon: <FiDownload className="w-6 h-6" />,
        };
      case 'mac':
        return {
          title: '💻 Install on Mac',
          steps: [
            'Open Chrome or Edge browser',
            'Look for the install icon (📥) in the address bar',
            'Click it and select "Install"',
            'The app will appear in your Applications folder',
          ],
          icon: <FiDownload className="w-6 h-6" />,
        };
      default:
        return {
          title: '💻 Install on Your Device',
          steps: [
            'Open Chrome or Edge browser',
            'Look for the install icon in the address bar',
            'Click it and follow the prompts',
          ],
          icon: <FiDownload className="w-6 h-6" />,
        };
    }
  };

  const instructions = getInstructions();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    hover: {
      y: -8,
      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      transition: { duration: 0.3 },
    },
  };

  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  // ── Loading state ──
  if (!installCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <>
      <Meta
        title="Install Make Trend App"
        description="Install Make Trend on your device for a faster, offline-ready, native-like experience."
        image="https://maketrend.vercel.app/og-download.jpg"
        url="https://maketrend.vercel.app/download"
      />

      <div ref={sectionRef} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-hidden">
        
        {/* ── Hero Section ── */}
        <motion.div 
          style={{ opacity, scale }}
          className="relative overflow-hidden pt-12 pb-8 px-4 sm:px-6"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
          
          <div className="max-w-4xl mx-auto text-center relative">
            <motion.div
              animate={floatAnimation}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl shadow-2xl mb-6"
            >
              <FiDownload className="w-12 h-12 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-6xl font-extrabold text-gray-900 mb-4"
            >
              Install{' '}
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Make Trend
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Get the best experience with our native-like app on your device.
              Faster, offline-ready, and always accessible.
            </motion.p>
          </div>
        </motion.div>

        {/* ── Main Content ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto px-4 sm:px-6 pb-12"
        >
          
          {/* ── Status Card ── */}
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8 mb-8 text-center"
          >
            {isInstalled ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-green-600">✓ App is already installed!</span>
                <p className="text-sm text-gray-500">You're all set. Enjoy using Make Trend!</p>
                <Link href="/">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
                  >
                    Go to Home
                  </motion.button>
                </Link>
              </motion.div>
            ) : isInstallable ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                    <FiDownload className="w-8 h-8 text-purple-600" />
                  </div>
                  <span className="text-2xl font-bold text-purple-600">Ready to install!</span>
                </div>
                
                <motion.button
                  onHoverStart={() => setIsHovered(true)}
                  onHoverEnd={() => setIsHovered(false)}
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstall}
                  className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg transition-all text-lg"
                >
                  <motion.div
                    animate={isHovered ? { x: 5 } : { x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiDownload className="w-6 h-6" />
                  </motion.div>
                  Install Now
                </motion.button>
                
                <p className="text-sm text-gray-400">
                  Tap the button above to add Make Trend to your home screen.
                </p>
              </motion.div>
            ) : isSupported ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                    <FiInfo className="w-8 h-8 text-amber-600" />
                  </div>
                  <span className="text-lg font-semibold text-amber-600">Install prompt not showing?</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstall}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
                >
                  <FiDownload className="w-4 h-4" />
                  Try Installing
                </motion.button>
                <p className="text-sm text-gray-400">
                  If nothing happens, try refreshing the page.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiAlertCircle className="w-10 h-10 text-blue-600" />
                </div>
                <span className="text-lg font-semibold text-gray-700">
                  Open this page in <strong className="text-blue-600">Chrome</strong> or <strong className="text-blue-600">Edge</strong> to install
                </span>
                <p className="text-sm text-gray-400">
                  These browsers support app installation on your device.
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* ── Instructions ── */}
          {!isInstalled && instructions && (
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8 mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">
                  {instructions.icon || '📱'}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{instructions.title}</h2>
              </div>
              
              {instructions.description && (
                <p className="text-gray-600 text-sm mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  {instructions.description}
                </p>
              )}
              
              <ol className="space-y-4 text-gray-700">
                {instructions.steps.map((step, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </motion.li>
                ))}
              </ol>
              
              {instructions.showDownloadLink && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                >
                  <div className="flex items-center gap-3 text-blue-700">
                    <FiChrome className="w-6 h-6" />
                    <span className="text-sm font-medium">
                      Download Chrome from the official store to install apps.
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Features Grid ── */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {[
              { icon: <FiSmartphone className="w-6 h-6" />, title: "Native Feel", desc: "Full-screen, app-like experience" },
              { icon: <FiZap className="w-6 h-6" />, title: "Lightning Fast", desc: "Optimized for speed and performance" },
              { icon: <FiShield className="w-6 h-6" />, title: "Secure & Private", desc: "Your data is always protected" },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                whileHover="hover"
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-6 text-center shadow-lg"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mx-auto mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Back Button ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <Link href={user ? '/profile' : '/'}>
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-white hover:border-gray-300 transition shadow-lg"
              >
                <FiArrowLeft className="w-4 h-4" />
                {user ? 'Back to Profile' : 'Back to Home'}
              </motion.button>
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* ── Toast / Bubble Notification ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 300 
            }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div
              className={`
                flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md
                ${
                  toastType === 'success'
                    ? 'bg-green-50/90 border-green-200 text-green-800'
                    : toastType === 'error'
                    ? 'bg-red-50/90 border-red-200 text-red-800'
                    : 'bg-blue-50/90 border-blue-200 text-blue-800'
                }
              `}
            >
              <div className="flex-shrink-0">
                {toastType === 'success' && <FiCheckCircle className="w-6 h-6 text-green-600" />}
                {toastType === 'error' && <FiAlertCircle className="w-6 h-6 text-red-600" />}
                {toastType === 'info' && <FiInfo className="w-6 h-6 text-blue-600" />}
              </div>
              <p className="text-sm font-medium flex-1">{toastMessage}</p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowToast(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}