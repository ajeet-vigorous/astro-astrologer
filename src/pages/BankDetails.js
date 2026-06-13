import React, { useState, useEffect } from 'react';
import { bankUpdateApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const FIELDS = [
  { key: 'accountHolderName', label: 'Account Holder Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'ifscCode', label: 'IFSC Code' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'bankBranch', label: 'Branch' },
  { key: 'accountType', label: 'Account Type' },
  { key: 'upi', label: 'UPI ID' },
];

const STATUS_COLOR = { Pending: '#d97706', Approved: '#16a34a', Rejected: '#dc2626' };

const BankDetails = () => {
  const { astrologer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);
  const [latest, setLatest] = useState(null);
  const [form, setForm] = useState({
    accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', bankBranch: '', accountType: 'Saving', upi: '',
  });

  const load = async () => {
    try {
      const res = await bankUpdateApi.myStatus({ astrologerId: astrologer?.id });
      const d = res.data;
      setCurrent(d?.current || null);
      setLatest(d?.latestRequest || null);
      if (d?.current) {
        setForm((f) => ({
          ...f,
          accountHolderName: d.current.accountHolderName || '',
          accountNumber: d.current.accountNumber || '',
          ifscCode: d.current.ifscCode || '',
          bankName: d.current.bankName || '',
          bankBranch: d.current.bankBranch || '',
          accountType: d.current.accountType || 'Saving',
          upi: d.current.upi || '',
        }));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const pending = latest && latest.status === 'Pending';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accountNumber.trim() && !form.upi.trim()) {
      toast.error('Enter at least an account number or a UPI ID'); return;
    }
    setSaving(true);
    try {
      const res = await bankUpdateApi.request({ astrologerId: astrologer?.id, ...form });
      if (res.data?.status === 200) {
        toast.success(res.data.message || 'Request submitted for admin approval');
        load();
      } else {
        toast.error(res.data?.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
    setSaving(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Bank Details</h2>
        <p>Updates are applied after admin approval</p>
      </div>

      {/* Current saved details */}
      <div style={{ padding: 16, border: '1px solid #e0d4f5', borderRadius: 12, background: '#faf7ff', marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 12px', color: '#1a0533', fontSize: '1rem' }}>Current Bank Details</h3>
        {current && (current.accountNumber || current.upi) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.9rem' }}>
            {FIELDS.map(f => (
              <div key={f.key}><span style={{ color: '#6b7280' }}>{f.label}:</span> <strong>{current[f.key] || '-'}</strong></div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>No bank details on file yet.</p>
        )}
      </div>

      {/* Latest request status */}
      {latest && (
        <div style={{ padding: 14, border: '1px solid #e0d4f5', borderRadius: 12, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.9rem' }}>
            Last request: <strong style={{ color: STATUS_COLOR[latest.status] || '#374151' }}>{latest.status}</strong>
            {latest.adminNote ? <span style={{ color: '#6b7280' }}> — {latest.adminNote}</span> : null}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            {latest.created_at ? new Date(latest.created_at).toLocaleString('en-IN') : ''}
          </span>
        </div>
      )}

      {/* Update form (request) */}
      <form onSubmit={handleSubmit} style={{ padding: 16, border: '1px solid #e0d4f5', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 4px', color: '#1a0533', fontSize: '1rem' }}>Request a Change</h3>
        <p style={{ margin: '0 0 14px', color: '#6b7280', fontSize: '0.85rem' }}>
          {pending ? 'You have a pending request. You can submit a new one after admin reviews it.' : 'Fill the details below and submit. Admin will review and approve.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {FIELDS.filter(f => f.key !== 'accountType').map(f => (
            <div className="form-field" key={f.key}>
              <label>{f.label}</label>
              <input name={f.key} value={form[f.key]} onChange={handleChange} disabled={pending} placeholder={f.label} />
            </div>
          ))}
          <div className="form-field">
            <label>Account Type</label>
            <select name="accountType" value={form.accountType} onChange={handleChange} disabled={pending}>
              <option value="Saving">Saving</option>
              <option value="Current">Current</option>
            </select>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={saving || pending} style={{ marginTop: 16 }}>
          {pending ? 'Awaiting Approval' : saving ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </form>
    </div>
  );
};

export default BankDetails;
