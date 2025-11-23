const express = require('express');
const { body } = require('express-validator');
const voiceController = require('../controllers/voiceController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route   POST /api/voice/call
 * @desc    Initiate support call
 * @access  Protected
 */
router.post(
  '/call',
  [
    authMiddleware,
    body('phoneNumber')
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    validate
  ],
  voiceController.initiateCall
);

/**
 * @route   POST /api/voice/twiml
 * @desc    TwiML response for voice bot (Twilio webhook)
 * @access  Public (called by Twilio)
 */
router.post('/twiml', voiceController.getTwiML);

/**
 * @route   POST /api/voice/handle-input
 * @desc    Handle voice menu input (Twilio webhook)
 * @access  Public (called by Twilio)
 */
router.post('/handle-input', voiceController.handleInput);

/**
 * @route   GET /api/voice/status
 * @desc    Get voice bot status
 * @access  Public
 */
router.get('/status', voiceController.getStatus);

/**
 * @route   POST /api/voice/callback
 * @desc    Call status callback (Twilio webhook)
 * @access  Public (called by Twilio)
 */
router.post('/callback', voiceController.callStatusCallback);

module.exports = router;
