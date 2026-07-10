// frontend/pages/profile.js
import { useState, useEffect } from 'react';
import Meta from '../components/Meta';
import AuthScreen from '../components/AuthScreen';

export default function Profile() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check auth status (replace with Firebase later)
    setIsLoggedIn(false);
  }, []);

  if (!isLoggedIn) {
    return (
      <>
        <Meta title="Profile" description="Manage your account." />
        <AuthScreen 
          onLogin={(email, password) => {
            console.log('Login:', email, password);
            setIsLoggedIn(true);
          }}
          onRegister={(email, password, fullname, username) => {
            console.log('Register:', email, password, fullname, username);
            setIsLoggedIn(true);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Meta title="Profile" description="Manage your account." />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-border sm:p-8">
          {/* Profile content */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl text-primary font-bold">
              JD
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">John Doe</h1>
              <p className="text-sm text-gray-500">john@example.com</p>
              <span className="mt-1 inline-block rounded-full bg-green-50 px-3 py-0.5 text-xs font-medium text-green-600 border border-green-200">
                Pro Plan
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-bg p-4">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">12</p>
              <p className="text-xs text-gray-500">Campaigns</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">4.2k</p>
              <p className="text-xs text-gray-500">Unlocks</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">87%</p>
              <p className="text-xs text-gray-500">Success Rate</p>
            </div>
          </div>

          <div className="mt-8 space-y-1">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Account Settings</h3>
            {['Edit Profile', 'Change Password', 'Billing & Subscription'].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{['👤', '🔐', '💳'][idx]}</span>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            ))}
            <div className="border-t border-border my-3" />
            <div className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-red-50 cursor-pointer transition">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚪</span>
                <span className="text-sm text-red-600 font-medium">Logout</span>
              </div>
              <span className="text-red-400">›</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}