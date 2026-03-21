import React, { useState, useEffect } from 'react';
import { blogApi } from '../api/services';
import { useParams, Link } from 'react-router-dom';

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBlog(); }, [id]);

  const fetchBlog = async () => {
    try {
      const res = await blogApi.getById({ blogId: id });
      const d = res.data;
      setBlog(d?.recordList?.[0] || d?.data || d?.recordList || null);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  if (!blog) return (
    <div className="page-container">
      <div className="empty-state">Blog not found. <Link to="/blog">Back to Blog</Link></div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/blog" className="back-link">&larr; Back to Blog</Link>
      </div>

      <article className="blog-detail">
        {blog.blogImage && <img src={blog.blogImage} alt={blog.title} className="blog-detail-image" />}
        <h1>{blog.title || blog.blogTitle || 'Untitled'}</h1>
        <div className="blog-meta">
          <span>{blog.created_at ? new Date(blog.created_at).toLocaleDateString('en-IN') : ''}</span>
          {blog.author && <span>By {blog.author}</span>}
        </div>
        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: blog.description || blog.blogDescription || '' }}
        />
      </article>
    </div>
  );
};

export default BlogDetail;
