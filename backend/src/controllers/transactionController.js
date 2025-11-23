const blockchainService = require('../services/blockchainService');
const supabaseService = require('../services/supabaseService');
const mlService = require('../services/mlService');
const twilioService = require('../services/twilioService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

class TransactionController {
  /**
   * Fetch single transaction from blockchain
   */
  async fetchTransaction(req, res) {
    try {
      const { txHash } = req.params;

      if (!txHash || !blockchainService.isValidTxHash(txHash)) {
        return res.status(400).json({ 
          error: 'Valid transaction hash is required (66 characters starting with 0x)' 
        });
      }

      const txResult = await blockchainService.getTransaction(txHash);
      const receiptResult = await blockchainService.getTransactionReceipt(txHash);

      if (!txResult.success) {
        return res.status(404).json({ 
          error: 'Transaction not found on blockchain',
          details: txResult.error 
        });
      }

      const tx = txResult.transaction;
      const receipt = receiptResult.receipt;

      const transactionData = {
        tx_hash: tx.hash,
        from_address: tx.from.toLowerCase(),
        to_address: tx.to ? tx.to.toLowerCase() : null,
        value: blockchainService.weiToEther(tx.value),
        gas_used: receipt ? receipt.gasUsed.toString() : null,
        gas_price: blockchainService.weiToEther(tx.gasPrice),
        gas_limit: tx.gas.toString(),
        block_number: tx.blockNumber,
        timestamp: new Date(),
        status: receipt ? (receipt.status ? 'success' : 'failed') : 'pending',
        nonce: tx.nonce,
        input_data: tx.input
      };

      res.json({
        success: true,
        message: 'Transaction fetched successfully',
        transaction: transactionData
      });
    } catch (error) {
      logger.error('Fetch Transaction Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transaction',
        details: error.message 
      });
    }
  }

  /**
   * Fetch wallet transactions using Etherscan API v2
   */
  async fetchWalletTransactions(req, res) {
    try {
      const { walletAddress } = req.params;
      const { 
        limit = 50, 
        page = 1, 
        sort = 'desc',
        chainId 
      } = req.query;

      if (!walletAddress || !blockchainService.isValidAddress(walletAddress)) {
        return res.status(400).json({ 
          error: 'Valid wallet address is required' 
        });
      }

      const targetChainId = chainId ? parseInt(chainId) : null;

      const result = await blockchainService.getWalletTransactions(
        walletAddress,
        parseInt(page),
        parseInt(limit),
        sort,
        targetChainId
      );

      if (!result.success) {
        return res.status(404).json({ 
          error: result.error || 'No transactions found',
          details: result.details 
        });
      }

      res.json({
        success: true,
        message: 'Wallet transactions fetched successfully',
        count: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        chainId: result.chainId,
        transactions: result.transactions
      });
    } catch (error) {
      logger.error('Fetch Wallet Transactions Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch wallet transactions',
        details: error.message 
      });
    }
  }

  /**
   * Analyze transaction for fraud
   */
  async analyzeTransaction(req, res) {
    try {
      const { transaction, walletAddress, userEmail, userPhone } = req.body;

      if (!transaction || !transaction.tx_hash) {
        return res.status(400).json({ 
          error: 'Transaction data with tx_hash is required' 
        });
      }

      // Check if already analyzed
      const { data: existingTx } = await supabaseService.getTransactionByHash(
        transaction.tx_hash
      );

      if (existingTx && existingTx.analyzed_at) {
        return res.json({
          success: true,
          message: 'Transaction already analyzed (cached)',
          cached: true,
          riskScore: existingTx.risk_score,
          isFraudulent: existingTx.is_fraudulent,
          anomalyType: existingTx.anomaly_type
        });
      }

      // Store transaction
      await supabaseService.storeTransaction({
        ...transaction,
        wallet_address: walletAddress,
        is_fraudulent: false,
        risk_score: 0
      });

      // Analyze with ML service
      const mlResult = await mlService.analyzeTransaction(transaction);

      if (!mlResult.success) {
        return res.status(500).json({ 
          error: 'ML analysis failed',
          details: mlResult.error 
        });
      }

      // Update transaction with ML results
      await supabaseService.updateTransactionRiskScore(
        transaction.tx_hash,
        mlResult.riskScore,
        mlResult.isFraudulent,
        mlResult.anomalyType
      );

      // Handle high-risk transactions
      if (mlResult.riskScore >= 70 || mlResult.isFraudulent) {
        await this.handleHighRiskTransaction(
          walletAddress,
          transaction.tx_hash,
          mlResult.riskScore,
          mlResult.anomalyType,
          userEmail,
          userPhone
        );
      }

      logger.info(`Transaction analyzed: ${transaction.tx_hash} - Risk: ${mlResult.riskScore}%`);

      res.json({
        success: true,
        message: 'Transaction analyzed successfully',
        riskScore: mlResult.riskScore,
        isFraudulent: mlResult.isFraudulent,
        anomalyType: mlResult.anomalyType,
        confidence: mlResult.confidence,
        alertCreated: mlResult.riskScore >= 70
      });
    } catch (error) {
      logger.error('Analyze Transaction Error:', error);
      res.status(500).json({ 
        error: 'Transaction analysis failed',
        details: error.message 
      });
    }
  }

  /**
   * Batch analyze transactions
   */
  async batchAnalyze(req, res) {
    try {
      const { transactions, walletAddress, userEmail, userPhone } = req.body;

      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ 
          error: 'Transactions array is required' 
        });
      }

      if (transactions.length > 100) {
        return res.status(400).json({ 
          error: 'Maximum 100 transactions per batch' 
        });
      }

      // Store all transactions
      await supabaseService.storeTransactionBatch(
        transactions.map(tx => ({
          ...tx,
          wallet_address: walletAddress,
          is_fraudulent: false,
          risk_score: 0
        }))
      );

      // Analyze batch
      const mlResult = await mlService.analyzeTransactionBatch(transactions);

      if (!mlResult.success) {
        return res.status(500).json({ 
          error: 'Batch analysis failed',
          details: mlResult.error 
        });
      }

      // Process results
      const results = [];
      const highRiskTxs = [];

      for (let i = 0; i < mlResult.results.length; i++) {
        const result = mlResult.results[i];
        const tx = transactions[i];

        await supabaseService.updateTransactionRiskScore(
          tx.tx_hash,
          result.risk_score,
          result.is_fraudulent,
          result.anomaly_type
        );

        results.push({
          txHash: tx.tx_hash,
          riskScore: result.risk_score,
          isFraudulent: result.is_fraudulent,
          anomalyType: result.anomaly_type
        });

        if (result.risk_score >= 70 || result.is_fraudulent) {
          highRiskTxs.push({
            txHash: tx.tx_hash,
            riskScore: result.risk_score,
            anomalyType: result.anomaly_type
          });
        }
      }

      // Handle high-risk transactions
      if (highRiskTxs.length > 0) {
        await this.handleBatchHighRisk(walletAddress, highRiskTxs, userEmail, userPhone);
      }

      logger.info(`Batch analysis completed: ${results.length} transactions, ${highRiskTxs.length} high-risk`);

      res.json({
        success: true,
        message: 'Batch analysis completed',
        totalAnalyzed: results.length,
        highRiskCount: highRiskTxs.length,
        results,
        highRiskTransactions: highRiskTxs
      });
    } catch (error) {
      logger.error('Batch Analyze Error:', error);
      res.status(500).json({ 
        error: 'Batch analysis failed',
        details: error.message 
      });
    }
  }

  /**
   * Get user transactions from database
   */
  async getUserTransactions(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, offset = 0, fraudOnly = false } = req.query;

      if (!walletAddress || !blockchainService.isValidAddress(walletAddress)) {
        return res.status(400).json({ 
          error: 'Valid wallet address is required' 
        });
      }

      const { data: transactions, error } = await supabaseService.getTransactionsByUser(
        walletAddress.toLowerCase(),
        parseInt(limit),
        parseInt(offset),
        fraudOnly === 'true'
      );

      if (error) {
        return res.status(500).json({ 
          error: 'Failed to fetch transactions' 
        });
      }

      res.json({
        success: true,
        message: 'Transactions fetched successfully',
        count: transactions ? transactions.length : 0,
        transactions: transactions || []
      });
    } catch (error) {
      logger.error('Get User Transactions Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: error.message 
      });
    }
  }

  /**
   * Get flagged transactions
   */
  async getFlaggedTransactions(req, res) {
    try {
      const { limit = 50, minRiskScore = 70 } = req.query;

      const { data: transactions, error } = await supabaseService.getFlaggedTransactions(
        parseInt(limit),
        parseInt(minRiskScore)
      );

      if (error) {
        return res.status(500).json({ 
          error: 'Failed to fetch flagged transactions' 
        });
      }

      res.json({
        success: true,
        message: 'Flagged transactions fetched successfully',
        count: transactions ? transactions.length : 0,
        transactions: transactions || []
      });
    } catch (error) {
      logger.error('Get Flagged Transactions Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch flagged transactions',
        details: error.message 
      });
    }
  }

  /**
   * Get alerts for wallet
   */
  async getAlerts(req, res) {
    try {
      const { walletAddress } = req.params;
      const { status = 'all', limit = 50 } = req.query;

      if (!walletAddress || !blockchainService.isValidAddress(walletAddress)) {
        return res.status(400).json({ 
          error: 'Valid wallet address is required' 
        });
      }

      const { data: alerts, error } = await supabaseService.getAlertsByWallet(
        walletAddress.toLowerCase(),
        status,
        parseInt(limit)
      );

      if (error) {
        return res.status(500).json({ 
          error: 'Failed to fetch alerts' 
        });
      }

      res.json({
        success: true,
        message: 'Alerts fetched successfully',
        count: alerts ? alerts.length : 0,
        alerts: alerts || []
      });
    } catch (error) {
      logger.error('Get Alerts Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch alerts',
        details: error.message 
      });
    }
  }

  // ========== HELPER METHODS ==========

  async handleHighRiskTransaction(walletAddress, txHash, riskScore, anomalyType, email, phone) {
    try {
      await supabaseService.createAlert(
        walletAddress,
        txHash,
        riskScore,
        `⚠️ High-risk transaction: ${anomalyType}`
      );

      if (email) {
        await emailService.sendFraudAlert(email, txHash, riskScore);
      }

      if (phone) {
        await twilioService.sendFraudAlert(phone, txHash, riskScore);
      }

      logger.info(`High-risk alert created for tx: ${txHash}`);
    } catch (error) {
      logger.error('Handle High Risk Error:', error);
    }
  }

  async handleBatchHighRisk(walletAddress, highRiskTxs, email, phone) {
    try {
      await Promise.all(
        highRiskTxs.map(tx =>
          supabaseService.createAlert(
            walletAddress,
            tx.txHash,
            tx.riskScore,
            `⚠️ ${tx.anomalyType}`
          )
        )
      );

      if (email && highRiskTxs.length > 0) {
        await emailService.sendFraudAlert(email, highRiskTxs[0].txHash, highRiskTxs[0].riskScore);
      }

      if (phone && highRiskTxs.length > 0) {
        await twilioService.sendFraudAlert(phone, highRiskTxs[0].txHash, highRiskTxs[0].riskScore);
      }
    } catch (error) {
      logger.error('Handle Batch High Risk Error:', error);
    }
  }
}

module.exports = new TransactionController();
