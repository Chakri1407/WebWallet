// 1inch_integration_fixed.js - Fixed 1inch Integration with API Key Support
const axios = require('axios');
const { ethers } = require('ethers');

// 1inch API Configuration
const ONEINCH_API_BASE = 'https://api.1inch.dev';
const API_VERSION = 'v6.0';

// ERC20 ABI for token approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Map testnet to mainnet chain IDs (1inch only supports mainnets)
const CHAIN_ID_MAPPING = {
  11155111: 1,      // Sepolia -> Ethereum
  80002: 137,       // Amoy -> Polygon
  421614: 42161,    // Arbitrum Sepolia -> Arbitrum
  84532: 8453,      // Base Sepolia -> Base
  97: 56,           // BSC Testnet -> BSC
  43113: 43114,     // Fuji -> Avalanche
  338: 25,          // Cronos Testnet -> Cronos
  44787: 42220      // Celo Alfajores -> Celo
};

// Reverse mapping
const ONEINCH_CHAIN_IDS = {
  ethereum_sepolia: 1,
  polygon_amoy: 137,
  arbitrum_sepolia: 42161,
  base_sepolia: 8453,
  bnb_testnet: 56,
  avalanche_fuji: 43114,
  cronos_testnet: 25,
  celo_alfajores: 42220
};

class OneInchIntegration {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.headers = {
      'accept': 'application/json',
      'content-type': 'application/json'
    };
    
