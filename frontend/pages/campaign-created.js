// pages/campaign-created.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CampaignCreated() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/campaigns/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Campaign not found');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch campaign');
      }
      const data = await res.json();
      if (data.success) {
        setCampaign(data.campaign);
      } else {
        setError(data.error || 'Failed to load campaign');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Could not load campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/${campaign?.templateSlug || 'campaign'}/${campaign?.id}`;
    navigator.clipboard.writeText(shareUrl);
    setMessage('✅ Link copied!');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign..." />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </>
    );
  }

  if (error || !campaign) {
    return (
      <>
        <Meta title="Campaign Not Found" />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
            <p className="text-gray-500">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/create')}
              className="mt-6 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
            >
              Create Another Campaign
            </button>
          </div>
        </div>
      </>
    );
  }

  const { title, description, reward, shareCount, tasks, finalUrl, features, templateSlug, id: campaignId, image } = campaign;
  const fullUrl = `${window.location.origin}/${templateSlug || 'campaign'}/${campaignId}`;

  return (
    <>
      <Meta title="Campaign Created!" />
      <main className="min-h-screen flex items-center justify-center px-4 py-5 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 sm:px-7 sm:py-5">
            <div className="flex items-center gap-4 text-white">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                🎉
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Campaign Created!</h1>
                <p className="text-purple-100 text-sm">Your campaign is ready to share.</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Preview Card */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</h2>
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-48 h-40 sm:h-auto bg-gray-200 flex-shrink-0">
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        🎯
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    {description && (
                      <p className="text-gray-600 text-sm">{description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">
                        🎁 {reward || 'Exclusive Reward'}
                      </span>
                      {features?.shareCount && (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200">
                          📢 {shareCount} shares
                        </span>
                      )}
                      {features?.tasks && tasks?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium border border-purple-200">
                          📋 {tasks.length} tasks
                        </span>
                      )}
                      {features?.finalUrl && finalUrl && (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200">
                          🔗 Redirect
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy URL */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Share Link</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="text"
                  value={fullUrl}
                  readOnly
                  className="flex-1 w-full bg-transparent outline-none text-sm font-mono text-gray-700 truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 w-full sm:w-auto px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm"
                >
                  Copy Link
                </button>
              </div>
              {message && <p className="mt-2 text-sm text-green-600 text-center">{message}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push(`/${templateSlug || 'campaign'}/${campaignId}`)}
                className="inline-flex items-center justify-center px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm"
              >
                👁️ View Campaign
              </button>
              <button
                onClick={() => router.push('/stats')}
                className="inline-flex items-center justify-center px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                📊 View Stats
              </button>
              <button
                onClick={() => router.push('/create')}
                className="inline-flex items-center justify-center px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                ✨ Create Another
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}