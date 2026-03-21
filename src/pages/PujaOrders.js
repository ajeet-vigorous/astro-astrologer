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
      const res = await pujaApi.getList({ astrologerId: astrologer?.id, type: 'orders', startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setOrders(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSendToUser = async (order) => {
    setSendingTo(order.id);
    try {
      await pujaApi.sendToUser({ orderId: order.id, userId: order.userId, astrologerId: astrologer?.id });
      toast.success('Puja sent to user');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to send puja');
    }
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
            <tr><th>User</th><th>Puja</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i}>
                <td>{o.userName || 'User'}</td>
                <td>{o.pujaName || o.name || '-'}</td>
                <td>&#8377;{parseFloat(o.amount || o.pujaPrice || 0).toFixed(2)}</td>
                <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '-'}</td>
                <td><span className={`badge ${(o.status || 'pending').toLowerCase()}`}>{o.status || 'Pending'}</span></td>
                <td>
                  {o.status !== 'completed' && (
                    <button
                      className="btn-sm btn-primary"
                      onClick={() => handleSendToUser(o)}
                      disabled={sendingTo === o.id}
                    >
                      {sendingTo === o.id ? 'Sending...' : 'Send to User'}
                    </button>
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
