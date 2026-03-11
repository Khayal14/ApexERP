import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Attach JWT access token
  const token = localStorage.getItem('apex-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Attach active branch header so backend scopes data to the right company.
  // Value is a Company UUID (single branch) or 'all' (consolidated view).
  const branchId = localStorage.getItem('apex-active-branch');
  if (branchId) config.headers['X-Branch-ID'] = branchId;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('apex-refresh');
        if (refresh) {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          localStorage.setItem('apex-token', data.access);
          if (data.refresh) localStorage.setItem('apex-refresh', data.refresh);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('apex-token');
        localStorage.removeItem('apex-refresh');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
