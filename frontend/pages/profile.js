// pages/profile.js

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserAuth } from '../components/UserContext';
import axios from 'axios';
import { FiUser, FiSettings, FiLock, FiCreditCard, FiHelpCircle, FiShare2, FiLogOut, FiGrid, FiInfo, FiDownload, FiAlertCircle, FiBook, FiShield, FiUsers, FiEye, FiUnlock, FiTrendingUp } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useUserAuth();
  const [campaignStats, setCampaignStats] = useState({
    total: 0,
    views: 0,
    unlocks: 0,
    referrals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch user campaign stats
  useEffect(() => {
    if (user) {
      fetchUserStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const campaigns = response.data.campaigns || [];
      const totalViews = campaigns.reduce((sum, c) => sum + (c.views || 0), 0);
      const totalUnlocks = campaigns.reduce((sum, c) => sum + (c.unlocks || 0), 0);
      const totalReferrals = campaigns.reduce((sum, c) => sum + (c.referrals || 0), 0);

      setCampaignStats({
        total: campaigns.length,
        views: totalViews,
        unlocks: totalUnlocks,
        referrals: totalReferrals,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Dummy user data if not logged in
  const displayUser = user || {
    displayName: 'Guest User',
    email: 'guest@example.com',
    photoURL: null,
    isPro: false,
  };

  // Navigation items
  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile', color: 'blue' },
    { icon: FiLock, label: 'Change Password', href: '/change-password', color: 'purple' },
    { icon: FiCreditCard, label: 'Billing & Subscription', href: '/billing', color: 'green' },
    { icon: FiHelpCircle, label: 'Support', href: '/support', color: 'red' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn', color: 'orange' },
    { icon: FiLogOut, label: 'Logout', href: '#', color: 'gray', action: true },
  ];

  const exploreOptions = [
    { icon: FiGrid, label: 'Platform', href: '/platform' },
    { icon: FiInfo, label: 'About Make Trend', href: '/about' },
    { icon: FiDownload, label: 'Download App', href: '/download' },
    { icon: FiAlertCircle, label: 'Rules to Follow', href: '/rules' },
  ];

  const legalLinks = [
    { icon: FiBook, label: 'Terms & Conditions', href: '/terms' },
    { icon: FiShield, label: 'Privacy Policy', href: '/privacy' },
  ];

  const userStats = [
    { icon: FiTrendingUp, label: 'Campaigns Created', value: campaignStats.total },
    { icon: FiEye, label: 'Total Views', value: campaignStats.views },
    { icon: FiUnlock, label: 'Total Unlocks', value: campaignStats.unlocks },
    { icon: FiUsers, label: 'Referrals', value: campaignStats.referrals },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                {displayUser.photoURL ? (
                  <img
                    src={displayUser.photoURL}
                    alt={displayUser.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayUser.displayName?.charAt(0).toUpperCase() || 'G'
                )}
              </div>
              {displayUser.isPro && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-lg">
                  <FaCrown className="text-white text-sm" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <h1 className="text-2xl font-bold text-gray-900">
                  {displayUser.displayName || 'Guest User'}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  displayUser.isPro 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {displayUser.isPro ? 'PRO' : 'FREE'}
                </span>
              </div>
              <p className="text-gray-500 mt-1">{displayUser.email || 'guest@example.com'}</p>
              {!user && (
                <p className="text-sm text-gray-400 mt-2">Sign in to access your dashboard</p>
              )}
            </div>

            {/* Login/Logout Button */}
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

        {/* Stats Grid */}
        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {userStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="flex justify-center mb-2">
                  <stat.icon className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <div key={index}>
                {action.action ? (
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <action.icon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {action.label}
                    </span>
                  </button>
                ) : (
                  <Link href={action.href}>
                    <div className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors group cursor-pointer">
                      <action.icon className={`w-5 h-5 text-${action.color}-400 group-hover:text-${action.color}-600`} />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {action.label}
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Refer & Affiliates (Logged In Only) */}
        {user && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Refer & Affiliates</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiUsers className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Friend Referrals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : campaignStats.referrals}
                  </p>
                </div>
              </div>
              <Link href="/refer-earn">
                <button className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors">
                  Invite Friends
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Explore Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Explore</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {exploreOptions.map((item, index) => (
              <Link key={index} href={item.href}>
                <div className="flex flex-col items-center gap-2 px-4 py-4 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer">
                  <item.icon className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700 text-center">
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Legal Framework */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Framework</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {legalLinks.map((item, index) => (
              <Link key={index} href={item.href}>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer">
                  <item.icon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to log out of your account?
              </p>
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
  );
}