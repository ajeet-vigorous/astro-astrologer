import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatApi, pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { useActiveChat } from '../context/ActiveChatContext';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ChatRoom = () => {
  const { chatId } = useParams();
  const { astrologer } = useAuth();
  const { startChat, endChat: clearActiveChat } = useActiveChat();
  const navigate = useNavigate();
  const [chatDetail, setChatDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [showPujaModal, setShowPujaModal] = useState(false);
  const [myPujas, setMyPujas] = useState([]);
  const [recommendingId, setRecommendingId] = useState(null);

  useEffect(() => {
    initChat();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    setLoading(true);
    try {
      const [detailRes, msgRes] = await Promise.allSettled([
        chatApi.getChatDetail({ chatRequestId: chatId }),
        chatApi.getMessages({ chatRequestId: chatId }),
      ]);

      if (detailRes.status === 'fulfilled') {
        const d = detailRes.value.data;
        const chat = d?.recordList || d?.data;
        if (chat) {
          setChatDetail(chat);
          startChat({ id: chatId, userId: chat.userId, userName: chat.userName, profileImage: chat.profileImage, chatStatus: chat.chatStatus, chatRate: chat.chatRate, startTime: Date.now() });
        }
      }

      if (msgRes.status === 'fulfilled') {
        const d = msgRes.value.data;
        const msgs = d?.recordList || d?.data || [];
        if (Array.isArray(msgs)) setMessages(msgs);
      }

      connectSocket();

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const connectSocket = () => {
    const token = localStorage.getItem('astrologerToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket; // Set ref BEFORE listeners

    socket.on('connect', () => {
      console.log('Astrologer chat socket connected');
      socket.emit('join-chat', { chatRequestId: chatId });
      // Sync messages on reconnect
      chatApi.getMessages({ chatRequestId: chatId }).then(res => {
        const msgs = res.data?.recordList || res.data?.data || [];
        if (Array.isArray(msgs) && msgs.length > 0) setMessages(msgs);
      }).catch(() => {});
    });

    socket.on('new-message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // If message is from customer (other person), mark as delivered then read
      if (msg.senderType === 'user' && msg.senderId !== astrologer?.id) {
        socket.emit('message-delivered', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
        // Mark as read after 2 sec (chat screen is open)
        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('message-read', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
          }
        }, 2000);
      }
    });

    // Message status updates (sent → delivered → read)
    socket.on('messages-status-update', ({ messageIds, status }) => {
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status } : m));
    });

    socket.on('chat-ended', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info(data.message || 'Chat session ended');
      setChatDetail(prev => ({ ...prev, chatStatus: 'Completed' }));
      clearActiveChat();
    });

    // Chat cancelled by customer (Pending state)
    socket.on('chat-cancelled', (data) => {
      toast.info(data.message || 'Customer cancelled the chat request');
      setChatDetail(prev => ({ ...prev, chatStatus: 'Cancelled' }));
      clearActiveChat();
      setTimeout(() => navigate('/'), 2000);
    });

    // Customer disconnected
    socket.on('user-disconnected', (data) => {
      if (data.userType !== 'astrologer') {
        toast.warning('Customer disconnected. Waiting 30s for reconnect...', { autoClose: 10000 });
      }
    });

    // Typing - only show when OTHER person (customer/user) is typing
    socket.on('user-typing', (data) => {
      if (data?.userType !== 'astrologer') setTyping(true);
    });
    socket.on('user-stop-typing', (data) => {
      if (data?.userType !== 'astrologer') setTyping(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', {
        chatRequestId: chatId,
        message: msgText,
      });
      socketRef.current.emit('stop-typing', { chatRequestId: chatId });
    } else {
      try {
        const res = await chatApi.sendMessage({ chatRequestId: chatId, message: msgText });
        const d = res.data;
        if (d?.status === 200 && d?.recordList) {
          setMessages(prev => [...prev, d.recordList]);
        }
      } catch (err) {
        toast.error('Failed to send message');
        setNewMessage(msgText);
      }
    }
    setSending(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { chatRequestId: chatId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stop-typing', { chatRequestId: chatId });
      }, 2000);
    }
  };

  const handleEndChat = () => {
    if (!window.confirm('Are you sure you want to end this chat?')) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('end-chat', { chatRequestId: chatId });
    }
    if (timerRef.current) clearInterval(timerRef.current);
    clearActiveChat();
    navigate('/');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const status = chatDetail?.chatStatus || 'Accepted';
  const astrologerId = astrologer?.id;

  return (
    <div className="chatroom">
      <div className="chatroom-header">
        <div className="chatroom-user-info">
          <img
            src={chatDetail?.userProfile ? `http://localhost:5000/${chatDetail.userProfile}` : '/default-avatar.png'}
            alt={chatDetail?.userName || 'User'}
            onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23e0d4f5"/><text x="50" y="55" text-anchor="middle" font-size="40" fill="%237c3aed">U</text></svg>'; }}
          />
          <div>
            <h4>{chatDetail?.userName || 'User'}</h4>
            <span className="chat-status">{status}</span>
          </div>
        </div>
        <div className="timer-section">
          <span className={`timer ${timeElapsed > 1800 ? 'warning' : ''}`}>
            {formatTime(timeElapsed)}
          </span>
          <button className="end-btn" onClick={handleEndChat}>End Chat</button>
          <button onClick={async () => {
            try { const res = await pujaApi.getList({ astrologerId: astrologer?.id }); setMyPujas(res.data?.recordList || []); } catch(e) {}
            setShowPujaModal(true);
          }} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Recommend Puja</button>
        </div>
      </div>

      {/* Recommend Puja Modal */}
      {showPujaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowPujaModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Recommend Puja to Customer</h3>
            {myPujas.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No pujas available. Create one first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                {myPujas.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid #e0d4f5', borderRadius: 10 }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{p.puja_title}</strong>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#7c3aed' }}>&#8377;{p.puja_price}</p>
                    </div>
                    <button disabled={recommendingId === p.id} onClick={async () => {
                      setRecommendingId(p.id);
                      try {
                        await pujaApi.sendToUser({ astrologerId: astrologer?.id, userId: chatDetail?.userId, puja_id: p.id });
                        toast.success('Puja recommended!');
                        setShowPujaModal(false);
                        // Add puja card to chat messages
                        setMessages(prev => [...prev, {
                          id: 'puja_sent_' + Date.now(),
                          senderType: 'system',
                          message: `__PUJA_SENT__`,
                          pujaData: { pujaTitle: p.puja_title, pujaPrice: p.puja_price, status: 'Sent' },
                          created_at: new Date().toISOString()
                        }]);
                      } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
                      setRecommendingId(null);
                    }} style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                      {recommendingId === p.id ? '...' : 'Send'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowPujaModal(false)} style={{ marginTop: 16, width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Close</button>
          </div>
        </div>
      )}

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>Chat started! Send a message to the customer.</p>
          </div>
        ) : (
          messages.map((msg) => (
            msg.message === '__PUJA_SENT__' && msg.pujaData ? (
              <div key={msg.id} style={{ margin: '12px auto', maxWidth: '85%', background: '#f0fdf4', border: '2px solid #10b981', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                <span style={{ background: '#10b981', color: '#fff', padding: '2px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>Puja Sent</span>
                <h4 style={{ margin: '8px 0 4px', color: '#1a0533' }}>{msg.pujaData.pujaTitle}</h4>
                <p style={{ margin: 0, color: '#7c3aed', fontWeight: 700 }}>&#8377;{msg.pujaData.pujaPrice || 0}</p>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.8rem' }}>Waiting for customer response...</p>
              </div>
            ) : (
              <div
                key={msg.id}
                className={`msg-bubble ${msg.senderType === 'astrologer' ? 'sent' : 'received'}`}
              >
                <p className="msg-text">{msg.message}</p>
                <span className="msg-time">
                  {formatMsgTime(msg.created_at)}
                  {msg.senderType === 'astrologer' && (
                    <span style={{ marginLeft: 4, fontSize: '0.7rem', letterSpacing: -1, color: msg.status === 'read' ? '#34d399' : msg.status === 'delivered' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }}>
                      {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            )
          ))
        )}
        {typing && <div className="typing-indicator">User is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={sending || status === 'Completed'}
        />
        <button type="submit" disabled={sending || !newMessage.trim() || status === 'Completed'}>
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;
