// pages/tasks.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CampaignTasks() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
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
        // If no tasks, redirect to share page
        if (!data.campaign.tasks || data.campaign.tasks.length === 0) {
          router.push(`/share?id=${id}`);
        }
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

  const handleCompleteTask = (index) => {
    if (completedTasks.includes(index)) return;
    setCompletedTasks([...completedTasks, index]);
  };

  const handleContinueToShare = () => {
    router.push(`/share?id=${id}`);
  };

  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">Loading campaign tasks...</p>
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
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  const tasks = campaign.tasks || [];
  const allTasksCompleted = tasks.length > 0 && completedTasks.length === tasks.length;

  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Tasks`} />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
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

          {/* Campaign header */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title || 'Campaign'}</h1>
            {campaign.description && (
              <p className="text-gray-500 mt-1">{campaign.description}</p>
            )}
            {campaign.reward && (
              <div className="mt-2 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                🎁 {campaign.reward}
              </div>
            )}
            {campaign.shareCount > 0 && (
              <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                📢 Share with {campaign.shareCount} people
              </div>
            )}
          </div>

          {/* Tasks list */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Complete these tasks
              </h2>
              <span className="text-sm text-gray-500">
                {completedTasks.length}/{tasks.length}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No tasks to complete.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, index) => {
                  const isCompleted = completedTasks.includes(index);
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                        isCompleted
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-border hover:bg-gray-100'
                      }`}
                    >
                      <button
                        onClick={() => handleCompleteTask(index)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 ${
                          isCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-primary'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.text}
                        </p>
                        {task.url && (
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            Open task
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {isCompleted && (
                        <span className="flex-shrink-0 text-green-600 text-sm font-medium">✓ Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={handleContinueToShare}
              disabled={!allTasksCompleted && tasks.length > 0}
              className={`w-full mt-6 inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                allTasksCompleted || tasks.length === 0
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {allTasksCompleted || tasks.length === 0
                ? 'Continue to Share →'
                : `Complete ${tasks.length - completedTasks.length} more task${tasks.length - completedTasks.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}