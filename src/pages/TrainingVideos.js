import React, { useState, useEffect } from 'react';
import { trainingVideoApi } from '../api/services';

const API_HOST = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const imgUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_HOST}/${path.replace(/^\//, '')}`;
};

const TrainingVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await trainingVideoApi.get();
        setVideos(res.data?.recordList || res.data?.data || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Training Videos</h2>
        <p>Learn how to make the most of the platform</p>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">No training videos available yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.video_link || '#'}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', color: 'inherit', border: '1px solid #e0d4f5', borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f3effb' }}>
                {imgUrl(v.cover_image) ? (
                  <img src={imgUrl(v.cover_image)} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bda', fontSize: '0.85rem' }}>No thumbnail</div>
                )}
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(124,58,237,0.9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>&#9658;</span>
                </span>
              </div>
              <div style={{ padding: 12, fontWeight: 600, color: '#1a0533' }}>{v.title || 'Untitled'}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingVideos;
