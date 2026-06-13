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
            <HistoryCard key={item.id} item={item} type="chat" onOpenKundli={openKundli} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
