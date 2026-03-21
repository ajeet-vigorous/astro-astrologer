import React, { useState, useEffect } from 'react';
import { blogApi } from '../api/services';
import { Link } from 'react-router-dom';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBlogs(); }, []);

  const fetchBlogs = async () => {
    try {
      const res = await blogApi.getAll();
      const d = res.data;
      setBlogs(d?.recordList || d?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Blog</h2>
        <p>Latest articles and updates</p>
      </div>

      {blogs.length === 0 ? (
        <div className="empty-state">No blogs found</div>
      ) : (
        <div className="blog-grid">
          {blogs.map((blog, i) => (
            <Link to={`/blog/${blog.id}`} className="blog-card" key={i}>
              {blog.blogImage && <img src={blog.blogImage} alt={blog.title} className="blog-image" />}
              <div className="blog-info">
                <h4>{blog.title || blog.blogTitle || 'Untitled'}</h4>
                <p className="blog-excerpt">
                  {(blog.description || blog.blogDescription || '').substring(0, 120)}
                  {(blog.description || blog.blogDescription || '').length > 120 ? '...' : ''}
                </p>
                <span className="blog-date">
                  {blog.created_at ? new Date(blog.created_at).toLocaleDateString('en-IN') : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogList;
