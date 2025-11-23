const express = require('express');
const { param, query } = require('express-validator');
const simpleTransactionController = require('../controllers/simpleTransactionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/simple-transactions/analyze/:walletAddress
 * @desc    Fetch from Etherscan and analyze with ML (ONE CALL)
 * @access  Protected
 */
router.get(
  '/analyze/:walletAddress',
  [
    param('walletAddress')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid Ethereum address format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('chainId')
      .optional()
      .isInt()
      .withMessage('Chain ID must be a number')
  ],
  simpleTransactionController.fetchAndAnalyze
);

/**
 * @route   GET /api/simple-transactions/fetch/:walletAddress
 * @desc    Fetch from Etherscan only (NO ML)
 * @access  Protected
 */
router.get(
  '/fetch/:walletAddress',
  [
    param('walletAddress')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid Ethereum address format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('chainId')
      .optional()
      .isInt()
      .withMessage('Chain ID must be a number')
  ],
  simpleTransactionController.fetchOnly
);

module.exports = router;
