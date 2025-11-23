const twilioService = require('../services/twilioService');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const config = require('../config/config');
const logger = require('../utils/logger');

class VoiceController {
  /**
   * Initiate support call
   */
  async initiateCall(req, res) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ 
          error: 'Phone number is required' 
        });
      }

      const result = await twilioService.makeVoiceCall(phoneNumber);

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Failed to initiate call',
          details: result.error 
        });
      }

      logger.info(`Support call initiated to ${phoneNumber}`);

      res.json({
        success: true,
        message: 'Support call initiated successfully',
        callSid: result.callSid
      });
    } catch (error) {
      logger.error('Initiate Call Error:', error);
      res.status(500).json({ 
        error: 'Failed to initiate call',
        details: error.message 
      });
    }
  }

  /**
   * Generate TwiML for voice bot menu
   */
  async getTwiML(req, res) {
    try {
      const twiml = new VoiceResponse();

      // Welcome message
      const gather = twiml.gather({
        numDigits: 1,
        action: `${config.backend.url}/api/voice/handle-input`,
        method: 'POST',
        timeout: 5
      });

      gather.say({
        voice: 'alice',
        language: 'en-US'
      }, 
        'Welcome to Chain Guard Security Support. ' +
        'Press 1 for transaction issues. ' +
        'Press 2 for fraud alerts. ' +
        'Press 3 for account verification help. ' +
        'Press 4 to speak with a support agent.'
      );

      // If no input
      twiml.say('Sorry, we did not receive any input. Goodbye.');
      twiml.hangup();

      res.type('text/xml');
      res.send(twiml.toString());

      logger.info('TwiML menu generated');
    } catch (error) {
      logger.error('TwiML Generation Error:', error);
      res.status(500).send('Error generating voice response');
    }
  }

  /**
   * Handle user input from voice menu
   */
  async handleInput(req, res) {
    try {
      const digit = req.body.Digits;
      const twiml = new VoiceResponse();

      logger.info(`Voice menu option selected: ${digit}`);

      switch (digit) {
        case '1':
          twiml.say({
            voice: 'alice'
          },
            'For transaction issues, please visit your Chain Guard dashboard and review the transaction history. ' +
            'If you notice a suspicious transaction with a high risk score, you can report it directly from the dashboard. ' +
            'Our AI system continuously monitors all your transactions.'
          );
          break;

        case '2':
          twiml.say({
            voice: 'alice'
          },
            'If you received a fraud alert, please log into your Chain Guard account immediately and review the flagged transaction. ' +
            'You can mark transactions as safe or report them as fraudulent. ' +
            'You may also whitelist trusted wallet addresses in your security settings.'
          );
          break;

        case '3':
          twiml.say({
            voice: 'alice'
          },
            'For account verification, please check your email and mobile phone for the 6-digit OTP code. ' +
            'Enter the first 3 digits from your email, followed by the next 3 digits from your SMS message. ' +
            'The OTP is valid for 10 minutes. If expired, please request a new code from the login page.'
          );
          break;

        case '4':
          twiml.say({
            voice: 'alice'
          },
            'Thank you for your request. Please hold while we connect you to a support agent. ' +
            'Alternatively, you can email us at support at chainguard dot com, or visit our help center at chainguard dot com slash help.'
          );
          // In production, add twiml.dial() to connect to actual agent
          break;

        default:
          twiml.say('Invalid option selected. Please try again.');
          twiml.redirect(`${config.backend.url}/api/voice/twiml`);
          return res.type('text/xml').send(twiml.toString());
      }

      // Common ending
      twiml.pause({ length: 1 });
      twiml.say('Thank you for using Chain Guard Security Support. Goodbye.');
      twiml.hangup();

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      logger.error('Handle Voice Input Error:', error);
      
      const twiml = new VoiceResponse();
      twiml.say('An error occurred. Please try again later. Goodbye.');
      twiml.hangup();
      
      res.type('text/xml').send(twiml.toString());
    }
  }

  /**
   * Get voice bot status
   */
  async getStatus(req, res) {
    try {
      res.json({
        success: true,
        status: 'active',
        helplineNumber: config.twilio.voiceBotNumber,
        availableOptions: [
          { option: 1, description: 'Transaction Issues' },
          { option: 2, description: 'Fraud Alerts' },
          { option: 3, description: 'Account Verification Help' },
          { option: 4, description: 'Speak with Agent' }
        ],
        availability: '24/7'
      });
    } catch (error) {
      logger.error('Get Voice Status Error:', error);
      res.status(500).json({ 
        error: 'Failed to get status',
        details: error.message 
      });
    }
  }

  /**
   * Call status callback (webhook from Twilio)
   */
  async callStatusCallback(req, res) {
    try {
      const callSid = req.body.CallSid;
      const callStatus = req.body.CallStatus;

      logger.info(`Call ${callSid} status: ${callStatus}`);

      // You can store call logs in database here
      // await supabaseService.storeCallLog(callSid, callStatus);

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Call Status Callback Error:', error);
      res.status(500).send('Error');
    }
  }
}

module.exports = new VoiceController();
