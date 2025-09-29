// complete_server.js - Complete Multi-Chain Wallet Server
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting complete multi-chain wallet server...');

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

// Initialize wallet classes
let BitcoinWallet, CronosWallet;
try {
  BitcoinWallet = require('./bitcoin_wallet');
  CronosWallet = require('./cronos_wallet');
  console.log('Wallet classes loaded successfully');
} catch (error) {
  console.error('Error loading wallet classes:', error.message);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Multi-chain wallet server is running!',
    timestamp: new Date().toISOString(),
    wallets: {
      bitcoin: BitcoinWallet ? 'Ready' : 'Error',
      cronos: CronosWallet ? 'Ready' : 'Error'
    }
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'wallet_frontend.html'));
});

// ============= BITCOIN API ROUTES =============

// Generate new Bitcoin wallet
app.post('/api/bitcoin/generate', (req, res) => {
  try {
    console.log('Generating new Bitcoin wallet...');
    const btcWallet = new BitcoinWallet();
    const wallet = btcWallet.generateWallet();
    console.log('Bitcoin wallet generated:', wallet.success ? 'Success' : 'Failed');
    res.json(wallet);
  } catch (error) {
    console.error('Bitcoin generate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Bitcoin wallet from seed
app.post('/api/bitcoin/generate-from-seed', (req, res) => {
  try {
    console.log('Generating Bitcoin wallet from seed...');
    const { mnemonic } = req.body;
    const btcWallet = new BitcoinWallet();
    const wallet = btcWallet.generateFromSeed(mnemonic);
    console.log('Bitcoin seed wallet generated:', wallet.success ? 'Success' : 'Failed');
    res.json(wallet);
  } catch (error) {
    console.error('Bitcoin seed generate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import Bitcoin wallet from private key
app.post('/api/bitcoin/import', (req, res) => {
  try {
    console.log('Importing Bitcoin wallet...');
    const { privateKey } = req.body;
    const btcWallet = new BitcoinWallet();
    const wallet = btcWallet.importFromPrivateKey(privateKey);
    console.log('Bitcoin wallet imported:', wallet.success ? 'Success' : 'Failed');
    res.json(wallet);
  } catch (error) {
    console.error('Bitcoin import error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Bitcoin balance
app.get('/api/bitcoin/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Checking Bitcoin balance for:', address);
    const btcWallet = new BitcoinWallet();
    const balance = await btcWallet.getBalance(address);
    console.log('Bitcoin balance result:', balance);
    res.json(balance);
  } catch (error) {
    console.error('Bitcoin balance error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send Bitcoin
app.post('/api/bitcoin/send', async (req, res) => {
  try {
    console.log('Sending Bitcoin transaction...');
    const { fromAddress, toAddress, amount, privateKey } = req.body;
    const btcWallet = new BitcoinWallet();
    const result = await btcWallet.sendBitcoin(fromAddress, toAddress, amount, privateKey);
    console.log('Bitcoin send result:', result.success ? 'Success' : 'Failed');
    res.json(result);
  } catch (error) {
    console.error('Bitcoin send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Bitcoin transaction status
app.get('/api/bitcoin/transaction/:txid', async (req, res) => {
  try {
    const { txid } = req.params;
    console.log('Getting Bitcoin transaction:', txid);
    const btcWallet = new BitcoinWallet();
    const transaction = await btcWallet.getTransactionStatus(txid);
    res.json(transaction);
  } catch (error) {
    console.error('Bitcoin transaction error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bitcoin test endpoint
app.post('/api/bitcoin/test', (req, res) => {
  try {
    console.log('Testing Bitcoin wallet...');
    const btcWallet = new BitcoinWallet();
    const wallet = btcWallet.generateWallet();
    res.json({ success: true, wallet });
  } catch (error) {
    console.error('Bitcoin test error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// ============= CRONOS API ROUTES =============

// Generate new Cronos wallet
app.post('/api/cronos/generate', (req, res) => {
  try {
    console.log('Generating new Cronos wallet...');
    const cronosWallet = new CronosWallet();
    const wallet = cronosWallet.generateWallet();
    console.log('Cronos wallet generated:', wallet.success ? 'Success' : 'Failed');
    res.json(wallet);
  } catch (error) {
    console.error('Cronos generate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Cronos wallet from seed
app.post('/api/cronos/generate-from-seed', (req, res) => {
  try {
    console.log('Generating Cronos wallet from seed...');
    const { mnemonic } = req.body;
    const cronosWallet = new CronosWallet();
    const wallet = cronosWallet.generateFromSeed(mnemonic);
    console.log('Cronos seed wallet generated:', wallet.success ? 'Success' : 'Failed');
    res.json(wallet);
  } catch (error) {
    console.error('Cronos seed generate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import Cronos wallet from private key
app.post('/api/cronos/import', (req, res) => {
  try {
    console.log('Importing Cronos wallet...');
    const { privateKey } = req.body;
    const cronosWallet = new CronosWallet();
    const wallet = cronosWallet.importFromPrivateKey(privateKey);
    console.log('Cronos wallet imported:', wallet.success ? 'Success' : 'Failed');
    res.json(wallet);
  } catch (error) {
    console.error('Cronos import error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Cronos balance
app.get('/api/cronos/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Checking Cronos balance for:', address);
    const cronosWallet = new CronosWallet();
    const balance = await cronosWallet.getBalance(address);
    console.log('Cronos balance result:', balance);
    res.json(balance);
  } catch (error) {
    console.error('Cronos balance error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send CRO
app.post('/api/cronos/send', async (req, res) => {
  try {
    console.log('Sending CRO transaction...');
    const { fromAddress, toAddress, amount, privateKey } = req.body;
    const cronosWallet = new CronosWallet();
    const result = await cronosWallet.sendCRO(fromAddress, toAddress, amount, privateKey);
    console.log('CRO send result:', result.success ? 'Success' : 'Failed');
    res.json(result);
  } catch (error) {
    console.error('CRO send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Cronos transaction status
app.get('/api/cronos/transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    console.log('Getting Cronos transaction:', txHash);
    const cronosWallet = new CronosWallet();
    const transaction = await cronosWallet.getTransactionStatus(txHash);
    res.json(transaction);
  } catch (error) {
    console.error('Cronos transaction error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Cronos network info
app.get('/api/cronos/network', async (req, res) => {
  try {
    console.log('Getting Cronos network info...');
    const cronosWallet = new CronosWallet();
    const networkInfo = await cronosWallet.getNetworkInfo();
    res.json(networkInfo);
  } catch (error) {
    console.error('Cronos network error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cronos test endpoint
app.post('/api/cronos/test', (req, res) => {
  try {
    console.log('Testing Cronos wallet...');
    const cronosWallet = new CronosWallet();
    const wallet = cronosWallet.generateWallet();
    res.json({ success: true, wallet });
  } catch (error) {
    console.error('Cronos test error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Add Bitcoin balance endpoint
app.get('/api/bitcoin/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Checking Bitcoin balance for:', address);
    const BitcoinWallet = require('./bitcoin_wallet');
    const btcWallet = new BitcoinWallet();
    const balance = await btcWallet.getBalance(address);
    console.log('Bitcoin balance result:', balance);
    res.json(balance);
  } catch (error) {
    console.error('Bitcoin balance error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add Cronos balance endpoint
app.get('/api/cronos/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Checking Cronos balance for:', address);
    const CronosWallet = require('./cronos_wallet');
    const cronosWallet = new CronosWallet();
    const balance = await cronosWallet.getBalance(address);
    console.log('Cronos balance result:', balance);
    res.json(balance);
  } catch (error) {
    console.error('Cronos balance error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}); 

// ============= UTILITY ROUTES =============

// Get supported networks
app.get('/api/networks', (req, res) => {
  res.json({
    success: true,
    networks: {
      bitcoin: {
        name: 'Bitcoin Testnet',
        type: 'UTXO',
        symbol: 'BTC',
        decimals: 8,
        explorer: 'https://blockstream.info/testnet/',
        faucets: [
          'https://bitcoinfaucet.uo1.net/',
          'https://testnet-faucet.mempool.co/',
          'https://coinfaucet.eu/en/btc-testnet/'
        ]
      },
      cronos: {
        name: 'Cronos Testnet',
        type: 'EVM',
        symbol: 'CRO', 
        decimals: 18,
        chainId: 338,
        rpcUrl: 'https://evm-t3.cronos.org',
        explorer: 'https://testnet.cronoscan.com/',
        faucet: {
          url: 'https://cronos.org/faucet',
          amount: '100 CRO per request',
          cooldown: '24 hours'
        }
      }
    }
  });
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
  console.log('\n🚀 COMPLETE MULTI-CHAIN WALLET SERVER STARTED!');
  console.log('=' .repeat(60));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Networks Info: http://localhost:${PORT}/api/networks`);
  console.log('');
  console.log('✅ Available Operations:');
  console.log('   🟠 Bitcoin Testnet:');
  console.log('      • Generate wallets (random/seed/import)');
  console.log('      • Check balances');
  console.log('      • Send transactions');
  console.log('      • Monitor transaction status');
  console.log('');
  console.log('   🔵 Cronos Testnet:');
  console.log('      • Generate wallets (random/seed/import)');
  console.log('      • Check CRO balances');
  console.log('      • Send CRO transactions');
  console.log('      • Network information');
  console.log('');
  console.log('🎯 API Endpoints Ready:');
  console.log('   POST /api/bitcoin/generate');
  console.log('   POST /api/bitcoin/generate-from-seed');
  console.log('   POST /api/bitcoin/import');
  console.log('   GET  /api/bitcoin/balance/:address');
  console.log('   POST /api/bitcoin/send');
  console.log('   GET  /api/bitcoin/transaction/:txid');
  console.log('');
  console.log('   POST /api/cronos/generate');
  console.log('   POST /api/cronos/generate-from-seed');
  console.log('   POST /api/cronos/import');
  console.log('   GET  /api/cronos/balance/:address');
  console.log('   POST /api/cronos/send');
  console.log('   GET  /api/cronos/transaction/:txHash');
  console.log('   GET  /api/cronos/network');
  console.log('');
  console.log('🔗 Faucets:');
  console.log('   Bitcoin: https://bitcoinfaucet.uo1.net/');
  console.log('   Cronos: https://cronos.org/faucet');
  console.log('');
  console.log('🎉 Ready for multi-chain wallet testing!');
  console.log('=' .repeat(60));
});

module.exports = app; 