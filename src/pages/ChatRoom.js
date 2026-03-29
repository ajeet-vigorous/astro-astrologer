import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://astrology-i7c9.onrender.com';

const ChatRoom = () => {
  const { chatId } = useParams();
  const { astrologer } = useAuth();
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
        if (chat) setChatDetail(chat);
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
    });

    socket.on('connect', () => {
      console.log('Astrologer chat socket connected');
      socket.emit('join-chat', { chatRequestId: chatId });
    });

    socket.on('new-message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('chat-ended', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info(data.message || 'Chat session ended');
      setChatDetail(prev => ({ ...prev, chatStatus: 'Completed' }));
    });

    socket.on('user-typing', () => setTyping(true));
    socket.on('user-stop-typing', () => setTyping(false));

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    socketRef.current = socket;
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
    if (socketRef.current?.connected) {
      socketRef.current.emit('end-chat', { chatRequestId: chatId });
    }
    if (timerRef.current) clearInterval(timerRef.current);
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
            src={chatDetail?.userProfile ? `https://astrology-i7c9.onrender.com/${chatDetail.userProfile}` : '/default-avatar.png'}
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
        </div>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>Chat started! Send a message to the customer.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`msg-bubble ${msg.senderType === 'astrologer' ? 'sent' : 'received'}`}
            >
              <p className="msg-text">{msg.message}</p>
              <span className="msg-time">{formatMsgTime(msg.created_at)}</span>
            </div>
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
