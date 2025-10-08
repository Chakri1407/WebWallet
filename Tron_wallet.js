// Tron_wallet.js - Tron Testnet Wallet (Shasta)
const TronWeb = require('tronweb');
const bip39 = require('bip39');

// TRC20 Token ABI (similar to ERC20)
const TRC20_ABI = [
  {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},
  {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
  {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
  {"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}
];

const TRON_CONFIG = {
  name: 'Tron Shasta Testnet',
  chainId: '2494104990',
  symbol: 'TRX',
  decimals: 6,
  fullNode: 'https://api.shasta.trongrid.io',
  solidityNode: 'https://api.shasta.trongrid.io',
  eventServer: 'https://api.shasta.trongrid.io',
  explorerUrl: 'https://shasta.tronscan.org/#',
  faucets: ['https://www.trongrid.io/shasta']
};

class TronWallet {
  constructor() {
    this.tronWeb = new TronWeb({
      fullHost: TRON_CONFIG.fullNode,
      headers: { "TRON-PRO-API-KEY": 'your-api-key-here' } // Optional but recommended
    });
    console.log(`✅ TronWeb initialized for ${TRON_CONFIG.name}`);
  }

  // ========== WALLET GENERATION ==========

  generateWallet() {
    try {
      // Generate random private key (32 bytes)
      const crypto = require('crypto');
      const privateKeyBytes = crypto.randomBytes(32);
      const privateKey = privateKeyBytes.toString('hex');
      
      // Derive address from private key
      const address = this.tronWeb.address.fromPrivateKey(privateKey);
      
      // Get public key
      let publicKey = '';
      try {
        publicKey = this.tronWeb.utils.crypto.getPubKeyFromPriKey(privateKey);
      } catch (e) {
        publicKey = 'N/A';
      }
      
      return {
        success: true,
        address: address,
        privateKey: privateKey,
        publicKey: publicKey,
        network: TRON_CONFIG.name,
        chainId: TRON_CONFIG.chainId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateFromSeed(mnemonic = null) {
    try {
      const seedPhrase = mnemonic || bip39.generateMnemonic();
      
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Generate seed from mnemonic
      const seed = bip39.mnemonicToSeedSync(seedPhrase);
      // Use first 32 bytes as private key
      const privateKeyHex = seed.slice(0, 32).toString('hex');
      
      // Derive address from private key
      const address = this.tronWeb.address.fromPrivateKey(privateKeyHex);
      
      return {
        success: true,
        mnemonic: seedPhrase,
        address: address,
        privateKey: privateKeyHex,
        derivationPath: "m/44'/195'/0'/0/0",
        network: TRON_CONFIG.name,
        chainId: TRON_CONFIG.chainId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  importFromPrivateKey(privateKey) {
    try {
      if (privateKey.startsWith('0x')) {
        privateKey = privateKey.slice(2);
      }
      
      const address = this.tronWeb.address.fromPrivateKey(privateKey);
      
      return {
        success: true,
        address: address,
        privateKey: privateKey,
        network: TRON_CONFIG.name,
        chainId: TRON_CONFIG.chainId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== NATIVE TRX OPERATIONS ==========

  async getBalance(address) {
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      const balanceTRX = balance / Math.pow(10, TRON_CONFIG.decimals);
      
      return {
        success: true,
        address: address,
        balance: balanceTRX,
        balanceSun: balance,
        symbol: TRON_CONFIG.symbol,
        network: TRON_CONFIG.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendTRX(fromAddress, toAddress, amount, privateKey) {
    try {
      this.tronWeb.setPrivateKey(privateKey);
      
      const balanceResult = await this.getBalance(fromAddress);
      if (!balanceResult.success) throw new Error('Failed to check balance');

      const amountSun = amount * Math.pow(10, TRON_CONFIG.decimals);
      
      // Estimate bandwidth/energy cost (roughly 0.1-0.3 TRX for simple transfer)
      const estimatedFee = 0.3;
      const totalNeeded = amount + estimatedFee;

      if (balanceResult.balance < totalNeeded) {
        throw new Error(`Insufficient balance. Need ${totalNeeded} TRX, have ${balanceResult.balance} TRX`);
      }

      console.log(`Sending ${amount} TRX on ${TRON_CONFIG.name}...`);
      
      const transaction = await this.tronWeb.trx.sendTransaction(toAddress, amountSun);
      
      if (!transaction.result) {
        throw new Error('Transaction failed');
      }

      console.log(`Transaction sent: ${transaction.txid}`);

      return {
        success: true,
        txHash: transaction.txid,
        from: fromAddress,
        to: toAddress,
        amount: amount,
        explorerUrl: `${TRON_CONFIG.explorerUrl}/transaction/${transaction.txid}`,
        network: TRON_CONFIG.name
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== TRC20 TOKEN OPERATIONS ==========

  async getTokenInfo(tokenAddress) {
    try {
      console.log(`Getting token info for: ${tokenAddress}`);
      
      // Validate address format
      if (!this.tronWeb.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
      }

      let name = 'Unknown';
      let symbol = 'Unknown';
      let decimals = 18;

      // Try to get name
      try {
        const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'name()',
          {},
          [],
          tokenAddress
        );
        
        if (txObj && txObj.constant_result && txObj.constant_result[0]) {
          const hexStr = txObj.constant_result[0];
          // Remove leading zeros and decode
          const cleanHex = hexStr.replace(/^0+/, '');
          if (cleanHex.length > 0) {
            // Skip first 64 characters (length indicator) and decode
            const nameHex = cleanHex.substring(64);
            name = this.tronWeb.toUtf8('0x' + nameHex).replace(/\0/g, '');
          }
        }
        console.log('Token name:', name);
      } catch (e) {
        console.log('Could not get name:', e.message);
      }

      // Try to get symbol
      try {
        const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'symbol()',
          {},
          [],
          tokenAddress
        );
        
        if (txObj && txObj.constant_result && txObj.constant_result[0]) {
          const hexStr = txObj.constant_result[0];
          const cleanHex = hexStr.replace(/^0+/, '');
          if (cleanHex.length > 0) {
            const symbolHex = cleanHex.substring(64);
            symbol = this.tronWeb.toUtf8('0x' + symbolHex).replace(/\0/g, '');
          }
        }
        console.log('Token symbol:', symbol);
      } catch (e) {
        console.log('Could not get symbol:', e.message);
      }

      // Try to get decimals
      try {
        const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'decimals()',
          {},
          [],
          tokenAddress
        );
        
        if (txObj && txObj.constant_result && txObj.constant_result[0]) {
          decimals = parseInt(txObj.constant_result[0], 16);
        }
        console.log('Token decimals:', decimals);
      } catch (e) {
        console.log('Could not get decimals, using default 18:', e.message);
      }

      return {
        success: true,
        tokenAddress: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: decimals,
        network: TRON_CONFIG.name
      };
    } catch (error) {
      console.error('Token info error:', error);
      return { 
        success: false, 
        error: `Failed to get token info: ${error.message}` 
      };
    }
  }

  async getTokenBalance(walletAddress, tokenAddress) {
    try {
      console.log(`Getting token balance for wallet: ${walletAddress}`);
      console.log(`Token contract: ${tokenAddress}`);
      
      if (!this.tronWeb.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }
      if (!this.tronWeb.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
      }

      // Encode the address parameter
      const parameter = [{
        type: 'address',
        value: walletAddress
      }];

      // Call balanceOf
      const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress,
        'balanceOf(address)',
        {},
        parameter,
        tokenAddress
      );

      if (!txObj || !txObj.constant_result || !txObj.constant_result[0]) {
        throw new Error('No balance data returned from contract');
      }

      const balance = parseInt(txObj.constant_result[0], 16);
      console.log('Balance (raw):', balance);

      // Get decimals and symbol
      let decimals = 18;
      let symbol = 'TOKEN';
      
      try {
        const decTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'decimals()',
          {},
          [],
          tokenAddress
        );
        if (decTxObj && decTxObj.constant_result && decTxObj.constant_result[0]) {
          decimals = parseInt(decTxObj.constant_result[0], 16);
        }
      } catch (e) {
        console.log('Using default decimals: 18');
      }
      
      try {
        const symTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'symbol()',
          {},
          [],
          tokenAddress
        );
        if (symTxObj && symTxObj.constant_result && symTxObj.constant_result[0]) {
          const hexStr = symTxObj.constant_result[0];
          const cleanHex = hexStr.replace(/^0+/, '');
          if (cleanHex.length > 0) {
            const symbolHex = cleanHex.substring(64);
            symbol = this.tronWeb.toUtf8('0x' + symbolHex).replace(/\0/g, '');
          }
        }
      } catch (e) {
        console.log('Using default symbol: TOKEN');
      }

      // Convert balance
      const formattedBalance = balance / Math.pow(10, decimals);
      console.log('Formatted balance:', formattedBalance, symbol);

      return {
        success: true,
        walletAddress: walletAddress,
        tokenAddress: tokenAddress,
        balance: formattedBalance,
        balanceRaw: balance.toString(),
        decimals: decimals,
        symbol: symbol,
        network: TRON_CONFIG.name
      };
    } catch (error) {
      console.error('Token balance error:', error);
      return { 
        success: false, 
        error: `Failed to get token balance: ${error.message}` 
      };
    }
  }

  async sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey) {
    try {
      console.log(`\n=== TRC20 TOKEN TRANSFER ON ${TRON_CONFIG.name.toUpperCase()} ===`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Token: ${tokenAddress}`);
      console.log(`Amount: ${amount}`);

      if (!this.tronWeb.isAddress(fromAddress)) throw new Error('Invalid from address');
      if (!this.tronWeb.isAddress(toAddress)) throw new Error('Invalid to address');
      if (!this.tronWeb.isAddress(tokenAddress)) throw new Error('Invalid token contract address');

      // Set private key for signing
      this.tronWeb.setPrivateKey(privateKey);
      
      // Verify the private key matches the from address
      const derivedAddress = this.tronWeb.address.fromPrivateKey(privateKey);
      if (derivedAddress.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      // Get token decimals
      let decimals = 18;
      try {
        const decTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'decimals()',
          {},
          [],
          tokenAddress
        );
        if (decTxObj && decTxObj.constant_result && decTxObj.constant_result[0]) {
          decimals = parseInt(decTxObj.constant_result[0], 16);
        }
      } catch (e) {
        console.log('Using default decimals: 18');
      }

      // Get symbol
      let symbol = 'TOKEN';
      try {
        const symTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          'symbol()',
          {},
          [],
          tokenAddress
        );
        if (symTxObj && symTxObj.constant_result && symTxObj.constant_result[0]) {
          const hexStr = symTxObj.constant_result[0];
          const cleanHex = hexStr.replace(/^0+/, '');
          if (cleanHex.length > 0) {
            const symbolHex = cleanHex.substring(64);
            symbol = this.tronWeb.toUtf8('0x' + symbolHex).replace(/\0/g, '');
          }
        }
      } catch (e) {
        console.log('Could not get symbol');
      }

      console.log(`Token: ${symbol}, Decimals: ${decimals}`);

      // Calculate amount in token units as string to avoid overflow
      const multiplier = Math.pow(10, decimals);
      const amountStr = (amount * multiplier).toLocaleString('fullwide', {useGrouping: false});
      const amountInTokenUnits = amountStr.split('.')[0]; // Remove any decimal point
      
      console.log(`Amount in token units: ${amountInTokenUnits}`);

      // Check balance
      const balanceTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress,
        'balanceOf(address)',
        {},
        [{type: 'address', value: fromAddress}],
        tokenAddress
      );

      if (!balanceTxObj || !balanceTxObj.constant_result || !balanceTxObj.constant_result[0]) {
        throw new Error('Could not check balance');
      }

      const balanceHex = balanceTxObj.constant_result[0];
      const balance = BigInt('0x' + balanceHex);
      const amountBigInt = BigInt(amountInTokenUnits);

      console.log(`Current balance: ${balance.toString()}`);

      if (balance < amountBigInt) {
        const formattedBalance = Number(balance) / multiplier;
        throw new Error(`Insufficient token balance. Need ${amount} ${symbol}, have ${formattedBalance} ${symbol}`);
      }

      // Check TRX balance for fees
      const nativeBalance = await this.getBalance(fromAddress);
      if (!nativeBalance.success || nativeBalance.balance < 10) {
        throw new Error(`Insufficient TRX balance for fees. Need at least 10 TRX, have ${nativeBalance.balance || 0} TRX`);
      }

      console.log('Building transaction...');

      // Build the transfer transaction
      const functionSelector = 'transfer(address,uint256)';
      const parameter = [
        {type: 'address', value: toAddress},
        {type: 'uint256', value: amountInTokenUnits}
      ];

      const tx = await this.tronWeb.transactionBuilder.triggerSmartContract(
        tokenAddress,
        functionSelector,
        {
          feeLimit: 100000000, // 100 TRX
          callValue: 0
        },
        parameter,
        fromAddress
      );

      if (!tx || !tx.transaction) {
        throw new Error('Failed to build transaction');
      }

      console.log('Signing transaction...');
      const signedTx = await this.tronWeb.trx.sign(tx.transaction, privateKey);

      console.log('Broadcasting transaction...');
      const broadcast = await this.tronWeb.trx.sendRawTransaction(signedTx);

      if (!broadcast || !broadcast.result) {
        throw new Error(broadcast.message || 'Transaction broadcast failed');
      }

      const txHash = broadcast.transaction?.txID || broadcast.txid;
      console.log(`Transaction sent: ${txHash}`);

      return {
        success: true,
        txHash: txHash,
        from: fromAddress,
        to: toAddress,
        tokenAddress: tokenAddress,
        amount: amount,
        symbol: symbol,
        explorerUrl: `${TRON_CONFIG.explorerUrl}/transaction/${txHash}`,
        network: TRON_CONFIG.name,
        message: `Successfully sent ${amount} ${symbol}`
      };

    } catch (error) {
      console.error('Token transfer failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ========== TRANSACTION INFO ==========

  async getTransactionStatus(txHash) {
    try {
      const tx = await this.tronWeb.trx.getTransaction(txHash);
      
      if (!tx || !tx.txID) {
        return { success: false, error: 'Transaction not found' };
      }

      const txInfo = await this.tronWeb.trx.getTransactionInfo(txHash);
      
      return {
        success: true,
        hash: tx.txID,
        blockNumber: txInfo.blockNumber,
        status: txInfo.result === 'SUCCESS' ? 'Success' : 'Failed',
        energyUsed: txInfo.receipt?.energy_usage_total || 0,
        netUsed: txInfo.receipt?.net_usage || 0,
        explorerUrl: `${TRON_CONFIG.explorerUrl}/transaction/${txHash}`,
        network: TRON_CONFIG.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== UTILITY METHODS ==========

  getFaucetInfo() {
    return {
      network: TRON_CONFIG.name,
      faucets: TRON_CONFIG.faucets,
      symbol: TRON_CONFIG.symbol
    };
  }

  isValidAddress(address) {
    return this.tronWeb.isAddress(address);
  }

  static getNetworkConfig() {
    return TRON_CONFIG;
  }
}

module.exports = { TronWallet, TRON_CONFIG }; 