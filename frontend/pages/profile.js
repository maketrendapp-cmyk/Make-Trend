// pages/profile.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import {
  FiSettings, FiLock, FiHelpCircle,
  FiShare2, FiGrid, FiInfo, FiDownload, FiAlertCircle,
  FiBook, FiShield, FiUsers, FiEye, FiUnlock, FiTrendingUp, FiCopy
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
  const [copySuccess, setCopySuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

  const copyReferralCode = () => {
    const code = profile?.referralCode || '';
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

  // ── Fetch profile ──
  const fetchProfile = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const url = `${API_BASE}/api/auth/me`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile({
          uid: data.user.uid || firebaseUser.uid,
          username: data.user.username || data.user.email?.split('@')[0] || 'user',
          fullName: data.user.fullname || data.user.displayName || data.user.email || 'User',
          email: data.user.email || firebaseUser.email,
          profilePic: data.user.avatar || data.user.photoURL || firebaseUser.photoURL || null,
          isPro: data.user.plan === 'pro' || false,
          referrals: data.user.referrals || 0,
          referralCode: data.user.referralCode || '',
        });
      } else {
        setProfile({
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user',
          fullName: firebaseUser.displayName || firebaseUser.email || 'User',
          email: firebaseUser.email,
          profilePic: firebaseUser.photoURL || null,
          isPro: false,
          referrals: 0,
          referralCode: '',
        });
      }
    } catch (error) {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        setProfile({
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user',
          fullName: firebaseUser.displayName || firebaseUser.email || 'User',
          email: firebaseUser.email,
          profilePic: firebaseUser.photoURL || null,
          isPro: false,
          referrals: 0,
          referralCode: '',
        });
      }
    }
  };

  // ── Fetch campaigns ──
  const fetchCampaignsStats = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const url = `${API_BASE}/api/campaigns`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (data.stats) {
          setStats(data.stats);
        } else {
          const campaigns = data.campaigns || [];
          let totalCampaigns = 0, totalViews = 0, totalUnlocks = 0,
              totalShares = 0, totalCompletions = 0, activeCampaigns = 0, successfulCampaigns = 0;
          campaigns.forEach(c => {
            if (c.status === 'deleted') return;
            totalCampaigns++;
            totalViews += c.views || 0;
            totalUnlocks += c.unlockCount || 0;
            totalShares += c.shares || 0;
            totalCompletions += c.completions || 0;
            if (c.status === 'active') activeCampaigns++;
            if (c.shareCount > 0 && (c.shares || 0) >= c.shareCount) successfulCampaigns++;
          });
          setStats({ totalCampaigns, totalViews, totalUnlocks, totalShares, totalCompletions, activeCampaigns, successfulCampaigns });
        }
      }
    } catch (error) {
      // silent fail
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
      if (firebaseUser) {
        setLoading(true);
        Promise.all([fetchProfile(), fetchCampaignsStats()])
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      router.push('/');
    } catch (error) {
      // silent
    }
  };

  const displayUser = profile || {
    username: 'guest',
    fullName: 'Guest User',
    email: auth.currentUser?.email || 'guest@example.com',
    profilePic: auth.currentUser?.photoURL || null,
    isPro: false,
    referrals: 0,
    referralCode: '',
  };

  const statsItems = [
    { icon: FiTrendingUp, label: 'Campaigns Created', value: stats.totalCampaigns },
    { icon: FiEye, label: 'Total Views', value: stats.totalViews },
    { icon: FiUnlock, label: 'Total Unlocks', value: stats.totalUnlocks },
    { icon: FiUsers, label: 'Referrals', value: displayUser.referrals },
  ];

  // Updated Quick Actions (removed Billing & Logout)
  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile' },
    { icon: FiLock, label: 'Change Password', href: '/change-password' },
    { icon: FiHelpCircle, label: 'Support', href: '/support' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn' },
  ];

  // Explore: replaced "Platform" with "Follow Us"
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

  // ===== SKELETON LOADER =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-200" />
              <div className="flex-1 text-center sm:text-left w-full">
                <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
              <div className="w-24 h-10 bg-gray-200 rounded-lg" />
            </div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center animate-pulse">
                <div className="flex justify-center mb-2">
                  <div className="w-6 h-6 bg-gray-200 rounded" />
                </div>
                <div className="h-7 w-12 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-3 w-20 bg-gray-200 rounded mx-auto" />
              </div>
            ))}
          </div>

          {/* Quick Actions skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Refer & Affiliates skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-200 rounded" />
                <div>
                  <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
                  <div className="h-7 w-12 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="w-24 h-10 bg-gray-200 rounded-lg" />
            </div>
          </div>

          {/* Explore skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Legal skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER ACTUAL PAGE =====
  return (
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
              {auth.currentUser && (
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

              {!auth.currentUser && <p className="text-sm text-gray-400 mt-2">Sign in to access your dashboard</p>}
            </div>

            {!auth.currentUser ? (
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
        {auth.currentUser && (
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
        {auth.currentUser && (
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
  );
}