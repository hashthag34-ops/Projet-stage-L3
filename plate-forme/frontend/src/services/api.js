// src/services/api.js
import axios from 'axios';
const API_URL = import.meta.env.VITE_URLTEST || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: API_URL,
});

// Intercepteur pour attacher le token JWT automatiquement
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;