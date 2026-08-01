// admin-app/pages/admin/withdrawrequest.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, auth } from '../../components/Auth';
import {
  FiDollarSign,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiUser,
  FiMail,
  FiPhone,
  FiCreditCard,
  FiBank,
  FiGlobe,
  FiInfo,
  FiCornerUpLeft,
  FiEdit,
} from 'react-icons/fi';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

// ── Status badge component ──
function StatusBadge({ status, refunded }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-purple-100 text-purple-800 border-purple-200',
    successful: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
  };
  const icons = {
    pending: <FiClock className="w-3.5 h-3.5" />,
    open: <FiEye className="w-3.5 h-3.5" />,
    processing: <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />,
    successful: <FiCheckCircle className="w-3.5 h-3.5" />,
    failed: <FiXCircle className="w-3.5 h-3.5" />,
  };
  let label = status;
  if (refunded && status === 'failed') {
    label = 'Refunded';
  }
  const style = refunded && status === 'failed' 
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : styles[status] || styles.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      {icons[status] || icons.pending}
      {label}
    </span>
  );
}

// ── Method icon ──
function MethodIcon({ method }) {
  const icons = {
    esewa: <FiPhone className="text-green-600" />,
    khalti: <FiPhone className="text-purple-600" />,
    bank: <FiBank className="text-blue-600" />,
    wise: <FiGlobe className="text-indigo-600" />,
    crypto: <FiCreditCard className="text-orange-600" />,
    paypal: <FiCreditCard className="text-blue-500" />,
    wire: <FiGlobe className="text-gray-600" />,
  };
  return icons[method] || <FiCreditCard className="text-gray-400" />;
}

