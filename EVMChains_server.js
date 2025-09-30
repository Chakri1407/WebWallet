// multichain_server.js - Complete Multi-Chain Wallet Server
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting multi-chain wallet server...');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('.'));

console.log('Middleware loaded...');

// Initialize wallet class
let MultiChainWallet, NETWORKS;
try {
  const walletModule = require('./EVMChains_wallet');
  MultiChainWallet = walletModule.MultiChainWallet;
  NETWORKS = walletModule.NETWORKS;
  console.log('✅ Multi-chain wallet module loaded successfully');
} catch (error) {
  console.error('❌ Error loading wallet module:', error.message);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Multi-chain wallet server is running!',
    timestamp: new Date().toISOString(),
    availableNetworks: Object.keys(NETWORKS),
    totalNetworks: Object.keys(NETWORKS).length
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'EVMChains_frontend.html'));
});

// Get all available networks
app.get('/api/networks', (req, res) => {
  try {
    const networks = MultiChainWallet.getAvailableNetworks();
    res.json({
      success: true,
      networks: networks,
      count: networks.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= WALLET GENERATION ROUTES =============

// Generate new wallet for a specific network
app.post('/api/:network/generate', (req, res) => {
  try {
    const { network } = req.params;
    console.log(`Generating new wallet for ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const result = wallet.generateWallet();
    
    console.log(`Wallet generated:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Generate error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate wallet from seed phrase
app.post('/api/:network/generate-from-seed', (req, res) => {
  try {
    const { network } = req.params;
    const { mnemonic } = req.body;
    console.log(`Generating wallet from seed for ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const result = wallet.generateFromSeed(mnemonic);
    
    console.log(`Seed wallet generated:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Seed generate error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import wallet from private key
app.post('/api/:network/import', (req, res) => {
  try {
    const { network } = req.params;
    const { privateKey } = req.body;
    console.log(`Importing wallet for ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const result = wallet.importFromPrivateKey(privateKey);
    
    console.log(`Wallet imported:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Import error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BALANCE & INFO ROUTES =============

// Get native currency balance
app.get('/api/:network/balance/:address', async (req, res) => {
  try {
    const { network, address } = req.params;
    console.log(`Checking balance for ${address} on ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const balance = await wallet.getBalance(address);
    
    console.log(`Balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get network info
app.get('/api/:network/info', async (req, res) => {
  try {
    const { network } = req.params;
    console.log(`Getting network info for ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const info = await wallet.getNetworkInfo();
    
    res.json(info);
  } catch (error) {
    console.error(`Network info error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get gas price
app.get('/api/:network/gas-price', async (req, res) => {
  try {
    const { network } = req.params;
    console.log(`Getting gas price for ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const gasPrice = await wallet.getGasPrice();
    
    res.json(gasPrice);
  } catch (error) {
    console.error(`Gas price error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get faucet info
app.get('/api/:network/faucet', (req, res) => {
  try {
    const { network } = req.params;
    
    const wallet = new MultiChainWallet(network);
    const faucetInfo = wallet.getFaucetInfo();
    
    res.json({
      success: true,
      ...faucetInfo
    });
  } catch (error) {
    console.error(`Faucet info error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= TRANSACTION ROUTES =============

// Send native currency
app.post('/api/:network/send', async (req, res) => {
  try {
    const { network } = req.params;
    const { fromAddress, toAddress, amount, privateKey } = req.body;
    console.log(`Sending transaction on ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const result = await wallet.sendNative(fromAddress, toAddress, amount, privateKey);
    
    console.log(`Send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction status
app.get('/api/:network/transaction/:txHash', async (req, res) => {
  try {
    const { network, txHash } = req.params;
    console.log(`Getting transaction ${txHash} on ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const transaction = await wallet.getTransactionStatus(txHash);
    
    res.json(transaction);
  } catch (error) {
    console.error(`Transaction status error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= ERC20 TOKEN ROUTES =============

// Get token information
app.post('/api/:network/token/info', async (req, res) => {
  try {
    const { network } = req.params;
    const { tokenAddress } = req.body;
    console.log(`Getting token info on ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const tokenInfo = await wallet.getTokenInfo(tokenAddress);
    
    console.log(`Token info result:`, tokenInfo.success ? '✅ Success' : '❌ Failed');
    res.json(tokenInfo);
  } catch (error) {
    console.error(`Token info error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token balance
app.post('/api/:network/token/balance', async (req, res) => {
  try {
    const { network } = req.params;
    const { walletAddress, tokenAddress } = req.body;
    console.log(`Getting token balance on ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const balance = await wallet.getTokenBalance(walletAddress, tokenAddress);
    
    console.log(`Token balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Token balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send ERC20 tokens
app.post('/api/:network/token/send', async (req, res) => {
  try {
    const { network } = req.params;
    const { fromAddress, toAddress, tokenAddress, amount, privateKey } = req.body;
    console.log(`Sending ERC20 tokens on ${network}...`);
    
    const wallet = new MultiChainWallet(network);
    const result = await wallet.sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey);
    
    console.log(`Token send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Token send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= UTILITY ROUTES =============

// Get MetaMask configuration
app.get('/api/:network/metamask-config', (req, res) => {
  try {
    const { network } = req.params;
    
    const wallet = new MultiChainWallet(network);
    const config = wallet.getMetaMaskConfig();
    
    res.json({
      success: true,
      config: config
    });
  } catch (error) {
    console.error(`MetaMask config error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate address
app.post('/api/validate-address', (req, res) => {
  try {
    const { address } = req.body;
    const wallet = new MultiChainWallet('ethereum_sepolia'); // Any network works for validation
    const isValid = wallet.isValidAddress(address);
    
    res.json({
      success: true,
      address: address,
      isValid: isValid
    });
  } catch (error) {
    console.error('Address validation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Not found:', req.url);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    url: req.url,
    availableEndpoints: '/api/health for full endpoint list'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 MULTI-CHAIN WALLET SERVER STARTED!');
  console.log('='.repeat(70));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Networks Info: http://localhost:${PORT}/api/networks`);
  console.log('');
  console.log('✅ Supported Networks:');
  Object.entries(NETWORKS).forEach(([key, network]) => {
    console.log(`   • ${network.name} (${network.symbol}) - Chain ID: ${network.chainId}`);
  });
  console.log('');
  console.log('🎯 API Endpoints:');
  console.log('   POST /api/{network}/generate');
  console.log('   POST /api/{network}/generate-from-seed');
  console.log('   POST /api/{network}/import');
  console.log('   GET  /api/{network}/balance/:address');
  console.log('   POST /api/{network}/send');
  console.log('   GET  /api/{network}/transaction/:txHash');
  console.log('   GET  /api/{network}/info');
  console.log('   POST /api/{network}/token/info');
  console.log('   POST /api/{network}/token/balance');
  console.log('   POST /api/{network}/token/send');
  console.log('');
  console.log('🔗 Network Keys:');
  console.log('   ethereum_sepolia, polygon_amoy, arbitrum_sepolia,');
  console.log('   cronos_testnet, base_sepolia, bnb_testnet,');
  console.log('   avalanche_fuji, celo_alfajores');
  console.log('');
  console.log('🎉 Ready for multi-chain wallet testing!');
  console.log('='.repeat(70));
});

module.exports = app; 