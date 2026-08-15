// pages/withdraw.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import { useAuth } from '../components/AuthScreen';
import {
  useProfile,
  useMtCoins,
  useWithdrawalMethods,
  useWithdrawals,
  useCreateWithdrawal,
} from '../lib/queries';
import {
  FaUser,
  FaEnvelope,
  FaWallet,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaSpinner,
  FaArrowRight,
  FaArrowLeft,
  FaInfoCircle,
  FaPhone,
  FaUniversity,
  FaCreditCard,
  FaBitcoin,
  FaPaypal,
  FaBuilding,
  FaGift,
  FaShareAlt,
  FaUnlock,
  FaCoins,
  FaLightbulb,
  FaArrowUp,
  FaArrowDown,
  FaPlusCircle,
  FaGoogle,
  FaMobile,
  FaMoneyBillWave,
  FaGlobe,
  FaHeart,
  FaThumbsUp,
  FaExchangeAlt,
  FaRocket,
} from 'react-icons/fa';

export default function Withdraw() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const { data: mtCoinsData, isLoading: coinsLoading, refetch: refetchMtCoins } = useMtCoins(isAuthenticated);
  const { data: methods = [], isLoading: methodsLoading } = useWithdrawalMethods(isAuthenticated);
  const { data: withdrawals = [], isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useWithdrawals(isAuthenticated);
  const { mutate: createWithdrawal, isLoading: isSubmitting } = useCreateWithdrawal();

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const WITHDRAWAL_AMOUNT = 10000;        // 10,000 MT Coins
  const USD_AMOUNT = 10;                  // $10.00

  useEffect(() => {
    if (user) {
      refetchMtCoins();
      refetchWithdrawals();
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/withdraw');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Format Firestore timestamp ──
  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
      let date;
      if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      } else if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const isLoading = profileLoading || coinsLoading || withdrawalsLoading || methodsLoading;
  if (isLoading) {
    return (
      <>
        <Meta title="Withdraw – MT Coins" />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-40" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 h-24 bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Please log in to view this page.</div>
      </div>
    );
  }

  const mtCoins = mtCoinsData || {
    earned: 0,
    spent: 0,
    available: 0,
    usdValue: 0,
    stats: { views: 0, shares: 0, completions: 0, unlocks: 0, likes: 0, upvotes: 0 },
  };
  const canWithdraw = (mtCoins.available || 0) >= WITHDRAWAL_AMOUNT;

  const handleWithdraw = () => {
    if (!selectedMethod) {
      setError('Please select a payment method.');
      return;
    }
    if (!canWithdraw) {
      setError(`Insufficient MT Coins. You need ${WITHDRAWAL_AMOUNT} MT Coins ($${USD_AMOUNT}) to withdraw.`);
      return;
    }

    const methodObj = methods.find((m) => m.id === selectedMethod);
    if (methodObj) {
      for (const field of methodObj.fields) {
        if (field.required && !formData[field.key]) {
          setError(`Please fill in ${field.label}.`);
          return;
        }
      }
    }

    setError('');
    setMessage('');

    createWithdrawal(
      {
        mtCoins: WITHDRAWAL_AMOUNT,
        method: selectedMethod,
        details: formData,
      },
      {
        onSuccess: (data) => {
          setMessage(`✅ Withdrawal of ${data.mtCoins} MT Coins ($${data.amount}) requested!`);
          setSelectedMethod(null);
          setFormData({});
          refetchWithdrawals();
        },
        onError: (err) => {
          setError(err.message || 'Failed to submit withdrawal.');
        },
      }
    );
  };

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
      className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[status] || styles.pending
      }`,
      icon: icons[status] || icons.pending,
    };
  };

  const getMethodIcon = (methodId) => {
    const icons = {
      esewa: <FaPhone />,
      khalti: <FaPhone />,
      bank_nepal: <FaUniversity />,
      paytm: <FaMobile />,
      phonepe: <FaMobile />,
      gpay: <FaGoogle />,
      bhim_upi: <FaCreditCard />,
      bank_india: <FaUniversity />,
      bkash: <FaMobile />,
      rocket: <FaMobile />,
      easypesa: <FaMobile />,
      dana: <FaMobile />,
      gopay: <FaMobile />,
      vodafone_cash: <FaMobile />,
      payeer: <FaCreditCard />,
      payoneer: <FaCreditCard />,
      webmoney: <FaCreditCard />,
      binance: <FaBitcoin />,
      usdt_trc20: <FaBitcoin />,
      wise: <FaCreditCard />,
      paypal: <FaPaypal />,
      wire: <FaBuilding />,
    };
    return icons[methodId] || <FaWallet />;
  };

  const getMethodName = (methodId) => {
    const names = {
      esewa: 'eSewa',
      khalti: 'Khalti',
      bank_nepal: 'Bank Transfer (Nepal)',
      paytm: 'Paytm',
      phonepe: 'PhonePe',
      gpay: 'Google Pay',
      bhim_upi: 'BHIM UPI',
      bank_india: 'Bank Transfer (India)',
      bkash: 'bKash',
      rocket: 'Rocket',
      easypesa: 'EasyPesa',
      dana: 'Dana',
      gopay: 'GoPay',
      vodafone_cash: 'Vodafone Cash',
      payeer: 'Payeer',
      payoneer: 'Payoneer',
      webmoney: 'WebMoney',
      binance: 'Binance Pay',
      usdt_trc20: 'USDT (TRC-20)',
      wise: 'Wise',
      paypal: 'PayPal',
      wire: 'Wire Transfer',
    };
    return names[methodId] || methodId;
  };

  return (
    <>
      <Meta title="Withdraw – MT Coins" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/profile')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>

          {/* ─── Profile Header ─── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl text-white flex-shrink-0">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.fullname}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  profile?.fullname?.charAt(0)?.toUpperCase() || <FaUser />
                )}
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-xl font-bold text-slate-900 truncate">{profile?.fullname}</h1>
                <p className="text-slate-500 text-sm flex items-center justify-center sm:justify-start gap-2 truncate">
                  <FaEnvelope className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </p>
              </div>

              {/* ─── THREE COIN BOXES ─── */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <div className="flex-shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 rounded-xl border border-emerald-200 text-center min-w-[100px]">
                  <p className="text-[10px] sm:text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                    <FaArrowUp className="text-emerald-500" /> Available
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">
                    {mtCoins.available?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="flex-shrink-0 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-2 rounded-xl border border-rose-200 text-center min-w-[100px]">
                  <p className="text-[10px] sm:text-xs text-rose-600 font-medium flex items-center justify-center gap-1">
                    <FaArrowDown className="text-rose-500" /> Spent
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-rose-700">
                    {mtCoins.spent?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="flex-shrink-0 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2 rounded-xl border border-indigo-200 text-center min-w-[100px]">
                  <p className="text-[10px] sm:text-xs text-indigo-600 font-medium flex items-center justify-center gap-1">
                    <FaPlusCircle className="text-indigo-500" /> Earned
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-700">
                    {mtCoins.earned?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Stats Grid ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <FaEye className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {mtCoins.stats?.views?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400 font-medium">Campaign Views</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <FaShareAlt className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {mtCoins.stats?.shares?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400 font-medium">Campaign Shares</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <FaUnlock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {mtCoins.stats?.unlocks?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400 font-medium">Campaign Unlocks</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 text-center">
              <FaCheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">
                {mtCoins.stats?.completions?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400 font-medium">Campaign Completions</p>
            </div>
          </div>

          {/* ─── How MT Coins Are Earned (Expanded + Links) ─── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FaLightbulb className="text-indigo-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-800">How MT Coins Are Earned</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full text-purple-700 border border-purple-200">
                    <FaEye className="text-purple-500" /> View
                  </span>
                  <span className="text-slate-300">+</span>
                  <span className="inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full text-blue-700 border border-blue-200">
                    <FaShareAlt className="text-blue-500" /> Share
                  </span>
                  <span className="text-slate-300">+</span>
                  <span className="inline-flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full text-amber-700 border border-amber-200">
                    <FaUnlock className="text-amber-500" /> Unlock
                  </span>
                  <span className="text-slate-300">+</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full text-emerald-700 border border-emerald-200">
                    <FaCheckCircle className="text-emerald-500" /> Complete
                  </span>
                  <span className="text-slate-300 font-bold">=</span>
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-amber-50 px-3 py-1.5 rounded-full text-amber-800 border border-amber-300 font-bold">
                    <FaCoins className="text-amber-500" /> 1 MT Coin
                  </span>
                </div>

                {/* ─── Explanation with Links ─── */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {/* Campaigns */}
                  <div className="bg-purple-50/80 p-4 rounded-xl border border-purple-200/60">
                    <div className="flex items-center gap-2 mb-1">
                      <FaRocket className="text-purple-600" />
                      <span className="font-semibold text-slate-800">Campaigns</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Views + Shares + Unlocks + Completions</strong> → 1 MT Coin
                    </p>
                    <button
                      onClick={() => router.push('/campaigns')}
                      className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-800 underline-offset-2 hover:underline transition"
                    >
                      Go to Campaigns →
                    </button>
                  </div>

                  {/* Community Posts */}
                  <div className="bg-pink-50/80 p-4 rounded-xl border border-pink-200/60">
                    <div className="flex items-center gap-2 mb-1">
                      <FaHeart className="text-pink-500" />
                      <span className="font-semibold text-slate-800">Community Likes</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Every like</strong> on your post = <strong>1 MT Coin</strong>
                    </p>
                    <button
                      onClick={() => router.push('/community')}
                      className="mt-2 text-xs font-medium text-pink-600 hover:text-pink-800 underline-offset-2 hover:underline transition"
                    >
                      Go to Community →
                    </button>
                  </div>

                  {/* Product Trend */}
                  <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200/60">
                    <div className="flex items-center gap-2 mb-1">
                      <FaThumbsUp className="text-blue-500" />
                      <span className="font-semibold text-slate-800">Product Upvotes</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Every upvote</strong> on your product = <strong>1 MT Coin</strong>
                    </p>
                    <button
                      onClick={() => router.push('/productstrend')}
                      className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition"
                    >
                      Go to ProductTrend →
                    </button>
                  </div>

                  {/* Grow Together (Exchanges) */}
                  <div className="bg-green-50/80 p-4 rounded-xl border border-green-200/60">
                    <div className="flex items-center gap-2 mb-1">
                      <FaExchangeAlt className="text-green-500" />
                      <span className="font-semibold text-slate-800">Exchanges</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Create an exchange</strong> (costs 1 MT Coin) and <br />
                      <strong>complete</strong> it → earn <strong>2 MT Coins</strong> (net +1)
                    </p>
                    <button
                      onClick={() => router.push('/groweachother')}
                      className="mt-2 text-xs font-medium text-green-600 hover:text-green-800 underline-offset-2 hover:underline transition"
                    >
                      Go to Grow Together →
                    </button>
                  </div>
                </div>

                {/* ─── Total Accumulated ─── */}
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    <span className="font-bold text-amber-600">1 MT Coin</span> = 
                    <span className="mx-1 text-slate-400">|</span>
                    <span className="text-purple-600">1 View</span>
                    <span className="mx-1 text-slate-300">+</span>
                    <span className="text-blue-600">1 Share</span>
                    <span className="mx-1 text-slate-300">+</span>
                    <span className="text-amber-600">1 Unlock</span>
                    <span className="mx-1 text-slate-300">+</span>
                    <span className="text-emerald-600">1 Completion</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-pink-500">1 Post Like</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-blue-500">1 Product Upvote</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-green-500">1 Exchange Completed</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Collect <strong>{WITHDRAWAL_AMOUNT.toLocaleString()} MT Coins</strong> and withdraw <strong>${USD_AMOUNT}.00</strong> – 24/7 available
                  </p>
                </div>
              </div>
            </div>
          </div>

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
              <div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 mb-4">
                  <p className="text-sm text-purple-700 font-semibold">Withdrawal Amount</p>
                  <p className="text-2xl font-bold text-purple-800">${USD_AMOUNT}.00</p>
                  <p className="text-xs text-purple-600">= {WITHDRAWAL_AMOUNT.toLocaleString()} MT Coins (exact amount)</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Your balance:{' '}
                    <strong>{mtCoins.available?.toLocaleString() || 0}</strong> MT Coins
                    {canWithdraw ? ' ✅' : ' ❌ Insufficient'}
                  </p>
                </div>

                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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

              <div>
                {selectedMethod && (
                  <div className="animate-fadeIn">
                    <h3 className="font-semibold text-sm text-slate-700 mb-3">
                      {methods.find((m) => m.id === selectedMethod)?.name} Details
                    </h3>
                    {methods
                      .find((m) => m.id === selectedMethod)
                      ?.fields.map((field) => (
                        <div key={field.key} className="mb-3">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {field.label}{' '}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={formData[field.key] || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.key]: e.target.value })
                              }
                              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                            >
                              <option value="">Select...</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type || 'text'}
                              placeholder={field.placeholder}
                              value={formData[field.key] || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.key]: e.target.value })
                              }
                              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                            />
                          )}
                        </div>
                      ))}

                    <button
                      onClick={handleWithdraw}
                      disabled={isSubmitting || !selectedMethod || !canWithdraw}
                      className={`w-full mt-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl transition-all duration-200 ${
                        isSubmitting || !selectedMethod || !canWithdraw
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin inline mr-2" /> Processing...
                        </>
                      ) : (
                        <>
                          <FaArrowRight className="inline mr-2" /> Withdraw ${USD_AMOUNT}
                        </>
                      )}
                    </button>
                    {!canWithdraw && (
                      <p className="text-xs text-red-500 mt-2">
                        You need {WITHDRAWAL_AMOUNT.toLocaleString()} MT Coins to withdraw ${USD_AMOUNT}. Keep earning!
                      </p>
                    )}
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
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-400 uppercase">
                        Date
                      </th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-400 uppercase">
                        Method
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-slate-400 uppercase">
                        MT Coins
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-slate-400 uppercase">
                        Amount
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-slate-400 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => {
                      const status = getStatusBadge(w.status);
                      return (
                        <tr
                          key={w.id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition"
                        >
                          <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(w.createdAt)}
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
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
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}