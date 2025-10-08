# Multi-Chain Crypto Wallet

A comprehensive multi-chain cryptocurrency wallet supporting **EVM chains**, **Tron**, and **Litecoin** testnets.

## 🌐 Supported Networks

### EVM Chains (Port 3000)
All EVM chains support **ERC20 tokens**:
- ✅ Ethereum Sepolia
- ✅ Polygon Amoy
- ✅ Arbitrum Sepolia
- ✅ Cronos Testnet
- ✅ Base Sepolia
- ✅ BNB Smart Chain Testnet
- ✅ Avalanche Fuji
- ✅ Celo Alfajores

### Tron Network (Port 3001)
- ✅ Tron Shasta Testnet
- ✅ **TRC20 Token Support** (Tron's equivalent of ERC20)

### Litecoin Network (Port 3002)
- ✅ Litecoin Testnet
- ❌ **No Token Support** (UTXO-based chain, no smart contracts)

---

## 📦 Installation

```bash
# Install dependencies
npm install

# Additional dependencies for Tron
npm install tronweb
```

---

## 🚀 Running the Servers

### Start EVM Chains Server
```bash
npm start
# or
node EVMChains_server.js
# Runs on: http://localhost:3000
```

### Start Tron Server
```bash
npm run start-tron
# or
node Tron_server.js
# Runs on: http://localhost:3001
```

### Start Litecoin Server
```bash
npm run start-litecoin
# or
node Litecoin_server.js
# Runs on: http://localhost:3002
```

---

## 🔑 Key Differences

| Feature | EVM Chains | Tron | Litecoin |
|---------|-----------|------|----------|
| **Token Standard** | ERC20 ✅ | TRC20 ✅ | None ❌ |
| **Smart Contracts** | Yes ✅ | Yes ✅ | No ❌ |
| **Address Format** | 0x... | T... | m/n... |
| **Transaction Model** | Account | Account | UTXO |
| **Gas/Fees** | Gas (Gwei) | Energy/Bandwidth | Satoshis/byte |

---

## 📝 API Endpoints

### Common Endpoints (All Networks)

```javascript
// Generate new wallet
POST /api/{network}/generate

// Generate from seed phrase
POST /api/{network}/generate-from-seed
Body: { "mnemonic": "optional seed phrase" }

// Import from private key
POST /api/{network}/import
Body: { "privateKey": "your-private-key" }

// Check balance
GET /api/{network}/balance/:address

// Send native currency
POST /api/{network}/send
Body: {
  "fromAddress": "...",
  "toAddress": "...",
  "amount": 1.5,
  "privateKey": "..."
}

// Get transaction status
GET /api/{network}/transaction/:txHash

// Get faucet info
GET /api/{network}/faucet
```

### Token Endpoints (EVM + Tron Only)

```javascript
// Get token information
POST /api/{network}/token/info
Body: { "tokenAddress": "0x..." }  // or "T..." for Tron

// Check token balance
POST /api/{network}/token/balance
Body: {
  "walletAddress": "...",
  "tokenAddress": "..."
}

// Send tokens
POST /api/{network}/token/send
Body: {
  "fromAddress": "...",
  "toAddress": "...",
  "tokenAddress": "...",
  "amount": 10,
  "privateKey": "..."
}
```

### Litecoin Specific

```javascript
// Get UTXOs (Litecoin only)
GET /api/litecoin/utxos/:address
```

---

## 🎯 Network Keys for EVM Chains

Use these keys in the URL path:
- `ethereum_sepolia`
- `polygon_amoy`
- `arbitrum_sepolia`
- `cronos_testnet`
- `base_sepolia`
- `bnb_testnet`
- `avalanche_fuji`
- `celo_alfajores`

**Example:** `http://localhost:3000/api/ethereum_sepolia/generate`

---

## 💡 Usage Examples

### EVM Chain (with ERC20)
```javascript
// Generate wallet on Ethereum Sepolia
POST http://localhost:3000/api/ethereum_sepolia/generate

// Check ERC20 token balance
POST http://localhost:3000/api/ethereum_sepolia/token/balance
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "tokenAddress": "0x7af963cF6D228E564e2A0aA0DdBF06210B38615D"
}

// Send ERC20 tokens
POST http://localhost:3000/api/ethereum_sepolia/token/send
{
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "tokenAddress": "0x...",
  "amount": 100,
  "privateKey": "0x..."
}
```

### Tron (with TRC20)
```javascript
// Generate wallet on Tron
POST http://localhost:3001/api/tron/generate

// Check TRC20 token balance
POST http://localhost:3001/api/tron/token/balance
{
  "walletAddress": "TYourTronAddress...",
  "tokenAddress": "TTokenContractAddress..."
}

// Send TRC20 tokens
POST http://localhost:3001/api/tron/token/send
{
  "fromAddress": "T...",
  "toAddress": "T...",
  "tokenAddress": "T...",
  "amount": 50,
  "privateKey": "..."
}
```

### Litecoin (No Tokens)
```javascript
// Generate wallet on Litecoin
POST http://localhost:3002/api/litecoin/generate

// Send LTC (no token support)
POST http://localhost:3002/api/litecoin/send
{
  "fromAddress": "mYourLitecoinAddress...",
  "toAddress": "mRecipientAddress...",
  "amount": 0.5,
  "privateKey": "cPrivateKeyInWIF..."
}
```

---

## 🔐 Security Notes

⚠️ **IMPORTANT:**
- This is for **TESTNET ONLY** - never use on mainnet without proper security audits
- Never expose private keys in production
- Always use HTTPS in production
- Store private keys securely (hardware wallets, encrypted storage)
- This code is for educational/testing purposes

---

## 🌊 Getting Test Funds

### EVM Chains
- **Ethereum Sepolia:** https://sepoliafaucet.com/
- **Polygon Amoy:** https://faucet.polygon.technology/
- **Arbitrum Sepolia:** https://faucet.quicknode.com/arbitrum/sepolia
- **Base Sepolia:** https://www.alchemy.com/faucets/base-sepolia
- **BNB Testnet:** https://testnet.bnbchain.org/faucet-smart
- **Avalanche Fuji:** https://core.app/tools/testnet-faucet/
- **Cronos Testnet:** https://cronos.org/faucet

### Tron
- **Shasta Testnet:** https://www.trongrid.io/shasta

### Litecoin
- **Litecoin Testnet:** https://testnet.help/en/ltcfaucet/testnet

---

## 📚 Architecture

```
multichain-wallet/
├── EVMChains_wallet.js       # EVM chains implementation (ERC20 support)
├── EVMChains_server.js        # EVM chains server
├── EVMChains_frontend.html    # Web UI
├── Tron_wallet.js             # Tron implementation (TRC20 support)
├── Tron_server.js             # Tron server
├── Litecoin_wallet.js         # Litecoin implementation (UTXO-based)
├── Litecoin_server.js         # Litecoin server
└── package.json               # Dependencies
```

---

## 🛠 Technology Stack

- **Express.js** - Web server framework
- **Ethers.js** - Ethereum/EVM interaction
- **TronWeb** - Tron blockchain interaction
- **BitcoinJS-lib** - Bitcoin/Litecoin UTXO operations
- **BIP39/BIP32** - HD wallet generation
- **Axios** - HTTP requests for blockchain APIs

---

## ⚡ Token Support Summary

### ✅ ERC20 Tokens (All 8 EVM Chains)
Works on all EVM-compatible chains because they all support the Ethereum smart contract standard.

### ✅ TRC20 Tokens (Tron)
Tron's equivalent of ERC20. Very similar API but different blockchain.

### ❌ Litecoin Tokens
Litecoin is a UTXO-based chain like Bitcoin. It **does not support smart contracts or tokens**. Only native LTC transfers are supported.

---

## 🐛 Troubleshooting

### Tron API Rate Limits
If you encounter rate limits, get a free API key from TronGrid:
1. Visit https://www.trongrid.io/
2. Sign up for free API key
3. Add to `Tron_wallet.js`:
```javascript
headers: { "TRON-PRO-API-KEY": 'your-api-key' }
```

### Litecoin UTXO Errors
Ensure the wallet has sufficient UTXOs by checking:
```bash
GET /api/litecoin/utxos/:address
```

### Insufficient Gas/Fees
- **EVM:** Ensure wallet has native currency (ETH, MATIC, etc.) for gas
- **Tron:** Need TRX for energy/bandwidth
- **Litecoin:** Transaction fee is automatically calculated from UTXOs

---

## 📄 License

ISC

---

## 🤝 Contributing

This is a testnet wallet for educational purposes. Contributions welcome!

---

**Made with ❤️ for the crypto community** 