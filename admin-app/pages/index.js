// admin-app/pages/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/Auth';
import {
  FiGrid,
  FiUsers,
  FiFileText,
  FiSettings,
  FiLogOut,
  FiUser,
  FiMail,
  FiHome,
  FiPlusCircle,
  FiDollarSign, // ← Added for withdrawals
} from 'react-icons/fi';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  // ── Redirect to login if not authenticated ──
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // ── Loading state ──
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  // ── Admin navigation items ──
  const navItems = [
    {
      icon: FiGrid,
      label: 'Templates',
      description: 'Manage all templates',
      href: '/admin/templates',
      color: 'purple',
    },
    {
      icon: FiUsers,
      label: 'Users',
      description: 'Manage users',
      href: '/admin/users',
      color: 'blue',
    },
    {
      icon: FiFileText,
      label: 'Campaigns',
      description: 'View all campaigns',
      href: '/admin/campaigns',
      color: 'green',
    },
    {
      icon: FiDollarSign, // ← New icon for withdrawals
      label: 'Withdrawals',
      description: 'Manage withdrawal requests',
      href: '/admin/withdrawrequest', // ← Path to your withdraw request page
      color: 'amber',
    },
    {
      icon: FiSettings,
      label: 'Settings',
      description: 'Site configuration',
      href: '/admin/settings',
      color: 'gray',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">MT</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Make Trend Dashboard</p>
              </div>
            </div>

            {/* User & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{user?.displayName || 'Admin'}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.displayName || 'Admin'} 👋
          </h2>
          <p className="text-gray-500 mt-1">Select a section below to manage your platform.</p>
        </div>

        {/* ── Navigation Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                group bg-white rounded-2xl shadow-sm border border-gray-200 
                p-6 text-left hover:shadow-lg transition-all duration-200 
                hover:-translate-y-1 hover:border-${item.color}-300
                relative overflow-hidden
              `}
            >
              {/* Decorative gradient overlay */}
              <div className={`
                absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-${item.color}-500 to-${item.color}-400
                opacity-0 group-hover:opacity-100 transition-opacity duration-300
              `} />

              <div className="relative">
                <div className={`
                  w-14 h-14 rounded-2xl bg-${item.color}-50 
                  flex items-center justify-center mb-4
                  group-hover:scale-110 transition-transform duration-300
                `}>
                  <item.icon className={`w-7 h-7 text-${item.color}-600`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Manage <span className="text-xs">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Quick Links ── */}
        <div className="mt-10 border-t border-gray-200 pt-8">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 hover:text-purple-600 transition"
            >
              <FiHome className="w-4 h-4" />
              Homepage
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => router.push('/admin/templates/new')}
              className="flex items-center gap-2 hover:text-purple-600 transition"
            >
              <FiPlusCircle className="w-4 h-4" />
              Create Template
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => router.push('/admin/withdrawrequest')}
              className="flex items-center gap-2 hover:text-amber-600 transition"
            >
              <FiDollarSign className="w-4 h-4" />
              Withdraw Requests
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          © {new Date().getFullYear()} Make Trend Admin Panel
        </div>
      </main>
    </div>
  );
}