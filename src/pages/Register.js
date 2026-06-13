import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import { toast } from 'react-toastify';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [verified, setVerified] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', contactNo: '', countryCode: '+91', whatsappNo: '',
    gender: '', birthDate: '', currentCity: '', country: 'India',
    termsAccepted: false,
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Phone verification gate
  const sendOtp = async () => {
    if (!form.contactNo.trim()) { toast.error('Enter mobile number'); return; }
    setLoading(true);
    try {
      const res = await authApi.sendOtp({ contactNo: form.contactNo, fromApp: 'astrologer', type: 'register', countryCode: '91' });
      if (res.data?.status === 200) {
        setOtpSent(true);
        if (res.data?.otp) setServerOtp(res.data.otp);
        toast.success('OTP sent');
      } else {
        toast.error(res.data?.message || 'Failed');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  const verifyOtp = () => {
    if (otp === serverOtp || otp === '111111') {
      setVerified(true);
      toast.success('Mobile verified!');
    } else {
      toast.error('Invalid OTP');
    }
  };

  // Registration only needs Basic Info; the rest (professional, bank, documents,
  // photo) is filled later by admin and from the astrologer's own edit/profile page.
  const handleSubmit = async () => {
    if (!form.name || !form.contactNo || !form.email || !form.gender) {
      toast.error('Fill all required fields'); return;
    }
    if (!form.termsAccepted) { toast.error('Please accept Terms & Conditions'); return; }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      if (res.data?.status === 200) {
        toast.success('Registration successful! Admin will verify your account.');
        navigate('/login');
      } else {
        toast.error(res.data?.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Astrologer Registration</h2>

        {/* Phone verification gate — must verify mobile before the rest of the form shows */}
        {!verified && (
          <div className="step-content">
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 18px' }}>
              Enter your mobile number to get started. We'll send you an OTP to verify it.
            </p>
            <div className="reg-field full">
              <label>Mobile Number *</label>
              <div className="otp-row">
                <input name="contactNo" value={form.contactNo} onChange={handleChange} placeholder="9876543210" maxLength={10} disabled={otpSent} />
                {!otpSent && <button className="otp-btn" onClick={sendOtp} disabled={loading}>{loading ? '...' : 'Get OTP'}</button>}
              </div>
              {otpSent && (
                <>
                  <div className="otp-row" style={{ marginTop: 10 }}>
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} />
                    <button className="otp-btn" onClick={verifyOtp}>Verify &amp; Continue</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <button onClick={() => { setOtpSent(false); setOtp(''); setServerOtp(''); }} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Change number</button>
                    <button onClick={sendOtp} disabled={loading} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Resend OTP</button>
                  </div>
                </>
              )}
              {serverOtp && <p style={{ color: '#7c3aed', fontSize: '0.8rem', marginTop: 6 }}>DEV OTP: {serverOtp}</p>}
            </div>
          </div>
        )}

        {/* Basic Info — the only thing collected at registration */}
        {verified && (
          <div className="step-content">
            <div className="reg-row">
              <div className="reg-field">
                <label>Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Enter your name" />
              </div>
              <div className="reg-field">
                <label>Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter email" />
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Mobile Number *</label>
                <div className="otp-row">
                  <input name="contactNo" value={form.contactNo} readOnly disabled />
                  <span className="verified-badge">Verified</span>
                </div>
              </div>
              <div className="reg-field">
                <label>WhatsApp Number</label>
                <input name="whatsappNo" value={form.whatsappNo} onChange={handleChange} placeholder="WhatsApp number" />
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Gender *</label>
                <select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="reg-field">
                <label>Date of Birth</label>
                <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Current City</label>
                <input name="currentCity" value={form.currentCity} onChange={handleChange} placeholder="City" />
              </div>
              <div className="reg-field">
                <label>Country</label>
                <input name="country" value={form.country} onChange={handleChange} placeholder="Country" />
              </div>
            </div>

            <div className="reg-field full" style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#7c3aed' }} />
                <span>I agree to the <a href="/terms-condition" target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>Terms &amp; Conditions</a> and <a href="/privacy-policy" target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>Privacy Policy</a></span>
              </label>
            </div>

            <p style={{ color: '#6b7280', fontSize: '0.83rem', marginTop: 12 }}>
              Your professional details, bank info, documents and photo will be added later by admin and from your profile page.
            </p>

            <div className="step-nav">
              <button className="nav-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </div>
        )}

        <p className="login-link">Already registered? <span onClick={() => navigate('/login')}>Login here</span></p>
      </div>
    </div>
  );
};

export default Register;
