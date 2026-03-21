import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chatApi } from '../api/services';
import { useAuth } from '../context/AuthContext';

const ChatHistory = () => {
  const { astrologer, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await chatApi.getChatHistory({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setHistory(d?.recordList || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <header className="app-header">
        <h2>AstroGuru - Chat History</h2>
        <div className="header-right">
          <Link to="/" className="nav-link">Dashboard</Link>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <h3>Completed Chats</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
        ) : history.length === 0 ? (
          <div className="no-requests"><p>No chat history found</p></div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Duration</th>
                <th>Earnings</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((chat) => (
                <tr key={chat.id}>
                  <td>{chat.userName || chat.name || 'User'}</td>
                  <td>{chat.totalMin || 0} min</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>
                    &#8377;{parseFloat(chat.deduction || 0).toFixed(2)}
                  </td>
                  <td>{chat.created_at ? new Date(chat.created_at).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
