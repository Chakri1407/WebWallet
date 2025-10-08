// Litecoin_server.js - Litecoin Testnet Wallet Server
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting Litecoin wallet server...');

const app = express();
const PORT = 3002;

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
let LitecoinWallet, LITECOIN_CONFIG;
try {
  const walletModule = require('./Litecoin_wallet');
  LitecoinWallet = walletModule.LitecoinWallet;
  LITECOIN_CONFIG = walletModule.LITECOIN_CONFIG;
  console.log('✅ Litecoin wallet module loaded successfully');
} catch (error) {
  console.error('❌ Error loading wallet module:', error.message);
}

const wallet = new LitecoinWallet();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Litecoin wallet server is running!',
    timestamp: new Date().toISOString(),
    network: LITECOIN_CONFIG.name
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Litecoin_frontend.html'));
});

// ============= WALLET GENERATION ROUTES =============

app.post('/api/litecoin/generate', (req, res) => {
  try {
    console.log(`Generating new Litecoin wallet...`);
    const result = wallet.generateWallet();
    console.log(`Wallet generated:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Generate error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/litecoin/generate-from-seed', (req, res) => {
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

app.post('/api/litecoin/import', (req, res) => {
  try {
    const { privateKey } = req.body;
    console.log(`Importing Litecoin wallet...`);
    const result = wallet.importFromPrivateKey(privateKey);
    console.log(`Wallet imported:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Import error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BALANCE & INFO ROUTES =============

app.get('/api/litecoin/balance/:address', async (req, res) => {
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

app.get('/api/litecoin/utxos/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`Getting UTXOs for ${address}...`);
    const utxos = await wallet.getUTXOs(address);
    console.log(`UTXO result:`, utxos.success ? '✅ Success' : '❌ Failed');
    res.json(utxos);
  } catch (error) {
    console.error(`UTXO error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/litecoin/faucet', (req, res) => {
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

app.post('/api/litecoin/send', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, privateKey } = req.body;
    console.log(`Sending Litecoin transaction...`);
    const result = await wallet.sendLTC(fromAddress, toAddress, amount, privateKey);
    console.log(`Send result:`, result.success ? '✅ Success' : '❌ Failed');
    res.json(result);
  } catch (error) {
    console.error(`Send error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/litecoin/transaction/:txHash', async (req, res) => {
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

// ============= UTILITY ROUTES =============

app.post('/api/litecoin/validate-address', (req, res) => {
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
  console.log('\n🚀 LITECOIN WALLET SERVER STARTED!');
  console.log('='.repeat(70));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api/litecoin`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('✅ Network:', LITECOIN_CONFIG.name);
  console.log('   Symbol:', LITECOIN_CONFIG.symbol);
  console.log('');
  console.log('🎯 API Endpoints:');
  console.log('   POST /api/litecoin/generate');
  console.log('   POST /api/litecoin/generate-from-seed');
  console.log('   POST /api/litecoin/import');
  console.log('   GET  /api/litecoin/balance/:address');
  console.log('   GET  /api/litecoin/utxos/:address');
  console.log('   POST /api/litecoin/send');
  console.log('   GET  /api/litecoin/transaction/:txHash');
  console.log('   POST /api/litecoin/validate-address');
  console.log('   GET  /api/litecoin/faucet');
  console.log('');
  console.log('⚠️  Note: Litecoin uses UTXO model (no smart contracts/tokens)');
  console.log('🎉 Ready for Litecoin testnet operations!');
  console.log('='.repeat(70));
});

module.exports = app; 