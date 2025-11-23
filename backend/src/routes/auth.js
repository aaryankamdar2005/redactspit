const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phoneNumber')
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('walletAddress')
      .optional()
      .isEthereumAddress()
      .withMessage('Please provide a valid Ethereum/Polygon address'),
    validate
  ],
  authController.signup
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .exists()
      .withMessage('Password is required'),
    validate
  ],
  authController.login
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Protected
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Protected
 */
router.put(
  '/profile',
  [
    authMiddleware,
    body('phoneNumber')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number'),
    body('walletAddress')
      .optional()
      .isEthereumAddress()
      .withMessage('Invalid wallet address'),
    validate
  ],
  authController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Protected
 */
router.post(
  '/change-password',
  [
    authMiddleware,
    body('currentPassword')
      .exists()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    validate
  ],
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Protected
 */
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
