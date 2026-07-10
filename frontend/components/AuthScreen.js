// frontend/components/AuthScreen.js
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ onSuccess }) {
  const { login, register, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        onSuccess?.(); // Callback to parent
      } else {
        setError(result.error || 'Login failed');
      }
    } else {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }
      const result = await register(email, password, fullname, username);
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Registration failed');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-border">
        
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">
            Make<span className="text-gray-900">Trend</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Viral campaign builder</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Log In
          </button>
          <button
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              !isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="john_doe"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-400">3-30 characters, letters, numbers, underscore.</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary pr-10"
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {isLogin && (
              <button
                type="button"
                className="mt-1 text-xs text-primary hover:underline"
                onClick={async () => {
                  if (!email) {
                    setError('Please enter your email address.');
                    return;
                  }
                  const result = await useAuth().resetPassword(email);
                  if (result.success) {
                    setError('');
                    alert('Password reset link sent to your email.');
                  } else {
                    setError(result.error || 'Failed to send reset email.');
                  }
                }}
              >
                Forgot password?
              </button>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
                disabled={isSubmitting}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || authLoading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Loading...' : isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* Social Buttons (Placeholder) */}
        <div className="flex gap-3">
          <button
            onClick={() => alert('Google login coming soon!')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="text-lg">G</span> Google
          </button>
          <button
            onClick={() => alert('Facebook login coming soon!')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="text-lg">f</span> Facebook
          </button>
        </div>
      </div>
    </div>
  );
}