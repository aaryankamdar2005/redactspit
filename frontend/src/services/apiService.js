import axios from 'axios';

const API_URL =import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sendOTP = (userId, email, phone) =>
  api.post('/api/otp/send', { userId, email, phone });

export const verifyOTP = (userId, otp) =>
  api.post('/api/otp/verify', { userId, otp });

export const scoreTransactions = (transactions) =>
  api.post('/api/transactions/score', { transactions });

export const getTransactionHistory = (address) =>
  api.get(`/api/transactions/${address}`);

export default api;
