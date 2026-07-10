// frontend/pages/index.js
import Meta from '../components/Meta';

export default function Home() {
  return (
    <>
      <Meta 
        title="Home" 
        description="Build viral share-to-unlock campaigns for Instagram, YouTube, TikTok, and WhatsApp. Start growing your audience today."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">🏠 Home</h1>
        <p className="text-gray-500 mt-2">Your feed of campaigns will appear here.</p>
      </main>
    </>
  );
}