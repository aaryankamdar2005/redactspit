const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabaseService = require('../services/supabaseService');
const config = require('../config/config');
const logger = require('../utils/logger');

class AuthController {
  /**
   * User Signup/Registration
   */
  async signup(req, res) {
    try {
      const { email, password, phoneNumber, walletAddress } = req.body;

      // Validate required fields
      if (!email || !password || !phoneNumber) {
        return res.status(400).json({ 
          error: 'Email, password, and phone number are required' 
        });
      }

      // Check if user already exists
      const { data: existingUser } = await supabaseService.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ 
          error: 'User with this email already exists' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user in Supabase
      const result = await supabaseService.createUser({
        email,
        password: hashedPassword,
        phoneNumber,
        walletAddress: walletAddress || null
      });

      if (!result.success) {
        return res.status(400).json({ 
          error: result.error || 'Failed to create user' 
        });
      }

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User created successfully. Please verify OTP.',
        userId: result.user.id,
        email: result.user.email
      });
    } catch (error) {
      logger.error('Signup Error:', error);
      res.status(500).json({ 
        error: 'Signup failed',
        details: error.message 
      });
    }
  }

  /**
   * User Login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      // Get user from database
      const { data: user, error } = await supabaseService.getUserByEmail(email);

      if (error || !user) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Check if user is verified
      if (!user.is_verified) {
        return res.status(403).json({ 
          error: 'Please verify your account with OTP first',
          userId: user.id,
          requiresOTP: true
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          walletAddress: user.wallet_address
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phone_number,
          walletAddress: user.wallet_address,
          isVerified: user.is_verified,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      logger.error('Login Error:', error);
      res.status(500).json({ 
        error: 'Login failed',
        details: error.message 
      });
    }
  }

  /**
   * Get User Profile (Protected)
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const { data: user, error } = await supabaseService.getUserById(userId);

      if (error || !user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phone_number,
          walletAddress: user.wallet_address,
          isVerified: user.is_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      logger.error('Get Profile Error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch profile',
        details: error.message 
      });
    }
  }

  /**
   * Update User Profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { phoneNumber, walletAddress } = req.body;

      const updateData = {};
      if (phoneNumber) updateData.phone_number = phoneNumber;
      if (walletAddress) updateData.wallet_address = walletAddress;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          error: 'No fields to update' 
        });
      }

      const result = await supabaseService.updateUser(userId, updateData);

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Failed to update profile' 
        });
      }

      logger.info(`Profile updated for user: ${userId}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: result.user
      });
    } catch (error) {
      logger.error('Update Profile Error:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        details: error.message 
      });
    }
  }

  /**
   * Change Password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Current password and new password are required' 
        });
      }

      // Get user
      const { data: user } = await supabaseService.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await supabaseService.updateUser(userId, { password: hashedPassword });

      logger.info(`Password changed for user: ${userId}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change Password Error:', error);
      res.status(500).json({ 
        error: 'Failed to change password',
        details: error.message 
      });
    }
  }

  /**
   * Logout (Optional - mainly client-side token removal)
   */
  async logout(req, res) {
    try {
      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout Error:', error);
      res.status(500).json({ 
        error: 'Logout failed',
        details: error.message 
      });
    }
  }
}

module.exports = new AuthController();
