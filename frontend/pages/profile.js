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
  FiGift, FiCheckCircle, FiChevronRight
} from 'react-icons/fi';
import { FaCrown, FaWallet, FaCoins } from 'react-icons/fa';
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

  // ── Daily Bonus State ──
  const [bonusStatus, setBonusStatus] = useState({ canClaim: false, nextClaimTime: null, bonusAmount: 10 });
  const [bonusLoading, setBonusLoading] = useState(true);
  const [bonusError, setBonusError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  // ── Modals & Notifications ──
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showBonusSuccessModal, setShowBonusSuccessModal] = useState(false);
  const [claimedBonusAmount, setClaimedBonusAmount] = useState(0);
  const [copySuccess, setCopySuccess] = useState('');

  // ── Helper: get Firebase token ──
  const getToken = async () => {
    await auth.authStateReady(); 
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

  // ── Claim bonus (FIXED: Replaced alert() with sleek Modal) ──
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
        setClaimedBonusAmount(data.bonus);
        setShowBonusSuccessModal(true); // Trigger beautiful success modal
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

  // ── Force refetch when user changes ──
  useEffect(() => {
    const init = async () => {
      await auth.authStateReady(); 
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

  const statsItems = [
    { icon: FiTrendingUp, label: 'Campaigns', value: stats?.totalCampaigns ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: FiEye, label: 'Total Views', value: stats?.totalViews ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: FiUnlock, label: 'Unlocks', value: stats?.totalUnlocks ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: FiUsers, label: 'Referrals', value: profile?.referrals || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const quickActions = [
    { icon: FiSettings, label: 'Edit Profile', href: '/edit-profile' },
    { icon: FiLock, label: 'Change Password', href: '/change-password' },
    { icon: FiHelpCircle, label: 'Support Center', href: '/support' },
    { icon: FiShare2, label: 'Refer & Earn', href: '/refer-earn' },
    { icon: FaCoins, label: 'Earn MT Coins', href: '/earncash' },
    { icon: FaWallet, label: 'Withdraw Funds', href: isAuthenticated ? '/withdraw' : '/login?redirect=/withdraw' },
  ];

  const exploreOptions = [
    { icon: FiGrid, label: 'Follow Us', href: '/follow' },
    { icon: FiInfo, label: 'About Make Trend', href: '/about' },
    { icon: FiDownload, label: 'Download App', href: '/download' },
    { icon: FiAlertCircle, label: 'Platform Rules', href: '/rules' },
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 mb-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-3">
                <div className="h-7 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-40" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl h-28 bg-gray-200 shadow-sm" />)}
          </div>
          <div className="bg-white rounded-3xl h-32 bg-gray-200 shadow-sm" />
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
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-gray-50 to-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

          {/* ── Profile Header ── */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/60 p-6 sm:p-8 mb-6 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative z-10">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl sm:text-5xl font-bold overflow-hidden shadow-lg border-4 border-white">
                  {displayUser.profilePic ? (
                    <img src={displayUser.profilePic} alt={displayUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    displayUser.fullName?.charAt(0).toUpperCase() || 'G'
                  )}
                </div>
                {displayUser.isPro && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full p-2 shadow-lg border-2 border-white">
                    <FaCrown className="text-white text-sm" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {displayUser.fullName}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase ${
                    displayUser.isPro ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 border border-amber-200/50' : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {displayUser.isPro ? '👑 PRO Member' : 'Free Plan'}
                  </span>
                </div>
                <p className="text-gray-500 font-medium text-sm sm:text-base mb-1">@{displayUser.username}</p>
                <p className="text-gray-400 text-sm">{displayUser.email}</p>

                {user && (
                  <div className="mt-4 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Referral Code</span>
                    {displayUser.referralCode ? (
                      <div className="flex items-center gap-1.5 bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-200/80">
                        <span className="text-sm font-mono text-gray-700 px-2 font-bold select-all">
                          {displayUser.referralCode}
                        </span>
                        <button
                          onClick={copyReferralCode}
                          className="bg-white p-1.5 rounded-md text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition shadow-sm border border-gray-100"
                        >
                          <FiCopy className="w-4 h-4" />
                        </button>
                        {copySuccess && <span className="text-xs font-bold text-green-600 ml-1">{copySuccess}</span>}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Generate code to invite</span>
                    )}
                  </div>
                )}

                {!user && <p className="text-sm text-gray-400 mt-3 font-medium">Sign in to unlock your complete dashboard</p>}
              </div>

              <div className="flex-shrink-0">
                {!user ? (
                  <Link href="/login">
                    <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:-translate-y-0.5 w-full sm:w-auto">
                      Sign In to Account
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="px-6 py-2.5 bg-white border-2 border-gray-100 text-gray-600 rounded-xl font-bold hover:border-red-100 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── MT Coins Premium Wallet Card ── */}
          {user && (
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 rounded-[2rem] p-6 sm:p-8 mb-6 shadow-xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 relative z-10">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-purple-200 mb-1">
                    <FaWallet className="w-4 h-4" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Total Balance</span>
                  </div>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight">
                      {mtCoins?.available?.toLocaleString() ?? '0'}
                    </span>
                    <span className="text-lg font-bold text-purple-300">MT</span>
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto gap-3">
                  <Link href="/earncash" className="flex-1 sm:flex-none">
                    <button className="w-full px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold transition-all backdrop-blur-md flex items-center justify-center gap-2 active:scale-95">
                      <FaCoins className="w-4 h-4 text-yellow-400" /> Earn More
                    </button>
                  </Link>
                  <Link href="/withdraw" className="flex-1 sm:flex-none">
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_0_rgb(124,58,237,0.39)] flex items-center justify-center gap-2 active:scale-95">
                      Withdraw <FiChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Daily Bonus Card ── */}
          {user && (
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-gray-200/60 p-6 sm:p-7 mb-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${bonusStatus.canClaim ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                    <FiGift className={`w-7 h-7 ${bonusStatus.canClaim ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">Daily Bonus Reward</h3>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">
                      {bonusLoading
                        ? 'Checking availability...'
                        : bonusStatus.canClaim
                        ? `A gift of ${bonusStatus.bonusAmount} MT Coins is waiting for you!`
                        : 'You have already collected today\'s bonus.'}
                    </p>
                    {!bonusLoading && !bonusStatus.canClaim && bonusStatus.nextClaimTime && (
                      <p className="text-xs font-semibold text-purple-500 mt-1.5 flex items-center justify-center sm:justify-start gap-1">
                        <FaClock className="w-3 h-3" /> Next claim: {new Date(bonusStatus.nextClaimTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={claimBonus}
                  disabled={!bonusStatus.canClaim || claimLoading || bonusLoading}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 ${
                    bonusStatus.canClaim && !claimLoading
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 border border-green-400/50'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  {claimLoading ? (
                    <>
                      <FaSpinner className="w-5 h-5 animate-spin" /> Unlocking...
                    </>
                  ) : bonusStatus.canClaim ? (
                    <>
                      <FiGift className="w-5 h-5" /> Claim Now
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-5 h-5" /> Collected
                    </>
                  )}
                </button>
              </div>
              {bonusError && <p className="mt-3 text-sm text-red-600 font-semibold text-center sm:text-left bg-red-50 p-2 rounded-lg">{bonusError}</p>}
            </div>
          )}

          {/* ── Stats Grid ── */}
          {user && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {statsItems.map((stat, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/60 p-5 text-center hover:border-purple-200 transition-colors group">
                  <div className={`w-12 h-12 mx-auto ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Settings & Quick Actions ── */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-gray-200/60 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <FiSettings className="text-gray-400" /> Account Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <div className="flex items-center gap-4 px-5 py-4 bg-gray-50/80 rounded-2xl hover:bg-purple-50 transition-colors cursor-pointer border border-gray-200/50 hover:border-purple-200 hover:shadow-sm group">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-all">
                      <action.icon className="w-5 h-5 text-gray-500 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Explore App ── */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-gray-200/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Explore Platform</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {exploreOptions.map((item, index) => (
                  <Link key={index} href={item.href}>
                    <div className="flex flex-col items-center gap-3 px-4 py-5 bg-gray-50/80 rounded-2xl hover:bg-purple-50 transition-colors cursor-pointer border border-gray-200/50 hover:border-purple-200 hover:shadow-sm group text-center">
                      <item.icon className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:-translate-y-1 transition-all" />
                      <span className="text-xs sm:text-sm font-bold text-gray-700 group-hover:text-gray-900">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Legal & Resources ── */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-gray-200/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Legal & Resources</h2>
              <div className="space-y-3 sm:space-y-4">
                {legalLinks.map((item, index) => (
                  <Link key={index} href={item.href}>
                    <div className="flex items-center gap-4 px-5 py-4 bg-gray-50/80 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200/50 hover:border-gray-300 group">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 flex-1">{item.label}</span>
                      <FiChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
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
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
              <div className="w-24 h-24 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-6">
                <FiGift className="w-12 h-12 text-green-500 animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Reward Claimed!</h3>
              <p className="text-gray-500 font-medium mb-6">
                You have successfully collected your daily bonus of <strong className="text-green-600">{claimedBonusAmount} MT Coins</strong>.
              </p>
              <button
                onClick={() => setShowBonusSuccessModal(false)}
                className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md"
              >
                Awesome, thanks!
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
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-5">
                <FiLogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sign Out</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">Are you sure you want to securely log out of your account?</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                >
                  Yes, Sign Out
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}