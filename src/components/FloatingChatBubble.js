import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveChat } from '../context/ActiveChatContext';

const styles = {
  container: { position: 'fixed', bottom: 80, right: 20, zIndex: 9999, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  bubble: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  initial: { color: '#fff', fontSize: 22, fontWeight: 800 },
  dot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '3px solid #fff' },
  timer: { background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
};

const FloatingChatBubble = () => {
  const { activeChat } = useActiveChat();
  const navigate = useNavigate();
  const location = useLocation();
  const [elapsed, setElapsed] = useState(0);

  const isOnChatPage = location.pathname.includes('/chat-room/');

  useEffect(() => {
    if (!activeChat || activeChat.chatStatus === 'Completed') return;
    const timer = setInterval(() => {
      if (activeChat.startTime) {
        setElapsed(Math.floor((Date.now() - activeChat.startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeChat]);

  if (!activeChat || activeChat.chatStatus === 'Completed' || isOnChatPage) return null;

  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  const initial = (activeChat.userName || 'C').charAt(0).toUpperCase();

  return (
    <div style={styles.container} onClick={() => navigate(`/chat-room/${activeChat.id}`)}>
      <div style={styles.bubble}>
        <span style={styles.initial}>{initial}</span>
        <div style={styles.dot}></div>
      </div>
      <div style={styles.timer}>{timeStr}</div>
    </div>
  );
};

export default FloatingChatBubble;
