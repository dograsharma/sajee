import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get or create session ID from localStorage
    let storedSessionId = localStorage.getItem('sanjeevani_session_id');
    let storedChatSessionId = localStorage.getItem('sanjeevani_chat_session_id');
    
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem('sanjeevani_session_id', storedSessionId);
    }
    
    if (!storedChatSessionId) {
      storedChatSessionId = uuidv4();
      localStorage.setItem('sanjeevani_chat_session_id', storedChatSessionId);
    }
    
    setSessionId(storedSessionId);
    setChatSessionId(storedChatSessionId);
    setIsLoading(false);
  }, []);

  const clearSession = () => {
    localStorage.removeItem('sanjeevani_session_id');
    localStorage.removeItem('sanjeevani_chat_session_id');
    const newSessionId = uuidv4();
    const newChatSessionId = uuidv4();
    localStorage.setItem('sanjeevani_session_id', newSessionId);
    localStorage.setItem('sanjeevani_chat_session_id', newChatSessionId);
    setSessionId(newSessionId);
    setChatSessionId(newChatSessionId);
  };

  const createNewChatSession = () => {
    const newChatSessionId = uuidv4();
    localStorage.setItem('sanjeevani_chat_session_id', newChatSessionId);
    setChatSessionId(newChatSessionId);
    return newChatSessionId;
  };

  const value = {
    sessionId,
    chatSessionId,
    isLoading,
    clearSession,
    createNewChatSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};