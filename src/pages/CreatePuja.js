import React, { useState, useEffect } from 'react';
import { pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const CreatePuja = () => {
  const { astrologer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pujaName: '', pujaPrice: '', pujaDescription: '', categoryId: '',
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    API.post('/customer/getPujaCategory').then(res => {
      setCategories(res.data?.recordList || []);
    }).catch(() => {});
  }, []);
  const [pujaImage, setPujaImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pujaName || !form.pujaPrice) {
      toast.error('Please fill required fields'); return;
    }
    setSubmitting(true);
    try {
      await pujaApi.add({
        astrologerId: astrologer?.id,
        puja_title: form.pujaName,
        puja_price: form.pujaPrice,
        long_description: form.pujaDescription,
        puja_place: 'Online',
        puja_start_datetime: new Date(Date.now() + 86400000).toISOString(),
        puja_duration: 60,
        category_id: form.categoryId,
      });
      toast.success('Puja created successfully');
      navigate('/my-pujas');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create puja');
    }
    setSubmitting(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Create Puja</h2>
        <p>Add a new puja offering</p>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Puja Name *</label>
            <input name="pujaName" value={form.pujaName} onChange={handleChange} required placeholder="Enter puja name" />
          </div>
          <div className="form-field">
            <label>Price (&#8377;) *</label>
            <input name="pujaPrice" type="number" value={form.pujaPrice} onChange={handleChange} required placeholder="Enter price" />
          </div>
          <div className="form-field">
            <label>Category *</label>
            <select name="categoryId" value={form.categoryId} onChange={handleChange} required>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field full-width">
          <label>Description</label>
          <textarea name="pujaDescription" value={form.pujaDescription} onChange={handleChange} rows={4} placeholder="Describe the puja..." />
        </div>

        <div className="form-field">
          <label>Puja Image</label>
          <input type="file" accept="image/*" onChange={(e) => setPujaImage(e.target.files[0])} />
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Puja'}
        </button>
      </form>
    </div>
  );
};

export default CreatePuja;
