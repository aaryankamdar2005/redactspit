const crypto = require('crypto');
const config = require('../config/config');

class Helpers {
  /**
   * Generate random OTP
   */
  generateOTP(length = 3) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Hash data using SHA256
   */
  hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(config.security.encryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption Error:', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(config.security.encryptionKey, 'hex');
      
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts.shift(), 'hex');
      const encrypted = parts.join(':');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption Error:', error);
      return null;
    }
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Format wallet address for display
   */
  formatAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(part, total) {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(2);
  }

  /**
   * Delay/Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Paginate array
   */
  paginate(array, page = 1, limit = 10) {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    return {
      data: array.slice(startIndex, endIndex),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(array.length / limit),
        totalItems: array.length,
        itemsPerPage: limit
      }
    };
  }
}

module.exports = new Helpers();
