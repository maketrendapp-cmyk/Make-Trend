// pages/profile.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import {
  FiSettings, FiLock, FiHelpCircle,
  FiShare2, FiLogOut, FiGrid, FiInfo, FiDownload, FiAlertCircle,
  FiBook, FiShield, FiUsers, FiEye, FiUnlock, FiTrendingUp, FiCopy
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import Meta from '../components/Meta';

export default function Profile() {
  const router = useRouter();
  const { user, logout, profile: contextProfile, stats, dataLoaded } = useAuth();
  const [loading, setLoading] = useState(!dataLoaded);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const copyReferralCode = () => {
    const code = contextProfile?.referralCode || '';
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopySuccess('✅ Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess('✅ Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  // ── profile and stats are already loaded from AuthContext ──
  useEffect(() => {
    if (dataLoaded) {
      setLoading(false);
    }
  }, [dataLoaded]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      router.push('/');
    } catch (error) {
      // silent
    }
  };

  const displayUser = {
    username: contextProfile?.username || 'guest',
    fullName: contextProfile?.fullname || contextProfile?.name || 'Guest User',
    email: contextProfile?.email || 'guest@example.com',
    profilePic: contextProfile?.avatar || contextProfile?.profilePic || null,
    isPro: contextProfile?.plan === 'pro' || false,
    referrals: contextProfile?.referrals || 0,
    referralCode: contextProfile?.referralCode || '',
  };

  const statsItems = [
    { icon: FiTrendingUp, label: 'Campaigns Created', value: stats.totalCampaigns || 0 },
    { icon: FiEye, label: 'Total Views', value: stats.totalViews || 0 },
    { icon: FiUnlock, label: 'Total Unlocks', value: stats.totalUnlocks || 0 },
    { icon: FiUsers, label: 'Referrals', value: displayUser.referrals },
  ];

  // ✅ Quick Actions
  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile' },
    { icon: FiLock, label: 'Change Password', href: '/change-password' },
    { icon: FiHelpCircle, label: 'Support', href: '/support' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn' },
  ];

  // ✅ Explore
  const exploreOptions = [
    { icon: FiGrid, label: 'Follow Us', href: '/follow' },
    { icon: FiInfo, label: 'About Make Trend', href: '/about' },
    { icon: FiDownload, label: 'Download App', href: '/download' },
    { icon: FiAlertCircle, label: 'Rules to Follow', href: '/rules' },
  ];

  const legalLinks = [
    { icon: FiBook, label: 'Terms & Conditions', href: '/terms' },
    { icon: FiShield, label: 'Privacy Policy', href: '/privacy' },
  ];

  // ── Skeleton Loader (show only if data not loaded yet) ──
  if (loading || !dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ... skeleton unchanged ... */}
        </div>
      </div>
    );
  }

  // ── Actual Page ──
  return (
    <>
      <Meta
        title="Profile | Make Trend"
        description="Manage your profile, view your campaigns, and track your performance on Make Trend."
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Profile Header ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                  {displayUser.profilePic ? (
                    <img src={displayUser.profilePic} alt={displayUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    displayUser.fullName?.charAt(0).toUpperCase() || 'G'
                  )}
                </div>
                {displayUser.isPro && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-lg">
                    <FaCrown className="text-white text-sm" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {displayUser.fullName || displayUser.username || 'Guest User'}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    displayUser.isPro ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {displayUser.isPro ? 'PRO' : 'FREE'}
                  </span>
                </div>
                <p className="text-gray-500">@{displayUser.username || 'guest'}</p>
                <p className="text-gray-400 text-sm">{displayUser.email}</p>

                {/* ── Referral Code ── */}
                {user && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">Referral Code:</span>
                    {displayUser.referralCode ? (
                      <>
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {displayUser.referralCode}
                        </span>
                        <button
                          onClick={copyReferralCode}
                          className="text-purple-600 hover:text-purple-800 transition flex items-center gap-1 text-xs"
                        >
                          <FiCopy className="w-3.5 h-3.5" />
                          {copySuccess || 'Copy'}
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">No code yet</span>
                    )}
                  </div>
                )}

                {!user && <p className="text-sm text-gray-400 mt-2">Sign in to access your dashboard</p>}
              </div>

              {!user ? (
                <Link href="/login">
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                    Login
                  </button>
                </Link>
              ) : (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="px-6 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <FiLogOut className="w-4 h-4" />
                  Logout
                </button>
              )}
            </div>
          </div>

          {/* ── Stats Grid ── */}
          {user && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {statsItems.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200 hover:shadow-sm group">
                    <action.icon className="w-5 h-5 text-purple-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Refer & Affiliates ── */}
          {user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Refer & Affiliates</h2>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FiUsers className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Friend Referrals</p>
                    <p className="text-2xl font-bold text-gray-900">{displayUser.referrals}</p>
                  </div>
                </div>
                <Link href="/refer-earn">
                  <button className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors">
                    Invite Friends
                  </button>
                </Link>
              </div>
              {displayUser.referralCode && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Your Referral Code:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-3 py-1 rounded border border-gray-300 font-mono text-sm">
                      {displayUser.referralCode}
                    </code>
                    <button
                      onClick={copyReferralCode}
                      className="text-purple-600 hover:text-purple-800 transition flex items-center gap-1 text-sm"
                    >
                      <FiCopy className="w-4 h-4" />
                      {copySuccess || 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Explore ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Explore</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {exploreOptions.map((item, index) => (
                <Link key={index} href={item.href}>
                  <div className="flex flex-col items-center gap-2 px-4 py-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200 hover:shadow-sm group">
                    <item.icon className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-700 text-center group-hover:text-gray-900">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Legal ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Framework</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {legalLinks.map((item, index) => (
                <Link key={index} href={item.href}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200 hover:shadow-sm">
                    <item.icon className="w-5 h-5 text-gray-400 group-hover:text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Logout Modal ── */}
          {showLogoutModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Yes, Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}