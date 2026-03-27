import React, { useState, useEffect } from 'react';
import { callApi } from '../api/services';
import { useAuth } from '../context/AuthContext';

const CallHistory = () => {
  const { astrologer } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await callApi.getCallHistory({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setHistory(res.data?.recordList || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Calls</h2>
        <p>Check your complete call history</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">No call history found</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>User</th><th>Type</th><th>Duration</th><th>Earnings</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.map((call) => (
              <tr key={call.id}>
                <td>{call.userName || call.name || 'User'}</td>
                <td>{call.call_type == 10 ? 'Audio' : 'Video'}</td>
                <td>{call.totalMin || 0} min</td>
                <td className="text-green">&#8377;{parseFloat(call.deduction || 0).toFixed(2)}</td>
                <td>{call.created_at ? new Date(call.created_at).toLocaleDateString('en-IN') : '-'}</td>
                <td><span className="badge completed">Completed</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CallHistory;
