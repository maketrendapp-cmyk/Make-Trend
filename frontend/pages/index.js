export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Build viral campaigns <br />
          <span className="text-primary">in 2 minutes</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500">
          Create share-to-unlock campaigns for Instagram, YouTube, TikTok, and more.
        </p>
        <div className="mt-10 flex gap-4">
          <button className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition">
            Start free trial
          </button>
          <button className="rounded-lg border border-border bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition">
            See examples
          </button>
        </div>
      </div>
    </main>
  );
}