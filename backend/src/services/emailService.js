const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Initialize Gmail SMTP transporter with App Password
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: config.email.user,
        pass: config.email.password // App Password, not regular password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter configuration on initialization
    this.verifyConnection();
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Email service is ready to send messages');
    } catch (error) {
      logger.error('❌ Email service verification failed:', error.message);
    }
  }

  /**
   * Send Email OTP (First 3 digits)
   */
  async sendEmailOTP(email, otp) {
    const mailOptions = {
      from: {
        name: 'ChainGuard Security',
        address: config.email.user
      },
      to: email,
      subject: 'ChainGuard - Email Verification Code',
      html: this.getOTPEmailTemplate(otp),
      text: `Your ChainGuard email verification code is: ${otp}. This code will expire in 10 minutes.`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email} - Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Send Email OTP Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Fraud Alert Email
   */
  async sendFraudAlert(email, txHash, riskScore) {
    const mailOptions = {
      from: {
        name: 'ChainGuard Alert System',
        address: config.email.user
      },
      to: email,
      subject: '⚠️ ChainGuard - Suspicious Transaction Detected',
      html: this.getFraudAlertTemplate(txHash, riskScore),
      text: `⚠️ Fraud Alert: A suspicious transaction (${txHash}) with risk score ${riskScore}% has been detected. Check your dashboard immediately.`,
      priority: 'high'
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Fraud alert sent to ${email} - Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Send Fraud Alert Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Welcome Email after successful signup
   */
  async sendWelcomeEmail(email, userName) {
    const mailOptions = {
      from: {
        name: 'ChainGuard Team',
        address: config.email.user
      },
      to: email,
      subject: 'Welcome to ChainGuard - Your DeFi Security Platform',
      html: this.getWelcomeEmailTemplate(userName),
      text: `Welcome to ChainGuard! We're excited to have you on board.`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email} - Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Send Welcome Email Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Account Verification Success Email
   */
  async sendVerificationSuccessEmail(email) {
    const mailOptions = {
      from: {
        name: 'ChainGuard Security',
        address: config.email.user
      },
      to: email,
      subject: '✅ Account Verified Successfully',
      html: this.getVerificationSuccessTemplate(),
      text: 'Your ChainGuard account has been verified successfully!'
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Verification success email sent to ${email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Send Verification Success Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Daily Security Report
   */
  async sendDailyReport(email, stats) {
    const mailOptions = {
      from: {
        name: 'ChainGuard Reports',
        address: config.email.user
      },
      to: email,
      subject: '📊 ChainGuard Daily Security Report',
      html: this.getDailyReportTemplate(stats),
      text: `Daily Report: ${stats.totalTransactions} transactions analyzed, ${stats.fraudulentCount} flagged as suspicious.`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Daily report sent to ${email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Send Daily Report Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'ChainGuard Security',
        address: config.email.user
      },
      to: email,
      subject: '🔐 Password Reset Request',
      html: this.getPasswordResetTemplate(resetUrl),
      text: `You requested a password reset. Click this link to reset: ${resetUrl}`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Send Password Reset Error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== EMAIL TEMPLATES ==========

  /**
   * OTP Email Template
   */
  getOTPEmailTemplate(otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f7;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 40px 30px;
          }
          .otp-box {
            background: #f3f4f6;
            border: 2px dashed #667eea;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #667eea;
            margin: 10px 0;
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ ChainGuard Security</h1>
          </div>
          <div class="content">
            <h2 style="color: #1f2937;">Email Verification Code</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Your ChainGuard email verification code is:
            </p>
            <div class="otp-box">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">FIRST 3 DIGITS</p>
              <div class="otp-code">${otp}</div>
            </div>
            <p style="color: #4b5563; line-height: 1.6;">
              Enter this code along with the SMS code to complete your verification.
            </p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              • This code expires in <strong>10 minutes</strong><br>
              • Never share this code with anyone<br>
              • ChainGuard will never ask for your code
            </div>
          </div>
          <div class="footer">
            <p>If you didn't request this code, please ignore this email.</p>
            <p>&copy; 2025 ChainGuard. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Fraud Alert Email Template
   */
  getFraudAlertTemplate(txHash, riskScore) {
    const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 70 ? 'HIGH' : 'MEDIUM';
    const riskColor = riskScore >= 80 ? '#dc2626' : riskScore >= 70 ? '#f59e0b' : '#fb923c';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f7;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: ${riskColor};
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
          }
          .alert-box {
            background: #fee2e2;
            border-left: 6px solid ${riskColor};
            padding: 20px;
            margin: 20px 30px;
            border-radius: 4px;
          }
          .risk-badge {
            background: ${riskColor};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
          }
          .tx-hash {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 6px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #374151;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
          .content {
            padding: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 FRAUD ALERT</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <h2 style="margin-top: 0; color: #991b1b;">Suspicious Transaction Detected!</h2>
              <p style="margin: 0; color: #7f1d1d;">
                Our AI system has flagged a potentially fraudulent transaction associated with your monitored wallet.
              </p>
            </div>

            <h3 style="color: #1f2937;">Transaction Details:</h3>
            
            <p><strong>Risk Level:</strong></p>
            <span class="risk-badge">${riskLevel} - ${riskScore}%</span>

            <p style="margin-top: 20px;"><strong>Transaction Hash:</strong></p>
            <div class="tx-hash">${txHash}</div>

            <p style="margin-top: 20px; color: #4b5563; line-height: 1.6;">
              <strong>Immediate Actions Required:</strong><br>
              ✓ Review this transaction in your dashboard<br>
              ✓ Verify if this was an authorized transaction<br>
              ✓ Check your wallet for any unauthorized access<br>
              ✓ Consider freezing affected accounts if necessary
            </p>

            <center>
              <a href="${config.frontend.url}/dashboard" class="button">
                View Dashboard →
              </a>
            </center>

            <p style="color: #6b7280; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Why did I receive this alert?</strong><br>
              Our machine learning model detected anomalous patterns in this transaction that match known fraud indicators.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome Email Template
   */
  getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; }
          .content { padding: 40px 30px; }
          .feature { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: white; margin: 0;">Welcome to ChainGuard! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName || 'there'}!</h2>
            <p>Thank you for joining ChainGuard, your AI-powered DeFi security platform.</p>
            
            <h3>What You Can Do:</h3>
            <div class="feature">
              <strong>🔍 Monitor Transactions</strong><br>
              Real-time analysis of blockchain transactions
            </div>
            <div class="feature">
              <strong>🤖 AI Fraud Detection</strong><br>
              Machine learning-powered anomaly detection
            </div>
            <div class="feature">
              <strong>🚨 Instant Alerts</strong><br>
              Get notified of suspicious activities immediately
            </div>
            
            <p>Get started by connecting your wallet and analyzing transactions!</p>
            <center>
              <a href="${config.frontend.url}/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Go to Dashboard
              </a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verification Success Template
   */
  getVerificationSuccessTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; text-align: center; padding: 40px; }
          .checkmark { font-size: 80px; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1 style="color: #1f2937;">Account Verified!</h1>
          <p style="color: #4b5563;">Your ChainGuard account has been successfully verified. You can now access all features.</p>
          <a href="${config.frontend.url}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Access Dashboard
          </a>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Daily Report Template
   */
  getDailyReportTemplate(stats) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; }
          .stat-box { display: inline-block; width: 45%; margin: 10px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 36px; font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="padding: 30px;">
            <h2>📊 Daily Security Report</h2>
            <p>Here's your transaction security summary for today:</p>
            
            <div class="stat-box">
              <div class="stat-number">${stats.totalTransactions}</div>
              <div>Total Transactions</div>
            </div>
            
            <div class="stat-box">
              <div class="stat-number" style="color: #dc2626;">${stats.fraudulentCount}</div>
              <div>Flagged as Suspicious</div>
            </div>
            
            <p style="margin-top: 30px;">Average Risk Score: <strong>${stats.avgRiskScore}%</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password Reset Template
   */
  getPasswordResetTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; padding: 40px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🔐 Password Reset Request</h2>
          <p>You requested to reset your ChainGuard password. Click the button below to create a new password:</p>
          <center>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </center>
          <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
