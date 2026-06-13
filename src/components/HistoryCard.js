import React, { useState } from 'react';
import { remedyApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const REMEDY_CATEGORIES = ['Gemstone', 'Mantra', 'Puja', 'Daan', 'Other'];

const fmtDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// DOB like "17-July-1990, 09:46 AM"
const fmtDob = (dateStr, timeStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return '-';
  const datePart = `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  if (!timeStr) return datePart;
  // timeStr is "HH:MM:SS"
  const [h, m] = String(timeStr).split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${datePart}, ${String(hour).padStart(2, '0')}:${m || '00'} ${ampm}`;
};

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', fontSize: '0.92rem', marginBottom: 6 }}>
    <span style={{ width: 96, color: '#374151', fontWeight: 600, flexShrink: 0 }}>{label}</span>
    <span style={{ color: '#374151', marginRight: 6 }}>:</span>
    <span style={{ color: '#111827' }}>{value}</span>
  </div>
);

const HistoryCard = ({ item, type, onOpenKundli, onViewChat }) => {
  const { astrologer } = useAuth();
  const [remedyOpen, setRemedyOpen] = useState(false);
  const [remedyCat, setRemedyCat] = useState(REMEDY_CATEGORIES[0]);
  const [remedyText, setRemedyText] = useState('');
  const [remedySaving, setRemedySaving] = useState(false);

  const submitRemedy = async () => {
    if (!remedyText.trim()) { toast.error('Please write the remedy'); return; }
    setRemedySaving(true);
    try {
      await remedyApi.send({
        astrologerId: astrologer?.id,
        userId: item.userId,
        chatRequestId: item.id,
        category: remedyCat,
        remedy: remedyText.trim(),
      });
      toast.success('Remedy sent to customer');
      setRemedyOpen(false); setRemedyText(''); setRemedyCat(REMEDY_CATEGORIES[0]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send remedy');
    }
    setRemedySaving(false);
  };

  const name = item.intakeName || item.userName || 'User';
  const gender = item.intakeGender || '-';
  const dob = fmtDob(item.intakeBirthDate, item.intakeBirthTime);
  const pob = item.intakeBirthPlace || '-';
  const duration = `${item.totalMin || 0} minutes`;
  const rate = type === 'chat'
    ? (item.chatRate || item.astrologerCharge || 0)
    : (item.call_type == 11 ? (item.astrologerVideoCallRate || item.callRate || item.astrologerCharge || 0) : (item.callRate || item.astrologerCharge || 0));
  const amount = parseFloat(item.deduction || 0).toFixed(2);
  const sessionId = item.chatId || item.callId || item.id;
  const canOpenKundli = !!(item.intakeBirthDate && item.intakeBirthPlace);

  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #f0e9fb' }}>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
        {type === 'call' && (
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>
            {item.call_type == 11 ? 'Video' : 'Audio'} Call
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>
          Completed
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>&#10003;</span>
        </span>
        <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#111827' }}>&#8377; {amount}</span>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>#{sessionId}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 14 }}>
          {fmtDate(item.created_at)} ({fmtTime(item.created_at)} - {fmtTime(item.updated_at)})
        </div>

        <Row label="Name" value={name} />
        <Row label="Gender" value={gender} />
        <Row label="DOB" value={dob} />
        <Row label="Duration" value={duration} />
        <Row label="Rate" value={`₹ ${rate}/min`} />
        <Row label="POB" value={pob} />

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {type === 'chat' && onViewChat && (
            <button
              onClick={() => onViewChat(item)}
              style={{
                flex: 1, padding: '11px 16px', border: '1px solid #7c3aed', borderRadius: 8,
                background: '#fff', color: '#7c3aed', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              }}
            >
              View Chat
            </button>
          )}
          <button
            onClick={() => onOpenKundli(item)}
            disabled={!canOpenKundli}
            title={canOpenKundli ? 'Open this customer’s kundli' : 'No birth details available for this session'}
            style={{
              flex: 1, padding: '11px 16px', border: 'none', borderRadius: 8,
              background: canOpenKundli ? '#16a34a' : '#d1d5db', color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              cursor: canOpenKundli ? 'pointer' : 'not-allowed',
            }}
          >
            Open Kundli
          </button>
        </div>

        <button
          onClick={() => setRemedyOpen(true)}
          style={{
            marginTop: 10, width: '100%', padding: '11px 16px', borderRadius: 8,
            border: '1px solid #f59e0b', background: '#fffbeb', color: '#b45309', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
          }}
        >
          Suggest Remedy
        </button>
      </div>

      {remedyOpen && (
        <div onClick={() => setRemedyOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ margin: 0, color: '#1a0533' }}>Suggest Remedy</h3>
              <button onClick={() => setRemedyOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#6b7280' }}>For {name}</p>

            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Category</label>
            <select value={remedyCat} onChange={e => setRemedyCat(e.target.value)}
              style={{ width: '100%', padding: 10, margin: '6px 0 14px', border: '1px solid #e0d4f5', borderRadius: 8 }}>
              {REMEDY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Remedy Details</label>
            <textarea value={remedyText} onChange={e => setRemedyText(e.target.value)} rows={4}
              placeholder="e.g. Wear a 5-carat yellow sapphire on Thursday; chant Guru mantra 108 times daily."
              style={{ width: '100%', padding: 10, margin: '6px 0 14px', border: '1px solid #e0d4f5', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit' }} />

            <button onClick={submitRemedy} disabled={remedySaving}
              style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: remedySaving ? 'not-allowed' : 'pointer', opacity: remedySaving ? 0.6 : 1 }}>
              {remedySaving ? 'Sending...' : 'Send Remedy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryCard;
