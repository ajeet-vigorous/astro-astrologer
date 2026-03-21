import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { chatApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const Dashboard = () => {
  const { astrologer, logout } = useAuth();
  const navigate = useNavigate();
  const [chatRequests, setChatRequests] = useState([]);
  const [chatStatus, setChatStatus] = useState(astrologer?.chatStatus || 'Offline');
  const [callStatus, setCallStatus] = useState(astrologer?.callStatus || 'Offline');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchRequests();
    connectSocket();

    // Poll for new requests every 5 seconds
    pollRef.current = setInterval(fetchRequests, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const connectSocket = () => {
    const token = localStorage.getItem('astrologerToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Astrologer socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    socketRef.current = socket;
  };

  const fetchRequests = async () => {
    try {
      const res = await chatApi.getRequests({ astrologerId: astrologer?.id });
      const d = res.data;
      if (d?.status === 200) {
        setChatRequests(d.chatRequest || d.recordList || []);
      }
    } catch (err) {
      // Silent
    }
    setLoading(false);
  };

  const handleAccept = async (request) => {
    try {
      // Accept via socket (real-time notification to customer)
      if (socketRef.current?.connected) {
        // First join the chat room
        socketRef.current.emit('join-chat', { chatRequestId: request.id });
        // Then accept
        socketRef.current.emit('accept-chat', { chatRequestId: request.id });
      } else {
        // Fallback: accept via REST API if socket not connected
        await chatApi.acceptRequest({ chatId: request.id });
      }

      toast.success('Chat accepted! Redirecting...');
      // Remove from list
      setChatRequests(prev => prev.filter(r => r.id !== request.id));
      // Navigate to chat room
      setTimeout(() => {
        navigate(`/chat-room/${request.id}`);
      }, 500);
    } catch (err) {
      toast.error('Failed to accept chat');
    }
  };

  const handleReject = async (request) => {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('reject-chat', { chatRequestId: request.id });
      } else {
        await chatApi.rejectRequest({ chatId: request.id });
      }
      toast.success('Chat rejected');
      setChatRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      toast.error('Failed to reject chat');
    }
  };

  const handleStatusChange = async (type, value) => {
    try {
      await chatApi.updateStatus({
        astrologerId: astrologer?.id,
        status: value,
      });
      if (type === 'chat') setChatStatus(value);
      else setCallStatus(value);
      toast.success(`${type === 'chat' ? 'Chat' : 'Call'} status updated to ${value}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="app-header">
        <h2>AstroGuru - Astrologer Panel</h2>
        <div className="header-right">
          <div className="status-toggle">
            <span>Chat:</span>
            <select value={chatStatus} onChange={(e) => handleStatusChange('chat', e.target.value)}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div className="status-toggle">
            <span>Call:</span>
            <select value={callStatus} onChange={(e) => handleStatusChange('call', e.target.value)}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <Link to="/chat-history" className="nav-link">Chat History</Link>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <h3>Chat Requests ({chatRequests.length})</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        ) : chatRequests.length === 0 ? (
          <div className="no-requests">
            <p>No pending chat requests</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Make sure your chat status is Online</p>
          </div>
        ) : (
          <div className="request-grid">
            {chatRequests.map((req) => (
              <div key={req.id} className="request-card">
                <img
                  src={req.userProfile ? (req.userProfile.startsWith('http') ? req.userProfile : `http://localhost:5000/${req.userProfile}`) : '/default-avatar.png'}
                  alt={req.userName || 'User'}
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e0d4f5"/><text x="50" y="55" text-anchor="middle" font-size="40" fill="%237c3aed">U</text></svg>'; }}
                />
                <div className="request-info">
                  <h4>{req.userName || req.intakeName || 'User'}</h4>
                  <p>
                    {req.intakeTopicOfConcern && `Topic: ${req.intakeTopicOfConcern}`}
                    {req.intakeBirthDate && ` | DOB: ${req.intakeBirthDate}`}
                    {req.intakeGender && ` | ${req.intakeGender}`}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : ''}
                  </p>
                </div>
                <div className="request-actions">
                  <button className="accept-btn" onClick={() => handleAccept(req)}>Accept</button>
                  <button className="reject-btn" onClick={() => handleReject(req)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
