// cronos_wallet.js - Cronos Testnet Wallet with ERC20 Support
const { ethers } = require('ethers');
const bip39 = require('bip39');

// Standard ERC20 ABI - only the functions we need
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

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

  importFromPrivateKey(privateKey) {
    try {
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

  async getNonce(address) {
    try {
      const nonce = await this.provider.getTransactionCount(address, 'pending');
      return { success: true, nonce: nonce };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendCRO(fromAddress, toAddress, amountCRO, privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      const balanceResult = await this.getBalance(fromAddress);
      if (!balanceResult.success) throw new Error('Failed to check balance');

      const valueWei = ethers.parseEther(amountCRO.toString());

      const feeData = await this.provider.getFeeData();
      const gasLimit = 21000n;
      const gasCost = parseFloat(ethers.formatEther(feeData.gasPrice * gasLimit));
      const totalNeeded = amountCRO + gasCost;

      if (balanceResult.balance < totalNeeded) {
        throw new Error(`Insufficient balance. Need ${totalNeeded.toFixed(6)} CRO, have ${balanceResult.balance.toFixed(6)} CRO`);
      }

      const transaction = {
        to: toAddress,
        value: valueWei,
        gasLimit: gasLimit,
        gasPrice: feeData.gasPrice,
        chainId: this.chainId
      };

      const txResponse = await wallet.sendTransaction(transaction);
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

  // ========== ERC20 TOKEN FUNCTIONS ==========

  async getTokenInfo(tokenAddress) {
    try {
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
      }

      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ]);

      return {
        success: true,
        tokenAddress: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: Number(decimals),
        network: 'Cronos Testnet'
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to get token info: ${error.message}` 
      };
    }
  }

  async getTokenBalance(walletAddress, tokenAddress) {
    try {
      if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
      }

      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol()
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);

      return {
        success: true,
        walletAddress: walletAddress,
        tokenAddress: tokenAddress,
        balance: parseFloat(formattedBalance),
        balanceRaw: balance.toString(),
        decimals: Number(decimals),
        symbol: symbol
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to get token balance: ${error.message}` 
      };
    }
  }

  async sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey) {
    try {
      console.log('\n=== ERC20 TOKEN TRANSFER ===');
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Token: ${tokenAddress}`);
      console.log(`Amount: ${amount}`);

      // Validate addresses
      if (!ethers.isAddress(fromAddress)) {
        throw new Error('Invalid from address');
      }
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid to address');
      }
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
      }

      // Create wallet
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      // Get token contract
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      
      // Get token info
      const [decimals, symbol, balance] = await Promise.all([
        contract.decimals(),
        contract.symbol(),
        contract.balanceOf(fromAddress)
      ]);

      console.log(`Token: ${symbol}, Decimals: ${decimals}`);

      // Convert amount to token units
      const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);
      
      console.log(`Amount in token units: ${amountInTokenUnits.toString()}`);

      // Check balance
      if (balance < amountInTokenUnits) {
        const formattedBalance = ethers.formatUnits(balance, decimals);
        throw new Error(`Insufficient token balance. Need ${amount} ${symbol}, have ${formattedBalance} ${symbol}`);
      }

      // Check CRO balance for gas
      const croBalance = await this.getBalance(fromAddress);
      if (!croBalance.success) {
        throw new Error('Failed to check CRO balance for gas');
      }

      if (croBalance.balance < 0.01) {
        throw new Error('Insufficient CRO balance for gas fees. Need at least 0.01 CRO');
      }

      // Estimate gas
      console.log('Estimating gas...');
      const gasEstimate = await contract.transfer.estimateGas(toAddress, amountInTokenUnits);
      const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
      
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
      console.log(`Gas limit (with buffer): ${gasLimit.toString()}`);

      // Get gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      
      const gasCostWei = gasLimit * gasPrice;
      const gasCostCRO = parseFloat(ethers.formatEther(gasCostWei));
      
      console.log(`Estimated gas cost: ${gasCostCRO.toFixed(6)} CRO`);

      // Send transaction
      console.log('Sending token transfer transaction...');
      const tx = await contract.transfer(toAddress, amountInTokenUnits, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });

      console.log(`Transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      console.log('Transaction confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: fromAddress,
        to: toAddress,
        tokenAddress: tokenAddress,
        amount: amount,
        symbol: symbol,
        gasUsed: receipt.gasUsed.toString(),
        gasCost: gasCostCRO,
        explorerUrl: `${this.explorerUrl}/tx/${receipt.hash}`,
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

  getFaucetInfo() {
    return {
      url: 'https://cronos.org/faucet',
      amount: '100 CRO per request',
      cooldown: '24 hours',
      requirements: 'Twitter account required'
    };
  }

  getMetaMaskConfig() {
    return {
      chainId: '0x152',
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

  isValidAddress(address) {
    return ethers.isAddress(address);
  }
}

module.exports = CronosWallet; 