import React, { useState, useEffect } from 'react';
import { reportApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Reports = () => {
  const { astrologer } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await reportApi.getReports({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setReports(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleUpload = async (reportId, file) => {
    if (!file) return;
    setUploadingId(reportId);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await reportApi.uploadFile({ id: reportId, reportFile: reader.result });
        if (res.data?.status === 200) { toast.success('Report uploaded!'); fetchReports(); }
        else toast.error(res.data?.message || 'Upload failed');
      } catch (e) { toast.error('Upload failed'); }
      setUploadingId(null);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Report Requests</h2>
        <p>Upload reports requested by customers</p>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">No report requests</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #f0e6ff', borderLeft: r.reportFile ? '4px solid #10b981' : '4px solid #f59e0b', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>{r.firstName || 'User'} {r.lastName || ''}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                    {r.reportType || '-'} | &#8377;{parseFloat(r.reportRate || 0).toFixed(2)} | {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '-'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '3px 12px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                    background: r.reportFile ? '#d1fae5' : '#fef3c7',
                    color: r.reportFile ? '#065f46' : '#92400e'
                  }}>{r.reportFile ? 'Completed' : 'Pending'}</span>
                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    {expandedId === r.id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>

              {expandedId === r.id && (
                <div style={{ marginTop: 12, padding: 12, background: '#f9f5ff', borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                    <p style={{ margin: 0 }}><strong>Gender:</strong> {r.gender || '-'}</p>
                    <p style={{ margin: 0 }}><strong>Birth Date:</strong> {r.birthDate || '-'}</p>
                    <p style={{ margin: 0 }}><strong>Birth Time:</strong> {r.birthTime || '-'}</p>
                    <p style={{ margin: 0 }}><strong>Birth Place:</strong> {r.birthPlace || '-'}</p>
                    <p style={{ margin: 0 }}><strong>Marital Status:</strong> {r.maritalStatus || '-'}</p>
                    <p style={{ margin: 0 }}><strong>Occupation:</strong> {r.occupation || '-'}</p>
                  </div>
                  {r.comments && <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}><strong>Comments:</strong> {r.comments}</p>}

                  {!r.reportFile ? (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                        {uploadingId === r.id ? 'Uploading...' : 'Upload Report (PDF)'}
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleUpload(r.id, e.target.files[0])} disabled={uploadingId === r.id} />
                      </label>
                    </div>
                  ) : (
                    <p style={{ margin: '8px 0 0', color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>Report uploaded</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
