// pages/refer-earn.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
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
} from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export default function ReferEarn() {
  const router = useRouter();
  const { user, profile: contextProfile, dataLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState({
    referralCode: '',
    totalReferrals: 0,
    referredUsers: [],
    referrer: null,
  });
  const [copySuccess, setCopySuccess] = useState('');
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // ── Get username for welcome message ──
  const username = contextProfile?.username || user?.username || user?.email?.split('@')[0] || 'User';
  const displayName = contextProfile?.fullname || user?.fullName || user?.fullname || user?.displayName || 'User';

  // ── Fetch referral data ──
  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          setLoading(false);
          return;
        }
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`${API_BASE}/api/auth/referrals`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setReferralData({
            referralCode: data.referralCode || '',
            totalReferrals: data.totalReferrals || 0,
            referredUsers: data.referredUsers || [],
            referrer: data.referrer || null,
          });
        } else {
          console.error('Failed to fetch referrals:', data.error);
        }
      } catch (err) {
        console.error('Fetch referrals error:', err);
      } finally {
        setLoading(false);
        // ── Allow animations to start after content loads ──
        setTimeout(() => setShouldAnimate(true), 100);
      }
    };
    fetchReferrals();
  }, []);

  // ── Intersection Observer for scroll animations ──
  useEffect(() => {
    if (!shouldAnimate) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [shouldAnimate]); // Re-run when animations are allowed

  const copyReferralCode = () => {
    const code = referralData.referralCode;
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

  // ── Skeleton Loading ──
  if (!dataLoaded || loading) {
    return (
      <>
        <Meta title="Refer & Earn | Make Trend" />
        <div className="min-h-screen bg-gray-50/50 py-8 px-4">
          <div className="max-w-4xl mx-auto animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100/60 p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="h-8 w-40 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-xl" />
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100/60 p-6 text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3" />
                  <div className="h-8 w-16 bg-gray-200 rounded mx-auto mb-2" />
                  <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
                </div>
              ))}
            </div>

            {/* Referral Code Skeleton */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100/60 p-6 mb-6">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-12 w-48 bg-gray-200 rounded-xl" />
                <div className="flex gap-3">
                  <div className="h-12 w-24 bg-gray-200 rounded-xl" />
                  <div className="h-12 w-24 bg-gray-200 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Referred Users Skeleton */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100/60 p-6">
              <div className="h-6 w-56 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
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

  // ── Unauthenticated – Show Login Prompt ──
  if (!user) {
    return (
      <>
        <Meta
          title="Refer & Earn | Make Trend"
          description="Invite your friends to Make Trend and earn rewards for every successful referral."
        />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-purple-50/30">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100/60 p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FiUsers className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Refer & Earn</h2>
            <p className="text-gray-500 text-sm mb-6">
              Sign in to get your referral code and start earning rewards by inviting friends.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 shadow-md w-full"
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

  // ── Main Content ──
  return (
    <>
      <Meta
        title="Refer & Earn | Make Trend"
        description="Invite your friends to Make Trend and earn rewards for every successful referral."
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
        <div className="max-w-4xl mx-auto">

          {/* ── Welcome Message ── */}
          <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 bg-white rounded-3xl shadow-lg border border-gray-100/60 p-5 mb-6 text-center">
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <FiUser className="w-6 h-6 text-purple-600" />
              <span className="text-lg font-medium">
                Welcome,{' '}
                <span className="font-bold text-purple-700">
                  @{username}
                </span>
                {user && (
                  <span className="text-gray-400 text-sm ml-1">
                    ({displayName})
                  </span>
                )}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Invite friends and earn rewards for every successful referral.
            </p>
          </div>

          {/* ── Header ── */}
          <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-100 bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Refer</span>
                  & Earn
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Invite friends and earn rewards</p>
              </div>
              <Link href="/profile">
                <button className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors">
                  Back to Profile <FiChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-150 bg-white rounded-2xl shadow-xl border border-gray-100/60 p-6 text-center hover:shadow-2xl transition-shadow duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FiUsers className="w-7 h-7 text-purple-600" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{referralData.totalReferrals}</p>
              <p className="text-sm text-gray-500 font-medium">Total Referrals</p>
            </div>

            <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-200 bg-white rounded-2xl shadow-xl border border-gray-100/60 p-6 text-center hover:shadow-2xl transition-shadow duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FiUserPlus className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                {referralData.referrer ? '✅' : '—'}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {referralData.referrer ? `Referred by ${referralData.referrer.username || 'someone'}` : 'No referrer'}
              </p>
            </div>

            <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-250 bg-white rounded-2xl shadow-xl border border-gray-100/60 p-6 text-center hover:shadow-2xl transition-shadow duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FaCrown className="w-7 h-7 text-yellow-600" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">—</p>
              <p className="text-sm text-gray-500 font-medium">Rewards (coming soon)</p>
            </div>
          </div>

          {/* ── Referral Code ── */}
          <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-300 bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiAward className="w-5 h-5 text-purple-600" />
              Your Referral Code
            </h2>
            {referralData.referralCode ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <code className="bg-gradient-to-r from-gray-50 to-gray-100/80 px-5 py-3 rounded-xl text-xl font-mono border border-gray-200 text-gray-800 shadow-sm">
                  {referralData.referralCode}
                </code>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={copyReferralCode}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5 text-sm font-medium"
                  >
                    <FiCopy className="w-4 h-4" />
                    {copySuccess || 'Copy'}
                  </button>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/signup?ref=${referralData.referralCode}`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'Join Make Trend!',
                          text: `Use my referral code ${referralData.referralCode} to get started!`,
                          url: shareUrl,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          setCopySuccess('✅ Share link copied!');
                          setTimeout(() => setCopySuccess(''), 2000);
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5 text-sm font-medium"
                  >
                    <FiShare2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No referral code assigned.</p>
            )}
            {copySuccess && !copySuccess.includes('Copied!') && (
              <p className="mt-3 text-sm text-green-600 font-medium">{copySuccess}</p>
            )}
          </div>

          {/* ── Referred Users List ── */}
          <div className="fade-up opacity-0 translate-y-8 transition-all duration-700 delay-400 bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 backdrop-blur-sm">
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
                      <tr
                        key={ref.uid}
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-gray-600 text-sm font-medium overflow-hidden">
                              {ref.avatar ? (
                                <img src={ref.avatar} alt={ref.fullname} className="w-full h-full rounded-full object-cover" />
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