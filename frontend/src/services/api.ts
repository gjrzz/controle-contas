import axios from 'axios';
import type { LoginCredentials, User } from '../types/auth';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Envia cookies automaticamente
});

// Interceptor para adicionar access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refresh automático via cookie
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token é enviado automaticamente via httpOnly cookie
        const { data } = await axios.post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<{ accessToken: string }>('/auth/login', credentials);
    return response;
  },
  me: () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export default api;
