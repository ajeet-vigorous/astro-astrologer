import React, { useState, useEffect } from 'react';
import { pageApi } from '../api/services';
import { useLocation } from 'react-router-dom';

const slugMap = {
  '/about': 'about-us',
  '/privacy-policy': 'privacy-policy',
  '/terms-condition': 'terms-condition',
  '/refund-policy': 'refund-policy',
};

const titleMap = {
  '/about': 'About Us',
  '/privacy-policy': 'Privacy Policy',
  '/terms-condition': 'Terms & Conditions',
  '/refund-policy': 'Refund Policy',
};

const StaticPage = () => {
  const location = useLocation();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const slug = slugMap[location.pathname] || location.pathname.replace('/', '');
  const title = titleMap[location.pathname] || 'Page';

  useEffect(() => { fetchPage(); }, [location.pathname]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await pageApi.getPage(slug);
      const d = res.data;
      setContent(d?.recordList?.[0] || d?.data || d?.recordList || null);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{content?.title || title}</h2>
      </div>
      <div className="static-content">
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: content.description || content.content || '' }} />
        ) : (
          <div className="empty-state">Content not available</div>
        )}
      </div>
    </div>
  );
};

export default StaticPage;
