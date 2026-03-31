import React, { useState, useEffect } from 'react';
import { reportApi } from '../api/services';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { astrologer } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await reportApi.getReports({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setReports(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Reports</h2>
        <p>View your consultation reports</p>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">No reports found</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>User</th><th>Report Type</th><th>Rate</th><th>Birth Date</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td>{r.firstName || r.userName || 'User'} {r.lastName || ''}</td>
                <td>{r.reportType || '-'}</td>
                <td className="text-green">&#8377;{parseFloat(r.reportRate || 0).toFixed(2)}</td>
                <td>{r.birthDate || '-'}</td>
                <td>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '-'}</td>
                <td><span className={`badge ${r.reportFile ? 'completed' : 'pending'}`}>{r.reportFile ? 'Completed' : 'Pending'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Reports;
