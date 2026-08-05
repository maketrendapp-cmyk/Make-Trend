// pages/profile.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import {
  useProfile,
  useStats,
  useMtCoins,
  useInvalidateQueries,
  useDailyBonus,
  useClaimDailyBonus,
} from '../lib/queries';
import {
  FiSettings, FiLock, FiHelpCircle,
  FiShare2, FiLogOut, FiGrid, FiInfo, FiDownload, FiAlertCircle,
  FiBook, FiShield, FiUsers, FiTrendingUp, FiCopy,
  FiGift, FiCheckCircle, FiChevronRight, FiHeart
} from 'react-icons/fi';
import { FaCrown, FaWallet, FaCoins, FaClock } from 'react-icons/fa';
import Meta from '../components/Meta';
import { motion, AnimatePresence } from 'framer-motion';

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

  // ── Daily Bonus with React Query ──
  const {
    data: bonusData,
    isLoading: bonusLoading,
    error: bonusError,
    refetch: refetchBonus,
  } = useDailyBonus(isAuthenticated);

  const claimBonusMutation = useClaimDailyBonus();

  // ── Modals & Notifications ──
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showBonusSuccessModal, setShowBonusSuccessModal] = useState(false);
  const [claimedBonusAmount, setClaimedBonusAmount] = useState(0);
  const [copySuccess, setCopySuccess] = useState('');

  // ── Claim handler ──
  const handleClaimBonus = () => {
    claimBonusMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.success) {
          setClaimedBonusAmount(data.bonus);
          setShowBonusSuccessModal(true);
        }
      },
      onError: (error) => {
        console.error('Claim bonus error:', error);
      },
    });
  };

  // ── Force refetch when user changes ──
  useEffect(() => {
    if (isAuthenticated) {
      invalidateProfile();
      invalidateStats();
      refetchProfile();
      refetchStats();
      refetchMtCoins();
      refetchBonus();
    }
  }, [isAuthenticated]);

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

  // Cleaned up stats (removed views and unlocks as requested)
  const statsItems = [
    { icon: FiTrendingUp, label: 'Campaigns Created', value: stats?.totalCampaigns ?? 0 },
    { icon: FiUsers, label: 'Referrals', value: profile?.referrals || 0 },
  ];

  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile' },
    { icon: FiLock, label: 'Change Password', href: '/change-password' },
    { icon: FiHelpCircle, label: 'Support', href: '/support' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn' },
    { icon: FaCoins, label: 'Earn MT Coins', href: '/earncash' },
    { icon: FaWallet, label: 'Withdraw', href: isAuthenticated ? '/withdraw' : '/login?redirect=/withdraw' },
    { icon: FiHeart, label: 'Grow Together', href: '/groweachother/grow-feed', highlight: true }, // ✅ New button added
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

  // ── Skeleton Loader ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
          <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-40" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2].map(i => <div key={i} className="bg-white rounded-xl h-24 bg-gray-200 border border-gray-100" />)}
          </div>
          <div className="bg-white rounded-2xl h-32 bg-gray-200 border border-gray-100" />
        </div>
      </div>
    );
  }

  // ── Main Page ──
  return (
    <>
      <Meta
        title="Profile | Make Trend"
        description="Manage your profile, view your campaigns, and track your performance on Make Trend."
      />
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

          {/* ── Profile Header ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-inner">
                  {displayUser.profilePic ? (
                    <img src={displayUser.profilePic} alt={displayUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    displayUser.fullName?.charAt(0).toUpperCase() || 'G'
                  )}
                </div>
                {displayUser.isPro && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-md border-2 border-white">
                    <FaCrown className="text-white text-xs" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {displayUser.fullName || displayUser.username || 'Guest User'}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                    displayUser.isPro ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {displayUser.isPro ? 'PRO' : 'FREE'}
                  </span>
                </div>
                <p className="text-gray-500 font-medium">@{displayUser.username || 'guest'}</p>
                <p className="text-gray-400 text-sm">{displayUser.email}</p>

                {user && (
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">Referral Code:</span>
                    {displayUser.referralCode ? (
                      <>
                        <span className="text-sm font-mono bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 select-all">
                          {displayUser.referralCode}
                        </span>
                        <button
                          onClick={copyReferralCode}
                          className="text-purple-600 hover:text-purple-800 transition flex items-center gap-1.5 text-xs font-semibold bg-purple-50 px-2 py-1 rounded-md"
                        >
                          <FiCopy className="w-3.5 h-3.5" />
                          {copySuccess || 'Copy'}
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No code yet</span>
                    )}
                  </div>
                )}

                {!user && <p className="text-sm text-gray-400 mt-2 font-medium">Sign in to access your dashboard</p>}
              </div>

              <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                {!user ? (
                  <Link href="/login">
                    <button className="w-full sm:w-auto px-8 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition shadow-sm">
                      Login
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full sm:w-auto px-6 py-2.5 border border-red-200 text-red-600 bg-red-50/50 rounded-xl font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats Grid (Cleaned up: only Campaigns & Referrals) ── */}
          {user && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              {statsItems.map((stat, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition">
                  <div className="flex justify-center mb-2.5">
                    <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── MT Coins Card ── */}
          {user && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="text-center sm:text-left w-full sm:w-auto">
                <p className="text-sm font-semibold text-purple-800 uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                  <FaWallet className="w-4 h-4" /> Available MT Coins
                </p>
                <p className="text-4xl font-black text-gray-900 tracking-tight">
                  {mtCoins?.available?.toLocaleString() ?? '0'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/earncash" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition shadow-sm flex items-center justify-center gap-2">
                    <FaCoins className="w-4 h-4" /> Earn More
                  </button>
                </Link>
                <Link href="/withdraw" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-sm flex items-center justify-center gap-2">
                    <FaWallet className="w-4 h-4" /> Withdraw
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* ── Daily Bonus Card ── */}
          {user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    bonusData?.canClaim ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <FiGift className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Daily Bonus</h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {bonusLoading
                        ? 'Checking availability...'
                        : bonusData?.canClaim
                        ? `Claim ${bonusData.bonusAmount} MT Coins today!`
                        : 'Already claimed today'}
                    </p>
                    {!bonusLoading && !bonusData?.canClaim && bonusData?.nextClaimTime && (
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
                        <FaClock className="w-3 h-3" /> Next claim: {new Date(bonusData.nextClaimTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClaimBonus}
                  disabled={!bonusData?.canClaim || claimBonusMutation.isPending || bonusLoading}
                  className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                    bonusData?.canClaim && !claimBonusMutation.isPending
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {claimBonusMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Claiming...
                    </>
                  ) : bonusData?.canClaim ? (
                    <>
                      <FiGift className="w-4 h-4" /> Claim Bonus
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4" /> Claimed 🎉
                    </>
                  )}
                </button>
              </div>
              {bonusError && <p className="mt-3 text-sm text-red-600 text-center sm:text-left bg-red-50 p-2 rounded-lg">{bonusError.message}</p>}
            </div>
          )}

          {/* ── Quick Actions (Fixed alignment grid layout) ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors cursor-pointer border ${
                    action.highlight
                      ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-sm'
                      : 'bg-gray-50 border-transparent hover:border-purple-200 text-gray-700'
                  }`}>
                    <action.icon className={`w-5 h-5 flex-shrink-0 ${action.highlight ? 'text-purple-600' : 'text-purple-600'}`} />
                    <span className="text-sm font-semibold flex-1">{action.label}</span>
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Refer & Affiliates ── */}
          {user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Refer & Affiliates</h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <FiUsers className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Referrals</p>
                    <p className="text-2xl font-bold text-gray-900">{displayUser.referrals}</p>
                  </div>
                </div>
                <Link href="/refer-earn">
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                    <FiShare2 className="w-4 h-4" /> Invite Friends
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* ── Explore & Legal Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Explore */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Explore</h2>
              <div className="grid grid-cols-2 gap-3">
                {exploreOptions.map((item, index) => (
                  <Link key={index} href={item.href}>
                    <div className="flex flex-col items-center gap-2 px-3 py-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200 text-center">
                      <item.icon className="w-6 h-6 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Legal Framework</h2>
              <div className="flex flex-col gap-3">
                {legalLinks.map((item, index) => (
                  <Link key={index} href={item.href}>
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200">
                      <item.icon className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700 flex-1">{item.label}</span>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── Bonus Claim Success Modal ── */}
      <AnimatePresence>
        {showBonusSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-5">
                <FiGift className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Reward Claimed!</h3>
              <p className="text-gray-600 font-medium mb-6">
                You have successfully collected your daily bonus of <strong className="text-green-600">{claimedBonusAmount} MT Coins</strong>.
              </p>
              <button
                onClick={() => setShowBonusSuccessModal(false)}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-sm"
              >
                Awesome
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Logout Modal ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
                <FiLogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sign Out</h3>
              <p className="text-gray-500 text-sm font-medium mb-6">Are you sure you want to log out of your account?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-sm"
                >
                  Yes, Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

