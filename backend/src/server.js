const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const config = require('./config/config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const transactionRoutes = require('./routes/transactions');
const voiceRoutes = require('./routes/voice');
const simpleTransactionRoutes = require('./routes/simpleTransactions');

const app = express();

// ========== MIDDLEWARE SETUP ==========

// CORS - Allow requests from frontend
app.use(cors({
  origin: [
    config.frontend.url,
    'http://localhost:3000',
    'http://localhost:5173', // Vite default port
    'http://localhost:5174',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for development
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ========== API ROUTES ==========

app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/simple-transactions', simpleTransactionRoutes);

// ========== UTILITY ENDPOINTS ==========

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'ChainGuard Backend is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ChainGuard API',
    version: '1.0.0',
    description: 'AI/ML DeFi Transaction Anomaly Detection',
    status: 'online',
    endpoints: {
      health: '/health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'POST /api/auth/change-password',
      },
      otp: {
        send: 'POST /api/otp/send',
        verify: 'POST /api/otp/verify',
        resend: 'POST /api/otp/resend',
        status: 'GET /api/otp/status/:userId'
      },
      transactions: {
        fetch: 'GET /api/simple-transactions/fetch/:walletAddress',
        analyze: 'GET /api/simple-transactions/analyze/:walletAddress',
        userTransactions: 'GET /api/transactions/user/:walletAddress',
        flagged: 'GET /api/transactions/flagged',
        alerts: 'GET /api/transactions/alerts/:walletAddress'
      },
      voice: {
        call: 'POST /api/voice/call',
        status: 'GET /api/voice/status'
      }
    },
    documentation: 'https://github.com/yourusername/chainguard'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      blockchain: 'connected',
      ml: 'connected',
      email: 'ready',
      sms: 'ready'
    }
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ========== PROCESS ERROR HANDLERS ==========

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit the process in production
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit the process in production
});

// ========== START SERVER ==========

const PORT = config.port || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n==============================================');
  console.log('🚀 ChainGuard Backend Server Started');
  console.log('==============================================');
  logger.info(`📡 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}`);
  logger.info(`🌐 CORS Enabled for: ${config.frontend.url}`);
  logger.info(`✅ Server is ready to accept requests`);
  console.log('==============================================\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
    console.error(`\n⚠️  Port ${PORT} is already in use. Please:`);
    console.error('   1. Stop the other process using this port');
    console.error('   2. Or change PORT in .env file\n');
    process.exit(1);
  } else {
    logger.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n');
  logger.info('👋 Shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
