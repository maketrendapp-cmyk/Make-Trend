// pages/refer-earn.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile } from '../lib/queries';
import { auth } from '../services/firebase';
import Link from 'next/link';
import Meta from '../components/Meta';
import {
  FiCopy,
  FiUsers,
  FiUserPlus,
  FiShare2,
  FiChevronRight,
  FiLogIn,
  FiUser,
  FiAward,
  FiClock,
  FiCheckCircle,
  FiRefreshCw,
  FiMail,
  FiCalendar,
} from 'react-icons/fi';
import { FaCrown, FaGift } from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

export default function ReferEarn() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile(isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [referralData, setReferralData] = useState({
    referralCode: '',
    totalReferrals: 0,
    referredUsers: [],
    referrer: null,
  });
  const [copySuccess, setCopySuccess] = useState('');
  const [visible, setVisible] = useState(false);

  const username = profile?.username || user?.username || user?.email?.split('@')[0] || 'User';
  const displayName = profile?.fullname || user?.fullName || user?.fullname || user?.displayName || 'User';
  const isPro = profile?.plan === 'pro';
  const proExpiry = profile?.proExpiry?.toDate?.() || null;
  const referralsCount = referralData.totalReferrals;

  // ── Calculate progress ──
  const nextRewardAt = (Math.floor(referralsCount / 5) + 1) * 5;
  const remaining = Math.max(nextRewardAt - referralsCount, 0);
  const progress = Math.min((referralsCount % 5) / 5 * 100, 100);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Fetch referrals ──
  const fetchReferrals = useCallback(async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setLoading(false);
        return;
      }
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/auth/referrals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setReferralData({
          referralCode: data.referralCode || profile?.referralCode || '',
          totalReferrals: data.totalReferrals || 0,
          referredUsers: data.referredUsers || [],
          referrer: data.referrer || null,
        });
      }
    } catch (err) {
      console.error('Fetch referrals error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [profile?.referralCode]);

  // ── Auto refresh ──
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchReferrals();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, fetchReferrals]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && user) {
        setIsRefreshing(true);
        fetchReferrals();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, user, fetchReferrals]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReferrals();
  };

  const copyReferralCode = () => {
    const code = referralData.referralCode || profile?.referralCode;
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

  // ── Safe date formatting for Firestore timestamps ──
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp.seconds !== undefined) {
        // Firestore Timestamp
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      } else if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const getUserAvatar = (ref) => {
    return ref.avatar || ref.photoURL || null;
  };

  // ── Skeleton ──
  if (profileLoading || loading || (user && !profile)) {
    return (
      <>
        <Meta title="Refer & Earn | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-5xl mx-auto animate-pulse">
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div className="h-8 w-48 bg-gray-200 rounded-lg" />
              <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-28 bg-gray-200" />
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 h-48 bg-gray-200" />
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 h-32 bg-gray-200" />
            <div className="bg-white rounded-xl shadow-sm p-6 h-64 bg-gray-200" />
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Meta title="Refer & Earn | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Refer & Earn</h2>
            <p className="text-gray-500 mt-2 text-sm">Sign in to get your referral code and start earning rewards.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition w-full"
            >
              <FiLogIn className="w-5 h-5" />
              Sign In
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Don't have an account?{' '}
              <button onClick={() => router.push('/login')} className="text-purple-600 hover:underline font-medium">
                Create one
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="Refer & Earn – Make Trend" description="Invite friends and earn PRO access for free." />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">

          {/* ── Header ── */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Refer</span>
                  <span className="text-gray-700">&amp;</span>
                  <span className="text-gray-900">Earn</span>
                </h1>
                <p className="text-sm text-gray-500">Invite friends and unlock PRO access</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <Link href="/profile">
                  <button className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition-colors font-medium">
                    Back to Profile <FiChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <FiUser className="w-4 h-4 text-purple-600" />
              <span>Welcome, <strong className="text-gray-900">@{username}</strong> ({displayName})</span>
            </div>
          </div>

          {/* ── Stats Cards ── (compact, professional) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                <FiUsers className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{referralData.totalReferrals}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <FiUserPlus className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">Referred By</p>
                <p className="text-lg font-semibold text-gray-900 truncate">
                  {referralData.referrer?.username || referralData.referrer?.fullname || '—'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                <FaCrown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">Plan</p>
                <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  {isPro ? '👑 PRO' : 'FREE'}
                  {isPro && proExpiry && (
                    <span className="text-xs text-gray-400 font-normal">
                      (expires {proExpiry.toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* ── Reward Progress ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FaGift className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Reward Progress</h2>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-800">
                🎉 For every <strong>5 friends</strong> you refer, you get <strong>24 hours of PRO</strong> – free!
              </p>
              {isPro && (
                <div className="mt-2 flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>You're currently PRO – enjoy premium features!</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress to next reward</span>
                <span className="font-medium text-gray-900">
                  {remaining === 0 ? '✅ Ready!' : `${remaining} more referral${remaining > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {referralsCount} referral{referralsCount !== 1 ? 's' : ''} • {nextRewardAt} needed for PRO
              </p>
            </div>
          </div>

          {/* ── Referral Code ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FiAward className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Your Referral Code</h2>
            </div>
            {referralData.referralCode || profile?.referralCode ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <code className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg text-xl font-mono text-gray-800">
                  {referralData.referralCode || profile?.referralCode}
                </code>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={copyReferralCode}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium shadow-sm"
                  >
                    <FiCopy className="w-4 h-4" />
                    {copySuccess || 'Copy'}
                  </button>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/signup?ref=${referralData.referralCode || profile?.referralCode}`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'Join Make Trend!',
                          text: `Use my referral code ${referralData.referralCode || profile?.referralCode} to get started!`,
                          url: shareUrl,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          setCopySuccess('✅ Share link copied!');
                          setTimeout(() => setCopySuccess(''), 2000);
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-sm"
                  >
                    <FiShare2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No referral code assigned.</p>
            )}
          </div>

          {/* ── Referred Users Table ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FiUsers className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">People You've Referred</h2>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {referralData.totalReferrals}
                </span>
              </div>
            </div>

            {referralData.referredUsers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <div className="text-5xl mb-3">👥</div>
                <p className="font-medium">No referrals yet.</p>
                <p className="text-sm">Share your code to start earning!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="py-3 px-3 font-medium">User</th>
                      <th className="py-3 px-3 font-medium hidden sm:table-cell">Email</th>
                      <th className="py-3 px-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.referredUsers.map((ref) => (
                      <tr key={ref.uid} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-gray-600 text-sm font-medium overflow-hidden flex-shrink-0">
                              {getUserAvatar(ref) ? (
                                <img src={getUserAvatar(ref)} alt={ref.fullname} className="w-full h-full object-cover" />
                              ) : (
                                ref.fullname?.charAt(0) || ref.username?.charAt(0) || '?'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{ref.fullname || ref.username || 'User'}</p>
                              <p className="text-gray-400 text-xs truncate">@{ref.username || 'unknown'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell text-gray-600 truncate max-w-xs">
                          {ref.email || '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                          {formatDate(ref.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}