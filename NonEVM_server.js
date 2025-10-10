// NonEVM_server.js - Complete Non-EVM Multi-Chain Wallet Server
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting Non-EVM multi-chain wallet server...');

const app = express();
const PORT = 3004;

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
let NonEVMWallet, NETWORKS;
try {
  const walletModule = require('./NonEVM_wallet');
  NonEVMWallet = walletModule.NonEVMWallet;
  NETWORKS = walletModule.NETWORKS;
  console.log('✅ Non-EVM wallet module loaded successfully');
} catch (error) {
  console.error('❌ Error loading wallet module:', error.message);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Non-EVM multi-chain wallet server is running!',
    timestamp: new Date().toISOString(),
    availableNetworks: Object.keys(NETWORKS),
    totalNetworks: Object.keys(NETWORKS).length
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'NonEVM_frontend.html'));
});

// Get all available networks
app.get('/api/networks', (req, res) => {
  try {
    const networks = NonEVMWallet.getAvailableNetworks();
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
    
    const wallet = new NonEVMWallet(network);
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
    
    const wallet = new NonEVMWallet(network);
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
    
    const wallet = new NonEVMWallet(network);
    const result = wallet.importFromPrivateKey(privateKey);
    
    console.log(`Wallet imported:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Import error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BALANCE & INFO ROUTES =============

// Get balance
app.get('/api/:network/balance/:address', async (req, res) => {
  try {
    const { network, address } = req.params;
    console.log(`Checking balance for ${address} on ${network}...`);
    
    const wallet = new NonEVMWallet(network);
    const balance = await wallet.getBalance(address);
    
    console.log(`Balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get UTXOs (Bitcoin/Litecoin only)
app.get('/api/:network/utxos/:address', async (req, res) => {
  try {
    const { network, address } = req.params;
    console.log(`Getting UTXOs for ${address} on ${network}...`);
    
    const wallet = new NonEVMWallet(network);
    const utxos = await wallet.getUTXOs(address);
    
    console.log(`UTXO result:`, utxos.success ? '✅ Success' : '❌ Failed');
    res.json(utxos);
  } catch (error) {
    console.error(`UTXO error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get faucet info
app.get('/api/:network/faucet', (req, res) => {
  try {
    const { network } = req.params;
    
    const wallet = new NonEVMWallet(network);
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
    
    const wallet = new NonEVMWallet(network);
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
    
    const wallet = new NonEVMWallet(network);
    const transaction = await wallet.getTransactionStatus(txHash);
    
    res.json(transaction);
  } catch (error) {
    console.error(`Transaction status error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= TOKEN ROUTES (Tron/Solana only) =============

// Get token information
app.post('/api/:network/token/info', async (req, res) => {
  try {
    const { network } = req.params;
    const { tokenAddress } = req.body;
    console.log(`Getting token info on ${network}...`);
    
    const wallet = new NonEVMWallet(network);
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
    
    const wallet = new NonEVMWallet(network);
    const balance = await wallet.getTokenBalance(walletAddress, tokenAddress);
    
    console.log(`Token balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Token balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send tokens
app.post('/api/:network/token/send', async (req, res) => {
  try {
    const { network } = req.params;
    const { fromAddress, toAddress, tokenAddress, amount, privateKey } = req.body;
    console.log(`Sending tokens on ${network}...`);
    
    const wallet = new NonEVMWallet(network);
    const result = await wallet.sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey);
    
    console.log(`Token send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Token send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= UTILITY ROUTES =============

// Validate address
app.post('/api/:network/validate-address', (req, res) => {
  try {
    const { network } = req.params;
    const { address } = req.body;
    const wallet = new NonEVMWallet(network);
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
  console.log('\n🚀 NON-EVM MULTI-CHAIN WALLET SERVER STARTED!');
  console.log('='.repeat(70));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Networks Info: http://localhost:${PORT}/api/networks`);
  console.log('');
  console.log('✅ Supported Networks:');
  Object.entries(NETWORKS).forEach(([key, network]) => {
    console.log(`   • ${network.name} (${network.symbol}) - Type: ${network.type}`);
  });
  console.log('');
  console.log('🎯 API Endpoints:');
  console.log('   POST /api/{network}/generate');
  console.log('   POST /api/{network}/generate-from-seed');
  console.log('   POST /api/{network}/import');
  console.log('   GET  /api/{network}/balance/:address');
  console.log('   POST /api/{network}/send');
  console.log('   GET  /api/{network}/transaction/:txHash');
  console.log('   GET  /api/{network}/utxos/:address (Bitcoin/Litecoin)');
  console.log('   POST /api/{network}/token/info (Tron/Solana)');
  console.log('   POST /api/{network}/token/balance (Tron/Solana)');
  console.log('   POST /api/{network}/token/send (Tron/Solana)');
  console.log('');
  console.log('🔗 Network Keys:');
  console.log('   bitcoin, litecoin, tron, solana');
  console.log('');
  console.log('🎉 Ready for non-EVM multi-chain wallet testing!');
  console.log('='.repeat(70));
});

module.exports = app; 