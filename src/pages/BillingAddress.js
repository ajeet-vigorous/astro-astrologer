import React, { useState, useEffect } from 'react';
import { profileApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const BillingAddress = () => {
  const { astrologer, login } = useAuth();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await profileApi.get({ astrologerId: astrologer?.id });
        const d = res.data;
        const a = d?.recordList?.[0] || d?.recordList || d?.data || {};
        setAddress(a.billingAddress || astrologer?.billingAddress || '');
      } catch (err) {
        setAddress(astrologer?.billingAddress || '');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [astrologer]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateBillingAddress({ astrologerId: astrologer?.id, billingAddress: address });
      // keep the cached astrologer data in sync
      try {
        const token = localStorage.getItem('astrologerToken');
        if (token && astrologer) login(token, { ...astrologer, billingAddress: address });
      } catch (e) {}
      toast.success('Billing address updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
    setSaving(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Update Billing Address</h2>
        <p>This address is used for your payouts and invoices.</p>
      </div>

      <div style={{ maxWidth: 520 }}>
        <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Billing Address</label>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          rows={5}
          placeholder="House/Flat, Street, Area, City, State, PIN code"
          style={{ width: '100%', padding: 12, marginTop: 8, border: '1px solid #e0d4f5', borderRadius: 10, resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem' }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: 14, width: '100%', padding: '12px', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : 'Update Billing Address'}
        </button>
      </div>
    </div>
  );
};

export default BillingAddress;
