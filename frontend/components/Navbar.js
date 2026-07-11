// components/Navbar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1 group">
              <span className="text-xl font-bold text-primary">Make</span>
              <span className="text-xl font-bold text-gray-900 group-hover:text-primary/80 transition">Trend</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link
                href="/"
                className={`transition ${
                  router.pathname === '/'
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Home
              </Link>

              {isAuthenticated && (
                <Link
                  href="/stats"
                  className={`transition ${
                    router.pathname === '/stats'
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Stats
                </Link>
              )}
            </div>
          </div>

          {/* Right side: Auth buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-600">
                  {user?.fullname || user?.email?.split('@')[0] || 'User'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-900 transition px-3 py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 transition px-3 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}