import React, { useState, useEffect } from 'react';
import { appointmentApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Appointments = () => {
  const { astrologer } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    try {
      const res = await appointmentApi.getScheduleCalls({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setAppointments(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await appointmentApi.delete(id);
      toast.success('Appointment deleted');
      setAppointments(appointments.filter(a => a.id !== id));
    } catch (err) {
      toast.error('Failed to delete appointment');
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Appointments</h2>
        <p>Your scheduled call requests</p>
      </div>

      {appointments.length === 0 ? (
        <div className="empty-state">No appointments scheduled</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>User</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {appointments.map((a, i) => (
              <tr key={i}>
                <td>{a.userName || a.name || 'User'}</td>
                <td>{a.scheduleDate ? new Date(a.scheduleDate).toLocaleDateString('en-IN') : '-'}</td>
                <td>{a.scheduleTime || '-'}</td>
                <td>{a.requestType || 'Call'}</td>
                <td><span className={`badge ${(a.status || 'pending').toLowerCase()}`}>{a.status || 'Pending'}</span></td>
                <td>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Appointments;
