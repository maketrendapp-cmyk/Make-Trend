// pages/follow.js
import Link from 'next/link';
import Meta from '../components/Meta';

export default function FollowUs() {
  return (
    <>
      <Meta
        title="Follow Us"
        description="Follow Make Trend on social media to stay updated with the latest campaigns and features."
        image="https://maketrend.vercel.app/og-follow.jpg"
        url="https://maketrend.vercel.app/follow"
      />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Follow Us</h1>
            <p className="text-gray-500 mb-8">Stay connected and never miss an update.</p>

            <div className="space-y-4 max-w-sm mx-auto">
              <a
                href="https://instagram.com/maketrend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold rounded-xl hover:shadow-lg transition"
              >
                <span className="text-xl">📸</span> Instagram
              </a>
              <a
                href="https://youtube.com/maketrend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-[#FF0000] text-white font-bold rounded-xl hover:shadow-lg transition"
              >
                <span className="text-xl">▶️</span> YouTube
              </a>
              <a
                href="https://facebook.com/maketrend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-[#1877F2] text-white font-bold rounded-xl hover:shadow-lg transition"
              >
                <span className="text-xl">👍</span> Facebook
              </a>
              <a
                href="https://x.com/maketrend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-black text-white font-bold rounded-xl hover:shadow-lg transition"
              >
                <span className="text-xl">🐦</span> X (Twitter)
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/profile">
                <button className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition">
                  ← Back to Profile
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}