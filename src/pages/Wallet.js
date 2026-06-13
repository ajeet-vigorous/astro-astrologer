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
  const [tdsPercent, setTdsPercent] = useState(0);
  const [pgChargePercent, setPgChargePercent] = useState(2.5);
  const [savedBank, setSavedBank] = useState(null);
  const [savedUpi, setSavedUpi] = useState(null);
  const [expandedWd, setExpandedWd] = useState(null);

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
        // Saved bank/UPI (from admin) + deduction charges for the breakdown
        if (record.bankDetails) setSavedBank(record.bankDetails);
        if (record.upi) setSavedUpi(record.upi);
        if (record.tdsPercent !== undefined) setTdsPercent(parseFloat(record.tdsPercent) || 0);
        if (record.pgChargePercent !== undefined) setPgChargePercent(parseFloat(record.pgChargePercent) || 0);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // Open the withdraw modal pre-filled with the astrologer's saved bank/UPI (auto method)
  const openWithdraw = () => {
    const hasBank = savedBank && (savedBank.accountNumber || savedBank.ifscCode);
    setWithdrawForm({
      amount: '',
      paymentMethod: hasBank ? 'bank' : (savedUpi ? 'upi' : 'bank'),
      accountNumber: savedBank?.accountNumber || '',
      ifscCode: savedBank?.ifscCode || '',
      accountHolderName: savedBank?.accountHolderName || '',
      upiId: savedUpi || '',
    });
    setShowWithdraw(true);
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
        <button className="withdraw-btn" onClick={openWithdraw}>Withdraw</button>
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

              {/* Deduction breakdown — shown live as the astrologer types the amount */}
              {(() => {
                const wAmt = parseFloat(withdrawForm.amount) || 0;
                if (wAmt <= 0) return null;
                const tds = wAmt * tdsPercent / 100;
                const pg = wAmt * pgChargePercent / 100;
                const payable = wAmt - tds - pg;
                const row = { display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', margin: '6px 0' };
                return (
                  <div style={{ background: '#faf7ff', border: '1px solid #e0d4f5', borderRadius: 10, padding: 14, margin: '14px 0' }}>
                    <div style={{ fontWeight: 700, color: '#1a0533', marginBottom: 8 }}>Withdrawal Breakdown</div>
                    <div style={row}><span>Withdraw Amount</span><span>&#8377;{wAmt.toFixed(2)}</span></div>
                    <div style={{ ...row, color: '#dc2626' }}><span>TDS ({tdsPercent}%)</span><span>- &#8377;{tds.toFixed(2)}</span></div>
                    <div style={{ ...row, color: '#dc2626' }}><span>PG Charge ({pgChargePercent}%)</span><span>- &#8377;{pg.toFixed(2)}</span></div>
                    <hr style={{ border: 'none', borderTop: '1px dashed #c4b5fd', margin: '10px 0' }} />
                    <div style={{ ...row, fontWeight: 700, fontSize: '1rem', color: '#16a34a' }}>
                      <span>You'll Receive</span><span>&#8377;{payable.toFixed(2)}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '8px 0 0' }}>
                      &#8377;{wAmt.toFixed(2)} will be deducted from your wallet; charges above are subtracted from your payout.
                    </p>
                  </div>
                );
              })()}

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
            <thead><tr><th>Amount</th><th>You Get</th><th>Method</th><th>Status</th><th>Date</th><th>Breakup</th></tr></thead>
            <tbody>
              {withdrawals.map((w, i) => {
                const amt = parseFloat(w.withdrawAmount || w.amount || 0);
                const tds = parseFloat(w.tds_pay_amount || 0);
                const payable = w.pay_amount != null ? parseFloat(w.pay_amount) : amt;
                const pg = Math.max(0, amt - tds - payable);
                const isOpen = expandedWd === i;
                const brow = { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', margin: '5px 0' };
                return (
                  <React.Fragment key={i}>
                    <tr>
                      <td>&#8377;{amt.toFixed(2)}</td>
                      <td className="text-green">&#8377;{payable.toFixed(2)}</td>
                      <td>{w.paymentMethod || '-'}</td>
                      <td><span className={`badge ${(w.status || '').toLowerCase()}`}>{w.status || 'Pending'}</span></td>
                      <td>{w.created_at ? new Date(w.created_at).toLocaleDateString('en-IN') : '-'}</td>
                      <td>
                        <button type="button" onClick={() => setExpandedWd(isOpen ? null : i)}
                          style={{ background: 'none', border: '1px solid #c4b5fd', color: '#7c3aed', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                          {isOpen ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ background: '#faf7ff', padding: 14 }}>
                          <div style={{ maxWidth: 360 }}>
                            <div style={{ fontWeight: 700, color: '#1a0533', marginBottom: 8 }}>Withdrawal Breakup</div>
                            <div style={brow}><span>Withdraw Amount</span><span>&#8377;{amt.toFixed(2)}</span></div>
                            <div style={{ ...brow, color: '#dc2626' }}><span>PG Charge</span><span>- &#8377;{pg.toFixed(2)}</span></div>
                            <div style={{ ...brow, color: '#dc2626' }}><span>TDS</span><span>- &#8377;{tds.toFixed(2)}</span></div>
                            <hr style={{ border: 'none', borderTop: '1px dashed #c4b5fd', margin: '8px 0' }} />
                            <div style={{ ...brow, fontWeight: 700, color: '#16a34a' }}><span>Payable Amount</span><span>&#8377;{payable.toFixed(2)}</span></div>
                            {w.Note && <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '8px 0 0' }}>{w.Note}</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
