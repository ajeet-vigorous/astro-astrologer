import React, { useState } from 'react';
import { pageApi } from '../api/services';
import { toast } from 'react-toastify';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill required fields'); return;
    }
    setSubmitting(true);
    try {
      await pageApi.submitContact(form);
      toast.success('Message sent successfully');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
    setSubmitting(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Contact Us</h2>
        <p>Get in touch with us</p>
      </div>

      <form className="profile-form contact-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name" />
          </div>
          <div className="form-field">
            <label>Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="Your email" />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Your phone number" />
          </div>
          <div className="form-field">
            <label>Subject</label>
            <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" />
          </div>
        </div>
        <div className="form-field full-width">
          <label>Message *</label>
          <textarea name="message" value={form.message} onChange={handleChange} rows={5} required placeholder="Write your message..." />
        </div>
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

export default Contact;
