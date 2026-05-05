import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const setToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

const bootToken = localStorage.getItem('token');
if (bootToken) setToken(bootToken);
