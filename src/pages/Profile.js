import React, { useState, useEffect } from 'react';
import { profileApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Profile = () => {
  const { astrologer, login } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', contactNo: '', whatsappNo: '', gender: '',
    birthDate: '', experience: '', aboutMe: '', charge: '',
    primarySkill: '', languageKnown: '', aadharNo: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState([]);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, skillRes] = await Promise.allSettled([
        profileApi.get({ astrologerId: astrologer?.id }),
        profileApi.getSkills(),
      ]);
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data;
        const a = d?.recordList?.[0] || d?.data || d?.recordList || {};
        setForm({
          name: a.name || '', email: a.email || '', contactNo: a.contactNo || '',
          whatsappNo: a.whatsappNo || '', gender: a.gender || '',
          birthDate: a.birthDate || '', experience: a.experience || '',
          aboutMe: a.aboutMe || '', charge: a.charge || '',
          primarySkill: a.primarySkill || '', languageKnown: a.languageKnown || '',
          aadharNo: a.aadharNo || '',
        });
      }
      if (skillRes.status === 'fulfilled') {
        const s = skillRes.value.data;
        setSkills(s?.recordList || s?.data || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => formData.append(k, form[k]));
      formData.append('astrologerId', astrologer?.id);
      if (profileImage) formData.append('profileImage', profileImage);

      await profileApi.update(formData);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Account</h2>
        <p>Update your profile details</p>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input name="contactNo" value={form.contactNo} onChange={handleChange} disabled />
          </div>
          <div className="form-field">
            <label>WhatsApp</label>
            <input name="whatsappNo" value={form.whatsappNo} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label>Birth Date</label>
            <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Experience (years)</label>
            <input name="experience" type="number" value={form.experience} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Charge (per min)</label>
            <input name="charge" type="number" value={form.charge} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Aadhar Number</label>
            <input name="aadharNo" value={form.aadharNo} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Language Known</label>
            <input name="languageKnown" value={form.languageKnown} onChange={handleChange} placeholder="Hindi, English" />
          </div>
        </div>

        <div className="form-field full-width">
          <label>About Me</label>
          <textarea name="aboutMe" value={form.aboutMe} onChange={handleChange} rows={4} placeholder="Tell about yourself..." />
        </div>

        <div className="form-field">
          <label>Profile Image</label>
          <input type="file" accept="image/*" onChange={(e) => setProfileImage(e.target.files[0])} />
        </div>

        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