export default function AdminWithdrawRequests() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [refundingId, setRefundingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [editData, setEditData] = useState({ amount: 0, mtCoins: 0, method: '', details: {} });

  // ── Admin check ──
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.isAdmin)) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, user, router]);

  // ── Fetch all withdrawals ──
  const fetchWithdrawals = async () => {
    setLoadingData(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken(); // ← FIXED
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_BASE}/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch: ${res.status} ${text}`);
      }
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Fetch withdrawals error:', err);
      setError(err.message || 'Failed to load withdrawals.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchWithdrawals();
    }
  }, [user]);

  // ── Update status ──
  const updateStatus = async (withdrawalId, newStatus) => {
    setUpdatingId(withdrawalId);
    setUpdateError('');
    setUpdateSuccess('');
    try {
      const token = await auth.currentUser?.getIdToken(); // ← FIXED
      const res = await fetch(`${API_BASE}/withdrawals/${withdrawalId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUpdateSuccess(`✅ Status updated to ${newStatus}`);
        setTimeout(() => setUpdateSuccess(''), 3000);
        fetchWithdrawals();
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err) {
      setUpdateError(err.message || 'Failed to update status');
      setTimeout(() => setUpdateError(''), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Refund MT Coins ──
  const handleRefund = async () => {
    if (!selectedWithdrawal) return;
    setRefundingId(selectedWithdrawal.id);
    setUpdateError('');
    setUpdateSuccess('');
    try {
      const token = await auth.currentUser?.getIdToken(); // ← FIXED
      const res = await fetch(`${API_BASE}/withdrawals/${selectedWithdrawal.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUpdateSuccess(`✅ Refunded ${selectedWithdrawal.mtCoins} MT Coins to user`);
        setTimeout(() => setUpdateSuccess(''), 4000);
        setShowRefundModal(false);
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      } else {
        throw new Error(data.error || 'Refund failed');
      }
    } catch (err) {
      setUpdateError(err.message || 'Failed to process refund');
      setTimeout(() => setUpdateError(''), 4000);
    } finally {
      setRefundingId(null);
    }
  };

  // ── Edit withdrawal ──
  const updateWithdrawal = async () => {
    const id = selectedWithdrawal?.id;
    if (!id) return;
    setEditingId(id);
    setUpdateError('');
    setUpdateSuccess('');
    try {
      const token = await auth.currentUser?.getIdToken(); // ← FIXED
      const res = await fetch(`${API_BASE}/withdrawals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.success) {
        setUpdateSuccess(`✅ Withdrawal updated successfully`);
        setTimeout(() => setUpdateSuccess(''), 3000);
        setShowEditModal(false);
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err) {
      setUpdateError(err.message || 'Failed to update');
      setTimeout(() => setUpdateError(''), 3000);
    } finally {
      setEditingId(null);
    }
  };

  // ── Format date ──
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      } else if (timestamp.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return 'Invalid date';
    }
  };

  // ── Filter withdrawals ──
  const filtered = filterStatus === 'all'
    ? withdrawals
    : withdrawals.filter(w => w.status === filterStatus);

  // ── Loading state ──
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  // ── Status options ──
  const statusOptions = ['pending', 'open', 'processing', 'successful', 'failed'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiDollarSign className="w-6 h-6 text-amber-500" />
              Withdrawal Requests
            </h1>
            <p className="text-gray-500 text-sm">Manage all withdrawal requests from users</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchWithdrawals}
              disabled={loadingData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-purple-600 hover:text-purple-700 transition"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* ── Errors / Success ── */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {updateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5" />
            {updateError}
          </div>
        )}
        {updateSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5" />
            {updateSuccess}
          </div>
        )}

        {/* ── Filter ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filterStatus === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-400 ml-auto">
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingData ? (
            <div className="p-8 text-center text-gray-500">Loading withdrawals...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No withdrawal requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MT Coins</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-medium">
                            {w.userEmail?.charAt(0) || w.userId?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 truncate max-w-[120px]">
                              {w.userEmail || w.userId || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[120px]">
                              {w.userId || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        ${w.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {w.mtCoins?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MethodIcon method={w.method} />
                          <span className="text-gray-700 capitalize">{w.method}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={w.status} refunded={w.refunded} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(w.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setExpandedRow(expandedRow === w.id ? null : w.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                            title="View details"
                          >
                            {expandedRow === w.id ? (
                              <FiEyeOff className="w-4 h-4 text-gray-500" />
                            ) : (
                              <FiEye className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <select
                            value={w.status}
                            onChange={(e) => updateStatus(w.id, e.target.value)}
                            disabled={updatingId === w.id || refundingId === w.id || editingId === w.id}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition disabled:opacity-50"
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(w);
                              setEditData({
                                amount: w.amount || 0,
                                mtCoins: w.mtCoins || 0,
                                method: w.method || '',
                                details: w.details || {},
                              });
                              setShowEditModal(true);
                            }}
                            disabled={editingId === w.id}
                            className="p-1.5 rounded-lg hover:bg-blue-100 transition text-blue-600 disabled:opacity-50"
                            title="Edit withdrawal"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          {w.status === 'failed' && !w.refunded && (
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(w);
                                setShowRefundModal(true);
                              }}
                              disabled={refundingId === w.id}
                              className="p-1.5 rounded-lg hover:bg-amber-100 transition text-amber-600 disabled:opacity-50"
                              title="Refund MT Coins"
                            >
                              <FiCornerUpLeft className="w-4 h-4" />
                            </button>
                          )}
                          {(updatingId === w.id || refundingId === w.id || editingId === w.id) && (
                            <FiRefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Expanded Row: Payment Details ── */}
        {expandedRow && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiInfo className="w-5 h-5 text-purple-600" />
                Payment Details
              </h3>
              <button
                onClick={() => setExpandedRow(null)}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Close
              </button>
            </div>
            {(() => {
              const w = withdrawals.find((w) => w.id === expandedRow);
              if (!w) return <p className="text-gray-500">Details not found.</p>;
              const details = w.details || {};
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Withdrawal ID</p>
                    <p className="font-mono text-xs text-gray-800">{w.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User ID</p>
                    <p className="font-mono text-xs text-gray-800">{w.userId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Method</p>
                    <p className="font-medium text-gray-800 capitalize">{w.method}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium text-gray-800">${w.amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">MT Coins</p>
                    <p className="font-medium text-gray-800">{w.mtCoins?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <StatusBadge status={w.status} refunded={w.refunded} />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-gray-500">Payment Details</p>
                    <pre className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                  {w.createdAt && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-500">Created At</p>
                      <p className="text-gray-800">{formatDate(w.createdAt)}</p>
                    </div>
                  )}
                  {w.updatedAt && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-500">Last Updated</p>
                      <p className="text-gray-800">{formatDate(w.updatedAt)}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Refund Confirmation Modal ── */}
      {showRefundModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FiCornerUpLeft className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Refund MT Coins</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will refund <strong className="text-gray-800">{selectedWithdrawal.mtCoins.toLocaleString()} MT Coins</strong> 
                  {' '}back to user <span className="font-mono text-xs">{selectedWithdrawal.userId}</span>.
                </p>
                <p className="text-sm text-red-500 mt-2">
                  This action cannot be undone. Only do this if the withdrawal has failed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedWithdrawal(null);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refundingId === selectedWithdrawal.id}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {refundingId === selectedWithdrawal.id ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCornerUpLeft className="w-4 h-4" />
                    Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <FiEdit className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Withdrawal</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Update the details for this withdrawal request.
                </p>
              </div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateWithdrawal();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">MT Coins</label>
                <input
                  type="number"
                  step="1"
                  value={editData.mtCoins}
                  onChange={(e) => setEditData({ ...editData, mtCoins: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <select
                  value={editData.method}
                  onChange={(e) => setEditData({ ...editData, method: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="wise">Wise</option>
                  <option value="crypto">Crypto</option>
                  <option value="paypal">PayPal</option>
                  <option value="wire">Wire Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Details (JSON)</label>
                <textarea
                  value={JSON.stringify(editData.details, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditData({ ...editData, details: parsed });
                    } catch {
                      // Invalid JSON – keep as is, but user must enter valid JSON
                    }
                  }}
                  rows="4"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder='{"phone": "98XXXXXXXX"}'
                />
                <p className="text-xs text-gray-400 mt-1">Must be valid JSON object</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedWithdrawal(null);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingId === selectedWithdrawal?.id}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {editingId === selectedWithdrawal?.id ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}