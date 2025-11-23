const express = require('express');
const { body, param } = require('express-validator');
const otpController = require('../controllers/otpController');
const validate = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to email and phone
 * @access  Public
 */
router.post(
  '/send',
  [
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phoneNumber')
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    validate
  ],
  otpController.sendOTP
);

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP codes
 * @access  Public
 */
router.post(
  '/verify',
  [
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('emailOTP')
      .isLength({ min: 3, max: 3 })
      .isNumeric()
      .withMessage('Email OTP must be 3 digits'),
    body('phoneOTP')
      .isLength({ min: 3, max: 3 })
      .isNumeric()
      .withMessage('Phone OTP must be 3 digits'),
    validate
  ],
  otpController.verifyOTP
);

/**
 * @route   POST /api/otp/resend
 * @desc    Resend OTP
 * @access  Public
 */
router.post(
  '/resend',
  [
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phoneNumber')
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    validate
  ],
  otpController.resendOTP
);

/**
 * @route   GET /api/otp/status/:userId
 * @desc    Get OTP status
 * @access  Public
 */
router.get(
  '/status/:userId',
  [
    param('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    validate
  ],
  otpController.getOTPStatus
);

module.exports = router;
