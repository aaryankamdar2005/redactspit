const supabaseService = require('../services/supabaseService');
const twilioService = require('../services/twilioService');
const emailService = require('../services/emailService');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

class OTPController {
  /**
   * Send OTP (Split: 3 digits to email, 3 digits to phone)
   */
  async sendOTP(req, res) {
    try {
      const { userId, email, phoneNumber } = req.body;

      if (!userId || !email || !phoneNumber) {
        return res.status(400).json({ 
          error: 'User ID, email, and phone number are required' 
        });
      }

      // Generate 3-digit OTPs
      const emailOTP = helpers.generateOTP(3);
      const phoneOTP = helpers.generateOTP(3);

      logger.info(`Generated OTPs - Email: ${emailOTP}, Phone: ${phoneOTP}`);

      // Store OTP in database with expiration
      const { error: dbError } = await supabaseService.storeOTP(
        userId,
        email,
        phoneNumber,
        emailOTP,
        phoneOTP
      );

      if (dbError) {
        return res.status(500).json({ 
          error: 'Failed to store OTP',
          details: dbError 
        });
      }

      // Send email OTP
      const emailResult = await emailService.sendEmailOTP(email, emailOTP);
      
      // Send phone OTP via SMS
      const smsResult = await twilioService.sendPhoneOTP(phoneNumber, phoneOTP);

      // Check if both succeeded
      if (!emailResult.success || !smsResult.success) {
        logger.error('OTP sending failed', { emailResult, smsResult });
        return res.status(500).json({ 
          error: 'Failed to send OTP',
          emailSent: emailResult.success,
          smsSent: smsResult.success
        });
      }

      logger.info(`OTP sent successfully to ${email} and ${phoneNumber}`);

      res.json({
        success: true,
        message: 'OTP sent successfully to email and phone',
        emailSent: true,
        smsSent: true,
        expiresIn: '10 minutes'
      });
    } catch (error) {
      logger.error('Send OTP Error:', error);
      res.status(500).json({ 
        error: 'Failed to send OTP',
        details: error.message 
      });
    }
  }

  /**
   * Verify OTP (6 digits: first 3 from email, next 3 from phone)
   */
  async verifyOTP(req, res) {
    try {
      const { userId, emailOTP, phoneOTP } = req.body;

      if (!userId || !emailOTP || !phoneOTP) {
        return res.status(400).json({ 
          error: 'User ID, email OTP, and phone OTP are required' 
        });
      }

      // Validate OTP format (3 digits each)
      if (emailOTP.length !== 3 || phoneOTP.length !== 3) {
        return res.status(400).json({ 
          error: 'Each OTP must be exactly 3 digits' 
        });
      }

      // Get stored OTP from database
      const { data: otpRecord, error } = await supabaseService.getOTP(userId);

      if (error || !otpRecord) {
        return res.status(404).json({ 
          error: 'OTP not found or expired. Please request a new OTP.' 
        });
      }

      // Check if OTP is already verified
      if (otpRecord.is_verified) {
        return res.status(400).json({ 
          error: 'OTP already verified' 
        });
      }

      // Check if OTP is expired
      const now = new Date();
      const expiresAt = new Date(otpRecord.expires_at);
      
      if (now > expiresAt) {
        return res.status(401).json({ 
          error: 'OTP has expired. Please request a new OTP.' 
        });
      }

      // Verify both OTP codes
      const emailMatch = otpRecord.email_otp === emailOTP;
      const phoneMatch = otpRecord.phone_otp === phoneOTP;

      if (!emailMatch || !phoneMatch) {
        logger.warn(`Invalid OTP attempt for user: ${userId}`);
        return res.status(401).json({ 
          error: 'Invalid OTP codes. Please check and try again.',
          emailMatch,
          phoneMatch
        });
      }

      // Mark OTP as verified
      await supabaseService.markOTPVerified(otpRecord.id);

      // Update user verification status
      await supabaseService.updateUserVerification(userId, true);

      // Send verification success email
      await emailService.sendVerificationSuccessEmail(otpRecord.email);

      logger.info(`User verified successfully: ${userId}`);

      res.json({
        success: true,
        message: 'OTP verified successfully. Your account is now active!',
        verified: true
      });
    } catch (error) {
      logger.error('Verify OTP Error:', error);
      res.status(500).json({ 
        error: 'OTP verification failed',
        details: error.message 
      });
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(req, res) {
    try {
      const { userId, email, phoneNumber } = req.body;

      if (!userId || !email || !phoneNumber) {
        return res.status(400).json({ 
          error: 'User ID, email, and phone number are required' 
        });
      }

      // Invalidate old OTPs
      await supabaseService.invalidateOldOTPs(userId);

      // Generate new OTPs
      const emailOTP = helpers.generateOTP(3);
      const phoneOTP = helpers.generateOTP(3);

      // Store new OTP
      const { error: dbError } = await supabaseService.storeOTP(
        userId,
        email,
        phoneNumber,
        emailOTP,
        phoneOTP
      );

      if (dbError) {
        return res.status(500).json({ 
          error: 'Failed to store new OTP' 
        });
      }

      // Send new OTPs
      const emailResult = await emailService.sendEmailOTP(email, emailOTP);
      const smsResult = await twilioService.sendPhoneOTP(phoneNumber, phoneOTP);

      if (!emailResult.success || !smsResult.success) {
        return res.status(500).json({ 
          error: 'Failed to resend OTP',
          emailSent: emailResult.success,
          smsSent: smsResult.success
        });
      }

      logger.info(`OTP resent to ${email} and ${phoneNumber}`);

      res.json({
        success: true,
        message: 'New OTP sent successfully',
        emailSent: true,
        smsSent: true
      });
    } catch (error) {
      logger.error('Resend OTP Error:', error);
      res.status(500).json({ 
        error: 'Failed to resend OTP',
        details: error.message 
      });
    }
  }

  /**
   * Get OTP status
   */
  async getOTPStatus(req, res) {
    try {
      const { userId } = req.params;

      const { data: otpRecord, error } = await supabaseService.getOTP(userId);

      if (error || !otpRecord) {
        return res.status(404).json({ 
          error: 'No OTP found for this user' 
        });
      }

      const now = new Date();
      const expiresAt = new Date(otpRecord.expires_at);
      const isExpired = now > expiresAt;

      res.json({
        success: true,
        otpStatus: {
          isVerified: otpRecord.is_verified,
          isExpired,
          expiresAt: otpRecord.expires_at,
          createdAt: otpRecord.created_at
        }
      });
    } catch (error) {
      logger.error('Get OTP Status Error:', error);
      res.status(500).json({ 
        error: 'Failed to get OTP status',
        details: error.message 
      });
    }
  }
}

module.exports = new OTPController();
