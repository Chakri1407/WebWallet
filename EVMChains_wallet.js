// EVMChains_wallet_layerzero.js - Enhanced Multi-Chain Wallet with LayerZero Bridge
const { ethers } = require('ethers');
const bip39 = require('bip39');
const { EndpointId } = require('@layerzerolabs/lz-definitions');

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

// OFT Adapter ABI (simplified - only what we need)
const OFT_ADAPTER_ABI = [
  "function token() view returns (address)",
  "function approvalRequired() view returns (bool)",
  "function quoteSend((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) sendParam, bool payInLzToken) view returns ((uint256 nativeFee, uint256 lzTokenFee) msgFee, uint256 amountSentLD, uint256 amountReceivedLD)",
  "function send((uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) sendParam, (uint256 nativeFee, uint256 lzTokenFee) fee, address refundAddress) payable returns ((bytes32 guid, uint64 nonce, (uint256 nativeFee, uint256 lzTokenFee) fee) msgReceipt)",
  "function setPeer(uint32 eid, bytes32 peer)"
];

// Network configurations with LayerZero support
const NETWORKS = {
  ethereum_sepolia: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    faucets: ['https://sepoliafaucet.com/', 'https://www.infura.io/faucet/sepolia'],
    layerzeroSupported: true,
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    endpointId: EndpointId.SEPOLIA_V2_TESTNET
  },
  polygon_amoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    symbol: 'POL',
    decimals: 18,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    faucets: ['https://faucet.polygon.technology/'],
    layerzeroSupported: true,
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    endpointId: EndpointId.AMOY_V2_TESTNET
  },
  arbitrum_sepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.arbiscan.io',
    faucets: ['https://faucet.quicknode.com/arbitrum/sepolia'],
    layerzeroSupported: true,
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    endpointId: EndpointId.ARBSEP_V2_TESTNET
  },
  cronos_testnet: {
    name: 'Cronos Testnet',
    chainId: 338,
    symbol: 'TCRO',
    decimals: 18,
    rpcUrl: 'https://evm-t3.cronos.org',
    explorerUrl: 'https://explorer.cronos.org/testnet',
    faucets: ['https://cronos.org/faucet'],
    layerzeroSupported: false
  },
  base_sepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.basescan.org',
    faucets: ['https://www.alchemy.com/faucets/base-sepolia'],
    layerzeroSupported: true,
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    endpointId: EndpointId.BASESEP_V2_TESTNET
  },
  bnb_testnet: {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    symbol: 'tBNB',
    decimals: 18,
    rpcUrl: 'https://bsc-testnet.public.blastapi.io',
    explorerUrl: 'https://testnet.bscscan.com',
    faucets: ['https://testnet.bnbchain.org/faucet-smart'],
    layerzeroSupported: true,
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    endpointId: EndpointId.BSC_V2_TESTNET
  },
  avalanche_fuji: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    symbol: 'AVAX',
    decimals: 18,
    rpcUrl: 'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    faucets: ['https://core.app/tools/testnet-faucet/'],
    layerzeroSupported: true,
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    endpointId: EndpointId.AVALANCHE_V2_TESTNET
  },
  celo_alfajores: {
    name: 'Celo Alfajores',
    chainId: 44787,
    symbol: 'CELO',
    decimals: 18,
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    explorerUrl: 'https://alfajores.celoscan.io',
    faucets: ['https://faucet.celo.org/alfajores'],
    layerzeroSupported: false
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

  // ========== WALLET GENERATION (keeping existing methods) ==========

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

      const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);

      if (balance < amountInTokenUnits) {
        const formattedBalance = ethers.formatUnits(balance, decimals);
        throw new Error(`Insufficient token balance. Need ${amount} ${symbol}, have ${formattedBalance} ${symbol}`);
      }

      const gasEstimate = await contract.transfer.estimateGas(toAddress, amountInTokenUnits);
      const gasLimit = gasEstimate * 120n / 100n;
      const feeData = await this.provider.getFeeData();
      
      const tx = await contract.transfer(toAddress, amountInTokenUnits, {
        gasLimit: gasLimit,
        gasPrice: feeData.gasPrice
      });

      const receipt = await tx.wait();

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
        explorerUrl: `${this.network.explorerUrl}/tx/${receipt.hash}`,
        network: this.network.name
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ========== LAYERZERO CROSS-CHAIN OPERATIONS ==========

  /**
   * Check if current network supports LayerZero
   */
  supportsLayerZero() {
    return this.network.layerzeroSupported === true;
  }

  /**
   * Get list of networks that support LayerZero and can be bridge destinations
   */
  async getLayerZeroSupportedNetworks() {
    try {
      const supportedNetworks = Object.entries(NETWORKS)
        .filter(([key, config]) => config.layerzeroSupported)
        .filter(([key]) => key !== this.networkKey) // Exclude current network
        .map(([key, config]) => ({
          key: key,
          name: config.name,
          chainId: config.chainId,
          endpointId: config.endpointId,
          symbol: config.symbol
        }));

      return {
        success: true,
        currentNetwork: this.network.name,
        supportedNetworks: supportedNetworks,
        count: supportedNetworks.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Quote cross-chain transfer fee
   */
  async quoteCrossChainTransfer(oftAdapterAddress, destinationNetwork, recipientAddress, amount) {
    try {
      if (!this.supportsLayerZero()) {
        throw new Error(`${this.network.name} does not support LayerZero`);
      }

      const destNetwork = NETWORKS[destinationNetwork];
      if (!destNetwork || !destNetwork.layerzeroSupported) {
        throw new Error(`Destination network ${destinationNetwork} not supported`);
      }

      const adapter = new ethers.Contract(oftAdapterAddress, OFT_ADAPTER_ABI, this.provider);
      
      // Get token info
      const tokenAddress = await adapter.token();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const decimals = await tokenContract.decimals();
      
      // Convert amount to token units
      const amountLD = ethers.parseUnits(amount.toString(), decimals);
      
      // Convert recipient address to bytes32
      const recipientBytes32 = ethers.zeroPadValue(recipientAddress, 32);
      
      // Build send parameters
      const sendParam = {
        dstEid: destNetwork.endpointId,
        to: recipientBytes32,
        amountLD: amountLD,
        minAmountLD: (amountLD * 95n) / 100n, // 5% slippage
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x'
      };

      // Quote the send
      const quote = await adapter.quoteSend(sendParam, false);

      return {
        success: true,
        fromNetwork: this.network.name,
        toNetwork: destNetwork.name,
        amount: amount,
        nativeFee: ethers.formatEther(quote.msgFee.nativeFee),
        nativeFeeWei: quote.msgFee.nativeFee.toString(),
        amountSent: ethers.formatUnits(quote.amountSentLD, decimals),
        amountReceived: ethers.formatUnits(quote.amountReceivedLD, decimals),
        symbol: this.network.symbol
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Quote failed: ${error.message}` 
      };
    }
  }

  /**
   * Approve tokens for cross-chain transfer
   */
  async approveTokenForCrossChain(tokenAddress, oftAdapterAddress, amount, privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      
      const decimals = await tokenContract.decimals();
      const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);
      
      console.log(`Approving ${amount} tokens for OFT Adapter...`);
      
      const tx = await tokenContract.approve(oftAdapterAddress, amountInTokenUnits);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        approvedAmount: amount,
        spender: oftAdapterAddress,
        explorerUrl: `${this.network.explorerUrl}/tx/${receipt.hash}`
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Approval failed: ${error.message}` 
      };
    }
  }

  /**
   * Send tokens cross-chain via LayerZero
   */
  async sendCrossChainToken(oftAdapterAddress, destinationNetwork, recipientAddress, amount, privateKey, slippage = 5) {
    try {
      console.log(`\n=== LAYERZERO CROSS-CHAIN TRANSFER ===`);
      console.log(`From: ${this.network.name}`);
      console.log(`To: ${destinationNetwork}`);
      console.log(`Amount: ${amount}`);

      if (!this.supportsLayerZero()) {
        throw new Error(`${this.network.name} does not support LayerZero`);
      }

      const destNetwork = NETWORKS[destinationNetwork];
      if (!destNetwork || !destNetwork.layerzeroSupported) {
        throw new Error(`Destination network ${destinationNetwork} not supported`);
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const adapter = new ethers.Contract(oftAdapterAddress, OFT_ADAPTER_ABI, wallet);
      
      // Get token info
      const tokenAddress = await adapter.token();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      
      console.log(`Token: ${symbol}`);
      
      // Convert amount
      const amountLD = ethers.parseUnits(amount.toString(), decimals);
      const minAmountLD = (amountLD * BigInt(100 - slippage)) / 100n;
      
      // Convert recipient to bytes32
      const recipientBytes32 = ethers.zeroPadValue(recipientAddress, 32);
      
      // Build send parameters
      const sendParam = {
        dstEid: destNetwork.endpointId,
        to: recipientBytes32,
        amountLD: amountLD,
        minAmountLD: minAmountLD,
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x'
      };

      // Get quote
      console.log('Getting quote...');
      const quote = await adapter.quoteSend(sendParam, false);
      const nativeFee = quote.msgFee.nativeFee;
      
      console.log(`Bridge fee: ${ethers.formatEther(nativeFee)} ${this.network.symbol}`);

      // Send cross-chain
      console.log('Sending cross-chain transaction...');
      const tx = await adapter.send(
        sendParam,
        { nativeFee: nativeFee, lzTokenFee: 0 },
        wallet.address,
        { value: nativeFee }
      );

      console.log(`Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log('Transaction confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        from: this.network.name,
        to: destNetwork.name,
        recipient: recipientAddress,
        amount: amount,
        symbol: symbol,
        bridgeFee: ethers.formatEther(nativeFee),
        explorerUrl: `${this.network.explorerUrl}/tx/${receipt.hash}`,
        message: `Successfully bridged ${amount} ${symbol} to ${destNetwork.name}`
      };

    } catch (error) {
      console.error('Cross-chain transfer failed:', error);
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
        explorerUrl: this.network.explorerUrl,
        layerzeroSupported: this.network.layerzeroSupported || false
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

  static getLayerZeroSupportedNetworks() {
    return Object.entries(NETWORKS)
      .filter(([_, config]) => config.layerzeroSupported)
      .map(([key, config]) => ({
        key: key,
        name: config.name,
        chainId: config.chainId,
        endpointId: config.endpointId,
        symbol: config.symbol
      }));
  }

  static getNetworkByChainId(chainId) {
    const entry = Object.entries(NETWORKS).find(([_, config]) => config.chainId === chainId);
    return entry ? { key: entry[0], ...entry[1] } : null;
  }
}

module.exports = { MultiChainWallet, NETWORKS }; 