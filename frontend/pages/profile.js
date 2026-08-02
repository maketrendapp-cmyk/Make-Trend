// pages/profile.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import { useProfile, useStats, useMtCoins, useInvalidateQueries } from '../lib/queries';
import {
  FiSettings, FiLock, FiHelpCircle,
  FiShare2, FiLogOut, FiGrid, FiInfo, FiDownload, FiAlertCircle,
  FiBook, FiShield, FiUsers, FiEye, FiUnlock, FiTrendingUp, FiCopy,
  FiGift
} from 'react-icons/fi';
import { FaCrown, FaWallet, FaCoins } from 'react-icons/fa';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

export default function Profile() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile(isAuthenticated);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats(isAuthenticated);
  const { data: mtCoins, isLoading: mtCoinsLoading, refetch: refetchMtCoins } = useMtCoins(isAuthenticated);
  const { invalidateProfile, invalidateStats } = useInvalidateQueries();

  // ── Daily Bonus State ──
  const [bonusStatus, setBonusStatus] = useState({ canClaim: false, nextClaimTime: null, bonusAmount: 10 });
  const [bonusLoading, setBonusLoading] = useState(true);
  const [bonusError, setBonusError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  // ── Helper: get Firebase token (waits for auth to be ready) ──
  const getToken = async () => {
    await auth.authStateReady(); // ✅ Wait for Firebase to initialize
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    return await firebaseUser.getIdToken();
  };

  // ── Fetch bonus status ──
  const fetchBonusStatus = async () => {
    if (!isAuthenticated) return;
    try {
      setBonusLoading(true);
      const token = await getToken();
      if (!token) {
        setBonusError('Not authenticated');
        setBonusLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/daily-bonus/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBonusStatus({
          canClaim: data.canClaim,
          nextClaimTime: data.nextClaimTime,
          bonusAmount: data.bonusAmount || 10,
        });
        setBonusError('');
      } else {
        setBonusError(data.error || 'Failed to load bonus status');
      }
    } catch (err) {
      console.error('Bonus status error:', err);
      setBonusError('Network error');
    } finally {
      setBonusLoading(false);
    }
  };

  // ── Claim bonus ──
  const claimBonus = async () => {
    if (!isAuthenticated || !bonusStatus.canClaim) return;
    try {
      setClaimLoading(true);
      const token = await getToken();
      if (!token) {
        setBonusError('Not authenticated');
        setClaimLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/daily-bonus/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await refetchMtCoins();
        await fetchBonusStatus();
        alert(`🎉 Claimed ${data.bonus} MT Coins!`);
      } else {
        setBonusError(data.error || 'Failed to claim bonus');
      }
    } catch (err) {
      console.error('Claim bonus error:', err);
      setBonusError('Network error');
    } finally {
      setClaimLoading(false);
    }
  };

  // ── Force refetch when user changes (waits for auth) ──
  useEffect(() => {
    const init = async () => {
      await auth.authStateReady(); // ✅ Wait for Firebase to initialize
      if (isAuthenticated) {
        invalidateProfile();
        invalidateStats();
        refetchProfile();
        refetchStats();
        refetchMtCoins();
        fetchBonusStatus();
      }
    };
    init();
  }, [isAuthenticated]); // removed user?.uid dependency

  // ── Copy referral code ──
  const copyReferralCode = () => {
    const code = profile?.referralCode || '';
    if (!code) return;
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopySuccess('✅ Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(() => {
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

  // ── Handle logout ──
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      router.push('/');
    } catch (error) {
      // silent
    }
  };

  // ── Display user with safe fallbacks ──
  const displayUser = {
    username: profile?.username || 'guest',
    fullName: profile?.fullname || profile?.fullName || profile?.name || 'Guest User',
    email: profile?.email || 'guest@example.com',
    profilePic: profile?.avatar || profile?.profilePic || null,
    isPro: profile?.plan === 'pro' || profile?.plan?.toLowerCase() === 'pro' || false,
    plan: profile?.plan || 'free',
    referrals: profile?.referrals || 0,
    referralCode: profile?.referralCode || '',
  };

  const statsItems = [
    { icon: FiTrendingUp, label: 'Campaigns Created', value: stats?.totalCampaigns ?? 0 },
    { icon: FiEye, label: 'Total Views', value: stats?.totalViews ?? 0 },
    { icon: FiUnlock, label: 'Total Unlocks', value: stats?.totalUnlocks ?? 0 },
    { icon: FiUsers, label: 'Referrals', value: profile?.referrals || 0 },
  ];

  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile' },
    { icon: FiLock, label: 'Change Password', href: '/change-password' },
    { icon: FiHelpCircle, label: 'Support', href: '/support' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn' },
    { icon: FaCoins, label: 'Earn MT Coins', href: '/earncash' },
    { icon: FaWallet, label: 'Withdraw', href: isAuthenticated ? '/withdraw' : '/login?redirect=/withdraw' },
  ];

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

  const isLoading = profileLoading || statsLoading || mtCoinsLoading || (isAuthenticated && !profile);

  // ── Skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
          <div className="bg-white rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-40" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl p-4 h-24 bg-gray-200" />)}
          </div>
          <div className="bg-white rounded-2xl p-6 mt-6 h-20 bg-gray-200" />
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
                    {displayUser.isPro ? '👑 PRO' : 'FREE'}
                  </span>
                </div>
                <p className="text-gray-500">@{displayUser.username || 'guest'}</p>
                <p className="text-gray-400 text-sm">{displayUser.email}</p>

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

          {/* ── Stats Grid ── (only when logged in) ── */}
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

          {/* ── MT Coins Card ── (only when logged in) ── */}
          {user && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl px-6 py-4 mb-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-gray-600">Available MT Coins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mtCoins?.available?.toLocaleString() ?? '0'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/earncash">
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition shadow-sm hover:shadow-md flex items-center gap-2">
                    <FaCoins className="w-4 h-4" /> Earn More
                  </button>
                </Link>
                <Link href="/withdraw">
                  <button className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition shadow-sm hover:shadow-md flex items-center gap-2">
                    <FaWallet className="w-4 h-4" /> Withdraw
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* ── Daily Bonus Card ── (only when logged in) ── */}
          {user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <FiGift className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Daily Bonus</h3>
                    <p className="text-sm text-gray-500">
                      {bonusLoading
                        ? 'Checking availability...'
                        : bonusStatus.canClaim
                        ? `Claim ${bonusStatus.bonusAmount} MT Coins today!`
                        : 'Already claimed today'}
                    </p>
                    {!bonusLoading && !bonusStatus.canClaim && bonusStatus.nextClaimTime && (
                      <p className="text-xs text-gray-400">
                        Next claim: {new Date(bonusStatus.nextClaimTime).toLocaleDateString()} at 00:00 UTC
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={claimBonus}
                  disabled={!bonusStatus.canClaim || claimLoading || bonusLoading}
                  className={`px-6 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2 ${
                    bonusStatus.canClaim && !claimLoading
                      ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {claimLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Claiming...
                    </>
                  ) : bonusStatus.canClaim ? (
                    <>
                      <FiGift className="w-4 h-4" /> Claim Bonus
                    </>
                  ) : (
                    'Claimed 🎉'
                  )}
                </button>
              </div>
              {bonusError && <p className="mt-2 text-sm text-red-600">{bonusError}</p>}
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

          {/* ── Refer & Affiliates ── (only when logged in) ── */}
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

          {/* ── Explore ── (always visible) ── */}
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

          {/* ── Legal ── (always visible) ── */}
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