const axios = require('axios');
const logger = require('../utils/logger');

class SimpleTransactionController {
  /**
   * Fetch transactions directly from Etherscan URL and analyze with ML
   */
  async fetchAndAnalyze(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, chainId = 80002 } = req.query;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ 
          error: 'Valid wallet address is required (0x followed by 40 hex characters)' 
        });
      }

      logger.info(`Fetching transactions for wallet: ${walletAddress}`);

      // Direct Etherscan API URL (exactly like your working browser link)
      const etherscanUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=BA4HVQCKQCGVQNVPMBXE5I24F24QD2JH1Y`;

      // Step 1: Fetch from Etherscan
      logger.info('📡 Fetching from Etherscan...');
      const etherscanResponse = await axios.get(etherscanUrl, {
        timeout: 20000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      // Check response
      if (etherscanResponse.data.status !== '1') {
        logger.error('Etherscan API error:', etherscanResponse.data.message);
        return res.status(400).json({
          success: false,
          error: etherscanResponse.data.message || 'Failed to fetch transactions',
          details: etherscanResponse.data.result
        });
      }

      const transactions = etherscanResponse.data.result;
      logger.info(`✅ Fetched ${transactions.length} transactions from Etherscan`);

      // If no transactions, return early
      if (transactions.length === 0) {
        return res.json({
          success: true,
          message: 'No transactions found for this address',
          walletAddress,
          chainId,
          count: 0,
          transactions: []
        });
      }

      // Step 2: Send to ML Model
      logger.info('🤖 Sending to ML model for analysis...');
      
      let mlAnalysis = null;
      let analyzedTransactions = transactions;

      try {
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const mlResponse = await axios.post(
          `${mlServiceUrl}/predict-batch`,
          { transactions },
          { 
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (mlResponse.data && mlResponse.data.results) {
          logger.info(`✅ ML analysis completed for ${mlResponse.data.results.length} transactions`);

          // Merge ML results with transactions
          analyzedTransactions = transactions.map((tx, index) => ({
            ...tx,
            ml_analysis: mlResponse.data.results[index] || {
              risk_score: 0,
              is_fraudulent: false,
              anomaly_type: 'Analysis Failed',
              confidence: 0
            }
          }));

          // Calculate summary statistics
          const mlResults = mlResponse.data.results;
          mlAnalysis = {
            analyzed: true,
            totalAnalyzed: mlResults.length,
            summary: {
              highRisk: mlResults.filter(r => r.risk_score >= 70).length,
              mediumRisk: mlResults.filter(r => r.risk_score >= 40 && r.risk_score < 70).length,
              lowRisk: mlResults.filter(r => r.risk_score < 40).length,
              fraudulent: mlResults.filter(r => r.is_fraudulent).length,
              averageRiskScore: (mlResults.reduce((sum, r) => sum + (r.risk_score || 0), 0) / mlResults.length).toFixed(2)
            },
            riskDistribution: this.calculateRiskDistribution(mlResults)
          };
        }
      } catch (mlError) {
        logger.error('⚠️ ML service error (continuing without analysis):', mlError.message);
        mlAnalysis = {
          analyzed: false,
          error: mlError.message,
          message: 'ML service unavailable - returning raw transaction data'
        };
      }

      // Step 3: Return combined response
      res.json({
        success: true,
        message: 'Transactions fetched and analyzed successfully',
        walletAddress,
        chainId,
        count: analyzedTransactions.length,
        mlAnalysis,
        transactions: analyzedTransactions
      });

    } catch (error) {
      logger.error('❌ Fetch and Analyze Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch and analyze transactions',
        details: error.message
      });
    }
  }

  /**
   * Fetch transactions only (no ML analysis)
   */
  async fetchOnly(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, chainId = 80002 } = req.query;

      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ 
          error: 'Valid wallet address is required' 
        });
      }

      logger.info(`Fetching transactions for wallet: ${walletAddress}`);

      // Direct Etherscan API URL
      const etherscanUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=BA4HVQCKQCGVQNVPMBXE5I24F24QD2JH1Y`;

      const response = await axios.get(etherscanUrl, {
        timeout: 20000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.data.status !== '1') {
        return res.status(400).json({
          success: false,
          error: response.data.message || 'Failed to fetch transactions',
          details: response.data.result
        });
      }

      const transactions = response.data.result;
      logger.info(`✅ Fetched ${transactions.length} transactions`);

      res.json({
        success: true,
        message: 'Transactions fetched successfully',
        walletAddress,
        chainId,
        count: transactions.length,
        transactions
      });

    } catch (error) {
      logger.error('❌ Fetch Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        details: error.message
      });
    }
  }

  /**
   * Calculate risk distribution
   */
  calculateRiskDistribution(mlResults) {
    const ranges = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    mlResults.forEach(result => {
      const score = result.risk_score || 0;
      if (score <= 20) ranges['0-20']++;
      else if (score <= 40) ranges['21-40']++;
      else if (score <= 60) ranges['41-60']++;
      else if (score <= 80) ranges['61-80']++;
      else ranges['81-100']++;
    });

    return ranges;
  }
}

module.exports = new SimpleTransactionController();
