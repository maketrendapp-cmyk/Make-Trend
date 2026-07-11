// pages/stats.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function Stats() {
  const router = useRouter();
  const { user, isAuthenticated, needsCompletion, loading, refreshUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !needsCompletion) {
      const fetchCampaigns = async () => {
        try {
          const res = await fetch(`${API_BASE}/campaigns`);
          const data = await res.json();
          if (data.success) {
            setCampaigns(data.campaigns || []);
          }
        } catch (error) {
          console.error('Failed to fetch campaigns:', error);
        } finally {
          setStatsLoading(false);
        }
      };
      fetchCampaigns();
    } else {
      setStatsLoading(false);
    }
  }, [isAuthenticated, needsCompletion]);

  const handleCreateCampaign = () => {
    router.push('/create');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading stats...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Stats" description="Track your campaign performance." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  if (needsCompletion) {
    return (
      <>
        <Meta title="Complete Profile" description="Complete your profile." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <>
      <Meta title="Stats" description="Track your campaign performance." />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Stats</h1>
            <p className="text-gray-500 mt-1">Track your campaign performance and insights</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBackToHome}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
            <button
              onClick={handleCreateCampaign}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Campaign
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Campaigns', value: user?.stats?.totalCampaigns || 0, icon: '📊' },
            { label: 'Total Unlocks', value: user?.stats?.totalUnlocks || 0, icon: '🚀' },
            { label: 'Total Views', value: user?.stats?.totalViews || 0, icon: '👁️' },
            { label: 'Active Campaigns', value: activeCampaigns, icon: '🎯' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-all duration-200">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Campaign List */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Campaigns</h3>
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500 text-sm">You haven't created any campaigns yet.</p>
              <button
                onClick={handleCreateCampaign}
                className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 text-sm"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.slice(0, 10).map((camp) => (
                <div key={camp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{camp.title || 'Untitled'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{camp.platform || 'General'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-500">{camp.status || 'Active'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-primary font-medium">{camp.unlockCount || 0} unlocks</span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/campaign/${camp.id}`)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-sm whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}