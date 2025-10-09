// Solana_server.js - Solana Devnet Wallet Server
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting Solana wallet server...');

const app = express();
const PORT = 3003;

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
let SolanaWallet, SOLANA_CONFIG;
try {
  const walletModule = require('./Solana_wallet');
  SolanaWallet = walletModule.SolanaWallet;
  SOLANA_CONFIG = walletModule.SOLANA_CONFIG;
  console.log('✅ Solana wallet module loaded successfully');
} catch (error) {
  console.error('❌ Error loading wallet module:', error.message);
}

const wallet = new SolanaWallet();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Solana wallet server is running!',
    timestamp: new Date().toISOString(),
    network: SOLANA_CONFIG.name
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Solana_frontend.html'));
});

// ============= WALLET GENERATION ROUTES =============

app.post('/api/solana/generate', (req, res) => {
  try {
    console.log(`Generating new Solana wallet...`);
    const result = wallet.generateWallet();
    console.log(`Wallet generated:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Generate error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/solana/generate-from-seed', (req, res) => {
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

app.post('/api/solana/import', (req, res) => {
  try {
    const { privateKey } = req.body;
    console.log(`Importing Solana wallet...`);
    const result = wallet.importFromPrivateKey(privateKey);
    console.log(`Wallet imported:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Import error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BALANCE & INFO ROUTES =============

app.get('/api/solana/balance/:address', async (req, res) => {
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

app.get('/api/solana/faucet', (req, res) => {
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

app.post('/api/solana/send', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, privateKey } = req.body;
    console.log(`Sending SOL transaction...`);
    const result = await wallet.sendSOL(fromAddress, toAddress, amount, privateKey);
    console.log(`Send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/solana/transaction/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    console.log(`Getting transaction ${signature}...`);
    const transaction = await wallet.getTransactionStatus(signature);
    res.json(transaction);
  } catch (error) {
    console.error(`Transaction status error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Airdrop endpoint (Devnet only!)
app.post('/api/solana/airdrop', async (req, res) => {
  try {
    const { address, amount } = req.body;
    console.log(`Requesting airdrop for ${address}...`);
    const result = await wallet.requestAirdrop(address, amount || 1);
    console.log(`Airdrop result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Airdrop error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= SPL TOKEN ROUTES =============

app.post('/api/solana/token/info', async (req, res) => {
  try {
    const { tokenAddress } = req.body;
    console.log(`Getting SPL token info...`);
    const tokenInfo = await wallet.getTokenInfo(tokenAddress);
    console.log(`Token info result:`, tokenInfo.success ? '✅ Success' : '❌ Failed');
    res.json(tokenInfo);
  } catch (error) {
    console.error(`Token info error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/solana/token/balance', async (req, res) => {
  try {
    const { walletAddress, tokenAddress } = req.body;
    console.log(`Getting SPL token balance...`);
    const balance = await wallet.getTokenBalance(walletAddress, tokenAddress);
    console.log(`Token balance result:`, balance.success ? '✅ Success' : '❌ Failed');
    res.json(balance);
  } catch (error) {
    console.error(`Token balance error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/solana/token/send', async (req, res) => {
  try {
    const { fromAddress, toAddress, tokenAddress, amount, privateKey } = req.body;
    console.log(`Sending SPL tokens...`);
    const result = await wallet.sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey);
    console.log(`Token send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Token send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= UTILITY ROUTES =============

app.post('/api/solana/validate-address', (req, res) => {
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
  console.log('\n🚀 SOLANA WALLET SERVER STARTED!');
  console.log('='.repeat(70));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api/solana`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('✅ Network:', SOLANA_CONFIG.name);
  console.log('   Symbol:', SOLANA_CONFIG.symbol);
  console.log('');
  console.log('🎯 API Endpoints:');
  console.log('   POST /api/solana/generate');
  console.log('   POST /api/solana/generate-from-seed');
  console.log('   POST /api/solana/import');
  console.log('   GET  /api/solana/balance/:address');
  console.log('   POST /api/solana/send');
  console.log('   GET  /api/solana/transaction/:signature');
  console.log('   POST /api/solana/airdrop (Devnet only!)');
  console.log('   POST /api/solana/token/info');
  console.log('   POST /api/solana/token/balance');
  console.log('   POST /api/solana/token/send');
  console.log('   POST /api/solana/validate-address');
  console.log('');
  console.log('💎 SPL Token Support Available!');
  console.log('🎉 Ready for Solana devnet operations!');
  console.log('='.repeat(70));
});

module.exports = app; 