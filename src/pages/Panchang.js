import React, { useState, useEffect } from 'react';
import { kundaliApi } from '../api/services';

const Panchang = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchPanchang = async (dateParam) => {
    setLoading(true);
    try {
      const params = { lang: 'en' };
      if (dateParam && dateParam !== 'today') {
        const d = new Date(dateParam);
        params.date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
      const res = await kundaliApi.getPanchang(params);
      setData(res.data?.data || res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchPanchang('today'); }, []);

  const handleToday = () => { setSelectedDate('today'); setCustomDate(''); fetchPanchang('today'); };
  const handleTomorrow = () => {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    const iso = tmr.toISOString().split('T')[0];
    setSelectedDate('tomorrow'); setCustomDate(iso); fetchPanchang(iso);
  };
  const handleDateChange = (e) => {
    setCustomDate(e.target.value); setSelectedDate('custom'); setShowCalendar(false); fetchPanchang(e.target.value);
  };

  const resp = data?.response || data;

  const getTitle = () => {
    if (selectedDate === 'tomorrow') return "Tomorrow's Panchang (Kal Ka Panchang)";
    if (selectedDate === 'custom' && customDate) return `Panchang for ${new Date(customDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    return "Today's Panchang (Aaj Ka Panchang)";
  };

  const btnStyle = (active) => ({
    padding: '8px 20px', borderRadius: 50, border: '2px solid #e0d4f5', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s',
    background: active ? '#7c3aed' : '#fff', color: active ? '#fff' : '#1a0533', borderColor: active ? '#7c3aed' : '#e0d4f5'
  });
  const cardStyle = { background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0e6ff', overflow: 'hidden' };
  const headerStyle = { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', padding: '12px 20px', fontWeight: 700, textAlign: 'center' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid #f5f0ff' };
  const labelStyle = { fontWeight: 600, color: '#1a0533', fontSize: '0.9rem' };
  const valStyle = { color: '#6b7280', fontSize: '0.9rem' };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{getTitle()}</h2>
        <p>Daily Panchang — Tithi, Nakshatra, Yoga, and auspicious timings for client consultation</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <button style={btnStyle(selectedDate === 'today')} onClick={handleToday}>Today</button>
        <button style={btnStyle(selectedDate === 'tomorrow')} onClick={handleTomorrow}>Tomorrow</button>
        <button style={btnStyle(showCalendar || selectedDate === 'custom')} onClick={() => setShowCalendar(!showCalendar)}>Calendar ▾</button>
        {showCalendar && <input type="date" value={customDate} onChange={handleDateChange} style={{ padding: '8px 12px', border: '2px solid #7c3aed', borderRadius: 10, outline: 'none' }} autoFocus />}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner"></div></div>
      ) : resp?.tithi ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Panchang</div>
            <div>
              <div style={rowStyle}><span style={labelStyle}>Tithi</span><span style={valStyle}>{resp.tithi?.name || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Nakshatra</span><span style={valStyle}>{resp.nakshatra?.name || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Yoga</span><span style={valStyle}>{resp.yoga?.name || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Karana</span><span style={valStyle}>{resp.karana?.name || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Rasi</span><span style={valStyle}>{resp.rasi?.name || '-'}</span></div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={headerStyle}>Additional Info</div>
            <div>
              <div style={rowStyle}><span style={labelStyle}>Sunrise</span><span style={valStyle}>{resp.advanced_details?.sun_rise || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Sunset</span><span style={valStyle}>{resp.advanced_details?.sun_set || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Moonrise</span><span style={valStyle}>{resp.advanced_details?.moon_rise || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Moonset</span><span style={valStyle}>{resp.advanced_details?.moon_set || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Next Full Moon</span><span style={valStyle}>{resp.advanced_details?.next_full_moon || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Next New Moon</span><span style={valStyle}>{resp.advanced_details?.next_new_moon || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Amanta Month</span><span style={valStyle}>{resp.advanced_details?.masa?.amanta_name || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Paksha</span><span style={valStyle}>{resp.advanced_details?.masa?.paksha || '-'}</span></div>
              <div style={rowStyle}><span style={labelStyle}>Purnimanta</span><span style={valStyle}>{resp.advanced_details?.masa?.purnimanta_name || '-'}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-requests"><p>No Panchang data found for this date</p></div>
      )}
    </div>
  );
};

export default Panchang;
