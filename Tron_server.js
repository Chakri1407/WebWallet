// Tron_server.js - Tron Testnet Wallet Server
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting Tron wallet server...');

const app = express();
const PORT = 3001;

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
let TronWallet, TRON_CONFIG;
try {
  const walletModule = require('./Tron_wallet');
  TronWallet = walletModule.TronWallet;
  TRON_CONFIG = walletModule.TRON_CONFIG;
  console.log('✅ Tron wallet module loaded successfully');
} catch (error) {
  console.error('❌ Error loading wallet module:', error.message);
}

const wallet = new TronWallet();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Tron wallet server is running!',
    timestamp: new Date().toISOString(),
    network: TRON_CONFIG.name,
    chainId: TRON_CONFIG.chainId
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Tron_frontend.html'));
});

// ============= WALLET GENERATION ROUTES =============

app.post('/api/tron/generate', (req, res) => {
  try {
    console.log(`Generating new Tron wallet...`);
    const result = wallet.generateWallet();
    console.log(`Wallet generated:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Generate error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tron/generate-from-seed', (req, res) => {
  try {
    const { mnemonic } = req.body;
    console.log(`Generating wallet from seed...`);
    const result = wallet.generateFromSeed(mnemonic);
    console.log(`Seed wallet generated:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Seed generate error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tron/import', (req, res) => {
  try {
    const { privateKey } = req.body;
    console.log(`Importing Tron wallet...`);
    const result = wallet.importFromPrivateKey(privateKey);
    console.log(`Wallet imported:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Import error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BALANCE & INFO ROUTES =============

app.get('/api/tron/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`Checking balance for ${address}...`);
    const balance = await wallet.getBalance(address);
    console.log(`Balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tron/faucet', (req, res) => {
  try {
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

app.post('/api/tron/send', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, privateKey } = req.body;
    console.log(`Sending TRX transaction...`);
    const result = await wallet.sendTRX(fromAddress, toAddress, amount, privateKey);
    console.log(`Send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tron/transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    console.log(`Getting transaction ${txHash}...`);
    const transaction = await wallet.getTransactionStatus(txHash);
    res.json(transaction);
  } catch (error) {
    console.error(`Transaction status error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= TRC20 TOKEN ROUTES =============

app.post('/api/tron/token/info', async (req, res) => {
  try {
    const { tokenAddress } = req.body;
    console.log(`Getting TRC20 token info...`);
    const tokenInfo = await wallet.getTokenInfo(tokenAddress);
    console.log(`Token info result:`, tokenInfo.success ? '✅ Success' : '❌ Failed');
    res.json(tokenInfo);
  } catch (error) {
    console.error(`Token info error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tron/token/balance', async (req, res) => {
  try {
    const { walletAddress, tokenAddress } = req.body;
    console.log(`Getting TRC20 token balance...`);
    const balance = await wallet.getTokenBalance(walletAddress, tokenAddress);
    console.log(`Token balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Token balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tron/token/send', async (req, res) => {
  try {
    const { fromAddress, toAddress, tokenAddress, amount, privateKey } = req.body;
    console.log(`Sending TRC20 tokens...`);
    const result = await wallet.sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey);
    console.log(`Token send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Token send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= UTILITY ROUTES =============

app.post('/api/tron/validate-address', (req, res) => {
  try {
    const { address } = req.body;
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
    url: req.url
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 TRON WALLET SERVER STARTED!');
  console.log('='.repeat(70));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api/tron`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('✅ Network:', TRON_CONFIG.name);
  console.log('   Chain ID:', TRON_CONFIG.chainId);
  console.log('   Symbol:', TRON_CONFIG.symbol);
  console.log('');
  console.log('🎯 API Endpoints:');
  console.log('   POST /api/tron/generate');
  console.log('   POST /api/tron/generate-from-seed');
  console.log('   POST /api/tron/import');
  console.log('   GET  /api/tron/balance/:address');
  console.log('   POST /api/tron/send');
  console.log('   GET  /api/tron/transaction/:txHash');
  console.log('   POST /api/tron/token/info');
  console.log('   POST /api/tron/token/balance');
  console.log('   POST /api/tron/token/send');
  console.log('   POST /api/tron/validate-address');
  console.log('');
  console.log('💎 TRC20 Token Support Available!');
  console.log('🎉 Ready for Tron testnet operations!');
  console.log('='.repeat(70));
});

module.exports = app; 