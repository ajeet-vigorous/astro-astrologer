import React, { useState, useEffect } from 'react';
import { reviewApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Reviews = () => {
  const { astrologer } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      const res = await reviewApi.getReviews({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const d = res.data;
      setReviews(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleReply = async (reviewId) => {
    const text = replyText[reviewId];
    if (!text?.trim()) { toast.error('Please enter a reply'); return; }
    setReplyingTo(reviewId);
    try {
      await reviewApi.reply({ reviewId, reply: text, astrologerId: astrologer?.id });
      toast.success('Reply sent');
      setReplyText({ ...replyText, [reviewId]: '' });
      setReplyingTo(null);
      fetchReviews();
    } catch (err) {
      toast.error('Failed to send reply');
      setReplyingTo(null);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<span key={i} className={i <= rating ? 'star filled' : 'star'}>&#9733;</span>);
    }
    return stars;
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>User Reviews</h2>
        <p>Reviews from your clients</p>
      </div>

      {reviews.length === 0 ? (
        <div className="empty-state">No reviews yet</div>
      ) : (
        <div className="reviews-list">
          {reviews.map((r, i) => (
            <div className="review-card" key={i}>
              <div className="review-header">
                <div className="review-user">
                  <strong>{r.userName || r.name || 'User'}</strong>
                  <div className="review-stars">{renderStars(r.rating || 0)}</div>
                </div>
                <span className="review-date">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''}
                </span>
              </div>
              <p className="review-text">{r.review || r.comment || ''}</p>

              {r.reply && (
                <div className="review-reply">
                  <strong>Your Reply:</strong>
                  <p>{r.reply}</p>
                </div>
              )}

              {!r.reply && (
                <div className="reply-form">
                  <input
                    placeholder="Write a reply..."
                    value={replyText[r.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                  />
                  <button
                    className="btn-sm btn-primary"
                    onClick={() => handleReply(r.id)}
                    disabled={replyingTo === r.id}
                  >
                    {replyingTo === r.id ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
