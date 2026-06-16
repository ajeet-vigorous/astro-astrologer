import React, { useState, useEffect } from 'react';
import { assistantApi, authApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const API_HOST = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const imgUrl = (p) => (!p ? null : p.startsWith('http') ? p : `${API_HOST}/${p.replace(/^\//, '')}`);

const emptyForm = {
  id: null, name: '', email: '', contactNo: '', gender: 'Male', birthdate: '',
  experienceInYears: '', primarySkill: [], allSkill: [], language: [], profile: null,
};

const MyAssistants = () => {
  const { astrologer } = useAuth();
  const [assistants, setAssistants] = useState([]);
  const [skills, setSkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchAssistants = async () => {
    try {
      const res = await assistantApi.list({ astrologerId: astrologer?.id });
      setAssistants(res.data?.recordList || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (!astrologer?.id) return;
    authApi.getMasterData().then(res => {
      setSkills(res.data?.skill || []);
      setLanguages(res.data?.language || []);
    }).catch(() => {});
    fetchAssistants();
    // eslint-disable-next-line
  }, [astrologer]);

  const toggleMulti = (field, id) => {
    setForm(prev => ({ ...prev, [field]: prev[field].includes(id) ? prev[field].filter(x => x !== id) : [...prev[field], id] }));
  };

  const openAdd = () => { setForm(emptyForm); setShowForm(true); };
  const openEdit = (a) => {
    setForm({
      id: a.id, name: a.name || '', email: a.email || '', contactNo: a.contactNo || '',
      gender: a.gender || 'Male', birthdate: a.birthdate ? String(a.birthdate).split('T')[0] : '',
      experienceInYears: a.experienceInYears || '',
      primarySkill: Array.isArray(a.primarySkill) ? a.primarySkill.map(s => s.id) : [],
      allSkill: Array.isArray(a.allSkill) ? a.allSkill.map(s => s.id) : [],
      language: Array.isArray(a.languageKnown) ? a.languageKnown.map(l => l.id) : [],
      profile: null,
    });
    setShowForm(true);
  };

  const onPhoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, profile: reader.result.split(',')[1] }));
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.name || !form.contactNo || !form.gender || !form.birthdate) {
      toast.error('Name, contact number, gender and birthdate are required'); return;
    }
    if (!form.primarySkill.length || !form.allSkill.length || !form.language.length) {
      toast.error('Select primary skill, all skills and language'); return;
    }
    setSaving(true);
    const payload = {
      id: form.id, astrologerId: astrologer?.id,
      name: form.name, email: form.email, contactNo: form.contactNo,
      gender: form.gender, birthdate: form.birthdate,
      experienceInYears: form.experienceInYears || 0,
      assistantPrimarySkillId: form.primarySkill.map(id => ({ id })),
      assistantAllSkillId: form.allSkill.map(id => ({ id })),
      assistantLanguageId: form.language.map(id => ({ id })),
      profile: form.profile || undefined,
    };
    try {
      if (form.id) await assistantApi.update(payload);
      else await assistantApi.add(payload);
      toast.success(form.id ? 'Assistant updated' : 'Assistant added');
      setShowForm(false);
      fetchAssistants();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assistant?')) return;
    try { await assistantApi.delete({ id }); setAssistants(prev => prev.filter(a => a.id !== id)); }
    catch (e) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  const Chip = ({ active, onClick, children }) => (
    <span onClick={onClick} style={{ cursor: 'pointer', padding: '5px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
      border: `1px solid ${active ? '#7c3aed' : '#e0d4f5'}`, background: active ? '#7c3aed' : '#fff', color: active ? '#fff' : '#7c3aed' }}>
      {children}
    </span>
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>My Assistants</h2>
          <p>Assistants can chat with your customers on your behalf. They log in with their mobile number.</p>
        </div>
        <button onClick={openAdd} style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>+ Add Assistant</button>
      </div>

      {assistants.length === 0 ? (
        <div className="empty-state">No assistants yet. Add one to help handle your chats.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {assistants.map(a => (
            <div key={a.id} style={{ border: '1px solid #e0d4f5', borderRadius: 12, padding: 14, background: '#fff' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={imgUrl(a.profile) || '/default-avatar.png'} alt={a.name} onError={e => { e.target.src = '/default-avatar.png'; }}
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', background: '#f3effb' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1a0533' }}>{a.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{a.contactNo}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 8 }}>
                {Array.isArray(a.primarySkill) ? a.primarySkill.map(s => s.name).join(', ') : ''}
                {a.experienceInYears ? ` · ${a.experienceInYears} yrs` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => openEdit(a)} style={{ flex: 1, padding: 8, border: '1px solid #7c3aed', background: '#fff', color: '#7c3aed', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(a.id)} style={{ flex: 1, padding: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{form.id ? 'Edit Assistant' : 'Add Assistant'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Name *"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></Field>
              <Field label="Mobile Number *"><input value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })} maxLength={10} style={inp} placeholder="For assistant login" /></Field>
              <Field label="Email"><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></Field>
              <Field label="Gender *">
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inp}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Birth Date *"><input type="date" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} style={inp} /></Field>
              <Field label="Experience (yrs)"><input type="number" value={form.experienceInYears} onChange={e => setForm({ ...form, experienceInYears: e.target.value })} style={inp} /></Field>
            </div>

            <Field label="Primary Skills *">
              <div style={chipWrap}>{skills.map(s => <Chip key={s.id} active={form.primarySkill.includes(s.id)} onClick={() => toggleMulti('primarySkill', s.id)}>{s.name}</Chip>)}</div>
            </Field>
            <Field label="All Skills *">
              <div style={chipWrap}>{skills.map(s => <Chip key={s.id} active={form.allSkill.includes(s.id)} onClick={() => toggleMulti('allSkill', s.id)}>{s.name}</Chip>)}</div>
            </Field>
            <Field label="Languages *">
              <div style={chipWrap}>{languages.map(l => <Chip key={l.id} active={form.language.includes(l.id)} onClick={() => toggleMulti('language', l.id)}>{l.languageName || l.name}</Chip>)}</div>
            </Field>
            <Field label="Photo"><input type="file" accept="image/*" onChange={onPhoto} style={{ fontSize: 13 }} /></Field>

            <button onClick={handleSave} disabled={saving} style={{ width: '100%', marginTop: 16, padding: 12, border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : (form.id ? 'Update Assistant' : 'Add Assistant')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const inp = { width: '100%', padding: 9, border: '1px solid #e0d4f5', borderRadius: 8, fontFamily: 'inherit' };
const chipWrap = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const Field = ({ label, children }) => (
  <div style={{ marginTop: 12 }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

export default MyAssistants;
