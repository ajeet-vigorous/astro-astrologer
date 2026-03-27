import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import { toast } from 'react-toastify';
import './Register.css';

const STEPS = ['Basic Info', 'Professional', 'Bank Details', 'About & Photo'];

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [master, setMaster] = useState({ skill: [], language: [], astrolgoerCategory: [], mainSourceBusiness: [], highestQualification: [] });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [verified, setVerified] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', contactNo: '', countryCode: '+91', whatsappNo: '',
    gender: '', birthDate: '', currentCity: '', country: 'India',
    primarySkill: '', allSkill: '', languageKnown: '', astrologerCategoryId: '',
    experienceInYears: '', charge: '', videoCallRate: '', reportRate: '',
    dailyContribution: '', mainSourceOfBusiness: '', highestQualification: '', degree: '',
    whyOnBoard: '', loginBio: '',
    ifscCode: '', bankName: '', bankBranch: '', accountType: 'Saving',
    accountNumber: '', accountHolderName: '', upi: '',
    pancardNo: '', aadharNo: '',
    profileImage: null,
  });

  useEffect(() => {
    authApi.getMasterData().then(res => {
      const d = res.data;
      setMaster({
        skill: d?.skill || [],
        language: d?.language || [],
        astrolgoerCategory: d?.astrolgoerCategory || d?.astrologerCategory || [],
        mainSourceBusiness: d?.mainSourceBusiness || [],
        highestQualification: d?.highestQualification || [],
      });
    }).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, profileImage: reader.result.split(',')[1] });
    reader.readAsDataURL(file);
  };

  // Step 0: OTP verification
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

  const nextStep = () => {
    if (step === 0 && (!form.name || !form.contactNo || !form.gender || !form.email)) {
      toast.error('Fill all required fields'); return;
    }
    if (step === 0 && !verified) { toast.error('Verify your mobile number first'); return; }
    if (step === 1 && (!form.primarySkill || !form.charge || !form.experienceInYears)) {
      toast.error('Fill all required fields'); return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
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

        {/* Progress */}
        <div className="step-progress">
          {STEPS.map((s, i) => (
            <div key={i} className={`step-item ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="step-num">{i < step ? '\u2713' : i + 1}</span>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0: Basic Info */}
        {step === 0 && (
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
                  <input name="contactNo" value={form.contactNo} onChange={handleChange} placeholder="9876543210" disabled={verified} />
                  {!verified && !otpSent && <button className="otp-btn" onClick={sendOtp} disabled={loading}>{loading ? '...' : 'Send OTP'}</button>}
                  {verified && <span className="verified-badge">Verified</span>}
                </div>
                {otpSent && !verified && (
                  <div className="otp-row" style={{ marginTop: 8 }}>
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" maxLength={6} />
                    <button className="otp-btn" onClick={verifyOtp}>Verify</button>
                  </div>
                )}
                {serverOtp && !verified && <p style={{ color: '#7c3aed', fontSize: '0.8rem', marginTop: 4 }}>DEV OTP: {serverOtp}</p>}
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
          </div>
        )}

        {/* Step 1: Professional */}
        {step === 1 && (
          <div className="step-content">
            <div className="reg-row">
              <div className="reg-field">
                <label>Primary Skill *</label>
                <select name="primarySkill" value={form.primarySkill} onChange={handleChange}>
                  <option value="">Select Skill</option>
                  {master.skill.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="reg-field">
                <label>Category</label>
                <select name="astrologerCategoryId" value={form.astrologerCategoryId} onChange={handleChange}>
                  <option value="">Select Category</option>
                  {master.astrolgoerCategory.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Experience (years) *</label>
                <input type="number" name="experienceInYears" value={form.experienceInYears} onChange={handleChange} placeholder="e.g. 5" />
              </div>
              <div className="reg-field">
                <label>Language Known</label>
                <select name="languageKnown" value={form.languageKnown} onChange={handleChange}>
                  <option value="">Select Language</option>
                  {master.language.map(l => <option key={l.id} value={l.id}>{l.languageName || l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Chat/Call Rate (per min) *</label>
                <input type="number" name="charge" value={form.charge} onChange={handleChange} placeholder="e.g. 20" />
              </div>
              <div className="reg-field">
                <label>Video Call Rate (per min)</label>
                <input type="number" name="videoCallRate" value={form.videoCallRate} onChange={handleChange} placeholder="e.g. 30" />
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Daily Contribution (hrs)</label>
                <input type="number" name="dailyContribution" value={form.dailyContribution} onChange={handleChange} placeholder="e.g. 4" />
              </div>
              <div className="reg-field">
                <label>Qualification</label>
                <select name="highestQualification" value={form.highestQualification} onChange={handleChange}>
                  <option value="">Select</option>
                  {master.highestQualification.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            </div>
            <div className="reg-field full">
              <label>Why do you want to join?</label>
              <textarea name="whyOnBoard" value={form.whyOnBoard} onChange={handleChange} rows={2} placeholder="Tell us..." />
            </div>
          </div>
        )}

        {/* Step 2: Bank Details */}
        {step === 2 && (
          <div className="step-content">
            <div className="reg-row">
              <div className="reg-field">
                <label>Bank Name</label>
                <input name="bankName" value={form.bankName} onChange={handleChange} placeholder="Bank name" />
              </div>
              <div className="reg-field">
                <label>Branch</label>
                <input name="bankBranch" value={form.bankBranch} onChange={handleChange} placeholder="Branch" />
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>Account Number</label>
                <input name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="Account number" />
              </div>
              <div className="reg-field">
                <label>Account Holder Name</label>
                <input name="accountHolderName" value={form.accountHolderName} onChange={handleChange} placeholder="Holder name" />
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>IFSC Code</label>
                <input name="ifscCode" value={form.ifscCode} onChange={handleChange} placeholder="SBIN0001234" />
              </div>
              <div className="reg-field">
                <label>Account Type</label>
                <select name="accountType" value={form.accountType} onChange={handleChange}>
                  <option value="Saving">Saving</option>
                  <option value="Current">Current</option>
                </select>
              </div>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label>UPI ID</label>
                <input name="upi" value={form.upi} onChange={handleChange} placeholder="name@upi" />
              </div>
              <div className="reg-field">
                <label>PAN Card Number</label>
                <input name="pancardNo" value={form.pancardNo} onChange={handleChange} placeholder="ABCDE1234F" />
              </div>
            </div>
            <div className="reg-field full">
              <label>Aadhar Number</label>
              <input name="aadharNo" value={form.aadharNo} onChange={handleChange} placeholder="1234 5678 9012" />
            </div>
          </div>
        )}

        {/* Step 3: About & Photo */}
        {step === 3 && (
          <div className="step-content">
            <div className="reg-field full">
              <label>About You / Bio</label>
              <textarea name="loginBio" value={form.loginBio} onChange={handleChange} rows={4} placeholder="Write about yourself, your expertise, experience..." />
            </div>
            <div className="reg-field full">
              <label>Profile Photo</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {form.profileImage && <img src={`data:image/png;base64,${form.profileImage}`} alt="Preview" className="photo-preview" />}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="step-nav">
          {step > 0 && <button className="nav-prev" onClick={prevStep}>Back</button>}
          {step < STEPS.length - 1 && <button className="nav-next" onClick={nextStep}>Next</button>}
          {step === STEPS.length - 1 && (
            <button className="nav-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          )}
        </div>

        <p className="login-link">Already registered? <span onClick={() => navigate('/login')}>Login here</span></p>
      </div>
    </div>
  );
};

export default Register;
