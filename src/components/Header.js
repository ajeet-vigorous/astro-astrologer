import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../api/services';

const Header = () => {
  const { astrologer, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!astrologer) { setActiveSession(null); return; }
    const checkActive = async () => {
      try {
        const res = await chatApi.getActiveSession({ astrologerId: astrologer?.id });
        const d = res.data;
        if (d?.activeChat) setActiveSession({ type: 'chat', id: d.activeChat.id, name: d.activeChat.userName, status: d.activeChat.chatStatus });
        else if (d?.activeCall) setActiveSession({ type: 'call', id: d.activeCall.id, name: d.activeCall.userName, status: d.activeCall.callStatus });
        else setActiveSession(null);
      } catch(e) { setActiveSession(null); }
    };
    checkActive();
    const interval = setInterval(checkActive, 15000);
    return () => clearInterval(interval);
  }, [astrologer]);

  const imgSrc = astrologer?.profileImage
    ? (astrologer.profileImage.startsWith('http') ? astrologer.profileImage : `http://localhost:5000${astrologer.profileImage}`)
    : null;

  return (
    <>
    {activeSession && (
      <div onClick={() => navigate(activeSession.type === 'chat' ? `/chat-room/${activeSession.id}` : `/call-room/${activeSession.id}`)}
        style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'dotBlink 1s infinite' }}></span>
        <span>Active {activeSession.type === 'chat' ? 'Chat' : 'Call'} with <strong>{activeSession.name}</strong> ({activeSession.status})</span>
        <span style={{ background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: '0.8rem' }}>Resume &rarr;</span>
      </div>
    )}
    <header className="astro-header">
      <Link to="/" className="header-logo">AstroGuru</Link>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '\u2715' : '\u2630'}
      </button>

      <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
        <div className="nav-item">
          <Link to="/" onClick={closeMenu}>Dashboard</Link>
        </div>

        <div className="nav-item has-dropdown">
          <span>Services &#9662;</span>
          <div className="dropdown-menu">
            <Link to="/kundali" onClick={closeMenu}>Kundali</Link>
            <Link to="/kundali-matching" onClick={closeMenu}>Kundali Matching</Link>
            <Link to="/horoscope" onClick={closeMenu}>Horoscope</Link>
            <Link to="/panchang" onClick={closeMenu}>Panchang</Link>
            <Link to="/blog" onClick={closeMenu}>Blog</Link>
          </div>
        </div>

        <div className="nav-item has-dropdown user-nav">
          <span className="user-trigger">
            {imgSrc ? (
              <img src={imgSrc} alt={astrologer?.name} className="user-avatar" />
            ) : (
              <span className="user-avatar-placeholder">{(astrologer?.name || 'A')[0]}</span>
            )}
            {astrologer?.name || 'Astrologer'} &#9662;
          </span>
          <div className="dropdown-menu dropdown-right">
            <Link to="/profile" onClick={closeMenu}>My Account</Link>
            <Link to="/wallet" onClick={closeMenu}>My Wallet</Link>
            <div className="dropdown-divider"></div>
            <Link to="/chat-history" onClick={closeMenu}>My Chats</Link>
            <Link to="/call-history" onClick={closeMenu}>My Calls</Link>
            <Link to="/reports" onClick={closeMenu}>My Reports</Link>
            <Link to="/followers" onClick={closeMenu}>My Followers</Link>
            <div className="dropdown-divider"></div>
            <Link to="/my-pujas" onClick={closeMenu}>My Puja Lists</Link>
            <Link to="/puja-orders" onClick={closeMenu}>Puja Orders</Link>
            <Link to="/appointments" onClick={closeMenu}>Appointments</Link>
            <Link to="/reviews" onClick={closeMenu}>Reviews</Link>
            <div className="dropdown-divider"></div>
            <button className="dropdown-logout" onClick={() => { handleLogout(); closeMenu(); }}>Sign Out</button>
          </div>
        </div>
      </nav>
    </header>
    </>
  );
};

export default Header;
