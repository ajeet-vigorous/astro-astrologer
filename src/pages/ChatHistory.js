import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import HistoryCard from '../components/HistoryCard';

const ChatHistory = () => {
  const { astrologer } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatModal, setChatModal] = useState(null);   // the chat item being viewed
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  useEffect(() => {
    if (!astrologer?.id) return;
    (async () => {
      try {
        const res = await chatApi.getChatHistory({ astrologerId: astrologer.id, startIndex: 0, fetchRecord: 50 });
        setHistory(res.data?.recordList || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, [astrologer]);

  const openKundli = (item) => {
    navigate('/kundali', { state: { prefill: {
      name: item.intakeName || item.userName || '',
      gender: item.intakeGender || 'Male',
      birthDate: item.intakeBirthDate || '',
      birthTime: item.intakeBirthTime || '',
      birthPlace: item.intakeBirthPlace || '',
      latitude: item.intakeLat || '',
      longitude: item.intakeLong || '',
    } } });
  };

  const viewChat = async (item) => {
    setChatModal(item);
    setMessages([]);
    setMsgLoading(true);
    try {
      const res = await chatApi.getMessages({ chatRequestId: item.id });
      setMessages(res.data?.recordList || []);
    } catch (err) { console.error(err); }
    setMsgLoading(false);
  };

  const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Chat History</h2>
        <p>Your completed chat sessions</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">No chat history found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          {history.map((item) => (
            <HistoryCard key={item.id} item={item} type="chat" onOpenKundli={openKundli} onViewChat={viewChat} />
          ))}
        </div>
      )}

      {/* Read-only chat conversation viewer */}
      {chatModal && (
        <div onClick={() => setChatModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1a0533' }}>{chatModal.intakeName || chatModal.userName || 'User'}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Chat #{chatModal.chatId || chatModal.id}</div>
              </div>
              <button onClick={() => setChatModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#faf7ff' }}>
              {msgLoading ? (
                <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner"></div></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>No messages in this chat</div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderType === 'astrologer';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                      <div style={{
                        maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                        background: mine ? '#7c3aed' : '#fff', color: mine ? '#fff' : '#1f2937',
                        border: mine ? 'none' : '1px solid #e0d4f5', fontSize: '0.9rem', wordBreak: 'break-word',
                      }}>
                        <div>{m.message}</div>
                        <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
