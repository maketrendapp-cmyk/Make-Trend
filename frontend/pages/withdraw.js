// pages/withdraw.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import { useAuth } from '../components/AuthScreen';
import {
  FaUser,
  FaEnvelope,
  FaWallet,
  FaDollarSign,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaSpinner,
  FaArrowRight,
  FaArrowLeft,
  FaCopy,
  FaExternalLinkAlt,
  FaGlobe,
  FaShieldAlt,
  FaGift,
  FaCoins,
  FaInfoCircle,
  FaPhone,
  FaUniversity,
  FaCreditCard,
  FaBitcoin,
  FaPaypal,
  FaBuilding,
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

export default function Withdraw() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ── State ──
  const [profile, setProfile] = useState(null);
  const [mtCoins, setMtCoins] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState(0);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch data ──
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    } else if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/withdraw');
    }
  }, [isAuthenticated, user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();

      // ── Fetch profile ──
      const profileRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();
      if (profileData.success) {
        setProfile(profileData.user);
      }

      // ── Fetch MT Coins ──
      const coinsRes = await fetch(`${API_BASE}/mt-coins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const coinsData = await coinsRes.json();
      if (coinsData.success) {
        setMtCoins(coinsData.mtCoins);
      }

      // ── Fetch withdrawal methods ──
      const methodsRes = await fetch(`${API_BASE}/withdrawal-methods`);
      const methodsData = await methodsRes.json();
      if (methodsData.success) {
        setMethods(methodsData.methods);
      }

      // ── Fetch withdrawal history ──
      const withdrawalsRes = await fetch(`${API_BASE}/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsData.success) {
        setWithdrawals(withdrawalsData.withdrawals);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle withdrawal submission ──
  const handleWithdraw = async () => {
    if (!selectedMethod) {
      setError('Please select a payment method.');
      return;
    }

    const mtCoinsToWithdraw = Number(amount);
    if (!mtCoinsToWithdraw || mtCoinsToWithdraw < 100) {
      setError('Minimum withdrawal is 100 MT Coins.');
      return;
    }

    if (mtCoinsToWithdraw > (mtCoins?.available || 0)) {
      setError('Insufficient MT Coins balance.');
      return;
    }

    // ── Validate form fields ──
    const methodObj = methods.find(m => m.id === selectedMethod);
    if (methodObj) {
      for (const field of methodObj.fields) {
        if (field.required && !formData[field.key]) {
          setError(`Please fill in ${field.label}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const token = await user.getIdToken();

      const payload = {
        mtCoins: mtCoinsToWithdraw,
        method: selectedMethod,
        details: formData,
      };

      const res = await fetch(`${API_BASE}/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ Withdrawal of ${data.mtCoins} MT Coins ($${data.amount}) requested successfully!`);
        // Refresh data
        setTimeout(() => {
          fetchData();
          setSelectedMethod(null);
          setFormData({});
          setAmount(0);
        }, 2000);
      } else {
        setError(data.error || 'Failed to process withdrawal.');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Get status badge color ──
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      open: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-purple-100 text-purple-800 border-purple-200',
      successful: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
    };
    const icons = {
      pending: <FaClock className="text-yellow-500" />,
      open: <FaEye className="text-blue-500" />,
      processing: <FaSpinner className="text-purple-500 animate-spin" />,
      successful: <FaCheckCircle className="text-green-500" />,
      failed: <FaTimes className="text-red-500" />,
    };
    return {
      className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`,
      icon: icons[status] || icons.pending,
    };
  };

  // ── Get method icon ──
  const getMethodIcon = (methodId) => {
    const icons = {
      esewa: <FaPhone />,
      khalti: <FaPhone />,
      bank: <FaUniversity />,
      wise: <FaCreditCard />,
      crypto: <FaBitcoin />,
      paypal: <FaPaypal />,
      wire: <FaBuilding />,
    };
    return icons[methodId] || <FaWallet />;
  };

  // ── Get method name ──
  const getMethodName = (methodId) => {
    const names = {
      esewa: 'eSewa / Khalti',
      khalti: 'eSewa / Khalti',
      bank: 'Bank Transfer',
      wise: 'Wise',
      crypto: 'Crypto',
      paypal: 'PayPal',
      wire: 'Wire Transfer',
    };
    return names[methodId] || methodId;
  };

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Meta title="Withdraw – MT Coins" />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto" />
            <p className="mt-4 text-slate-500">Loading your dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  // ── Skeleton loading ──
  if (!profile || !mtCoins) {
    return (
      <>
        <Meta title="Withdraw – MT Coins" />
        <div className="min-h-screen bg-slate-50 p-4">
          <div className="max-w-5xl mx-auto">
            <div className="animate-pulse">
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-32" />
                    <div className="h-4 bg-slate-200 rounded w-48 mt-1" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-sm h-32" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="Withdraw – MT Coins" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">

          {/* ─── Back Button ─── */}
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>

          {/* ─── Profile Header ─── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl text-white flex-shrink-0">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt={profile.fullname} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile?.fullname?.charAt(0)?.toUpperCase() || <FaUser />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-900 truncate">{profile?.fullname}</h1>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <FaEnvelope className="text-slate-400" /> {profile?.email}
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2 rounded-xl border border-purple-200 text-center">
                <p className="text-xs text-purple-600 font-medium">MT Coins</p>
                <p className="text-xl font-bold text-purple-700">{mtCoins?.available?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* ─── Stats Grid ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium">Views</p>
              <p className="text-xl font-bold text-slate-800">{mtCoins?.stats?.views?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium">Shares</p>
              <p className="text-xl font-bold text-slate-800">{mtCoins?.stats?.shares?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium">Completions</p>
              <p className="text-xl font-bold text-slate-800">{mtCoins?.stats?.completions?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <p className="text-xs text-slate-400 font-medium">Unlocks</p>
              <p className="text-xl font-bold text-slate-800">{mtCoins?.stats?.unlocks?.toLocaleString() || 0}</p>
            </div>
          </div>

          {/* ─── Conversion Info ─── */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-6">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="text-amber-500 text-lg mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">How It Works</p>
                <p className="text-sm text-amber-700">
                  <strong>1 MT Coin</strong> = 1 View + 1 Share + 1 Completion + 1 Unlock. 
                  <strong className="block mt-1">2,500 MT Coins = $15</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Available: <strong>{mtCoins?.available?.toLocaleString() || 0}</strong> MT Coins 
                  ≈ <strong>${mtCoins?.usdValue?.toFixed(2) || '0.00'}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* ─── Messages ─── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {message}
            </div>
          )}

          {/* ─── Withdrawal Form ─── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FaWallet className="text-purple-600" /> Request Withdrawal
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ─── Left: Amount & Methods ─── */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (MT Coins)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Min 100"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  min="100"
                  max={mtCoins?.available || 0}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Max: {mtCoins?.available?.toLocaleString() || 0} MT Coins
                  {amount >= 100 && ` ≈ $${((amount / 2500) * 15).toFixed(2)}`}
                </p>

                <label className="block text-sm font-medium text-slate-700 mt-4 mb-1">
                  Payment Method
                </label>
                <div className="space-y-2">
                  {methods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setFormData({});
                        setError('');
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedMethod === method.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-200'
                      }`}
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800">{method.name}</p>
                        <p className="text-xs text-slate-500">{method.description}</p>
                      </div>
                      {selectedMethod === method.id && (
                        <FaCheckCircle className="text-purple-500 text-lg flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Right: Form Fields ─── */}
              <div>
                {selectedMethod && (
                  <div className="animate-fadeIn">
                    <h3 className="font-semibold text-sm text-slate-700 mb-3">
                      {methods.find(m => m.id === selectedMethod)?.name} Details
                    </h3>
                    {methods.find(m => m.id === selectedMethod)?.fields.map((field) => (
                      <div key={field.key} className="mb-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={formData[field.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                          >
                            <option value="">Select...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            placeholder={field.placeholder}
                            value={formData[field.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      onClick={handleWithdraw}
                      disabled={isSubmitting || !selectedMethod || !amount || amount < 100}
                      className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                    >
                      {isSubmitting ? (
                        <><FaSpinner className="animate-spin inline mr-2" /> Processing...</>
                      ) : (
                        <><FaArrowRight className="inline mr-2" /> Withdraw Now</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Withdrawal History ─── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FaClock className="text-purple-600" /> Withdrawal History
            </h2>

            {withdrawals.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FaWallet className="text-4xl mx-auto mb-2 opacity-30" />
                <p className="text-sm">No withdrawal requests yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-400 uppercase">Date</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-400 uppercase">Method</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-slate-400 uppercase">MT Coins</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-slate-400 uppercase">Amount</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-slate-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => {
                      const status = getStatusBadge(w.status);
                      return (
                        <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-3 px-2 text-xs text-slate-500">
                            {w.createdAt ? new Date(w.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-700 flex items-center gap-1.5">
                            {getMethodIcon(w.method)} {getMethodName(w.method)}
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-700 text-right font-medium">
                            {w.mtCoins?.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-700 text-right font-medium">
                            ${w.amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={status.className}>
                              {status.icon} {w.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── How to Earn ─── */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4">
            <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-2">
              <FaGift className="text-blue-500" /> How to Earn MT Coins
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl">👁️</p>
                <p className="text-xs font-medium text-slate-700">1 View</p>
                <p className="text-xs text-slate-500">= 1 MT Coin</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl">📤</p>
                <p className="text-xs font-medium text-slate-700">1 Share</p>
                <p className="text-xs text-slate-500">= 1 MT Coin</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl">✅</p>
                <p className="text-xs font-medium text-slate-700">1 Completion</p>
                <p className="text-xs text-slate-500">= 1 MT Coin</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl">🔓</p>
                <p className="text-xs font-medium text-slate-700">1 Unlock</p>
                <p className="text-xs text-slate-500">= 1 MT Coin</p>
              </div>
            </div>
            <p className="text-center text-xs text-blue-600 mt-3 font-medium">
              💰 2,500 MT Coins = $15 • Minimum withdrawal: 100 MT Coins
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </>
  );
}