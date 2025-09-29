// cronos_wallet.js - Clean Cronos Testnet Wallet using Ethers.js only
// Install: npm install ethers@6.8.0 bip39@3.0.4

const { ethers } = require('ethers');
const bip39 = require('bip39');

class CronosWallet {
  constructor() {
    this.rpcUrl = 'https://evm-t3.cronos.org';
    this.chainId = 338;
    this.explorerUrl = 'https://testnet.cronoscan.com';
    
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      console.log('Ethers.js provider initialized for Cronos');
    } catch (error) {
      console.error('Failed to initialize ethers provider:', error.message);
      throw error;
    }
  }

  // Generate new wallet
  generateWallet() {
    try {
      const wallet = ethers.Wallet.createRandom();
      
      return {
        success: true,
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase,
        network: 'Cronos Testnet',
        chainId: this.chainId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Generate wallet from seed phrase
  generateFromSeed(mnemonic = null) {
    try {
      const seedPhrase = mnemonic || bip39.generateMnemonic();
      
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const wallet = ethers.Wallet.fromPhrase(seedPhrase);
      
      return {
        success: true,
        mnemonic: seedPhrase,
        address: wallet.address,
        privateKey: wallet.privateKey,
        derivationPath: "m/44'/60'/0'/0/0",
        network: 'Cronos Testnet',
        chainId: this.chainId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Import wallet from private key
  importFromPrivateKey(privateKey) {
    try {
      // Add 0x prefix if not present
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      const wallet = new ethers.Wallet(privateKey);
      
      return {
        success: true,
        address: wallet.address,
        privateKey: wallet.privateKey,
        network: 'Cronos Testnet',
        chainId: this.chainId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get CRO balance
  async getBalance(address) {
    try {
      const balanceWei = await this.provider.getBalance(address);
      const balanceCRO = ethers.formatEther(balanceWei);
      
      return {
        success: true,
        address: address,
        balance: parseFloat(balanceCRO),
        balanceWei: balanceWei.toString(),
        symbol: 'CRO'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get current gas price
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      
      return {
        success: true,
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get transaction count (nonce)
  async getNonce(address) {
    try {
      const nonce = await this.provider.getTransactionCount(address, 'pending');
      return { success: true, nonce: nonce };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send CRO
  async sendCRO(fromAddress, toAddress, amountCRO, privateKey) {
    try {
      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Check if wallet address matches fromAddress
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      // Get current balance
      const balanceResult = await this.getBalance(fromAddress);
      if (!balanceResult.success) throw new Error('Failed to check balance');

      // Convert amount to wei
      const valueWei = ethers.parseEther(amountCRO.toString());

      // Get fee data
      const feeData = await this.provider.getFeeData();
      const gasLimit = 21000n; // Standard transfer gas limit
      const gasCost = parseFloat(ethers.formatEther(feeData.gasPrice * gasLimit));
      const totalNeeded = amountCRO + gasCost;

      if (balanceResult.balance < totalNeeded) {
        throw new Error(`Insufficient balance. Need ${totalNeeded.toFixed(6)} CRO, have ${balanceResult.balance.toFixed(6)} CRO`);
      }

      // Create transaction
      const transaction = {
        to: toAddress,
        value: valueWei,
        gasLimit: gasLimit,
        gasPrice: feeData.gasPrice,
        chainId: this.chainId
      };

      // Send transaction
      const txResponse = await wallet.sendTransaction(transaction);
      
      // Wait for transaction to be mined
      const receipt = await txResponse.wait();

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasCost: gasCost,
        explorerUrl: `${this.explorerUrl}/tx/${receipt.hash}`
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get transaction status
  async getTransactionStatus(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!tx) {
        return { success: false, error: 'Transaction not found' };
      }

      const valueCRO = ethers.formatEther(tx.value);
      
      return {
        success: true,
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: parseFloat(valueCRO),
        gasPrice: tx.gasPrice?.toString(),
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        status: receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Pending',
        blockNumber: receipt ? receipt.blockNumber : null,
        explorerUrl: `${this.explorerUrl}/tx/${txHash}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get network info
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();
      
      return {
        success: true,
        chainId: Number(network.chainId),
        blockNumber: blockNumber,
        gasPrice: feeData.gasPrice?.toString(),
        gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
        rpcUrl: this.rpcUrl,
        explorerUrl: this.explorerUrl
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get faucet info
  getFaucetInfo() {
    return {
      url: 'https://cronos.org/faucet',
      amount: '100 CRO per request',
      cooldown: '24 hours',
      requirements: 'Twitter account required'
    };
  }

  // Get MetaMask configuration
  getMetaMaskConfig() {
    return {
      chainId: '0x152', // 338 in hex
      chainName: 'Cronos Testnet',
      nativeCurrency: {
        name: 'CRO',
        symbol: 'CRO',
        decimals: 18
      },
      rpcUrls: [this.rpcUrl],
      blockExplorerUrls: [this.explorerUrl]
    };
  }

  // Validate address
  isValidAddress(address) {
    return ethers.isAddress(address);
  }
}

module.exports = CronosWallet; 