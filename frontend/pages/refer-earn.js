// pages/refer-earn.js
import React, { useState, useEffect } from 'react';
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
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

export default function ReferEarn() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState({
    referralCode: profile?.referralCode || '', // ✅ start with profile code
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

  // ── Calculate progress to next reward ──
  const nextRewardAt = (Math.floor(referralsCount / 5) + 1) * 5;
  const remaining = Math.max(nextRewardAt - referralsCount, 0);
  const progress = Math.min((referralsCount % 5) / 5 * 100, 100);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchReferrals = async () => {
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
            referralCode: data.referralCode || profile?.referralCode || '', // ✅ fallback
            totalReferrals: data.totalReferrals || 0,
            referredUsers: data.referredUsers || [],
            referrer: data.referrer || null,
          });
        }
      } catch (err) {
        console.error('Fetch referrals error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

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

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp.toDate) date = timestamp.toDate();
      else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
      else date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // ── Skeleton Loader ──
  if (profileLoading || loading || (user && !profile)) {
    return (
      <>
        <Meta title="Refer & Earn | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-4xl mx-auto animate-pulse">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="h-8 w-40 bg-gray-200 rounded-lg mb-2" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3" />
                  <div className="h-8 w-16 bg-gray-200 rounded mx-auto mb-2" />
                  <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-12 w-48 bg-gray-200 rounded-xl" />
                <div className="flex gap-3">
                  <div className="h-12 w-24 bg-gray-200 rounded-xl" />
                  <div className="h-12 w-24 bg-gray-200 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
              <div className="h-6 w-56 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-3 border-b border-gray-100">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Meta title="Refer & Earn | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
            <div className="w-24 h-24 bg-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FiUsers className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Refer & Earn</h2>
            <p className="text-gray-500 text-sm mb-6">
              Sign in to get your referral code and start earning rewards.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition w-full"
            >
              <FiLogIn className="w-5 h-5" />
              Sign In
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-purple-600 hover:underline font-medium"
              >
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
      <Meta
        title="Refer & Earn – Make Trend"
        description="Invite friends to Make Trend and earn free PRO access for every 5 referrals."
      />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">

          {/* ── Header ── */}
          <div className={`bg-white rounded-3xl shadow-sm border border-gray-200 p-6 mb-6 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Refer</span>
                  & Earn
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Invite friends and unlock PRO access</p>
              </div>
              <Link href="/profile">
                <button className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors">
                  Back to Profile <FiChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <FiUser className="w-4 h-4 text-purple-600" />
              <span>Welcome, <strong className="text-gray-900">@{username}</strong> ({displayName})</span>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiUsers className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{referralData.totalReferrals}</p>
              <p className="text-sm text-gray-500 font-medium">Total Referrals</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiUserPlus className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {referralData.referrer ? '✅' : '—'}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {referralData.referrer ? `Referred by ${referralData.referrer.username || 'someone'}` : 'No referrer'}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaCrown className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {isPro ? '👑' : '—'}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {isPro ? 'PRO Active' : 'Free Plan'}
              </p>
              {isPro && proExpiry && (
                <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                  <FiClock className="w-3 h-3" />
                  Expires: {proExpiry.toLocaleDateString()} {proExpiry.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* ── Reward Explanation & Progress ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FiAward className="w-5 h-5 text-purple-600" />
              Reward System
            </h2>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <p className="text-purple-800 text-sm font-medium">
                🎉 For every <strong>5 friends</strong> you refer, you get <strong>24 hours of PRO access</strong> – absolutely free!
              </p>
              {isPro && (
                <div className="mt-2 flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>You're currently PRO – enjoy the premium features!</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress to next reward</span>
                <span className="font-medium text-gray-900">
                  {remaining === 0 ? '✅ Ready for PRO!' : `${remaining} more referral${remaining > 1 ? 's' : ''} needed`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
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
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiAward className="w-5 h-5 text-purple-600" />
              Your Referral Code
            </h2>
            {referralData.referralCode || profile?.referralCode ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <code className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl text-xl font-mono text-gray-800 shadow-sm">
                  {referralData.referralCode || profile?.referralCode}
                </code>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={copyReferralCode}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
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
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm font-medium shadow-sm"
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

          {/* ── Referred Users List ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiUsers className="w-5 h-5 text-purple-600" />
              People You've Referred
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full ml-1">
                {referralData.totalReferrals}
              </span>
            </h2>
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
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-3 px-3 font-medium">User</th>
                      <th className="py-3 px-3 font-medium hidden sm:table-cell">Email</th>
                      <th className="py-3 px-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.referredUsers.map((ref) => (
                      <tr key={ref.uid} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-gray-600 text-sm font-medium overflow-hidden">
                              {ref.avatar ? (
                                <img src={ref.avatar} alt={ref.fullname} className="w-full h-full object-cover" />
                              ) : (
                                ref.fullname?.charAt(0) || ref.username?.charAt(0) || '?'
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{ref.fullname || ref.username || 'User'}</p>
                              <p className="text-gray-400 text-xs">@{ref.username || 'unknown'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell text-gray-600">{ref.email || '—'}</td>
                        <td className="py-3 px-3 text-gray-500">{formatDate(ref.createdAt)}</td>
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