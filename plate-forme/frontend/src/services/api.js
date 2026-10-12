// src/services/api.js
import axios from 'axios';
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: API_URL,
});

export const getFormationImageUrl = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) return '';

  const value = imageUrl.trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const backendOrigin = new URL(API.defaults.baseURL, window.location.origin).origin;
  const normalizedPath = value.replace(/\\/g, '/');
  return new URL(normalizedPath, `${backendOrigin}/`).toString();
};

// Intercepteur pour attacher le token JWT automatiquement
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;