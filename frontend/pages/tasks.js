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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  // ===== FETCH CAMPAIGN (view increment happens automatically on backend) =====
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
        // If no tasks, redirect to share page (no unlock API call)
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

  // ===== TASK COMPLETION =====
  const handleCompleteTask = (index) => {
    if (completedTasks.includes(index)) return;
    setCompletedTasks((prev) => [...prev, index]);
  };

  // ===== CONTINUE TO SHARE – ONLY CALLED WHEN ALL TASKS ARE COMPLETED =====
  const handleContinueToShare = async () => {
    // Safety check: ensure all tasks are completed before calling API
    const allTasksCompleted = campaign?.tasks?.length > 0 && 
                              completedTasks.length === campaign.tasks.length;
    
    if (!allTasksCompleted) {
      // Should never happen because button is disabled, but safety check anyway
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ Only call /unlock when tasks are completed
      const res = await fetch(`${API_BASE}/campaigns/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'anonymous' }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        console.error('Unlock failed:', data.error);
        // Still redirect to share page even if unlock fails (user shouldn't be blocked)
      }
    } catch (err) {
      console.error('Error unlocking:', err);
    } finally {
      setIsSubmitting(false);
      router.push(`/share?id=${id}`);
    }
  };

  const tasks = campaign?.tasks || [];
  const allTasksCompleted = tasks.length > 0 && completedTasks.length === tasks.length;

  // ===== SKELETON LOADING =====
  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign" />
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto animate-pulse">
            {/* Back button skeleton */}
            <div className="w-24 h-5 bg-gray-200 rounded mb-6" />
            
            {/* Campaign header skeleton */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
              <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-64 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
                <div className="h-6 w-28 bg-gray-200 rounded-full" />
              </div>
            </div>

            {/* Tasks list skeleton */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-12 bg-gray-200 rounded" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border mb-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
              <div className="w-full h-12 bg-gray-200 rounded-xl mt-4" />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===== ERROR STATE =====
  if (error || !campaign) {
    return (
      <>
        <Meta title="Campaign Not Found" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md animate-fadeIn">
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

  // ===== MAIN RENDER =====
  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Tasks`} />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-6"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </button>

          {/* ===== CAMPAIGN HEADER ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6 transition-all hover:shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title || 'Campaign'}</h1>
            {campaign.description && (
              <p className="text-gray-500 mt-1">{campaign.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {campaign.reward && (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                  🎁 {campaign.reward}
                </span>
              )}
              {campaign.shareCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  📢 Share with {campaign.shareCount} people
                </span>
              )}
              {campaign.tasks && campaign.tasks.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                  📋 {completedTasks.length}/{campaign.tasks.length} tasks
                </span>
              )}
            </div>
          </div>

          {/* ===== TASKS LIST ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Complete these tasks
              </h2>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
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
                      className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-border hover:border-primary/30 hover:bg-gray-100/80 cursor-pointer'
                      }`}
                      onClick={() => !isCompleted && handleCompleteTask(index)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTask(index);
                        }}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 mt-0.5 ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 shadow-sm shadow-green-200'
                            : 'border-gray-300 hover:border-primary group-hover:border-primary'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white animate-popIn" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium transition-all duration-300 ${
                          isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {task.text}
                        </p>
                        {task.url && (
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1 opacity-80 hover:opacity-100 transition"
                          >
                            Open task
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {isCompleted && (
                        <span className="flex-shrink-0 text-green-600 text-sm font-medium animate-slideIn">
                          ✓ Done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== CONTINUE BUTTON ===== */}
            <button
              onClick={handleContinueToShare}
              disabled={!allTasksCompleted || isSubmitting}
              className={`w-full mt-6 inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transition-all duration-300 shadow-sm ${
                allTasksCompleted && !isSubmitting
                  ? 'bg-primary text-white hover:bg-primary/90 hover:shadow-md active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : allTasksCompleted || tasks.length === 0 ? (
                'Continue to Share →'
              ) : (
                `Complete ${tasks.length - completedTasks.length} more task${tasks.length - completedTasks.length > 1 ? 's' : ''}`
              )}
            </button>

            {/* Progress text */}
            {tasks.length > 0 && !allTasksCompleted && (
              <p className="mt-3 text-center text-xs text-gray-400">
                {completedTasks.length} of {tasks.length} tasks completed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== ANIMATIONS ===== */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-popIn { animation: popIn 0.3s ease-out; }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
    </>
  );
}