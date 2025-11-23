const express = require('express');
const { param, query, body } = require('express-validator');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

/**
 * @route   GET /api/transactions/fetch/:txHash
 * @desc    Fetch transaction from blockchain
 * @access  Protected
 */
router.get(
  '/fetch/:txHash',
  [
    param('txHash')
      .isLength({ min: 66, max: 66 })
      .withMessage('Invalid transaction hash'),
    validate
  ],
  transactionController.fetchTransaction
);

/**
 * @route   GET /api/transactions/wallet/:walletAddress
 * @desc    Fetch wallet transactions from Etherscan API v2
 * @access  Protected
 */
router.get(
  '/wallet/:walletAddress',
  [
    param('walletAddress')
      .isEthereumAddress()
      .withMessage('Invalid wallet address'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be positive'),
    validate
  ],
  transactionController.fetchWalletTransactions
);

/**
 * @route   POST /api/transactions/analyze
 * @desc    Analyze single transaction for fraud
 * @access  Protected
 */
router.post(
  '/analyze',
  [
    body('transaction')
      .exists()
      .withMessage('Transaction object is required'),
    body('transaction.tx_hash')
      .exists()
      .withMessage('Transaction hash is required'),
    body('walletAddress')
      .optional()
      .isEthereumAddress()
      .withMessage('Invalid wallet address'),
    validate
  ],
  transactionController.analyzeTransaction
);

/**
 * @route   POST /api/transactions/batch-analyze
 * @desc    Batch analyze transactions
 * @access  Protected
 */
router.post(
  '/batch-analyze',
  [
    body('transactions')
      .isArray({ min: 1, max: 100 })
      .withMessage('Transactions must be an array (1-100)'),
    body('walletAddress')
      .optional()
      .isEthereumAddress()
      .withMessage('Invalid wallet address'),
    validate
  ],
  transactionController.batchAnalyze
);

/**
 * @route   GET /api/transactions/user/:walletAddress
 * @desc    Get user transactions from database
 * @access  Protected
 */
router.get(
  '/user/:walletAddress',
  [
    param('walletAddress')
      .isEthereumAddress()
      .withMessage('Invalid wallet address'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200'),
    validate
  ],
  transactionController.getUserTransactions
);

/**
 * @route   GET /api/transactions/flagged
 * @desc    Get flagged transactions
 * @access  Protected
 */
router.get(
  '/flagged',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200'),
    validate
  ],
  transactionController.getFlaggedTransactions
);

/**
 * @route   GET /api/transactions/alerts/:walletAddress
 * @desc    Get alerts for wallet
 * @access  Protected
 */

router.get(
  '/alerts/:walletAddress',
  [
    param('walletAddress')
      .isEthereumAddress()
      .withMessage('Invalid wallet address'),
    query('status')
      .optional()
      .isIn(['all', 'pending', 'resolved'])
      .withMessage('Invalid status'),
    validate
  ],
  transactionController.getAlerts
);

module.exports = router;
