// multi_chain_wallet.js - Universal Multi-Chain EVM Wallet
const { ethers } = require('ethers');
const bip39 = require('bip39');

// Standard ERC20 ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Network configurations
const NETWORKS = {
  ethereum_sepolia: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    faucets: ['https://sepoliafaucet.com/', 'https://www.infura.io/faucet/sepolia']
  },
  polygon_amoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    symbol: 'POL',
    decimals: 18,
    rpcUrl: 'https://polygon-amoy.drpc.org',
    explorerUrl: 'https://amoy.polygonscan.com',
    faucets: ['https://faucet.polygon.technology/']
  },
  arbitrum_sepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.arbiscan.io',
    faucets: ['https://faucet.quicknode.com/arbitrum/sepolia']
  },
  cronos_testnet: {
    name: 'Cronos Testnet',
    chainId: 338,
    symbol: 'TCRO',
    decimals: 18,
    rpcUrl: 'https://evm-t3.cronos.org',
    explorerUrl: 'https://explorer.cronos.org/testnet',
    faucets: ['https://cronos.org/faucet']
  },
  base_sepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.basescan.org',
    faucets: ['https://www.alchemy.com/faucets/base-sepolia']
  },
  bnb_testnet: {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    symbol: 'tBNB',
    decimals: 18,
    rpcUrl: 'https://bsc-testnet.public.blastapi.io',
    explorerUrl: 'https://testnet.bscscan.com',
    faucets: ['https://testnet.bnbchain.org/faucet-smart']
  },
  avalanche_fuji: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    symbol: 'AVAX',
    decimals: 18,
    rpcUrl: 'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    faucets: ['https://core.app/tools/testnet-faucet/']
  },
  celo_alfajores: {
    name: 'Celo Alfajores',
    chainId: 44787,
    symbol: 'CELO',
    decimals: 18,
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    explorerUrl: 'https://explorer.celo.org/alfajores',
    faucets: ['https://faucet.celo.org/alfajores']
  }
};

class MultiChainWallet {
  constructor(networkKey) {
    if (!NETWORKS[networkKey]) {
      throw new Error(`Unknown network: ${networkKey}. Available networks: ${Object.keys(NETWORKS).join(', ')}`);
    }

    this.network = NETWORKS[networkKey];
    this.networkKey = networkKey;
    
    try {
      this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
      console.log(`✅ Provider initialized for ${this.network.name}`);
    } catch (error) {
      console.error(`❌ Failed to initialize provider for ${this.network.name}:`, error.message);
      throw error;
    }
  }

  // ========== WALLET GENERATION ==========

