import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const storedAuth = localStorage.getItem('crimewatch_auth');
  if (storedAuth) {
    try {
      const { token } = JSON.parse(storedAuth);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      localStorage.removeItem('crimewatch_auth');
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crimewatch_auth');
    }
    return Promise.reject(error);
  }
);

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const getAuthRoles = async () => {
  const response = await api.get('/auth/roles');
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data;
};

export const updateUserRole = async (id, role) => {
  const response = await api.patch(`/auth/users/${id}/role`, { role });
  return response.data;
};

export const analyzeText = async (text) => {
  const response = await api.post('/analyze/text', { text });
  return response.data;
};

export const analyzeUrl = async (url) => {
  const response = await api.post('/analyze/url', { url });
  return response.data;
};

export const analyzeFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/analyze/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const analyzeBatch = async (texts) => {
  const response = await api.post('/analyze/batch', { texts });
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/analyze/stats');
  return response.data;
};

export const getCrimeReports = async (page = 1, limit = 50) => {
  const response = await api.get(`/analyze/crime-reports?page=${page}&limit=${limit}`);
  return response.data;
};

export const deleteCrimeReport = async (id) => {
  const response = await api.delete(`/analyze/crime-reports/${id}`);
  return response.data;
};

export const updateCrimeReport = async (id, payload) => {
  const response = await api.patch(`/analyze/crime-reports/${id}`, payload);
  return response.data;
};

export const getSystemLogs = async (page = 1, limit = 50) => {
  const response = await api.get(`/analyze/logs?page=${page}&limit=${limit}`);
  return response.data;
};

export const getHistory = async (page = 1, limit = 20) => {
  const response = await api.get(`/analyze/history?page=${page}&limit=${limit}`);
  return response.data;
};

export const getModelInfo = async () => {
  const response = await api.get('/model/info');
  return response.data;
};

export const getAdminUsers = getUsers;

export const deleteUser = async (id) => {
  const response = await api.delete(`/auth/users/${id}`);
  return response.data;
};

export const exportCrimeReports = async (format = 'csv') => {
  const response = await api.get(`/analyze/crime-reports/export?format=${format}`, {
    responseType: 'blob'
  });
  return response.data;
};

export default api;
