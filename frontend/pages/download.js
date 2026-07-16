// pages/download.js
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import Meta from '../components/Meta';
import {
  FiDownload,
  FiCheckCircle,
  FiInfo,
  FiArrowLeft,
  FiSmartphone,
  FiAlertCircle,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function Download() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info'); // 'info' | 'success' | 'error'
  const [platform, setPlatform] = useState('');

  // ── Detect platform ──
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(ua)) setPlatform('android');
    else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) setPlatform('ios');
    else if (/windows/i.test(ua)) setPlatform('windows');
    else setPlatform('other');
  }, []);

  // ── Check if already installed ──
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
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

    // When app is installed
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
    if (!deferredPrompt) {
      // If no prompt, show instructions
      setToastMessage('Open this page in Chrome or Edge to install the app.');
      setToastType('info');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
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
  }, [deferredPrompt]);

  // ── Get platform instructions ──
  const getInstructions = () => {
    if (isInstalled) return null;
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
        };
      default:
        return {
          title: '💻 Install on Desktop',
          steps: [
            'Open Chrome, Edge, or Firefox',
            'Look for the install icon (📥) in the address bar',
            'Click it and select "Install"',
            'Make Trend will be added to your apps list',
          ],
        };
    }
  };

  const instructions = getInstructions();

  return (
    <>
      <Meta
        title="Install Make Trend App"
        description="Install Make Trend on your device for a faster, offline-ready, native-like experience."
        image="https://maketrend.vercel.app/og-download.jpg"
        url="https://maketrend.vercel.app/download"
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* ── Header ── */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl shadow-lg mb-4">
              <FiDownload className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3">
              Install Make Trend
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get the best experience with our native-like app on your device.
              Faster, offline-ready, and always accessible.
            </p>
          </div>

          {/* ── Status Card ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 text-center">
            {isInstalled ? (
              <div className="flex items-center justify-center gap-3 text-green-600">
                <FiCheckCircle className="w-8 h-8" />
                <span className="text-lg font-bold">✓ App is already installed!</span>
              </div>
            ) : isInstallable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-purple-600">
                  <FiDownload className="w-8 h-8" />
                  <span className="text-lg font-bold">Ready to install!</span>
                </div>
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <FiDownload className="w-5 h-5" />
                  Install Now
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Tap the button above to add Make Trend to your home screen.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 text-gray-500">
                <FiInfo className="w-6 h-6" />
                <span className="text-sm">
                  {platform === 'ios'
                    ? 'Open this page in Safari to install'
                    : platform === 'android'
                    ? 'Open this page in Chrome to install'
                    : 'Your browser may not support installation'}
                </span>
              </div>
            )}
          </div>

          {/* ── Instructions (if not installed) ── */}
          {!isInstalled && instructions && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{instructions.title}</h2>
              <ol className="space-y-3 text-gray-700">
                {instructions.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── Features Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <FiSmartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900 text-sm">Native Feel</h3>
              <p className="text-xs text-gray-500">Full-screen, app-like experience</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <FiDownload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900 text-sm">Always Accessible</h3>
              <p className="text-xs text-gray-500">One tap from your home screen</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <FiCheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900 text-sm">Offline Ready</h3>
              <p className="text-xs text-gray-500">Works even without internet</p>
            </div>
          </div>

          {/* ── Back Button ── */}
          <div className="text-center">
            <Link href={user ? '/profile' : '/'}>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition shadow-sm">
                <FiArrowLeft className="w-4 h-4" />
                {user ? 'Back to Profile' : 'Back to Home'}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Toast / Bubble Notification ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div
              className={`
                flex items-center gap-3 p-4 rounded-2xl shadow-xl border
                ${
                  toastType === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : toastType === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }
              `}
            >
              <div className="flex-shrink-0">
                {toastType === 'success' && <FiCheckCircle className="w-6 h-6 text-green-600" />}
                {toastType === 'error' && <FiAlertCircle className="w-6 h-6 text-red-600" />}
                {toastType === 'info' && <FiInfo className="w-6 h-6 text-blue-600" />}
              </div>
              <p className="text-sm font-medium flex-1">{toastMessage}</p>
              <button
                onClick={() => setShowToast(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}