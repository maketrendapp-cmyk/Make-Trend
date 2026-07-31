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
  FaBalanceScale,
  FaArrowUp,
  FaArrowDown,
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

  const WITHDRAWAL_AMOUNT = 2500;
  const USD_AMOUNT = 15;

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
    stats: { views: 0, shares: 0, completions: 0, unlocks: 0 },
  };
  const canWithdraw = (mtCoins.available || 0) >= WITHDRAWAL_AMOUNT;

  const handleWithdraw = () => {
    if (!selectedMethod) {
      setError('Please select a payment method.');
      return;
    }
    if (!canWithdraw) {
      setError(`Insufficient MT Coins. You need ${WITHDRAWAL_AMOUNT} MT Coins ($15) to withdraw.`);
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
      bank: <FaUniversity />,
      wise: <FaCreditCard />,
      crypto: <FaBitcoin />,
      paypal: <FaPaypal />,
      wire: <FaBuilding />,
    };
    return icons[methodId] || <FaWallet />;
  };

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

  return (
    <>
      <Meta title="Withdraw – MT Coins" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>

          {/* ─── Profile Header ─── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Avatar */}
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

              {/* Name & Email */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-xl font-bold text-slate-900 truncate">{profile?.fullname}</h1>
                <p className="text-slate-500 text-sm flex items-center justify-center sm:justify-start gap-2 truncate">
                  <FaEnvelope className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </p>
              </div>

              {/* ─── NEW: Available & Spent MT Coins ─── */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {/* Available */}
                <div className="flex-shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 rounded-xl border border-emerald-200 text-center min-w-[100px]">
                  <p className="text-[10px] sm:text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                    <FaArrowUp className="text-emerald-500" /> Available
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">
                    {mtCoins.available?.toLocaleString() || 0}
                  </p>
                </div>

                {/* Spent */}
                <div className="flex-shrink-0 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-2 rounded-xl border border-rose-200 text-center min-w-[100px]">
                  <p className="text-[10px] sm:text-xs text-rose-600 font-medium flex items-center justify-center gap-1">
                    <FaArrowDown className="text-rose-500" /> Spent
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-rose-700">
                    {mtCoins.spent?.toLocaleString() || 0}
                  </p>
                </div>

                {/* Earned (small badge) */}
                <div className="flex-shrink-0 bg-slate-100 px-2.5 py-1 rounded-full text-xs text-slate-600 font-medium border border-slate-200">
                  Earned: {mtCoins.earned?.toLocaleString() || 0}
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

          {/* ─── IMPROVED: How MT Coins Are Earned ─── */}
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
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-full">
                    <strong>2,500 MT Coins</strong> = <strong className="text-emerald-600">$15.00</strong>
                  </span>
                  <span>•</span>
                  <span>Each withdrawal is <strong>exactly $15</strong></span>
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
                  <p className="text-2xl font-bold text-purple-800">$15.00</p>
                  <p className="text-xs text-purple-600">= 2,500 MT Coins (exact amount)</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Your balance:{' '}
                    <strong>{mtCoins.available?.toLocaleString() || 0}</strong> MT Coins
                    {canWithdraw ? ' ✅' : ' ❌ Insufficient'}
                  </p>
                </div>

                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                          <FaArrowRight className="inline mr-2" /> Withdraw $15
                        </>
                      )}
                    </button>
                    {!canWithdraw && (
                      <p className="text-xs text-red-500 mt-2">
                        You need {WITHDRAWAL_AMOUNT} MT Coins to withdraw $15. Keep earning!
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
                          <td className="py-3 px-2 text-xs text-slate-500">
                            {w.createdAt
                              ? new Date(w.createdAt.seconds * 1000).toLocaleDateString()
                              : '—'}
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

          {/* ─── Quick Earn Guide (compact footer) ─── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white/70 rounded-lg p-3 border border-slate-200/60">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <FaEye className="text-purple-600 text-sm" />
              </div>
              <p className="text-xs font-bold text-slate-700">View</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-slate-200/60">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <FaShareAlt className="text-blue-600 text-sm" />
              </div>
              <p className="text-xs font-bold text-slate-700">Share</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-slate-200/60">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <FaUnlock className="text-amber-600 text-sm" />
              </div>
              <p className="text-xs font-bold text-slate-700">Unlock</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-slate-200/60">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <FaCheckCircle className="text-emerald-600 text-sm" />
              </div>
              <p className="text-xs font-bold text-slate-700">Complete</p>
            </div>
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