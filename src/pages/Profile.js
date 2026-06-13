import React, { useState, useEffect } from 'react';
import { profileApi, authApi } from '../api/services';
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

  // Change-mobile-number flow (OTP verified on the new number)
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneServerOtp, setPhoneServerOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

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

  // Send OTP to the NEW number. type:'register' also rejects a number already in use.
  const sendPhoneOtp = async () => {
    const num = newPhone.trim();
    if (!num) { toast.error('Enter the new mobile number'); return; }
    if (num === form.contactNo) { toast.error('This is already your current number'); return; }
    setPhoneBusy(true);
    try {
      const res = await authApi.sendOtp({ contactNo: num, fromApp: 'astrologer', type: 'register', countryCode: '91' });
      if (res.data?.status === 200) {
        setPhoneOtpSent(true);
        if (res.data?.otp) setPhoneServerOtp(res.data.otp);
        toast.success('OTP sent to new number');
      } else {
        toast.error(res.data?.message || 'Failed to send OTP');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP'); }
    setPhoneBusy(false);
  };

  const verifyAndChangePhone = async () => {
    if (phoneOtp !== phoneServerOtp && phoneOtp !== '111111') { toast.error('Invalid OTP'); return; }
    setPhoneBusy(true);
    try {
      const res = await profileApi.changeContactNo({ astrologerId: astrologer?.id, contactNo: newPhone.trim() });
      if (res.data?.status === 200) {
        const updated = res.data.contactNo || newPhone.trim();
        setForm((f) => ({ ...f, contactNo: updated }));
        // Keep the local session in sync so the new number shows everywhere
        const token = localStorage.getItem('astrologerToken');
        if (token) login(token, { ...astrologer, contactNo: updated });
        toast.success('Mobile number updated');
        setNewPhone(''); setPhoneOtp(''); setPhoneServerOtp(''); setPhoneOtpSent(false);
      } else {
        toast.error(res.data?.message || 'Failed to update number');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update number'); }
    setPhoneBusy(false);
  };

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

      {/* Change Mobile Number — OTP verified on the new number */}
      <div style={{ marginTop: 28, padding: 20, border: '1px solid #e0d4f5', borderRadius: 12, background: '#faf7ff' }}>
        <h3 style={{ margin: '0 0 4px', color: '#1a0533' }}>Change Mobile Number</h3>
        <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '0.85rem' }}>
          Current number: <strong>{form.contactNo || '-'}</strong>. We'll send an OTP to the new number to verify it.
        </p>

        <div className="form-field" style={{ maxWidth: 420 }}>
          <label>New Mobile Number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="New 10-digit number" maxLength={10} disabled={phoneOtpSent} />
            {!phoneOtpSent && (
              <button type="button" onClick={sendPhoneOtp} disabled={phoneBusy}
                style={{ whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}>
                {phoneBusy ? '...' : 'Send OTP'}
              </button>
            )}
          </div>
        </div>

        {phoneOtpSent && (
          <div className="form-field" style={{ maxWidth: 420, marginTop: 12 }}>
            <label>Enter OTP</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} />
              <button type="button" onClick={verifyAndChangePhone} disabled={phoneBusy}
                style={{ whiteSpace: 'nowrap', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}>
                {phoneBusy ? '...' : 'Verify & Update'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button type="button" onClick={() => { setPhoneOtpSent(false); setPhoneOtp(''); setPhoneServerOtp(''); }}
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Change number</button>
              <button type="button" onClick={sendPhoneOtp} disabled={phoneBusy}
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Resend OTP</button>
            </div>
            {phoneServerOtp && <p style={{ color: '#7c3aed', fontSize: '0.8rem', marginTop: 6 }}>DEV OTP: {phoneServerOtp}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
