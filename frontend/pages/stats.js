// frontend/pages/stats.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Meta from '../components/Meta';
import AuthScreen from '../components/AuthScreen';
import api from '../services/api';

export default function Stats() {
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch campaigns if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchCampaigns = async () => {
        try {
          const response = await api.get('/campaigns');
          if (response.data.success) {
            setCampaigns(response.data.campaigns);
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
  }, [isAuthenticated]);

  // If loading auth, show nothing or a subtle loader
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // If not authenticated, show AuthScreen
  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Analytics" description="Track your campaign performance." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  // If authenticated, show stats dashboard
  return (
    <>
      <Meta title="Analytics" description="Track your campaign performance." />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📊 Analytics</h1>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Campaigns', value: user?.stats?.totalCampaigns || 0, icon: '📊' },
            { label: 'Total Unlocks', value: user?.stats?.totalUnlocks || 0, icon: '🚀' },
            { label: 'Total Views', value: user?.stats?.totalViews || 0, icon: '👁️' },
            { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length, icon: '🎯' },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-xl bg-white p-4 shadow-sm border border-border">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Your campaigns list or other content */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm border border-border">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Your Campaigns</h3>
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-400">You haven't created any campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((camp) => (
                <div key={camp.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{camp.title}</p>
                    <p className="text-xs text-gray-400">{camp.platform} • {camp.actionType}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{camp.unlockCount || 0} unlocks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}