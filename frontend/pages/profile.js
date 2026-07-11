// pages/profile.js
import { useAuth } from '../components/AuthScreen';
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';

export default function Profile() {
  const { user, isAuthenticated, needsCompletion, loading, logout, refreshUser } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Profile" description="Manage your account." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  if (needsCompletion) {
    return (
      <>
        <Meta title="Complete Profile" description="Complete your profile." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  const initials = user?.fullname
    ? user.fullname.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <Meta title="Profile" description="Manage your account." />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-border sm:p-8">
          
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl text-primary font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.fullname || user?.username || 'User'}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-green-50 px-3 py-0.5 text-xs font-medium text-green-600 border border-green-200">
                {user?.plan || 'Free'} Plan
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-bg p-4">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{user?.stats?.totalCampaigns || 0}</p>
              <p className="text-xs text-gray-500">Campaigns</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{user?.stats?.totalUnlocks || 0}</p>
              <p className="text-xs text-gray-500">Unlocks</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{user?.stats?.totalViews || 0}</p>
              <p className="text-xs text-gray-500">Views</p>
            </div>
          </div>

          <div className="mt-8 space-y-1">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Account Settings</h3>
            
            {['Edit Profile', 'Change Password', 'Billing & Subscription'].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{['👤', '🔐', '💳'][idx]}</span>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            ))}
            
            <div className="border-t border-border my-3" />
            
            <button 
              onClick={logout}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 hover:bg-red-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚪</span>
                <span className="text-sm text-red-600 font-medium">Logout</span>
              </div>
              <span className="text-red-400">›</span>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}