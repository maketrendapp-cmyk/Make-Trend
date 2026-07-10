import { useEffect, useState } from 'react';

const Loader = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-700">
      <h1 className="text-3xl font-bold text-primary tracking-tight">
        Make<span className="text-gray-900">Trend</span>
      </h1>
      <div className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="mt-4 text-sm text-gray-400">Loading experience...</p>
    </div>
  );
};

export default Loader;