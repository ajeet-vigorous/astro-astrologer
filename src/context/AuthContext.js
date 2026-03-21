import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [astrologer, setAstrologer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('astrologerToken');
    const data = localStorage.getItem('astrologerData');
    if (token && data) {
      try {
        setAstrologer(JSON.parse(data));
      } catch (e) {
        localStorage.removeItem('astrologerToken');
        localStorage.removeItem('astrologerData');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, data) => {
    localStorage.setItem('astrologerToken', token);
    localStorage.setItem('astrologerData', JSON.stringify(data));
    setAstrologer(data);
  };

  const logout = () => {
    localStorage.removeItem('astrologerToken');
    localStorage.removeItem('astrologerData');
    setAstrologer(null);
  };

  return (
    <AuthContext.Provider value={{ astrologer, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
