import axios from 'axios';

const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
};

export const predictionAPI = {
  predictText: (data) => api.post('/predict/text', data),
  predictImage: (formData) => api.post('/predict/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  predictBrainMRI: (formData) => api.post('/predict/brain', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  predictFaceAcne: (formData) => api.post('/predict/face', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

};

export const historyAPI = {
  getHistory: (params) => api.get('/history', { params }),
  getStats: () => api.get('/history/stats'),
  getQueryById: (id) => api.get(`/history/${id}`),
  deleteQuery: (id) => api.delete(`/history/${id}`),
};

export default api;
