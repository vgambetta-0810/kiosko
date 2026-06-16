import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAuthStorage, setToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = (data) => {
    clearAuthStorage();
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return persistSession(data);
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return persistSession(data);
  };

  const loginWithGoogle = async (idToken) => {
    const { data } = await api.post('/auth/google', { idToken });
    return persistSession(data);
  };

  const logout = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    const boot = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      setToken(token);
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (_err) {
        clearAuthStorage();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const value = useMemo(
    () => ({ user, loading, setUser, login, register, loginWithGoogle, logout }),
    [user, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
