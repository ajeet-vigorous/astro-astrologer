import React, { useState, useEffect } from 'react';
import { horoscopeApi } from '../api/services';

const zodiacDates = {
  Aries: 'Mar 21 - Apr 19', Taurus: 'Apr 20 - May 20', Gemini: 'May 21 - Jun 20',
  Cancer: 'Jun 21 - Jul 22', Leo: 'Jul 23 - Aug 22', Virgo: 'Aug 23 - Sep 22',
  Libra: 'Sep 23 - Oct 22', Scorpio: 'Oct 23 - Nov 21', Sagittarius: 'Nov 22 - Dec 21',
  Capricorn: 'Dec 22 - Jan 19', Aquarius: 'Jan 20 - Feb 18', Pisces: 'Feb 19 - Mar 20'
};

const zodiacIcons = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
};

const Horoscope = () => {
  const [signs, setSigns] = useState([]);
  const [selectedSign, setSelectedSign] = useState(null);
  const [vedicList, setVedicList] = useState(null);
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [signsLoading, setSignsLoading] = useState(true);
  const [lang, setLang] = useState('en');
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const fetchSigns = async () => {
      try {
        const res = await horoscopeApi.getSigns();
        const d = res.data?.data || res.data;
        const list = Array.isArray(d) ? d : d?.recordList || [];
        setSigns(list.filter(s => s.isActive == 1 || s.isActive === undefined));
      } catch (err) { console.error(err); }
      setSignsLoading(false);
    };
    fetchSigns();
    horoscopeApi.getEnabledLanguages().then(res => {
      const list = res.data?.recordList || [];
      setLanguages(list.length ? list : [{ code: 'en', name: 'English' }]);
    }).catch(() => setLanguages([{ code: 'en', name: 'English' }]));
  }, []);

  const fetchHoroscope = async (sign, langCode) => {
    setSelectedSign(sign);
    setLoading(true);
    setTab('daily');
    try {
      const res = await horoscopeApi.getDaily({ horoscopeSignId: sign.id, langcode: langCode || lang });
      const d = res.data?.data || res.data;
      setVedicList(d?.vedicList || null);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const getActiveData = () => {
    if (!vedicList) return null;
    switch (tab) {
      case 'daily': return vedicList.todayHoroscope?.[0] || null;
      case 'weekly': return vedicList.weeklyHoroScope?.[0] || null;
      case 'yearly': return vedicList.yearlyHoroScope?.[0] || null;
      default: return null;
    }
  };

  const data = getActiveData();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (signsLoading) return <div className="page-container"><div className="spinner" style={{ margin: '40px auto' }}></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Daily Horoscope</h2>
        <p>Select a zodiac sign to view horoscope predictions</p>
      </div>

      <div className="zodiac-grid">
        {signs.map((sign) => (
          <div
            key={sign.id}
            className={`zodiac-card ${selectedSign?.id === sign.id ? 'active' : ''}`}
            onClick={() => fetchHoroscope(sign)}
          >
            <span className="zodiac-icon">{zodiacIcons[sign.name] || '⭐'}</span>
            <span className="zodiac-name">{sign.name}</span>
            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{zodiacDates[sign.name] || ''}</span>
          </div>
        ))}
      </div>

      {loading && <div className="page-loading"><div className="spinner"></div></div>}

      {selectedSign && vedicList && !loading && (
        <div className="horoscope-result">
          <h3>{zodiacIcons[selectedSign.name]} {selectedSign.name}</h3>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={lang} onChange={(e) => { setLang(e.target.value); if (selectedSign) fetchHoroscope(selectedSign, e.target.value); }}
              style={{ padding: '8px 14px', border: '2px solid #e0d4f5', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, color: '#1a0533', outline: 'none', marginBottom: 12 }}>
              {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            {['daily', 'weekly', 'yearly'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '8px 20px', borderRadius: 50, border: '2px solid #e0d4f5', cursor: 'pointer', fontWeight: 600,
                  background: tab === t ? '#7c3aed' : '#fff', color: tab === t ? '#fff' : '#1a0533', borderColor: tab === t ? '#7c3aed' : '#e0d4f5', transition: 'all 0.3s'
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {data ? (
            <div className="horoscope-content">
              {tab === 'daily' && data.date && <p style={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.85rem', marginBottom: 12 }}>Date: {formatDate(data.date)}</p>}
              {tab === 'weekly' && data.start_date && <p style={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.85rem', marginBottom: 12 }}>Week: {formatDate(data.start_date)} - {formatDate(data.end_date)}</p>}
              {tab === 'yearly' && data.month_range && <p style={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.85rem', marginBottom: 12 }}>Period: {data.month_range}</p>}

              {data.bot_response && <p style={{ lineHeight: 1.8, marginBottom: 16 }}>{data.bot_response}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {data.career != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Career</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.career}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.relationship != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Relationship</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.relationship}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.health != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Health</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.health}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.finances != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Finances</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.finances}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.family != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Family</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.family}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.friends != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Friends</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.friends}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.travel != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Travel</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.travel}{tab === 'yearly' ? '%' : ''}</div></div>}
                {data.status != null && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #e0d4f5' }}><div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Status</div><div style={{ fontWeight: 700, color: '#7c3aed' }}>{data.status}{tab === 'yearly' ? '%' : ''}</div></div>}
              </div>

              {(data.lucky_color || data.lucky_number || data.total_score) && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                  {data.total_score && <span style={{ color: '#7c3aed', fontSize: '0.9rem' }}><strong>Score:</strong> {data.total_score}</span>}
                  {data.lucky_color && <span style={{ color: '#7c3aed', fontSize: '0.9rem' }}><strong>Lucky Color:</strong> {data.lucky_color} {data.lucky_color_code && <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: data.lucky_color_code, marginLeft: 4, verticalAlign: 'middle', border: '1px solid #ddd' }}></span>}</span>}
                  {data.lucky_number && <span style={{ color: '#7c3aed', fontSize: '0.9rem' }}><strong>Lucky Number:</strong> {typeof data.lucky_number === 'string' && data.lucky_number.startsWith('[') ? JSON.parse(data.lucky_number).join(', ') : data.lucky_number}</span>}
                </div>
              )}

              {tab === 'yearly' && (data.health_remark || data.career_remark || data.relationship_remark || data.status_remark) && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.health_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Health:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.health_remark}</p></div>}
                  {data.career_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Career:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.career_remark}</p></div>}
                  {data.relationship_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Relationship:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.relationship_remark}</p></div>}
                  {data.travel_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Travel:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.travel_remark}</p></div>}
                  {data.family_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Family:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.family_remark}</p></div>}
                  {data.friends_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Friends:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.friends_remark}</p></div>}
                  {data.finances_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Finances:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.finances_remark}</p></div>}
                  {data.status_remark && <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5' }}><strong style={{ color: '#7c3aed' }}>Status:</strong> <p style={{ margin: '4px 0 0', lineHeight: 1.6 }}>{data.status_remark}</p></div>}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#9ca3af' }}>No horoscope data available for this period</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Horoscope;
