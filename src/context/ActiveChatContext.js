import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ActiveChatContext = createContext();

const STORAGE_KEY = 'activeAstrologerChat';

export const ActiveChatProvider = ({ children }) => {
  const [activeChat, setActiveChat] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });

  useEffect(() => {
    if (activeChat) localStorage.setItem(STORAGE_KEY, JSON.stringify(activeChat));
    else localStorage.removeItem(STORAGE_KEY);
  }, [activeChat]);

  const startChat = useCallback((data) => {
    setActiveChat({
      id: data.id,
      userId: data.userId,
      userName: data.userName || data.name || 'Customer',
      profileImage: data.profileImage || null,
      chatStatus: data.chatStatus || 'Accepted',
      chatRate: data.chatRate || 0,
      startTime: data.startTime || Date.now(),
    });
  }, []);

  const updateChat = useCallback((updates) => {
    setActiveChat(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const endChat = useCallback(() => {
    setActiveChat(null);
  }, []);

  return (
    <ActiveChatContext.Provider value={{ activeChat, startChat, updateChat, endChat }}>
      {children}
    </ActiveChatContext.Provider>
  );
};

export const useActiveChatRedirect = () => {
  const { activeChat } = useContext(ActiveChatContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (activeChat?.id && activeChat.chatStatus !== 'Completed') {
      const chatPath = `/chat-room/${activeChat.id}`;
      if (!location.pathname.includes('/chat-room/')) {
        const hasRedirected = sessionStorage.getItem('astroChatRedirected');
        if (!hasRedirected) {
          sessionStorage.setItem('astroChatRedirected', '1');
          navigate(chatPath);
        }
      }
    } else {
      sessionStorage.removeItem('astroChatRedirected');
    }
  }, []);
};

export const useActiveChat = () => useContext(ActiveChatContext);
