import React, { useState, useEffect } from 'react';
import { pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const PujaOrders = () => {
  const { astrologer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await pujaApi.getOrders({ astrologerId: astrologer?.id });
      const d = res.data;
      setOrders(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleComplete = async (orderId) => {
    if (!window.confirm('Mark this puja as completed?')) return;
    setSendingTo(orderId);
    try {
      const res = await pujaApi.completeOrder({ orderId, astrologerId: astrologer?.id });
      if (res.data?.status === 200) { toast.success('Puja completed!'); fetchOrders(); }
      else toast.error(res.data?.message || 'Failed');
    } catch (err) { toast.error('Failed'); }
    setSendingTo(null);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Puja Orders</h2>
        <p>Orders received from users</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">No puja orders found</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>User</th><th>Contact</th><th>Puja</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i}>
                <td>{o.userName || 'User'}</td>
                <td>{o.contactNo || '-'}</td>
                <td>{o.pujaTitle || o.puja_name || '-'}</td>
                <td>&#8377;{parseFloat(o.order_total_price || 0).toFixed(2)}</td>
                <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '-'}</td>
                <td><span className={`badge ${(o.puja_order_status || 'placed').toLowerCase()}`}>{o.puja_order_status || 'Placed'}</span></td>
                <td>
                  {o.puja_order_status !== 'completed' ? (
                    <button
                      className="btn-sm btn-primary"
                      onClick={() => handleComplete(o.id)}
                      disabled={sendingTo === o.id}
                    >
                      {sendingTo === o.id ? '...' : 'Mark Complete'}
                    </button>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PujaOrders;
