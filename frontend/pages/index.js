// pages/index.js – with Meta only
import Head from 'next/head';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Meta
        title="Make Trend – Create & Share Viral Campaigns"
        description="Launch share‑to‑unlock campaigns for Instagram, TikTok, YouTube, and more. Grow your audience in minutes."
      />
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50/80 px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
            Create & Share <span className="text-purple-600">Viral Campaigns</span>
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Launch share‑to‑unlock campaigns in minutes. Grow your audience.
          </p>
          <button
            onClick={() => router.push('/create')}
            className="mt-8 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition"
          >
            Get Started
          </button>
        </div>
      </main>
    </>
  );
}