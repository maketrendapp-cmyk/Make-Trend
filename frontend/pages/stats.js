// frontend/pages/stats.js
import { useState, useEffect } from 'react';
import Meta from '../components/Meta';
import AuthScreen from '../components/AuthScreen';

export default function Stats() {
  // Mock auth state - replace with Firebase later
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // For demo: Show auth screen after 1 second if not logged in
  useEffect(() => {
    // Check if user is logged in (we'll connect Firebase later)
    const checkAuth = () => {
      // For now, always show false to test auth screen
      setIsLoggedIn(false);
    };
    checkAuth();
  }, []);

  // If not logged in, show AuthScreen
  if (!isLoggedIn) {
    return (
      <>
        <Meta title="Analytics" description="Track your campaign performance." />
        <AuthScreen 
          onLogin={(email, password) => {
            console.log('Login:', email, password);
            // We'll connect Firebase later
            setIsLoggedIn(true);
          }}
          onRegister={(email, password, fullname, username) => {
            console.log('Register:', email, password, fullname, username);
            // We'll connect Firebase later
            setIsLoggedIn(true);
          }}
        />
      </>
    );
  }

  // If logged in, show the actual stats page
  return (
    <>
      <Meta title="Analytics" description="Track your campaign performance." />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📊 Analytics</h1>
        
        {/* Stats grid - same as before */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Campaigns', value: '24', change: '+12%', icon: '📊' },
            { label: 'Total Unlocks', value: '8,423', change: '+23%', icon: '🚀' },
            { label: 'Total Views', value: '15.2k', change: '+18%', icon: '👁️' },
            { label: 'Conversion Rate', value: '68%', change: '+5%', icon: '🎯' },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-xl bg-white p-4 shadow-sm border border-border">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <span className="mt-1 inline-block text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                {stat.change}
              </span>
            </div>
          ))}
        </div>

        {/* Activity Graph */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm border border-border">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Unlocks (Last 7 Days)</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {[40, 65, 45, 80, 70, 95, 60].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded bg-primary/20 transition hover:bg-primary/40"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-gray-400">Day {i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}