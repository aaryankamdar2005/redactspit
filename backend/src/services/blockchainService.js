const { Web3 } = require('web3');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const web3 = new Web3(config.polygon.rpcUrl);

class BlockchainService {
  constructor() {
    this.apiKey = config.polygon.apiKey;
    
    // Chain-specific API endpoints
    this.chainEndpoints = {
      80002: 'https://api-amoy.polygonscan.com/api', // Amoy Testnet
      137: 'https://api.polygonscan.com/api',         // Polygon Mainnet
      1: 'https://api.etherscan.io/api',              // Ethereum Mainnet
      11155111: 'https://api-sepolia.etherscan.io/api' // Sepolia Testnet
    };
    
    this.defaultChainId = 80002; // Amoy Testnet
    
    // Log API key status on initialization
    if (this.apiKey) {
      logger.info(`✅ Etherscan API Key configured: ${this.apiKey.substring(0, 10)}...`);
    } else {
      logger.warn('⚠️ Etherscan API Key not found in config');
    }
  }

  /**
   * Get wallet transactions - WORKING VERSION
   */
  async getWalletTransactions(address, page = 1, offset = 50, sort = 'desc', chainId = null) {
    try {
      const targetChainId = chainId || this.defaultChainId;
      const apiEndpoint = this.chainEndpoints[targetChainId];

      if (!apiEndpoint) {
        logger.error(`Unsupported chain ID: ${targetChainId}`);
        return {
          success: false,
          error: `Unsupported chain ID: ${targetChainId}`
        };
      }

      if (!this.apiKey) {
        logger.error('API key not configured');
        return {
          success: false,
          error: 'API key not configured. Check ETHERSCAN_API_KEY in .env'
        };
      }

      // Build URL manually (same as your working browser request)
      const url = `${apiEndpoint}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=${sort}&apikey=${this.apiKey}`;

      logger.info(`🔍 Fetching transactions...`);
      logger.info(`   Chain: ${this.getChainName(targetChainId)} (${targetChainId})`);
      logger.info(`   Address: ${address}`);
      logger.info(`   Endpoint: ${apiEndpoint}`);

      // Make request with proper config
      const response = await axios.get(url, {
        timeout: 20000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ChainGuard/1.0'
        }
      });

      logger.info(`📥 Response received:`, {
        httpStatus: response.status,
        apiStatus: response.data.status,
        message: response.data.message,
        resultType: typeof response.data.result,
        resultCount: Array.isArray(response.data.result) ? response.data.result.length : 'N/A'
      });

      // Handle response
      if (response.data.status === '0') {
        // Check for "No transactions found" (this is OK)
        if (response.data.message === 'No transactions found') {
          logger.info('✅ No transactions found for address (this is normal)');
          return {
            success: true,
            transactions: [],
            total: 0,
            message: 'No transactions found',
            chainId: targetChainId
          };
        }
        
        // Other errors
        logger.error('❌ API returned error:', response.data.message);
        return {
          success: false,
          error: response.data.message || 'API error',
          details: response.data.result
        };
      }

      // Success case
      if (response.data.status === '1' && Array.isArray(response.data.result)) {
        logger.info(`✅ Successfully fetched ${response.data.result.length} transactions`);
        
        const transactions = response.data.result.map(tx => ({
          tx_hash: tx.hash,
          from_address: tx.from.toLowerCase(),
          to_address: tx.to ? tx.to.toLowerCase() : null,
          value: tx.value ? web3.utils.fromWei(tx.value, 'ether') : '0',
          gas_used: tx.gasUsed || '0',
          gas_price: tx.gasPrice ? web3.utils.fromWei(tx.gasPrice, 'gwei') : '0',
          gas_limit: tx.gas || '0',
          block_number: parseInt(tx.blockNumber || 0),
          timestamp: new Date(parseInt(tx.timeStamp || 0) * 1000),
          status: tx.isError === '0' ? 'success' : 'failed',
          nonce: parseInt(tx.nonce || 0),
          transaction_index: parseInt(tx.transactionIndex || 0),
          input_data: tx.input || '0x',
          contract_address: tx.contractAddress || null,
          confirmations: parseInt(tx.confirmations || 0),
          is_error: tx.isError,
          method_id: tx.input && tx.input !== '0x' ? tx.input.substring(0, 10) : 'Transfer',
          function_name: tx.functionName || ''
        }));

        return {
          success: true,
          transactions,
          total: transactions.length,
          chainId: targetChainId
        };
      }

      // Unexpected response
      logger.error('❌ Unexpected response format:', response.data);
      return {
        success: false,
        error: 'Unexpected response format',
        details: response.data
      };

    } catch (error) {
      logger.error('❌ Request failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Request timeout - API is not responding'
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait and try again.'
        };
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Network error'
      };
    }
  }

  /**
   * Get balance
   */
  async getBalance(address, chainId = null) {
    try {
      const targetChainId = chainId || this.defaultChainId;
      const apiEndpoint = this.chainEndpoints[targetChainId];

      if (!apiEndpoint) {
        return {
          success: false,
          error: `Unsupported chain ID: ${targetChainId}`
        };
      }

      const url = `${apiEndpoint}?module=account&action=balance&address=${address}&tag=latest&apikey=${this.apiKey}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ChainGuard/1.0'
        }
      });

      if (response.data.status === '1') {
        const balanceInWei = response.data.result;
        const balanceInEther = web3.utils.fromWei(balanceInWei, 'ether');
        
        return {
          success: true,
          balance: balanceInEther,
          balanceWei: balanceInWei,
          chainId: targetChainId
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to fetch balance'
      };
    } catch (error) {
      logger.error('Get Balance Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get transaction from Web3
   */
  async getTransaction(txHash) {
    try {
      const tx = await web3.eth.getTransaction(txHash);
      return { success: true, transaction: tx };
    } catch (error) {
      logger.error('Get Transaction Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transaction receipt from Web3
   */
  async getTransactionReceipt(txHash) {
    try {
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      return { success: true, receipt };
    } catch (error) {
      logger.error('Get Receipt Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate transaction hash
   */
  isValidTxHash(txHash) {
    return /^0x([A-Fa-f0-9]{64})$/.test(txHash);
  }

  /**
   * Validate address
   */
  isValidAddress(address) {
    return web3.utils.isAddress(address);
  }

  /**
   * Convert Wei to Ether
   */
  weiToEther(wei) {
    return web3.utils.fromWei(wei.toString(), 'ether');
  }

  /**
   * Convert Ether to Wei
   */
  etherToWei(ether) {
    return web3.utils.toWei(ether.toString(), 'ether');
  }

  /**
   * Format address for display
   */
  formatAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Get chain name by ID
   */
  getChainName(chainId) {
    const names = {
      80002: 'Amoy Testnet',
      137: 'Polygon Mainnet',
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet'
    };
    return names[chainId] || `Chain ${chainId}`;
  }
}

module.exports = new BlockchainService();
