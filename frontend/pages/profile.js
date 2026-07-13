// pages/profile.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import axios from 'axios';
import {
  FiSettings, FiLock, FiCreditCard, FiHelpCircle,
  FiShare2, FiLogOut, FiGrid, FiInfo, FiDownload, FiAlertCircle,
  FiBook, FiShield, FiUsers, FiEye, FiUnlock, FiTrendingUp
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalViews: 0,
    totalUnlocks: 0,
    totalShares: 0,
    totalCompletions: 0,
    activeCampaigns: 0,
    successfulCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Fetch user profile from /api/auth/me ──
  const fetchProfile = async () => {
    try {
      const token = await user.getIdToken();
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      console.log('📄 Profile response:', data); // DEBUG
      if (data.success && data.user) {
        setProfile({
          uid: data.user.uid || user.uid,
          username: data.user.username || data.user.email?.split('@')[0] || 'user',
          fullName: data.user.fullname || data.user.displayName || data.user.email || 'User',
          email: data.user.email || user.email,
          profilePic: data.user.avatar || data.user.photoURL || user.photoURL || null,
          isPro: data.user.plan === 'pro' || false,
          referrals: data.user.referrals || 0,
        });
      } else {
        // Fallback to Firebase Auth
        setProfile({
          uid: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'user',
          fullName: user.displayName || user.email || 'User',
          email: user.email,
          profilePic: user.photoURL || null,
          isPro: false,
          referrals: 0,
        });
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setProfile({
        uid: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'user',
        fullName: user.displayName || user.email || 'User',
        email: user.email,
        profilePic: user.photoURL || null,
        isPro: false,
        referrals: 0,
      });
    }
  };

  // ── Fetch campaigns and calculate stats manually ──
  const fetchCampaignsAndStats = async () => {
    try {
      const token = await user.getIdToken();
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      console.log('📊 Campaigns response:', data); // DEBUG
      const campaigns = data.campaigns || [];

      // Calculate stats manually (backend doesn't return aggregated stats)
      let totalCampaigns = 0;
      let totalViews = 0;
      let totalUnlocks = 0;
      let totalShares = 0;
      let totalCompletions = 0;
      let activeCampaigns = 0;
      let successfulCampaigns = 0;

      campaigns.forEach(c => {
        // Skip deleted campaigns (they should already be filtered, but just in case)
        if (c.status === 'deleted') return;
        totalCampaigns++;
        totalViews += c.views || 0;
        totalUnlocks += c.unlockCount || 0;   // field name from backend
        totalShares += c.shares || 0;
        totalCompletions += c.completions || 0;
        if (c.status === 'active') activeCampaigns++;
        // successful if shares >= shareCount (and shareCount > 0)
        if (c.shareCount > 0 && (c.shares || 0) >= c.shareCount) successfulCampaigns++;
      });

      setStats({
        totalCampaigns,
        totalViews,
        totalUnlocks,
        totalShares,
        totalCompletions,
        activeCampaigns,
        successfulCampaigns,
      });
    } catch (error) {
      console.error('Campaigns fetch error:', error);
      // Keep stats as zeros
    }
  };

  // ── Load both ──
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchProfile(), fetchCampaignsAndStats()])
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ── Display user ──
  const displayUser = profile || {
    username: 'guest',
    fullName: 'Guest User',
    email: user?.email || 'guest@example.com',
    profilePic: user?.photoURL || null,
    isPro: false,
    referrals: 0,
  };

  const statsItems = [
    { icon: FiTrendingUp, label: 'Campaigns Created', value: stats.totalCampaigns },
    { icon: FiEye, label: 'Total Views', value: stats.totalViews },
    { icon: FiUnlock, label: 'Total Unlocks', value: stats.totalUnlocks },
    { icon: FiUsers, label: 'Referrals', value: displayUser.referrals },
  ];

  // ── Quick Actions with better spacing ──
  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile' },
    { icon: FiLock, label: 'Change Password', href: '/change-password' },
    { icon: FiCreditCard, label: 'Billing & Subscription', href: '/billing' },
    { icon: FiHelpCircle, label: 'Support', href: '/support' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn' },
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
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
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Quick Actions (improved UI) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200">
                  <action.icon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </div>
              </Link>
            ))}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-red-600 border border-transparent hover:border-red-200"
            >
              <FiLogOut className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* ── Refer & Affiliates ── */}
        {user && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Refer & Affiliates</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiUsers className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Friend Referrals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : displayUser.referrals}
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

        {/* ── Explore ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Explore</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {exploreOptions.map((item, index) => (
              <Link key={index} href={item.href}>
                <div className="flex flex-col items-center gap-2 px-4 py-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200">
                  <item.icon className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Legal ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Framework</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {legalLinks.map((item, index) => (
              <Link key={index} href={item.href}>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200">
                  <item.icon className="w-5 h-5 text-gray-400" />
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
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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