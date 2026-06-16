import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1' });

const AUTH_STORAGE_KEYS = ['token', 'refreshToken', 'user', 'role'];

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const setToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

const bootToken = localStorage.getItem('token');
if (bootToken) setToken(bootToken);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/google')) {
      clearAuthStorage();
      setToken(null);
    }
    return Promise.reject(error);
  }
);
