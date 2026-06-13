import React, { useState, useEffect } from 'react';
import { galleryApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const API_HOST = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const imgUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${API_HOST}/${p.replace(/^\//, '')}`);

const Gallery = () => {
  const { astrologer } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchGallery = async () => {
    try {
      const res = await galleryApi.my({ astrologerId: astrologer?.id });
      setPhotos(res.data?.recordList || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (astrologer?.id) fetchGallery(); /* eslint-disable-next-line */ }, [astrologer]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const images = await Promise.all(files.map(f => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(f);
      })));
      await galleryApi.add({ astrologerId: astrologer?.id, images });
      toast.success('Photo(s) uploaded');
      fetchGallery();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  const toggle = async (id) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, isActive: p.isActive ? 0 : 1 } : p)); // optimistic
    try { await galleryApi.toggle({ id }); } catch (err) { toast.error('Failed'); fetchGallery(); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try { await galleryApi.delete({ id }); setPhotos(prev => prev.filter(p => p.id !== id)); }
    catch (err) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Gallery</h2>
        <p>Upload photos. Only active ones are shown to customers on your profile.</p>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: '#fff', padding: '11px 20px', borderRadius: 8, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1, marginBottom: 18 }}>
        {uploading ? 'Uploading...' : '+ Upload Photos'}
        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
      </label>

      {photos.length === 0 ? (
        <div className="empty-state">No photos yet. Upload your first photo.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
          {photos.map(p => (
            <div key={p.id} style={{ border: '1px solid #e0d4f5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <div style={{ position: 'relative', paddingTop: '100%', background: '#faf7ff' }}>
                <img src={imgUrl(p.image)} alt="gallery" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: p.isActive ? 1 : 0.4 }} />
                <span style={{ position: 'absolute', top: 8, left: 8, background: p.isActive ? '#16a34a' : '#9ca3af', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                  {p.isActive ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div style={{ display: 'flex', borderTop: '1px solid #f0e9fb' }}>
                <button onClick={() => toggle(p.id)} style={{ flex: 1, padding: 8, border: 'none', background: '#fff', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
                  {p.isActive ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => remove(p.id)} style={{ flex: 1, padding: 8, border: 'none', borderLeft: '1px solid #f0e9fb', background: '#fff', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
