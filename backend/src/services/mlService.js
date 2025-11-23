const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');

class MLService {
  constructor() {
    this.mlServiceUrl = config.mlService.url;
  }

  /**
   * Hash sensitive data for privacy
   */
  hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Obfuscate transaction features
   */
  obfuscateTransaction(transaction) {
    return {
      ...transaction,
      from_address: this.hashSensitiveData(transaction.from_address || ''),
      to_address: this.hashSensitiveData(transaction.to_address || ''),
      value: transaction.value,
      gas_used: transaction.gas_used,
      gas_price: transaction.gas_price,
      timestamp: transaction.timestamp
    };
  }

  /**
   * Analyze single transaction
   */
  async analyzeTransaction(transaction) {
    try {
      const obfuscatedTx = this.obfuscateTransaction(transaction);
      
      const response = await axios.post(
        `${this.mlServiceUrl}/predict`,
        { transaction: obfuscatedTx },
        { 
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return {
        success: true,
        riskScore: response.data.risk_score || 0,
        isFraudulent: response.data.is_fraudulent || false,
        anomalyType: response.data.anomaly_type || 'None',
        confidence: response.data.confidence || 0
      };
    } catch (error) {
      logger.error('ML Service Error:', error.message);
      
      // Return default values on error
      return {
        success: false,
        error: error.message,
        riskScore: 0,
        isFraudulent: false,
        anomalyType: 'Analysis Failed',
        confidence: 0
      };
    }
  }

  /**
   * Batch analyze transactions
   */
  async analyzeTransactionBatch(transactions) {
    try {
      const obfuscatedTxs = transactions.map(tx => this.obfuscateTransaction(tx));
      
      const response = await axios.post(
        `${this.mlServiceUrl}/predict-batch`,
        { transactions: obfuscatedTxs },
        { 
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return {
        success: true,
        results: response.data.results || []
      };
    } catch (error) {
      logger.error('ML Batch Analysis Error:', error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Check ML service health
   */
  async checkHealth() {
    try {
      const response = await axios.get(
        `${this.mlServiceUrl}/health`, 
        { timeout: 5000 }
      );
      
      return { 
        success: true, 
        status: response.data,
        online: true
      };
    } catch (error) {
      logger.error('ML Service Health Check Failed:', error.message);
      return { 
        success: false, 
        error: error.message,
        online: false
      };
    }
  }

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      const response = await axios.get(
        `${this.mlServiceUrl}/model-info`,
        { timeout: 5000 }
      );
      
      return {
        success: true,
        info: response.data
      };
    } catch (error) {
      logger.error('Get Model Info Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MLService();
