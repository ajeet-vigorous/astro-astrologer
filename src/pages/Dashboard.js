import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { chatApi, callApi, boostApi, waitlistApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const Dashboard = () => {
  const { astrologer, logout } = useAuth();
  const navigate = useNavigate();
  const [chatRequests, setChatRequests] = useState([]);
  const [callRequests, setCallRequests] = useState([]);
  const [chatStatus, setChatStatus] = useState(astrologer?.chatStatus || 'Offline');
  const [callStatus, setCallStatus] = useState(astrologer?.callStatus || 'Offline');
  const [loading, setLoading] = useState(true);
  const [boostInfo, setBoostInfo] = useState(null);
  const [boosting, setBoosting] = useState(false);
  const [waitlist, setWaitlist] = useState([]);   // customers waiting in this astrologer's queue
  const [showQueue, setShowQueue] = useState(false);  // toggle full queue panel
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchRequests();
    fetchWaitlist();
    connectSocket();
    boostApi.getInfo({ astrologer_id: astrologer?.id }).then(res => setBoostInfo(res.data)).catch(() => {});

    // Poll for new requests + waitlist every 5 seconds (socket is primary, this is fallback)
    pollRef.current = setInterval(() => {
      fetchRequests();
      fetchWaitlist();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchWaitlist = async () => {
    if (!astrologer?.id) return;
    try {
      const res = await waitlistApi.forAstrologer({ astrologerId: astrologer.id });
      setWaitlist(res.data?.queue || []);
    } catch (e) { /* silent */ }
  };

  // Notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.wav');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Browser notification
  const showBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', tag: 'astroguru-request' });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const connectSocket = () => {
    const token = localStorage.getItem('astrologerToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Astrologer socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    // Listen for new chat requests
    socket.on('new-chat-request', (data) => {
      if (data.astrologerId === astrologer?.id) {
        playNotificationSound();
        showBrowserNotification('New Chat Request', `${data.request?.userName || 'A customer'} wants to chat with you!`);
        toast.info('New chat request received!', { autoClose: 10000 });
        fetchRequests(); // Refresh list
      }
    });

    // Listen for new call requests
    socket.on('new-call-request', (data) => {
      if (data.astrologerId === astrologer?.id) {
        playNotificationSound();
        const callType = data.call_type == 11 ? 'Video' : 'Audio';
        showBrowserNotification(`New ${callType} Call Request`, `A customer wants to ${callType.toLowerCase()} call you!`);
        toast.info(`New ${callType} call request received!`, { autoClose: 10000 });
        fetchRequests(); // Refresh list
      }
    });

    // Waitlist live updates — customer joined/left queue, position changes
    socket.on('waitlist:queue-update', (data) => {
      if (Number(data.astrologerId) === Number(astrologer?.id)) {
        setWaitlist(data.queue || []);
      }
    });

    // Auto-trigger: a customer from queue is being asked to start the call now
    socket.on('waitlist:next-picked', (data) => {
      playNotificationSound();
      toast.info(`Next customer ready: ${data.userName || 'Customer'} (from queue)`, { autoClose: 8000 });
      fetchWaitlist();
    });

    socketRef.current = socket;
  };

  const fetchRequests = async () => {
    try {
      const [chatRes, callRes] = await Promise.allSettled([
        chatApi.getRequests({ astrologerId: astrologer?.id }),
        callApi.getRequests({ astrologerId: astrologer?.id }),
      ]);
      if (chatRes.status === 'fulfilled') {
        const d = chatRes.value.data;
        setChatRequests(d?.chatRequest || d?.recordList || []);
      }
      if (callRes.status === 'fulfilled') {
        const d = callRes.value.data;
        setCallRequests(d?.callRequest || d?.recordList || []);
      }
    } catch (err) {}
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

  const handleAcceptCall = async (request) => {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-call', { callId: request.id });
        socketRef.current.emit('accept-call', { callId: request.id });
      } else {
        await callApi.acceptRequest({ callId: request.id });
      }
      toast.success('Call accepted! Redirecting...');
      setCallRequests(prev => prev.filter(r => r.id !== request.id));
      setTimeout(() => navigate(`/call-room/${request.id}`), 500);
    } catch (err) {
      toast.error('Failed to accept call');
    }
  };

  const handleRejectCall = async (request) => {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('reject-call', { callId: request.id });
      } else {
        await callApi.rejectRequest({ callId: request.id });
      }
      toast.success('Call rejected');
      setCallRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      toast.error('Failed to reject call');
    }
  };

  const handleStatusChange = async (type, value) => {
    try {
      const api = type === 'chat' ? chatApi : callApi;
      await api.updateStatus({
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

      {/* Profile Boost Card */}
      {boostInfo && (
        <div style={{ margin: '0 20px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 14, padding: 20, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Boost Your Profile</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>
              {boostInfo.isBoosted ? 'Your profile is boosted! Expires in 24 hours.' : 'Appear on top of astrologer list for 24 hours.'}
              {boostInfo.remainingBoosts !== undefined && ` (${boostInfo.remainingBoosts} boosts remaining this month)`}
            </p>
          </div>
          {!boostInfo.isBoosted && (
            <button onClick={async () => {
              if (!window.confirm('Boost your profile? Commission rates will change for 24 hours.')) return;
              setBoosting(true);
              try {
                const res = await boostApi.boost({ astrologer_id: astrologer?.id });
                if (res.data?.status === 200) { toast.success('Profile boosted!'); boostApi.getInfo({ astrologer_id: astrologer?.id }).then(r => setBoostInfo(r.data)); }
                else toast.error(res.data?.message || 'Failed');
              } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
              setBoosting(false);
            }} disabled={boosting} style={{ background: '#fff', color: '#d97706', border: 'none', padding: '12px 28px', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
              {boosting ? 'Boosting...' : 'Boost Now'}
            </button>
          )}
          {boostInfo.isBoosted && (
            <span style={{ background: 'rgba(255,255,255,0.3)', padding: '8px 20px', borderRadius: 50, fontWeight: 600 }}>Active</span>
          )}
        </div>
      )}

      <div className="dashboard-content">
        {/* Waitlist widget — customers waiting in queue */}
        {waitlist.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '2px solid #f59e0b',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            cursor: 'pointer',
          }} onClick={() => setShowQueue(!showQueue)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#92400e' }}>
                  ⏳ {waitlist.length} customer{waitlist.length > 1 ? 's' : ''} waiting in queue
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#78350f' }}>
                  {showQueue ? 'Click to hide list' : 'Click to view all waiting customers'}
                </p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>{showQueue ? '▲' : '▼'}</span>
            </div>
            {showQueue && (
              <div style={{ marginTop: 12, background: '#fff', borderRadius: 8, padding: 12 }}>
                {waitlist.map(w => (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 0', borderBottom: '1px solid #fef3c7',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#7c3aed', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14,
                    }}>
                      {w.position}
                    </div>
                    <img
                      src={w.profile ? (w.profile.startsWith('http') ? w.profile : `http://localhost:5000/${w.profile}`) : '/default-avatar.png'}
                      alt={w.name || 'User'}
                      style={{ width: 36, height: 36, borderRadius: '50%' }}
                      onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e0d4f5"/><text x="50" y="55" text-anchor="middle" font-size="40" fill="%237c3aed">U</text></svg>'; }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{w.name || `User #${w.userId}`}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {w.requestType} • waiting {w.waitingMin || 0} min
                        {w.status === 'notified' && <span style={{ color: '#16a34a', marginLeft: 8, fontWeight: 700 }}>● READY</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: '0.75rem', color: '#78350f', marginTop: 8, textAlign: 'center' }}>
                  Auto-routed to next when your current call ends
                </p>
              </div>
            )}
          </div>
        )}

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
        {/* Call Requests */}
        <h3 style={{ marginTop: 32 }}>Call Requests ({callRequests.length})</h3>

        {callRequests.length === 0 ? (
          <div className="no-requests">
            <p>No pending call requests</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Make sure your call status is Online</p>
          </div>
        ) : (
          <div className="request-grid">
            {callRequests.map((req) => (
              <div key={req.id} className="request-card call-request-card">
                <img
                  src={req.userProfile ? (req.userProfile.startsWith('http') ? req.userProfile : `http://localhost:5000/${req.userProfile}`) : '/default-avatar.png'}
                  alt={req.userName || 'User'}
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e0d4f5"/><text x="50" y="55" text-anchor="middle" font-size="40" fill="%237c3aed">U</text></svg>'; }}
                />
                <div className="request-info">
                  <h4>{req.userName || req.intakeName || 'User'} <span className="call-type-badge">{req.call_type == 11 ? 'Video' : 'Audio'}</span></h4>
                  <p>
                    {req.intakeTopicOfConcern && `Topic: ${req.intakeTopicOfConcern}`}
                    {req.intakeGender && ` | ${req.intakeGender}`}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : ''}
                  </p>
                </div>
                <div className="request-actions">
                  <button className="accept-btn" onClick={() => handleAcceptCall(req)}>Accept</button>
                  <button className="reject-btn" onClick={() => handleRejectCall(req)}>Reject</button>
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
