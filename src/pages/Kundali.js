import React, { useState, useRef } from 'react';
import { kundaliApi } from '../api/services';
import { toast } from 'react-toastify';

const Kundali = () => {
  const [form, setForm] = useState({ name: '', gender: 'Male', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [kundaliRecord, setKundaliRecord] = useState(null);
  const [basicReport, setBasicReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePlaceChange = (e) => {
    const place = e.target.value;
    setForm(prev => ({ ...prev, birthPlace: place, latitude: '', longitude: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await kundaliApi.geocode({ place });
        const d = res.data;
        if (d?.latitude && d?.longitude) {
          setForm(prev => ({ ...prev, latitude: String(d.latitude), longitude: String(d.longitude) }));
        }
      } catch (err) { /* silently fail */ }
      setPlaceLoading(false);
    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.birthDate || !form.birthTime || !form.birthPlace) {
      toast.error('Please fill all required fields'); return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error('Location not found. Try a more specific place name.'); return;
    }
    setLoading(true);
    setBasicReport(null);
    setKundaliRecord(null);
    try {
      const res = await kundaliApi.add({
        kundali: [{ name: form.name, gender: form.gender, birthDate: form.birthDate, birthTime: form.birthTime, birthPlace: form.birthPlace, latitude: form.latitude, longitude: form.longitude, pdf_type: 'basic' }]
      });
      const d = res.data?.data || res.data;
      const record = d?.recordList?.[0] || d?.recordList || null;
      setKundaliRecord(record);

      if (record?.id) {
        const basicRes = await kundaliApi.getBasicReport({ kundaliId: record.id, dob: form.birthDate, tob: form.birthTime, lat: form.latitude, lon: form.longitude, tz: 5.5, lang: 'en' });
        const bd = basicRes.data?.data || basicRes.data;
        setBasicReport(bd?.planetDetails || bd);
      }
      toast.success('Kundali generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate kundali');
    }
    setLoading(false);
  };

  const renderPlanetDetails = () => {
    if (!basicReport) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No planet data available</p>;
    if (typeof basicReport === 'string') return <p>{basicReport}</p>;
    const planets = Array.isArray(basicReport) ? basicReport : Object.values(basicReport);
    if (!planets.length) return <p style={{ color: '#9ca3af' }}>No data</p>;

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#7c3aed', color: '#fff' }}>
              <th style={thStyle}>Planet</th><th style={thStyle}>Sign</th><th style={thStyle}>Sign Lord</th>
              <th style={thStyle}>Degree</th><th style={thStyle}>House</th><th style={thStyle}>Retro</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#faf7ff' : '#fff', borderBottom: '1px solid #f0e6ff' }}>
                <td style={tdStyle}><strong>{p.name || p.planet || '-'}</strong></td>
                <td style={tdStyle}>{p.sign || p.zodiac || '-'}</td>
                <td style={tdStyle}>{p.sign_lord || p.signLord || '-'}</td>
                <td style={tdStyle}>{p.fullDegree ? parseFloat(p.fullDegree).toFixed(2) + '°' : p.degree || '-'}</td>
                <td style={tdStyle}>{p.house || '-'}</td>
                <td style={tdStyle}>{p.isRetro === 'true' || p.isRetro === true ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: 600 };
  const tdStyle = { padding: '10px 12px' };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Janam Kundali</h2>
        <p>Generate birth chart for client consultation</p>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Enter name" />
          </div>
          <div className="form-field">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label>Birth Date *</label>
            <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Birth Time *</label>
            <input type="time" name="birthTime" value={form.birthTime} onChange={handleChange} required />
          </div>
          <div className="form-field" style={{ gridColumn: 'span 2' }}>
            <label>Birth Place *</label>
            <div style={{ position: 'relative' }}>
              <input name="birthPlace" value={form.birthPlace} onChange={handlePlaceChange} required placeholder="Enter city name e.g. Delhi, Mumbai" />
              {placeLoading && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #e0d4f5', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }}></span>}
              {form.latitude && !placeLoading && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 700 }}>✓</span>}
            </div>
            {form.latitude && <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, display: 'block' }}>Lat: {form.latitude}, Lon: {form.longitude}</span>}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Kundali'}
        </button>
      </form>

      {(kundaliRecord || basicReport) && (
        <div className="section" style={{ marginTop: 24 }}>
          <h3>{kundaliRecord?.name || form.name}'s Kundali</h3>
          {kundaliRecord && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0 16px', fontSize: '0.85rem', color: '#6b7280' }}>
              <span style={{ background: '#f9f5ff', padding: '4px 10px', borderRadius: 6, border: '1px solid #e0d4f5' }}>DOB: {kundaliRecord.birthDate}</span>
              <span style={{ background: '#f9f5ff', padding: '4px 10px', borderRadius: 6, border: '1px solid #e0d4f5' }}>TOB: {kundaliRecord.birthTime}</span>
              <span style={{ background: '#f9f5ff', padding: '4px 10px', borderRadius: 6, border: '1px solid #e0d4f5' }}>Place: {kundaliRecord.birthPlace}</span>
            </div>
          )}
          {renderPlanetDetails()}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
};

export default Kundali;
