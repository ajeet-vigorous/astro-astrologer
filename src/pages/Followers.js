import React, { useState, useEffect } from 'react';
import { followerApi } from '../api/services';
import { useAuth } from '../context/AuthContext';

const Followers = () => {
  const { astrologer } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFollowers(); }, []);

  const fetchFollowers = async () => {
    try {
      const res = await followerApi.getFollowers({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 100 });
      const d = res.data;
      setFollowers(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Followers</h2>
        <p>Users who follow you</p>
      </div>

      {followers.length === 0 ? (
        <div className="empty-state">No followers yet</div>
      ) : (
        <div className="followers-grid">
          {followers.map((f, i) => (
            <div className="follower-card" key={i}>
              <div className="follower-avatar">
                {f.profileImage ? (
                  <img src={f.profileImage} alt={f.name || 'User'} />
                ) : (
                  <div className="avatar-placeholder">{(f.name || 'U').charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="follower-info">
                <h4>{f.name || f.userName || 'User'}</h4>
                <p>{f.contactNo || f.email || ''}</p>
                <span className="follower-date">
                  {f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN') : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Followers;
