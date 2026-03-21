import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const [contactNo, setContactNo] = useState('');
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    if (!contactNo.trim()) { toast.error('Enter mobile number'); return; }
    setLoading(true);
    try {
      const res = await authApi.sendOtp({
        contactNo,
        fromApp: 'astrologer',
        type: 'login',
        countryCode: '91',
      });
      if (res.data?.status === 200) {
        if (res.data?.otp) setServerOtp(res.data.otp);
        setOtpSent(true);
        toast.success('OTP sent successfully');
      } else {
        toast.error(res.data?.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { toast.error('Enter OTP'); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ contactNo, otp, countryCode: '+91' });
      const d = res.data;
      if (d?.status === 200 && d?.token) {
        const astroData = d.recordList?.[0] || d.recordList || {};
        login(d.token, astroData);
        toast.success('Login successful');
        navigate('/');
      } else {
        toast.error(d?.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Astrologer Login</h2>
        <p className="subtitle">Enter your mobile number to continue</p>

        <div className="login-field">
          <label>Mobile Number</label>
          <input
            type="text"
            value={contactNo}
            onChange={(e) => setContactNo(e.target.value)}
            placeholder="Enter mobile number"
            disabled={otpSent}
            maxLength={12}
          />
        </div>

        {!otpSent ? (
          <button className="login-btn" onClick={handleSendOtp} disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        ) : (
          <>
            <div className="login-field">
              <label>OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6 digit OTP"
                maxLength={6}
              />
              {serverOtp && <p style={{ color: '#7c3aed', fontWeight: 600, marginTop: 6, fontSize: '0.85rem' }}>DEV OTP: {serverOtp}</p>}
            </div>
            <button className="login-btn" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <p className="otp-sent" onClick={() => setOtpSent(false)} style={{ cursor: 'pointer' }}>
              Edit mobile number
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
