import React, { useState, useRef } from 'react';
import { kundaliApi } from '../api/services';
import { toast } from 'react-toastify';

const KundaliMatching = () => {
  const [boy, setBoy] = useState({ name: '', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [girl, setGirl] = useState({ name: '', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const boyDebounce = useRef(null);
  const girlDebounce = useRef(null);

  const geocodePlace = (place, setter, data, debounceRef) => {
    setter({ ...data, birthPlace: place, latitude: '', longitude: '' });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 3) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await kundaliApi.geocode({ place });
        const d = res.data;
        if (d?.latitude && d?.longitude) {
          setter(prev => ({ ...prev, latitude: String(d.latitude), longitude: String(d.longitude) }));
        }
      } catch (err) { /* silently fail */ }
    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!boy.name || !boy.birthDate || !boy.birthTime || !boy.birthPlace ||
        !girl.name || !girl.birthDate || !girl.birthTime || !girl.birthPlace) {
      toast.error('Please fill all fields for both'); return;
    }
    if (!boy.latitude || !girl.latitude) {
      toast.error('Location not found. Try more specific place names.'); return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Create kundali records for both in parallel
      const [boyRes, girlRes] = await Promise.all([
        kundaliApi.add({ kundali: [{ name: boy.name, gender: 'Male', birthDate: boy.birthDate, birthTime: boy.birthTime, birthPlace: boy.birthPlace, latitude: boy.latitude, longitude: boy.longitude, pdf_type: 'basic' }] }),
        kundaliApi.add({ kundali: [{ name: girl.name, gender: 'Female', birthDate: girl.birthDate, birthTime: girl.birthTime, birthPlace: girl.birthPlace, latitude: girl.latitude, longitude: girl.longitude, pdf_type: 'basic' }] })
      ]);

      const boyId = (boyRes.data?.data || boyRes.data)?.recordList?.[0]?.id || (boyRes.data?.data || boyRes.data)?.recordList?.id;
      const girlId = (girlRes.data?.data || girlRes.data)?.recordList?.[0]?.id || (girlRes.data?.data || girlRes.data)?.recordList?.id;

      if (!boyId || !girlId) { toast.error('Failed to create kundali records'); setLoading(false); return; }

      // Get match report
      const matchRes = await kundaliApi.matchReport({ maleKundaliId: boyId, femaleKundaliId: girlId, match_type: 'North' });
      const d = matchRes.data?.data || matchRes.data;
      setResult(d);
      toast.success('Matching report generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate matching');
    }
    setLoading(false);
  };

  const PlaceField = ({ data, setter, label, debounceRef }) => (
    <div className="form-field" style={{ gridColumn: 'span 2' }}>
      <label>Birth Place *</label>
      <div style={{ position: 'relative' }}>
        <input value={data.birthPlace} onChange={(e) => geocodePlace(e.target.value, setter, data, debounceRef)} required placeholder={`${label}'s birth place`} />
        {data.latitude && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 700 }}>✓</span>}
      </div>
      {data.latitude && <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, display: 'block' }}>Lat: {data.latitude}, Lon: {data.longitude}</span>}
    </div>
  );

  const matchData = result?.recordList;
  const boyManglik = result?.boyManaglikRpt;
  const girlManglik = result?.girlMangalikRpt;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Kundali Matching</h2>
        <p>Check compatibility (Ashtakoot Gun Milan) for client consultation</p>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <h3 className="form-section-title" style={{ color: '#7c3aed', borderBottom: '2px solid #f0e6ff', paddingBottom: 8, marginBottom: 16 }}>Boy's Details</h3>
        <div className="form-grid">
          <div className="form-field"><label>Name *</label><input value={boy.name} onChange={(e) => setBoy({ ...boy, name: e.target.value })} required placeholder="Boy's name" /></div>
          <div className="form-field"><label>Birth Date *</label><input type="date" value={boy.birthDate} onChange={(e) => setBoy({ ...boy, birthDate: e.target.value })} required /></div>
          <div className="form-field"><label>Birth Time *</label><input type="time" value={boy.birthTime} onChange={(e) => setBoy({ ...boy, birthTime: e.target.value })} required /></div>
          <PlaceField data={boy} setter={setBoy} label="Boy" debounceRef={boyDebounce} />
        </div>

        <h3 className="form-section-title" style={{ color: '#7c3aed', borderBottom: '2px solid #f0e6ff', paddingBottom: 8, marginBottom: 16, marginTop: 24 }}>Girl's Details</h3>
        <div className="form-grid">
          <div className="form-field"><label>Name *</label><input value={girl.name} onChange={(e) => setGirl({ ...girl, name: e.target.value })} required placeholder="Girl's name" /></div>
          <div className="form-field"><label>Birth Date *</label><input type="date" value={girl.birthDate} onChange={(e) => setGirl({ ...girl, birthDate: e.target.value })} required /></div>
          <div className="form-field"><label>Birth Time *</label><input type="time" value={girl.birthTime} onChange={(e) => setGirl({ ...girl, birthTime: e.target.value })} required /></div>
          <PlaceField data={girl} setter={setGirl} label="Girl" debounceRef={girlDebounce} />
        </div>

        <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? 'Matching...' : 'Match Kundali'}
        </button>
      </form>

      {result && (
        <div className="section" style={{ marginTop: 24, textAlign: 'center' }}>
          <h3>Matching Report</h3>

          {matchData?.total && (
            <div style={{ margin: '20px 0' }}>
              <span style={{ fontSize: '3rem', fontWeight: 700, color: '#7c3aed' }}>{matchData.total?.received_points || 0}</span>
              <span style={{ fontSize: '1.5rem', color: '#9ca3af' }}> / {matchData.total?.total_points || 36}</span>
              <p style={{ color: '#6b7280', marginTop: 4 }}>Guna Match (Ashtakoot)</p>
            </div>
          )}

          {matchData && typeof matchData === 'object' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'left', margin: '20px 0' }}>
              {Object.entries(matchData).filter(([key]) => key !== 'total' && key !== 'conclusion').map(([key, val]) => (
                <div key={key} style={{ background: '#f9f5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e0d4f5' }}>
                  <strong style={{ textTransform: 'capitalize', display: 'block', marginBottom: 4 }}>{key}</strong>
                  <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.9rem' }}>{val?.received_points || 0} / {val?.total_points || '-'}</span>
                  {val?.description && <span style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{val.description}</span>}
                </div>
              ))}
            </div>
          )}

          {matchData?.conclusion && (
            <div style={{ background: '#fff', padding: 16, borderRadius: 10, marginTop: 14, textAlign: 'left', border: '1px solid #e0d4f5' }}>
              <strong>Conclusion:</strong> {matchData.conclusion?.report || matchData.conclusion}
            </div>
          )}

          {(boyManglik || girlManglik) && (
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <h4 style={{ marginBottom: 12 }}>Manglik Dosha</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {boyManglik && (
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5', textAlign: 'center' }}>
                    <strong>Boy</strong>
                    <p style={{ color: boyManglik.is_pitr_dosha ? '#ef4444' : '#10b981', fontWeight: 600, marginTop: 4 }}>{boyManglik.is_pitr_dosha ? 'Manglik' : 'Not Manglik'}</p>
                  </div>
                )}
                {girlManglik && (
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e0d4f5', textAlign: 'center' }}>
                    <strong>Girl</strong>
                    <p style={{ color: girlManglik.is_pitr_dosha ? '#ef4444' : '#10b981', fontWeight: 600, marginTop: 4 }}>{girlManglik.is_pitr_dosha ? 'Manglik' : 'Not Manglik'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KundaliMatching;
