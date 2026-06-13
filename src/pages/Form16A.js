import React, { useState, useEffect } from 'react';
import { form16aApi } from '../api/services';
import { useAuth } from '../context/AuthContext';

const API_HOST = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const fileUrl = (p) => (!p ? '#' : p.startsWith('http') ? p : `${API_HOST}/${p.replace(/^\//, '')}`);

const Form16A = () => {
  const { astrologer } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await form16aApi.my({ astrologerId: astrologer?.id });
        setList(res.data?.recordList || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, [astrologer]);

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Form 16A (TDS Certificate)</h2>
        <p>Your TDS certificates uploaded by admin</p>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">No Form 16A certificates available yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
          {list.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: '1px solid #e0d4f5', borderRadius: 12, background: '#fff', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1a0533' }}>FY {c.financialYear} — {c.quarter}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
                  {c.fileName || 'Form 16A'} · {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </div>
              </div>
              <a href={fileUrl(c.filePath)} target="_blank" rel="noreferrer" download
                style={{ whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', textDecoration: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem' }}>
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Form16A;