    // IMPORTANT: Add API key to headers
    if (this.apiKey) {
      this.headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      console.warn('⚠️  WARNING: No 1inch API key provided. Some features may not work.');
      console.warn('📝 Get your free API key at: https://portal.1inch.dev/');
    }
  }

  /**
   * Get the API URL for a specific chain
   */
  getApiUrl(chainId) {
    // Map testnet to mainnet if needed
    const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
    return `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}`;
  }

  /**
   * Check if chain is supported by 1inch
   */
  isChainSupported(chainId) {
    const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
    return Object.values(ONEINCH_CHAIN_IDS).includes(mappedChainId);
  }

  /**
   * Make API request with better error handling
   */
  async makeRequest(url, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url,
        headers: this.headers
      };

      if (data) {
        if (method === 'GET') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('1inch API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: '1inch API Key Required',
          message: 'Please add your 1inch API key. Get one free at https://portal.1inch.dev/',
          details: 'Add API key in server initialization: new OneInchIntegration("YOUR_API_KEY")'
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.description || error.message,
        statusCode: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
   * Get list of supported tokens for a chain
   */
  async getTokenList(chainId) {
    try {
      if (!this.isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} not supported by 1inch`);
      }

      const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
      const url = `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}/tokens`;
      
      const result = await this.makeRequest(url);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        chainId: mappedChainId,
        originalChainId: chainId,
        tokens: result.data.tokens || result.data,
        tokenCount: Object.keys(result.data.tokens || result.data).length,
        note: chainId !== mappedChainId ? `Using ${mappedChainId} (mainnet) token list for testnet ${chainId}` : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current liquidity sources
   */
  async getLiquiditySources(chainId) {
    try {
      if (!this.isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} not supported by 1inch`);
      }

      const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
      const url = `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}/liquidity-sources`;
      
      const result = await this.makeRequest(url);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        chainId: mappedChainId,
        protocols: result.data.protocols || result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get 1inch router address for approvals
   */
  async getSpenderAddress(chainId) {
    try {
      if (!this.isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} not supported by 1inch`);
      }

      const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
      const url = `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}/approve/spender`;
      
      const result = await this.makeRequest(url);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        chainId: mappedChainId,
        spenderAddress: result.data.address
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check token allowance
   */
  async checkAllowance(chainId, tokenAddress, walletAddress, provider) {
    try {
      const spenderResult = await this.getSpenderAddress(chainId);
      if (!spenderResult.success) {
        throw new Error('Failed to get spender address: ' + spenderResult.error);
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const allowance = await tokenContract.allowance(walletAddress, spenderResult.spenderAddress);

      return {
        success: true,
        allowance: allowance.toString(),
        allowanceFormatted: ethers.formatUnits(allowance, await tokenContract.decimals()),
        spenderAddress: spenderResult.spenderAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build approval transaction
   */
  async buildApprovalTransaction(chainId, tokenAddress, amount = null) {
    try {
      if (!this.isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} not supported by 1inch`);
      }

      const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
      const params = { tokenAddress };
      
      if (amount) {
        params.amount = amount;
      }

      const url = `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}/approve/transaction`;
      const result = await this.makeRequest(url, 'GET', params);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        chainId: mappedChainId,
        data: result.data.data,
        gasPrice: result.data.gasPrice,
        to: result.data.to,
        value: result.data.value || '0'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get quote for token swap (no wallet needed)
   */
  async getQuote(chainId, fromToken, toToken, amount, protocols = null) {
    try {
      if (!this.isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} not supported by 1inch`);
      }

      const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
      const params = {
        src: fromToken,
        dst: toToken,
        amount: amount
      };

      if (protocols) {
        params.protocols = protocols;
      }

      const url = `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}/quote`;
      const result = await this.makeRequest(url, 'GET', params);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        chainId: mappedChainId,
        fromToken: result.data.srcToken || result.data.fromToken,
        toToken: result.data.dstToken || result.data.toToken,
        fromTokenAmount: result.data.srcAmount || result.data.fromTokenAmount,
        toTokenAmount: result.data.dstAmount || result.data.toTokenAmount,
        estimatedGas: result.data.gas || result.data.estimatedGas,
        protocols: result.data.protocols
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build swap transaction
   */
  async buildSwapTransaction(chainId, fromToken, toToken, amount, fromAddress, slippage = 1, protocols = null, disableEstimate = false) {
    try {
      if (!this.isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} not supported by 1inch`);
      }

      const mappedChainId = CHAIN_ID_MAPPING[chainId] || chainId;
      const params = {
        src: fromToken,
        dst: toToken,
        amount: amount,
        from: fromAddress,
        slippage: slippage,
        disableEstimate: disableEstimate
      };

      if (protocols) {
        params.protocols = protocols;
      }

      const url = `${ONEINCH_API_BASE}/swap/${API_VERSION}/${mappedChainId}/swap`;
      const result = await this.makeRequest(url, 'GET', params);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        chainId: mappedChainId,
        fromToken: result.data.srcToken || result.data.fromToken,
        toToken: result.data.dstToken || result.data.toToken,
        fromTokenAmount: result.data.srcAmount || result.data.fromTokenAmount,
        toTokenAmount: result.data.dstAmount || result.data.toTokenAmount,
        protocols: result.data.protocols,
        tx: result.data.tx
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Execute approval transaction
   */
  async executeApproval(chainId, tokenAddress, walletPrivateKey, provider, amount = null) {
    try {
      console.log(`\n=== EXECUTING TOKEN APPROVAL ===`);
      console.log(`Chain ID: ${chainId}`);
      console.log(`Token: ${tokenAddress}`);

      const wallet = new ethers.Wallet(walletPrivateKey, provider);
      console.log(`From wallet: ${wallet.address}`);

      // Get approval transaction
      const approvalTx = await this.buildApprovalTransaction(chainId, tokenAddress, amount);
      if (!approvalTx.success) {
        throw new Error(`Failed to build approval transaction: ${approvalTx.error}`);
      }

      console.log(`Spender (1inch Router): ${approvalTx.to}`);
      
      // Send transaction
      const tx = await wallet.sendTransaction({
        to: approvalTx.to,
        data: approvalTx.data,
        value: approvalTx.value,
        gasLimit: 100000 // Standard for approvals
      });

      console.log(`Approval transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Approval confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'Success' : 'Failed'
      };
    } catch (error) {
      console.error('Approval failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute swap transaction
   */
  async executeSwap(chainId, fromToken, toToken, amount, walletPrivateKey, provider, slippage = 1) {
    try {
      console.log(`\n=== EXECUTING TOKEN SWAP ===`);
      console.log(`Chain ID: ${chainId}`);
      console.log(`From Token: ${fromToken}`);
      console.log(`To Token: ${toToken}`);
      console.log(`Amount: ${amount}`);
      console.log(`Slippage: ${slippage}%`);

      const wallet = new ethers.Wallet(walletPrivateKey, provider);
      console.log(`From wallet: ${wallet.address}`);

      // Build swap transaction
      const swapTx = await this.buildSwapTransaction(
        chainId,
        fromToken,
        toToken,
        amount,
        wallet.address,
        slippage,
        null,
        false
      );

      if (!swapTx.success) {
        throw new Error(`Failed to build swap transaction: ${swapTx.error}`);
      }

      console.log(`Expected output: ${ethers.formatUnits(swapTx.toTokenAmount, swapTx.toToken.decimals)} ${swapTx.toToken.symbol}`);

      // Send transaction
      const tx = await wallet.sendTransaction(swapTx.tx);

      console.log(`Swap transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Swap confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'Success' : 'Failed',
        fromToken: swapTx.fromToken,
        toToken: swapTx.toToken,
        fromAmount: ethers.formatUnits(swapTx.fromTokenAmount, swapTx.fromToken.decimals),
        toAmount: ethers.formatUnits(swapTx.toTokenAmount, swapTx.toToken.decimals)
      };
    } catch (error) {
      console.error('Swap failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete swap flow with automatic approval if needed
   */
  async swapWithAutoApproval(chainId, fromToken, toToken, amount, walletPrivateKey, provider, slippage = 1) {
    try {
      const wallet = new ethers.Wallet(walletPrivateKey, provider);

      // Check if approval is needed (skip for native token)
      const nativeTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      if (fromToken.toLowerCase() !== nativeTokenAddress) {
        console.log('Checking token allowance...');
        
        const allowanceResult = await this.checkAllowance(chainId, fromToken, wallet.address, provider);
        if (!allowanceResult.success) {
          throw new Error(`Failed to check allowance: ${allowanceResult.error}`);
        }

        const requiredAllowance = BigInt(amount);
        const currentAllowance = BigInt(allowanceResult.allowance);

        if (currentAllowance < requiredAllowance) {
          console.log('Insufficient allowance. Approving tokens...');
          const approvalResult = await this.executeApproval(chainId, fromToken, walletPrivateKey, provider);
          
          if (!approvalResult.success) {
            throw new Error(`Approval failed: ${approvalResult.error}`);
          }
          
          console.log(`Approval successful: ${approvalResult.txHash}`);
          // Wait a bit for the approval to be processed
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('Sufficient allowance available');
        }
      }

      // Execute swap
      return await this.executeSwap(chainId, fromToken, toToken, amount, walletPrivateKey, provider, slippage);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { OneInchIntegration, ONEINCH_CHAIN_IDS, CHAIN_ID_MAPPING }; 