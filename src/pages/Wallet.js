import React, { useState, useEffect } from 'react';
import { walletApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Wallet = () => {
  const { astrologer } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalEarning, setTotalEarning] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '', paymentMethod: 'bank', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [balRes, txRes, wdRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getTransactions({ startIndex: 0, fetchRecord: 50 }),
        walletApi.getWithdrawRequests({ astrologerId: astrologer?.id }),
      ]);
      if (balRes.status === 'fulfilled') {
        const d = balRes.value.data;
        setBalance(parseFloat(d?.recordList?.amount || d?.data?.amount || 0));
      }
      if (txRes.status === 'fulfilled') {
        const d = txRes.value.data;
        setTransactions(d?.recordList || d?.data || []);
      }
      if (wdRes.status === 'fulfilled') {
        const d = wdRes.value.data;
        const record = d?.recordList || d?.data || {};
        // Withdraw API returns nested: { withdrawl: [...], walletAmount, totalEarning, totalPending, withdrawAmount }
        setWithdrawals(Array.isArray(record) ? record : record.withdrawl || []);
        if (record.walletAmount !== undefined) setBalance(parseFloat(record.walletAmount) || 0);
        setTotalEarning(parseFloat(record.totalEarning) || 0);
        setTotalPending(parseFloat(record.totalPending) || 0);
        setTotalWithdrawn(parseFloat(record.withdrawAmount) || 0);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      toast.error('Enter valid amount'); return;
    }
    if (parseFloat(withdrawForm.amount) > balance) {
      toast.error('Insufficient balance'); return;
    }
    setSubmitting(true);
    try {
      await walletApi.sendWithdrawRequest({
        astrologerId: astrologer?.id,
        amount: withdrawForm.amount,
        paymentMethod: withdrawForm.paymentMethod,
        accountNumber: withdrawForm.accountNumber,
        ifscCode: withdrawForm.ifscCode,
        accountHolderName: withdrawForm.accountHolderName,
        upiId: withdrawForm.upiId,
      });
      toast.success('Withdrawal request sent');
      setShowWithdraw(false);
      setWithdrawForm({ amount: '', paymentMethod: 'bank', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Wallet</h2>
      </div>

      <div className="wallet-balance-card">
        <div className="balance-info">
          <span className="balance-label">Available Balance</span>
          <span className="balance-amount">&#8377;{balance.toFixed(2)}</span>
        </div>
        <button className="withdraw-btn" onClick={() => setShowWithdraw(true)}>Withdraw</button>
      </div>

      <div className="wallet-stats-row">
        <div className="wallet-stat-card earning">
          <span className="stat-label">Total Earnings</span>
          <span className="stat-value">&#8377;{totalEarning.toFixed(2)}</span>
        </div>
        <div className="wallet-stat-card withdrawn">
          <span className="stat-label">Total Withdrawn</span>
          <span className="stat-value">&#8377;{totalWithdrawn.toFixed(2)}</span>
        </div>
        <div className="wallet-stat-card pending">
          <span className="stat-label">Pending</span>
          <span className="stat-value">&#8377;{totalPending.toFixed(2)}</span>
        </div>
      </div>

      {showWithdraw && (
        <div className="modal-overlay" onClick={() => setShowWithdraw(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWithdraw(false)}>&times;</button>
            <h3>Withdraw Request</h3>
            <form onSubmit={handleWithdraw}>
              <div className="form-field">
                <label>Amount *</label>
                <input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Payment Method</label>
                <div className="radio-group">
                  <label><input type="radio" name="method" value="bank" checked={withdrawForm.paymentMethod === 'bank'} onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })} /> Bank Transfer</label>
                  <label><input type="radio" name="method" value="upi" checked={withdrawForm.paymentMethod === 'upi'} onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })} /> UPI</label>
                </div>
              </div>
              {withdrawForm.paymentMethod === 'bank' && (
                <>
                  <div className="form-field">
                    <label>Account Number</label>
                    <input value={withdrawForm.accountNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label>IFSC Code</label>
                    <input value={withdrawForm.ifscCode} onChange={(e) => setWithdrawForm({ ...withdrawForm, ifscCode: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label>Account Holder Name</label>
                    <input value={withdrawForm.accountHolderName} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountHolderName: e.target.value })} />
                  </div>
                </>
              )}
              {withdrawForm.paymentMethod === 'upi' && (
                <div className="form-field">
                  <label>UPI ID</label>
                  <input value={withdrawForm.upiId} onChange={(e) => setWithdrawForm({ ...withdrawForm, upiId: e.target.value })} placeholder="name@upi" />
                </div>
              )}
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {withdrawals.length > 0 && (
        <div className="section">
          <h3>Withdrawal Requests</h3>
          <table className="data-table">
            <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {withdrawals.map((w, i) => (
                <tr key={i}>
                  <td>&#8377;{parseFloat(w.withdrawAmount || w.amount || 0).toFixed(2)}</td>
                  <td>{w.paymentMethod || '-'}</td>
                  <td><span className={`badge ${(w.status || '').toLowerCase()}`}>{w.status || 'Pending'}</span></td>
                  <td>{w.created_at ? new Date(w.created_at).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="empty-state">No transactions found</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Type</th><th>Amount</th><th>Credit/Debit</th><th>Date</th></tr></thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={i}>
                  <td>{tx.transactionType || '-'}</td>
                  <td>&#8377;{parseFloat(tx.amount || 0).toFixed(2)}</td>
                  <td><span className={tx.isCredit == 1 ? 'text-green' : 'text-red'}>{tx.isCredit == 1 ? 'Credit' : 'Debit'}</span></td>
                  <td>{tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Wallet;
