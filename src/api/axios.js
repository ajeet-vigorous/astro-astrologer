import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://192.168.29.78:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('astrologerToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
