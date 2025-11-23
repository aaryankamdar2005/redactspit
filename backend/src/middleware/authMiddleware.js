const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      logger.info(`User authenticated: ${decoded.email}`);
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    logger.error('Auth Middleware Error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed.',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = authMiddleware;
