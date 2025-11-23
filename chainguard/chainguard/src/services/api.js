import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // OTP methods in authAPI for easier access
  sendOTP: async (userId, email, phoneNumber) => {
    const response = await api.post('/otp/send', {
      userId,
      email,
      phoneNumber,
    });
    return response.data;
  },

  verifyOTP: async (userId, emailOTP, phoneOTP) => {
    const response = await api.post('/otp/verify', {
      userId,
      emailOTP,
      phoneOTP,
    });
    return response.data;
  },

  resendOTP: async (userId, email, phoneNumber) => {
    const response = await api.post('/otp/resend', {
      userId,
      email,
      phoneNumber,
    });
    return response.data;
  },

  getOTPStatus: async (userId) => {
    const response = await api.get(`/otp/status/${userId}`);
    return response.data;
  },
};

// Transaction API calls
export const transactionAPI = {
  // Simple transaction endpoints (no auth required for fetch)
  fetchWalletTransactions: async (walletAddress, params = {}) => {
    const response = await api.get(`/simple-transactions/fetch/${walletAddress}`, {
      params,
    });
    return response.data;
  },

  analyzeWallet: async (walletAddress, params = {}) => {
    const response = await api.get(`/simple-transactions/analyze/${walletAddress}`, {
      params,
    });
    return response.data;
  },

  // Database transaction endpoints (auth required)
  getUserTransactions: async (walletAddress, params = {}) => {
    const response = await api.get(`/transactions/user/${walletAddress}`, {
      params,
    });
    return response.data;
  },

  getFlaggedTransactions: async (params = {}) => {
    const response = await api.get('/transactions/flagged', { params });
    return response.data;
  },

  getAlerts: async (walletAddress, params = {}) => {
    const response = await api.get(`/transactions/alerts/${walletAddress}`, {
      params,
    });
    return response.data;
  },

  // Analyze single transaction
  analyzeTransaction: async (transaction, walletAddress, userEmail, userPhone) => {
    const response = await api.post('/transactions/analyze', {
      transaction,
      walletAddress,
      userEmail,
      userPhone,
    });
    return response.data;
  },

  // Batch analyze
  batchAnalyze: async (transactions, walletAddress, userEmail, userPhone) => {
    const response = await api.post('/transactions/batch-analyze', {
      transactions,
      walletAddress,
      userEmail,
      userPhone,
    });
    return response.data;
  },
};

export default api;
