const twilio = require('twilio');
const config = require('../config/config');
const logger = require('../utils/logger');

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

class TwilioService {
  /**
   * Send SMS message
   */
  async sendSMS(to, message) {
    try {
      const result = await client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: to
      });
      
      logger.info(`SMS sent to ${to} - SID: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error('Twilio SMS Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send phone OTP via SMS
   */
  async sendPhoneOTP(phoneNumber, otp) {
    const message = `Your ChainGuard verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Make voice call
   */
  async makeVoiceCall(to) {
    try {
      const call = await client.calls.create({
        url: `${config.backend.url}/api/voice/twiml`,
        to: to,
        from: config.twilio.voiceBotNumber,
        statusCallback: `${config.backend.url}/api/voice/callback`,
        statusCallbackMethod: 'POST'
      });
      
      logger.info(`Voice call initiated to ${to} - SID: ${call.sid}`);
      return { success: true, callSid: call.sid };
    } catch (error) {
      logger.error('Twilio Voice Call Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send fraud alert SMS
   */
  async sendFraudAlert(phoneNumber, txHash, riskScore) {
    const message = `⚠️ ChainGuard Alert: Suspicious transaction detected!\n` +
                   `Tx: ${txHash.substring(0, 10)}...\n` +
                   `Risk Score: ${riskScore}%\n` +
                   `Check your dashboard immediately at chainguard.com`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send welcome SMS
   */
  async sendWelcomeSMS(phoneNumber) {
    const message = `Welcome to ChainGuard! Your AI-powered DeFi security platform. ` +
                   `Start protecting your transactions at chainguard.com`;
    
    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = new TwilioService();
