// pages/share.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

export default function CampaignShare() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Fetch campaign data to display share info
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Meta title="Share Campaign" />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
          <div className="text-6xl mb-4">📤</div>
          <h1 className="text-2xl font-bold text-gray-900">Share Campaign</h1>
          <p className="text-gray-500 mt-2">Share this campaign with your friends</p>
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-border">
            <p className="text-sm text-gray-600 break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/campaign/tasks?id=${id}` : ''}
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                typeof window !== 'undefined' ? `${window.location.origin}/campaign/tasks?id=${id}` : ''
              );
              alert('Link copied!');
            }}
            className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition"
          >
            Copy Link
          </button>
          <button
            onClick={() => router.push('/')}
            className="mt-3 w-full inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    </>
  );
}