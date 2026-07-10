// frontend/pages/stats.js
import Meta from '../components/Meta';

export default function Stats() {
  return (
    <>
      <Meta 
        title="Analytics" 
        description="Track your campaign performance. See views, unlocks, and engagement metrics in real-time."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">📊 Statistics</h1>
        <p className="text-gray-500 mt-2">Your campaign analytics dashboard.</p>
      </main>
    </>
  );
}