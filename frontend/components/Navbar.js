import Link from 'next/link';
import { useRouter } from 'next/router';

const Navbar = () => {
  const router = useRouter();
  const isLoggedIn = false; // We'll connect Firebase later

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1 group">
              <span className="text-xl font-bold text-primary">Make</span>
              <span className="text-xl font-bold text-gray-900 group-hover:text-primary/80 transition">
                Trend
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className={`transition ${router.pathname === '/' ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
                Home
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 transition px-3 py-2">
              Log in
            </Link>
            <Link href="/auth/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;