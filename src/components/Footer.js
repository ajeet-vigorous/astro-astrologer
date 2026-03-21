import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="astro-footer">
      <div className="footer-content">
        <div className="footer-col">
          <h4>Menu</h4>
          <Link to="/kundali">Kundali</Link>
          <Link to="/kundali-matching">Kundali Matching</Link>
          <Link to="/horoscope">Horoscope</Link>
        </div>
        <div className="footer-col">
          <h4>Links</h4>
          <Link to="/blog">Blog</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-condition">Terms & Conditions</Link>
          <Link to="/refund-policy">Refund Policy</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AstroGuru. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
