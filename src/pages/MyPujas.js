import React, { useState, useEffect } from 'react';
import { pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const MyPujas = () => {
  const { astrologer } = useAuth();
  const [pujas, setPujas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPujas(); }, []);

  const fetchPujas = async () => {
    try {
      const res = await pujaApi.getList({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setPujas(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this puja?')) return;
    try {
      await pujaApi.delete({ id });
      toast.success('Puja deleted');
      setPujas(pujas.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Failed to delete puja');
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Puja List</h2>
        <Link to="/create-puja" className="header-btn">+ Create Puja</Link>
      </div>

      {pujas.length === 0 ? (
        <div className="empty-state">No pujas created yet. <Link to="/create-puja">Create one</Link></div>
      ) : (
        <div className="puja-grid">
          {pujas.map((p, i) => (
            <div className="puja-card" key={i}>
              {p.pujaImage && <img src={p.pujaImage} alt={p.pujaName} className="puja-image" />}
              <div className="puja-info">
                <h4>{p.pujaName || p.name || 'Puja'}</h4>
                <p className="puja-price">&#8377;{parseFloat(p.pujaPrice || p.price || 0).toFixed(2)}</p>
                <p className="puja-desc">{p.pujaDescription || p.description || ''}</p>
                <div className="puja-actions">
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPujas;
