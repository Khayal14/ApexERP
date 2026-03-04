import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('apex-token');
      if (!token) { setLoading(false); return; }
      const { data } = await api.get('/core/users/me/');
      setUser(data);
    } catch {
      localStorage.removeItem('apex-token');
      localStorage.removeItem('apex-refresh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('apex-token', data.access);
    localStorage.setItem('apex-refresh', data.refresh);
    await fetchUser();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('apex-token');
    localStorage.removeItem('apex-refresh');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
