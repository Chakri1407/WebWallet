# 🌐 Multi-Chain Cryptocurrency Wallet

A comprehensive multi-chain cryptocurrency wallet supporting **12 blockchain testnets** across both EVM and Non-EVM networks. Built with Node.js, Express, and vanilla JavaScript.

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Supported Networks](#-supported-networks)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🔐 Wallet Operations
- **Generate**: Create random wallets for any supported network
- **Import**: Import wallets using private keys (auto-format detection)
- **Seed Phrase**: Generate wallets from BIP39 mnemonic phrases
- **Balance Check**: View native currency and token balances
- **Send Transactions**: Transfer native currencies and tokens
- **QR Codes**: Generate QR codes for easy address sharing

### 🪙 Token Support
- **ERC20 Tokens**: Full support on all EVM chains
- **TRC20 Tokens**: Tron token standard support
- **SPL Tokens**: Solana Program Library tokens

### 💰 Additional Features
- **UTXO Management**: View unspent outputs (Bitcoin/Litecoin)
- **Transaction Tracking**: Monitor transaction status
- **Faucet Integration**: Direct links to testnet faucets
- **Network Switching**: Seamless switching between networks
- **Explorer Links**: Direct links to blockchain explorers

---

## 🌐 Supported Networks

### EVM Chains (8 Networks)
| Network | Chain ID | Symbol | Token Standard | Faucet |
|---------|----------|--------|----------------|---------|
| Ethereum Sepolia | 11155111 | ETH | ERC20 | [Sepolia Faucet](https://sepoliafaucet.com/) |
| Polygon Amoy | 80002 | POL | ERC20 | [Polygon Faucet](https://faucet.polygon.technology/) |
| Arbitrum Sepolia | 421614 | ETH | ERC20 | [Arbitrum Faucet](https://faucet.quicknode.com/arbitrum/sepolia) |
| Cronos Testnet | 338 | TCRO | ERC20 | [Cronos Faucet](https://cronos.org/faucet) |
| Base Sepolia | 84532 | ETH | ERC20 | [Base Faucet](https://www.alchemy.com/faucets/base-sepolia) |
| BNB Testnet | 97 | tBNB | ERC20 | [BNB Faucet](https://testnet.bnbchain.org/faucet-smart) |
| Avalanche Fuji | 43113 | AVAX | ERC20 | [Avalanche Faucet](https://core.app/tools/testnet-faucet/) |
| Celo Alfajores | 44787 | CELO | ERC20 | [Celo Faucet](https://faucet.celo.org/alfajores) |

### Non-EVM Chains (4 Networks)
| Network | Type | Symbol | Token Standard | Faucet |
|---------|------|--------|----------------|---------|
| Bitcoin Testnet | UTXO | BTC | None | [Bitcoin Faucet](https://bitcoinfaucet.uo1.net/) |
| Litecoin Testnet | UTXO | tLTC | None | [Litecoin Faucet](https://cypherfaucet.com/ltc-testnet) |
| Tron Shasta | Account | TRX | TRC20 | [Tron Faucet](https://www.trongrid.io/shasta) |
| Solana Devnet | Account | SOL | SPL | [Solana Faucet](https://faucet.solana.com) |

**Total**: **12 Blockchain Networks** | **3 Token Standards** (ERC20, TRC20, SPL)

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                  Multi-Chain Wallet                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │   EVM Chains     │      │  Non-EVM Chains  │       │
│  │   (Port 3000)    │      │   (Port 3004)    │       │
│  ├──────────────────┤      ├──────────────────┤       │
│  │ • Ethereum       │      │ • Bitcoin        │       │
│  │ • Polygon        │      │ • Litecoin       │       │
│  │ • Arbitrum       │      │ • Tron           │       │
│  │ • Cronos         │      │ • Solana         │       │
│  │ • Base           │      │                  │       │
│  │ • BNB            │      │ Token Support:   │       │
│  │ • Avalanche      │      │ • TRC20 (Tron)   │       │
│  │ • Celo           │      │ • SPL (Solana)   │       │
│  │                  │      │                  │       │
│  │ Token: ERC20     │      │ UTXO Support:    │       │
│  └──────────────────┘      │ • Bitcoin        │       │
│                            │ • Litecoin       │       │
│                            └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### File Organization

```
📦 WebWallet
├── 🟦 EVM System (3 files)
│   ├── EVMChains_frontend.html    # Unified EVM frontend
│   ├── EVMChains_server.js        # EVM API server (Port 3000)
│   └── EVMChains_wallet.js        # Multi-chain EVM wallet logic
│
├── 🟧 Non-EVM System (3 files)
│   ├── NonEVM_frontend.html       # Unified Non-EVM frontend
│   ├── NonEVM_server.js           # Non-EVM API server (Port 3004)
│   └── NonEVM_wallet.js           # Multi-chain Non-EVM wallet logic
│
├── 📄 Configuration
│   ├── package.json               # Dependencies & scripts
│   └── README.md                  # This file
│
└── 📁 node_modules                # Installed dependencies
```

**Total**: **6 core files** managing **12 blockchain networks**

---

## 📥 Installation

### Prerequisites

- **Node.js**: v14.0.0 or higher
- **npm**: v6.0.0 or higher
- **Git**: For cloning the repository

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd WebWallet
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `ethers` - Ethereum library
- `bitcoinjs-lib` - Bitcoin library
- `tronweb` - Tron library
- `@solana/web3.js` - Solana library
- `@solana/spl-token` - Solana token library
- `bip39` - Mnemonic phrase generation
- `bip32` - HD wallet derivation
- `axios` - HTTP client
- And more...

### Step 3: Verify Installation

```bash
node --version    # Should be v14+
npm --version     # Should be v6+
```

---

## 🚀 Usage

### Starting the Servers

#### Option 1: EVM Chains Only

```bash
npm run start-evm
# or
node EVMChains_server.js
```

Access at: **http://localhost:3000**

#### Option 2: Non-EVM Chains Only

```bash
npm run start-non-evm
# or
node NonEVM_server.js
```

Access at: **http://localhost:3004**

#### Option 3: Both Systems (Recommended)

Open two terminal windows:

**Terminal 1: EVM Chains**
```bash
npm run start-evm
```

**Terminal 2: Non-EVM Chains**
```bash
npm run start-non-evm
```

Access:
- EVM Chains: **http://localhost:3000**
- Non-EVM Chains: **http://localhost:3004**

---

## 📖 API Documentation

### EVM Chains API (Port 3000)

#### Base URL
```
http://localhost:3000/api
```

#### Endpoints

**Get All Networks**
```http
GET /api/networks
```

**Generate Wallet**
```http
POST /api/{network}/generate

# Example
POST /api/ethereum_sepolia/generate
```

**Generate from Seed**
```http
POST /api/{network}/generate-from-seed
Content-Type: application/json

{
  "mnemonic": "word1 word2 ... word12"  // Optional
}
```

**Import Wallet**
```http
POST /api/{network}/import
Content-Type: application/json

{
  "privateKey": "0x..."
}
```

**Get Balance**
```http
GET /api/{network}/balance/{address}

# Example
GET /api/polygon_amoy/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
```

**Send Transaction**
```http
POST /api/{network}/send
Content-Type: application/json

{
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "amount": 0.1,
  "privateKey": "0x..."
}
```

**Get Token Info (ERC20)**
```http
POST /api/{network}/token/info
Content-Type: application/json

{
  "tokenAddress": "0x..."
}
```

**Get Token Balance**
```http
POST /api/{network}/token/balance
Content-Type: application/json

{
  "walletAddress": "0x...",
  "tokenAddress": "0x..."
}
```

**Send ERC20 Tokens**
```http
POST /api/{network}/token/send
Content-Type: application/json

{
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "tokenAddress": "0x...",
  "amount": 10,
  "privateKey": "0x..."
}
```

**Network Keys**: `ethereum_sepolia`, `polygon_amoy`, `arbitrum_sepolia`, `cronos_testnet`, `base_sepolia`, `bnb_testnet`, `avalanche_fuji`, `celo_alfajores`

---

### Non-EVM Chains API (Port 3004)

#### Base URL
```
http://localhost:3004/api
```

#### Endpoints

**Get All Networks**
```http
GET /api/networks
```

**Generate Wallet**
```http
POST /api/{network}/generate

# Examples
POST /api/bitcoin/generate
POST /api/solana/generate
```

**Generate from Seed**
```http
POST /api/{network}/generate-from-seed
Content-Type: application/json

{
  "mnemonic": "word1 word2 ... word12"  // Optional
}
```

**Import Wallet**
```http
POST /api/{network}/import
Content-Type: application/json

{
  "privateKey": "..."  // Format depends on network
}
```

**Get Balance**
```http
GET /api/{network}/balance/{address}

# Examples
GET /api/bitcoin/balance/mYourBitcoinAddress
GET /api/tron/balance/TYourTronAddress
```

**Send Transaction**
```http
POST /api/{network}/send
Content-Type: application/json

{
  "fromAddress": "...",
  "toAddress": "...",
  "amount": 0.001,
  "privateKey": "..."
}
```

**Get UTXOs (Bitcoin/Litecoin only)**
```http
GET /api/{network}/utxos/{address}

# Example
GET /api/bitcoin/utxos/mYourBitcoinAddress
```

**Get Token Info (Tron TRC20 / Solana SPL)**
```http
POST /api/{network}/token/info
Content-Type: application/json

{
  "tokenAddress": "..."
}
```

**Get Token Balance**
```http
POST /api/{network}/token/balance
Content-Type: application/json

{
  "walletAddress": "...",
  "tokenAddress": "..."
}
```

**Send Tokens**
```http
POST /api/{network}/token/send
Content-Type: application/json

{
  "fromAddress": "...",
  "toAddress": "...",
  "tokenAddress": "...",
  "amount": 10,
  "privateKey": "..."
}
```

**Network Keys**: `bitcoin`, `litecoin`, `tron`, `solana`

---

## 📁 Project Structure

### Detailed File Breakdown

#### EVMChains_frontend.html
- Network selector grid for 8 EVM chains
- Tabbed interface (Generate, Import, Receive, Send, Tokens)
- QR code generation
- Balance display
- Token operations UI
- Real-time transaction feedback

#### EVMChains_server.js
- Express server on port 3000
- Route handling for all EVM operations
- Network switching logic
- Error handling middleware
- CORS configuration

#### EVMChains_wallet.js
- `MultiChainWallet` class
- Wallet generation (random/seed/import)
- Transaction management
- ERC20 token interactions
- Balance queries
- Network configurations for 8 chains

#### NonEVM_frontend.html
- Network selector for 4 non-EVM chains
- Dynamic tab display (UTXO/Token tabs based on network)
- Private key format labels (WIF/Hex/Base58/Base64)
- Network-specific UI adjustments
- Token standard labels (TRC20/SPL)

#### NonEVM_server.js
- Express server on port 3004
- Routing for Bitcoin, Litecoin, Tron, Solana
- UTXO endpoint handling
- Token operation routing
- Network-specific logic routing

#### NonEVM_wallet.js
- `NonEVMWallet` class
- Bitcoin UTXO management
- Litecoin operations
- Tron TRC20 implementation
- Solana SPL token support
- Format auto-detection
- Network-specific transaction building

---

## 🧪 Testing

### Quick Test Workflow

#### EVM Chains (Ethereum Sepolia Example)

1. **Start Server**
   ```bash
   npm run start-evm
   ```

2. **Open Browser**: http://localhost:3000

3. **Select Network**: Click "Ethereum Sepolia"

4. **Generate Wallet**: Click "Generate Random Wallet"

5. **Get Test ETH**: 
   - Copy your address
   - Visit https://sepoliafaucet.com/
   - Request test ETH

6. **Check Balance**: Click "Check Balance"

7. **Send Transaction**:
   - Go to "Send" tab
   - Enter recipient address
   - Enter amount (e.g., 0.01)
   - Click "Send"

8. **Test ERC20 Token**:
   - Go to "ERC20 Tokens" tab
   - Enter a test token contract address
   - Click "Get Token Info"
   - Check balance and test token transfer

#### Non-EVM Chains (Solana Example)

1. **Start Server**
   ```bash
   npm run start-non-evm
   ```

2. **Open Browser**: http://localhost:3004

3. **Select Network**: Click "Solana Devnet"

4. **Generate Wallet**: Click "Generate Random Wallet"

5. **Get Test SOL**:
   - Copy your address
   - Visit https://faucet.solana.com
   - Request test SOL

6. **Check Balance**: Click "Check Balance"

7. **Send Transaction**:
   - Go to "Send" tab
   - Enter recipient address
   - Enter amount (e.g., 0.1)
   - Click "Send SOL"

8. **Test SPL Token**:
   - Go to "SPL Tokens" tab
   - Enter SPL token mint address
   - Test token operations

### Testing Checklist

#### EVM Chains
- [ ] Test all 8 networks (Ethereum, Polygon, Arbitrum, etc.)
- [ ] Generate wallet on each network
- [ ] Import wallet using private key
- [ ] Generate from seed phrase
- [ ] Check native currency balance
- [ ] Send native currency transaction
- [ ] Get ERC20 token info
- [ ] Check ERC20 token balance
- [ ] Send ERC20 tokens
- [ ] Verify transaction on explorer

#### Non-EVM Chains
- [ ] Bitcoin: Generate, import, check balance, view UTXOs, send BTC
- [ ] Litecoin: Generate, import, check balance, view UTXOs, send LTC
- [ ] Tron: Generate, import, send TRX, test TRC20 tokens
- [ ] Solana: Generate, import, send SOL, test SPL tokens

---

## 🔒 Security

### ⚠️ IMPORTANT WARNINGS

1. **TESTNET ONLY**: This project is designed for TESTNET use only
2. **NEVER USE ON MAINNET**: Do not use with real funds
3. **PRIVATE KEYS**: Private keys are displayed in plain text for testing purposes
4. **NO PRODUCTION USE**: Not suitable for production without significant security enhancements

### Security Best Practices (For Production)

```javascript
// ❌ DON'T: Store private keys in plain text
const privateKey = "0x1234...";

// ✅ DO: Use environment variables
const privateKey = process.env.PRIVATE_KEY;

// ❌ DON'T: Send private keys to server
fetch('/api/send', { 
  body: JSON.stringify({ privateKey: pk }) 
});

// ✅ DO: Sign transactions client-side
const signedTx = await wallet.signTransaction(tx);
fetch('/api/broadcast', { 
  body: JSON.stringify({ signedTx }) 
});
```

### Recommended Security Measures

1. **Environment Variables**: Use `.env` files for sensitive data
2. **HTTPS**: Use SSL/TLS in production
3. **Authentication**: Implement user authentication
4. **Rate Limiting**: Prevent API abuse
5. **Input Validation**: Validate all user inputs
6. **Error Handling**: Don't expose sensitive information in errors
7. **Key Management**: Use hardware wallets or secure key storage
8. **Audit Logs**: Track all transactions and operations

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: "Failed to load networks"
**Symptom**: Frontend shows error message  
**Solution**:
```bash
# Check if server is running
netstat -an | grep 3000  # For EVM
netstat -an | grep 3004  # For Non-EVM

# Restart server
npm run start-evm
```

#### Issue 2: "Port already in use"
**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`  
**Solution**:
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in server file
```

#### Issue 3: "Insufficient balance"
**Symptom**: Transaction fails with insufficient balance error  
**Solution**:
1. Visit network faucet
2. Request test tokens
3. Wait for confirmation
4. Check balance again

#### Issue 4: "Invalid private key format"
**Symptom**: Import fails  
**Solution**:
- **Bitcoin/Litecoin**: Use WIF format (starts with 'c' for testnet)
- **EVM**: Use hex format (starts with '0x' or 64 characters)
- **Tron**: Use hex format (64 characters, no '0x')
- **Solana**: Use Base58 or Base64 format

#### Issue 5: "No UTXOs available"
**Symptom**: Can't send Bitcoin/Litecoin  
**Solution**:
1. Get coins from faucet first
2. Wait for transaction to confirm
3. Check UTXOs tab to verify

#### Issue 6: "Token not found"
**Symptom**: Token operations fail  
**Solution**:
- Verify token contract address
- Ensure token exists on selected network
- Check if token is deployed on testnet

### Debug Mode

Enable detailed logging:

```javascript
// In server files
const DEBUG = true;

if (DEBUG) {
  console.log('Request:', req.body);
  console.log('Response:', response);
}
```

### Network Connectivity Issues

```bash
# Test RPC endpoints
curl https://ethereum-sepolia-rpc.publicnode.com
curl https://api.devnet.solana.com
curl https://api.shasta.trongrid.io
```

---

## 💻 Development

### Adding a New EVM Network

Edit `EVMChains_wallet.js`:

```javascript
const NETWORKS = {
  // ... existing networks
  
  new_evm_network: {
    name: 'New Network Testnet',
    chainId: 12345,
    symbol: 'NEW',
    decimals: 18,
    rpcUrl: 'https://testnet-rpc.newnetwork.com',
    explorerUrl: 'https://testnet.newscan.com',
    faucets: ['https://faucet.newnetwork.com']
  }
};
```

### Adding a New Non-EVM Network

Edit `NonEVM_wallet.js`:

```javascript
const NETWORKS = {
  // ... existing networks
  
  new_network: {
    name: 'New Network Testnet',
    type: 'Account', // or 'UTXO'
    symbol: 'NEW',
    decimals: 18,
    rpcUrl: 'https://testnet-rpc.newnetwork.com',
    explorerUrl: 'https://testnet-explorer.newnetwork.com',
    faucets: ['https://faucet.newnetwork.com']
  }
};
```

### Running in Development Mode

```bash
# Install nodemon for auto-restart
npm install -g nodemon

# Run with auto-restart
nodemon EVMChains_server.js
nodemon NonEVM_server.js
```

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use async/await for asynchronous operations
- Add comments for complex logic
- Handle errors gracefully

---

## 📊 Performance

### Transaction Speed Comparison

| Network | Average Confirmation Time |
|---------|--------------------------|
| Solana | ~0.4 seconds |
| Tron | ~3 seconds |
| Base | ~2 seconds |
| Polygon | ~2-5 seconds |
| Arbitrum | ~1-2 seconds |
| Avalanche | ~1-2 seconds |
| BNB | ~3 seconds |
| Ethereum | ~12 seconds |
| Celo | ~5 seconds |
| Cronos | ~6 seconds |
| Litecoin | ~2.5 minutes |
| Bitcoin | ~10 minutes |

### Optimization Tips

1. **Batch Requests**: Group multiple balance checks
2. **Caching**: Cache network information
3. **Connection Pooling**: Reuse RPC connections
4. **Error Retry**: Implement exponential backoff

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines

- Write clear commit messages
- Add tests for new features
- Update documentation
- Follow existing code style
- Test on multiple networks

---

## 📜 License

This project is licensed under the ISC License.

---

## 📞 Support

For issues, questions, or contributions:

1. Check this README
2. Review [Troubleshooting](#-troubleshooting) section
3. Check console logs for errors
4. Open an issue on GitHub

---

## 🙏 Acknowledgments

- **Ethereum Foundation** - For EVM standards
- **Bitcoin Core** - For Bitcoin protocol
- **Litecoin Foundation** - For Litecoin development
- **Tron Foundation** - For Tron blockchain
- **Solana Labs** - For Solana development
- **OpenZeppelin** - For token standards
- All the amazing open-source contributors

---

## 📈 Roadmap

### Current Version (v3.0.0)
- [x] 8 EVM chains support
- [x] 4 Non-EVM chains support
- [x] Token support (ERC20, TRC20, SPL)
- [x] UTXO management
- [x] QR code generation

### Future Plans
- [ ] Mainnet support (with proper security)
- [ ] Transaction history
- [ ] Multi-signature wallets
- [ ] Hardware wallet integration
- [ ] Mobile responsive design
- [ ] Dark mode
- [ ] More networks (Cosmos, Polkadot, etc.)
- [ ] Advanced token features (approval, swap)
- [ ] NFT support

---

## 📚 Additional Resources

### Documentation Links

- **Ethereum**: https://ethereum.org/developers
- **Bitcoin**: https://developer.bitcoin.org/
- **Litecoin**: https://litecoin.info/
- **Tron**: https://developers.tron.network/
- **Solana**: https://docs.solana.com/
- **Web3**: https://web3js.readthedocs.io/

### Learning Resources

- **Blockchain Basics**: https://www.blockchain.com/learning-portal/
- **Smart Contracts**: https://docs.soliditylang.org/
- **Crypto Wallets**: https://academy.binance.com/en/articles/crypto-wallet-types-explained

---

## 🎯 Quick Start Summary

```bash
# 1. Install
npm install

# 2. Start EVM Server (Terminal 1)
npm run start-evm

# 3. Start Non-EVM Server (Terminal 2)
npm run start-non-evm

# 4. Access
# EVM: http://localhost:3000
# Non-EVM: http://localhost:3004

# 5. Test
# - Select network
# - Generate wallet
# - Get test tokens from faucet
# - Test transactions
```

---

**Made with ❤️ for the blockchain community**

**Version**: 3.0.0  
**Last Updated**: 2025  
**Status**: Active Development - Testnet Only

--- 