  generateWallet() {
    try {
      const wallet = ethers.Wallet.createRandom();
      
      return {
        success: true,
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase,
        network: this.network.name,
        chainId: this.network.chainId,
        networkKey: this.networkKey
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
        network: this.network.name,
        chainId: this.network.chainId,
        networkKey: this.networkKey
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
        network: this.network.name,
        chainId: this.network.chainId,
        networkKey: this.networkKey
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== NATIVE CURRENCY OPERATIONS ==========

  async getBalance(address) {
    try {
      const balanceWei = await this.provider.getBalance(address);
      const balance = ethers.formatEther(balanceWei);
      
      return {
        success: true,
        address: address,
        balance: parseFloat(balance),
        balanceWei: balanceWei.toString(),
        symbol: this.network.symbol,
        network: this.network.name
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
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
        network: this.network.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendNative(fromAddress, toAddress, amount, privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      const balanceResult = await this.getBalance(fromAddress);
      if (!balanceResult.success) throw new Error('Failed to check balance');

      const valueWei = ethers.parseEther(amount.toString());

      const feeData = await this.provider.getFeeData();
      const gasLimit = 21000n;
      const gasCost = parseFloat(ethers.formatEther(feeData.gasPrice * gasLimit));
      const totalNeeded = amount + gasCost;

      if (balanceResult.balance < totalNeeded) {
        throw new Error(`Insufficient balance. Need ${totalNeeded.toFixed(6)} ${this.network.symbol}, have ${balanceResult.balance.toFixed(6)} ${this.network.symbol}`);
      }

      const transaction = {
        to: toAddress,
        value: valueWei,
        gasLimit: gasLimit,
        gasPrice: feeData.gasPrice,
        chainId: this.network.chainId
      };

      console.log(`Sending ${amount} ${this.network.symbol} on ${this.network.name}...`);
      const txResponse = await wallet.sendTransaction(transaction);
      console.log(`Transaction sent: ${txResponse.hash}`);
      
      const receipt = await txResponse.wait();
      console.log('Transaction confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasCost: gasCost,
        explorerUrl: `${this.network.explorerUrl}/tx/${receipt.hash}`,
        network: this.network.name
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== ERC20 TOKEN OPERATIONS ==========

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
        network: this.network.name
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
        symbol: symbol,
        network: this.network.name
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
      console.log(`\n=== ERC20 TOKEN TRANSFER ON ${this.network.name.toUpperCase()} ===`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Token: ${tokenAddress}`);
      console.log(`Amount: ${amount}`);

      if (!ethers.isAddress(fromAddress)) throw new Error('Invalid from address');
      if (!ethers.isAddress(toAddress)) throw new Error('Invalid to address');
      if (!ethers.isAddress(tokenAddress)) throw new Error('Invalid token contract address');

      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      
      const [decimals, symbol, balance] = await Promise.all([
        contract.decimals(),
        contract.symbol(),
        contract.balanceOf(fromAddress)
      ]);

      console.log(`Token: ${symbol}, Decimals: ${decimals}`);

      const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);
      console.log(`Amount in token units: ${amountInTokenUnits.toString()}`);

      if (balance < amountInTokenUnits) {
        const formattedBalance = ethers.formatUnits(balance, decimals);
        throw new Error(`Insufficient token balance. Need ${amount} ${symbol}, have ${formattedBalance} ${symbol}`);
      }

      const nativeBalance = await this.getBalance(fromAddress);
      if (!nativeBalance.success) throw new Error('Failed to check native balance for gas');

      if (nativeBalance.balance < 0.01) {
        throw new Error(`Insufficient ${this.network.symbol} balance for gas fees. Need at least 0.01 ${this.network.symbol}`);
      }

      console.log('Estimating gas...');
      const gasEstimate = await contract.transfer.estimateGas(toAddress, amountInTokenUnits);
      const gasLimit = gasEstimate * 120n / 100n;
      
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
      console.log(`Gas limit (with buffer): ${gasLimit.toString()}`);

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      
      const gasCostWei = gasLimit * gasPrice;
      const gasCost = parseFloat(ethers.formatEther(gasCostWei));
      
      console.log(`Estimated gas cost: ${gasCost.toFixed(6)} ${this.network.symbol}`);

      console.log('Sending token transfer transaction...');
      const tx = await contract.transfer(toAddress, amountInTokenUnits, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });

      console.log(`Transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');

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
        gasCost: gasCost,
        explorerUrl: `${this.network.explorerUrl}/tx/${receipt.hash}`,
        network: this.network.name,
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

  // ========== TRANSACTION & NETWORK INFO ==========

  async getTransactionStatus(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!tx) {
        return { success: false, error: 'Transaction not found' };
      }

      const value = ethers.formatEther(tx.value);
      
      return {
        success: true,
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: parseFloat(value),
        gasPrice: tx.gasPrice?.toString(),
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        status: receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Pending',
        blockNumber: receipt ? receipt.blockNumber : null,
        explorerUrl: `${this.network.explorerUrl}/tx/${txHash}`,
        network: this.network.name
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
        name: this.network.name,
        chainId: Number(network.chainId),
        blockNumber: blockNumber,
        gasPrice: feeData.gasPrice?.toString(),
        gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
        rpcUrl: this.network.rpcUrl,
        explorerUrl: this.network.explorerUrl
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== UTILITY METHODS ==========

  getFaucetInfo() {
    return {
      network: this.network.name,
      faucets: this.network.faucets,
      symbol: this.network.symbol
    };
  }

  getMetaMaskConfig() {
    return {
      chainId: '0x' + this.network.chainId.toString(16),
      chainName: this.network.name,
      nativeCurrency: {
        name: this.network.symbol,
        symbol: this.network.symbol,
        decimals: this.network.decimals
      },
      rpcUrls: [this.network.rpcUrl],
      blockExplorerUrls: [this.network.explorerUrl]
    };
  }

  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  static getAvailableNetworks() {
    return Object.keys(NETWORKS).map(key => ({
      key: key,
      ...NETWORKS[key]
    }));
  }

  static getNetworkByChainId(chainId) {
    const entry = Object.entries(NETWORKS).find(([_, config]) => config.chainId === chainId);
    return entry ? { key: entry[0], ...entry[1] } : null;
  }
}

module.exports = { MultiChainWallet, NETWORKS }; 