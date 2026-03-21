import React, { useState } from 'react';
import { pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const CreatePuja = () => {
  const { astrologer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pujaName: '', pujaPrice: '', pujaDescription: '',
  });
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
      const formData = new FormData();
      formData.append('astrologerId', astrologer?.id);
      formData.append('pujaName', form.pujaName);
      formData.append('pujaPrice', form.pujaPrice);
      formData.append('pujaDescription', form.pujaDescription);
      if (pujaImage) formData.append('pujaImage', pujaImage);

      await pujaApi.add(formData);
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
