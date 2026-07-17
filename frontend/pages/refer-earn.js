// pages/refer-earn.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import Link from 'next/link';
import { FiCopy, FiUsers, FiUserPlus, FiShare2, FiChevronRight, FiLogIn } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export default function ReferEarn() {
  const router = useRouter();
  const { user, dataLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState({
    referralCode: '',
    totalReferrals: 0,
    referredUsers: [],
    referrer: null,
  });
  const [copySuccess, setCopySuccess] = useState('');

  // ── Fetch referral data locally ──
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
      }
    };
    fetchReferrals();
  }, []);

  const copyReferralCode = () => {
    const code = referralData.referralCode;
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

  // ── Show loading while auth is loading ──
  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated – Show Login Prompt ──
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUsers className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Refer & Earn</h2>
          <p className="text-gray-500 text-sm mb-6">
            Sign in to get your referral code and start earning rewards by inviting friends.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md w-full"
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
    );
  }

  // ── Show loading while fetching referrals ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referrals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Refer & Earn</h1>
              <p className="text-gray-500 text-sm">Invite friends and earn rewards</p>
            </div>
            <Link href="/profile">
              <button className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1">
                Back to Profile <FiChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <FiUsers className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{referralData.totalReferrals}</p>
            <p className="text-sm text-gray-500">Total Referrals</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <FiUserPlus className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {referralData.referrer ? '✅' : '—'}
            </p>
            <p className="text-sm text-gray-500">
              {referralData.referrer ? `Referred by ${referralData.referrer.username || 'someone'}` : 'No referrer'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <FaCrown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-sm text-gray-500">Rewards (coming soon)</p>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Referral Code</h2>
          {referralData.referralCode ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <code className="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono border border-gray-200 text-gray-800">
                {referralData.referralCode}
              </code>
              <div className="flex items-center gap-3">
                <button
                  onClick={copyReferralCode}
                  className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
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
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
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
            <p className="mt-2 text-sm text-green-600">{copySuccess}</p>
          )}
        </div>

        {/* Referred Users List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            People You've Referred ({referralData.totalReferrals})
          </h2>
          {referralData.referredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiUsers className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No referrals yet. Share your code to start earning!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 px-3 font-medium">User</th>
                    <th className="py-2 px-3 font-medium hidden sm:table-cell">Email</th>
                    <th className="py-2 px-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {referralData.referredUsers.map((ref) => (
                    <tr key={ref.uid} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
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
  );
}