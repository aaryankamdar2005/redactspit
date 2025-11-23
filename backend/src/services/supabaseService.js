const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');
const logger = require('../utils/logger');

// Initialize Supabase clients
const supabase = createClient(config.supabase.url, config.supabase.anonKey);
const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

class SupabaseService {
  // ========== USER OPERATIONS ==========

  async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          password: userData.password,
          phone_number: userData.phoneNumber,
          wallet_address: userData.walletAddress,
          is_verified: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      logger.error('Create User Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get User By Email Error:', error);
      return { data: null, error: error.message };
    }
  }

  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get User By ID Error:', error);
      return { data: null, error: error.message };
    }
  }

  async updateUser(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updateData, updated_at: new Date() })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      logger.error('Update User Error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserVerification(userId, isVerified) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_verified: isVerified, updated_at: new Date() })
        .eq('id', userId);
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Update Verification Error:', error);
      return { data: null, error: error.message };
    }
  }

  // ========== OTP OPERATIONS ==========

  async storeOTP(userId, email, phone, emailOTP, phoneOTP) {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      const { data, error } = await supabase
        .from('otp_verifications')
        .insert([{
          user_id: userId,
          email,
          phone,
          email_otp: emailOTP,
          phone_otp: phoneOTP,
          expires_at: expiresAt,
          is_verified: false
        }])
        .select()
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Store OTP Error:', error);
      return { data: null, error: error.message };
    }
  }

  async getOTP(userId) {
    try {
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get OTP Error:', error);
      return { data: null, error: error.message };
    }
  }

  async markOTPVerified(otpId) {
    try {
      const { data, error } = await supabase
        .from('otp_verifications')
        .update({ is_verified: true })
        .eq('id', otpId);
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Mark OTP Verified Error:', error);
      return { data: null, error: error.message };
    }
  }

  async invalidateOldOTPs(userId) {
    try {
      const { data, error } = await supabase
        .from('otp_verifications')
        .update({ is_verified: true })
        .eq('user_id', userId)
        .eq('is_verified', false);
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Invalidate OTPs Error:', error);
      return { data: null, error: error.message };
    }
  }

  // ========== TRANSACTION OPERATIONS ==========

  async storeTransaction(transactionData) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Store Transaction Error:', error);
      return { data: null, error: error.message };
    }
  }

  async storeTransactionBatch(transactions) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Store Transaction Batch Error:', error);
      return { data: null, error: error.message };
    }
  }

  async getTransactionByHash(txHash) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tx_hash', txHash)
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get Transaction By Hash Error:', error);
      return { data: null, error: error.message };
    }
  }

  async getTransactionsByUser(walletAddress, limit = 50, offset = 0, fraudOnly = false) {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (fraudOnly) {
        query = query.eq('is_fraudulent', true);
      }
      
      const { data, error } = await query;
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get Transactions By User Error:', error);
      return { data: null, error: error.message };
    }
  }

  async getFlaggedTransactions(limit = 50, minRiskScore = 70) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_fraudulent', true)
        .gte('risk_score', minRiskScore)
        .order('risk_score', { ascending: false })
        .limit(limit);
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get Flagged Transactions Error:', error);
      return { data: null, error: error.message };
    }
  }

  async updateTransactionRiskScore(txHash, riskScore, isFraudulent, anomalyType) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          risk_score: riskScore,
          is_fraudulent: isFraudulent,
          anomaly_type: anomalyType,
          analyzed_at: new Date()
        })
        .eq('tx_hash', txHash);
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Update Transaction Risk Score Error:', error);
      return { data: null, error: error.message };
    }
  }

  // ========== ALERT OPERATIONS ==========

  async createAlert(walletAddress, txHash, riskScore, message) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([{
          wallet_address: walletAddress,
          tx_hash: txHash,
          risk_score: riskScore,
          message,
          status: 'pending'
        }])
        .select()
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Create Alert Error:', error);
      return { data: null, error: error.message };
    }
  }

  async getAlertsByWallet(walletAddress, status = 'all', limit = 50) {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Get Alerts By Wallet Error:', error);
      return { data: null, error: error.message };
    }
  }

  async resolveAlert(alertId) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date()
        })
        .eq('id', alertId)
        .select()
        .single();
      
      return { data, error: error ? error.message : null };
    } catch (error) {
      logger.error('Resolve Alert Error:', error);
      return { data: null, error: error.message };
    }
  }
}

module.exports = new SupabaseService();
