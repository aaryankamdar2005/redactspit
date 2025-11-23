require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:5000'
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173' // Updated for Vite
  },
  
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    voiceBotNumber: process.env.TWILIO_VOICE_BOT_NUMBER
  },
  
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  },
  
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:8000'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};
