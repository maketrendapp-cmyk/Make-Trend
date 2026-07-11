// pages/share.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CampaignShare() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchShareCount();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
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
        setShareCount(data.campaign.shareCount || 0);
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

  const fetchShareCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/share-count`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShares(data.shares || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching share count:', err);
    }
  };

  const handleShare = async (platform) => {
    try {
      await fetch(`${API_BASE}/campaigns/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      setShares(prev => prev + 1);
      await fetchShareCount();
    } catch (err) {
      console.error('Error recording share:', err);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/tasks?id=${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      handleShare('copy');
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      handleShare('copy');
    }
  };

  const handleCompleteCampaign = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'anonymous' }),
      });
      const data = await res.json();
      if (data.success) {
        // Redirect to final URL or show success
        if (campaign?.finalUrl) {
          window.location.href = campaign.finalUrl;
        } else {
          alert('🎉 Campaign completed successfully!');
          router.push('/');
        }
      }
    } catch (err) {
      console.error('Error completing campaign:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const shareProgress = shareCount > 0 ? Math.min((shares / shareCount) * 100, 100) : 100;
  const isComplete = shareCount === 0 || shares >= shareCount;

  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !campaign) {
    return (
      <>
        <Meta title="Campaign Not Found" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
            <p className="text-gray-500">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Share`} />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
            <div className="text-6xl mb-4">📤</div>
            <h1 className="text-2xl font-bold text-gray-900">Share Campaign</h1>
            <p className="text-gray-500 mt-2">{campaign.title || 'Campaign'}</p>

            {/* Share Progress */}
            {shareCount > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Share Progress</span>
                  <span>{shares} / {shareCount}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${shareProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Share Link */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-border flex items-center gap-3">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/tasks?id=${id}`}
                readOnly
                className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-600"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  isCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {isCopied ? '✅ Copied!' : 'Copy'}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tasks?id=${id}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Check this out! ${url}`)}`, '_blank');
                  handleShare('whatsapp');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                WhatsApp
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tasks?id=${id}`;
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, '_blank');
                  handleShare('telegram');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Telegram
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tasks?id=${id}`;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                  handleShare('facebook');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
              >
                Facebook
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/tasks?id=${id}`;
                  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank');
                  handleShare('twitter');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
              >
                Twitter
              </button>
            </div>

            {/* Complete Campaign Button */}
            {(isComplete || shareCount === 0) && (
              <button
                onClick={handleCompleteCampaign}
                disabled={isCompleting}
                className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {isCompleting ? 'Completing...' : '🎉 Complete Campaign'}
              </button>
            )}

            {!isComplete && shareCount > 0 && (
              <p className="mt-4 text-sm text-gray-500">
                Share with {shareCount - shares} more people to complete
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}