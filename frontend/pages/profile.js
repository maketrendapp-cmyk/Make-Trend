// frontend/pages/profile.js
import Meta from '../components/Meta';

export default function Profile() {
  return (
    <>
      <Meta 
        title="Profile" 
        description="Manage your account settings, view your campaigns, and update your personal information."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">👤 Profile</h1>
        <p className="text-gray-500 mt-2">Your account settings and info.</p>
      </main>
    </>
  );
}