// NonEVM_wallet.js - Universal Non-EVM Multi-Chain Wallet
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const bip32 = require('bip32');
const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');
const axios = require('axios');
const TronWeb = require('tronweb');
const { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getMint,
  getAccount,
  TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
const { derivePath } = require('ed25519-hd-key');

const ECPair = ECPairFactory.default(ecc);

// Network configurations
const NETWORKS = {
  bitcoin: {
    name: 'Bitcoin Testnet',
    type: 'UTXO',
    symbol: 'BTC',
    decimals: 8,
    network: bitcoin.networks.testnet,
    apiUrl: 'https://blockstream.info/testnet/api',
    explorerUrl: 'https://blockstream.info/testnet',
    faucets: [
      'https://bitcoinfaucet.uo1.net/',
      'https://testnet-faucet.mempool.co/',
      'https://coinfaucet.eu/en/btc-testnet/'
    ]
  },
  litecoin: {
    name: 'Litecoin Testnet',
    type: 'UTXO',
    symbol: 'tLTC',
    decimals: 8,
    network: {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'tltc',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394
      },
      pubKeyHash: 0x6f,
      scriptHash: 0x3a,
      wif: 0xef
    },
    apiUrl: 'https://api.blockcypher.com/v1/ltc/test3',
    explorerUrl: 'https://litecoinspace.org/testnet',
    faucets: [
      'https://cypherfaucet.com/ltc-testnet',
      'https://litecoinspace.org/testnet'
    ]
  },
  tron: {
    name: 'Tron Shasta Testnet',
    type: 'Account',
    symbol: 'TRX',
    decimals: 6,
    chainId: '2494104990',
    fullNode: 'https://api.shasta.trongrid.io',
    explorerUrl: 'https://shasta.tronscan.org/#',
    faucets: ['https://www.trongrid.io/shasta']
  },
  solana: {
    name: 'Solana Devnet',
    type: 'Account',
    symbol: 'SOL',
    decimals: 9,
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    faucets: [
      'https://faucet.solana.com',
      'https://solfaucet.com'
    ]
  }
};

class NonEVMWallet {
  constructor(networkKey) {
    if (!NETWORKS[networkKey]) {
      throw new Error(`Unknown network: ${networkKey}. Available networks: ${Object.keys(NETWORKS).join(', ')}`);
    }

    this.network = NETWORKS[networkKey];
    this.networkKey = networkKey;
    
    // Initialize network-specific clients
    if (networkKey === 'tron') {
      this.tronWeb = new TronWeb({
        fullHost: this.network.fullNode
      });
      console.log(`✅ TronWeb initialized for ${this.network.name}`);
    } else if (networkKey === 'solana') {
      this.connection = new Connection(this.network.rpcUrl, 'confirmed');
      console.log(`✅ Solana connection initialized for ${this.network.name}`);
    } else {
      console.log(`✅ ${this.network.name} wallet initialized`);
    }
  }

  // ========== WALLET GENERATION ==========

  generateWallet() {
    try {
      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        return this._generateUTXOWallet();
      } else if (this.networkKey === 'tron') {
        return this._generateTronWallet();
      } else if (this.networkKey === 'solana') {
        return this._generateSolanaWallet();
      }
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

      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        return this._generateUTXOFromSeed(seedPhrase);
      } else if (this.networkKey === 'tron') {
        return this._generateTronFromSeed(seedPhrase);
      } else if (this.networkKey === 'solana') {
        return this._generateSolanaFromSeed(seedPhrase);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  importFromPrivateKey(privateKey) {
    try {
      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        return this._importUTXOWallet(privateKey);
      } else if (this.networkKey === 'tron') {
        return this._importTronWallet(privateKey);
      } else if (this.networkKey === 'solana') {
        return this._importSolanaWallet(privateKey);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== UTXO WALLET METHODS (Bitcoin/Litecoin) ==========

  _generateUTXOWallet() {
    const keyPair = ECPair.makeRandom({ network: this.network.network });
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: this.network.network
    });
    
    return {
      success: true,
      address: address,
      privateKey: keyPair.toWIF(),
      publicKey: keyPair.publicKey.toString('hex'),
      network: this.network.name,
      networkKey: this.networkKey,
      addressType: 'P2PKH (Legacy)'
    };
  }

  _generateUTXOFromSeed(seedPhrase) {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const root = bip32.BIP32Factory(ecc).fromSeed(seed, this.network.network);
    
    // Bitcoin: m/44'/1'/0'/0/0, Litecoin: m/44'/2'/0'/0/0
    const coinType = this.networkKey === 'bitcoin' ? "1" : "2";
    const path = `m/44'/${coinType}'/0'/0/0`;
    const child = root.derivePath(path);
    
    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: this.network.network
    });
    
    return {
      success: true,
      mnemonic: seedPhrase,
      address: address,
      privateKey: child.toWIF(),
      publicKey: child.publicKey.toString('hex'),
      derivationPath: path,
      network: this.network.name,
      networkKey: this.networkKey
    };
  }

  _importUTXOWallet(privateKey) {
    const keyPair = ECPair.fromWIF(privateKey, this.network.network);
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: this.network.network
    });
    
    return {
      success: true,
      address: address,
      privateKey: keyPair.toWIF(),
      publicKey: keyPair.publicKey.toString('hex'),
      network: this.network.name,
      networkKey: this.networkKey
    };
  }

  // ========== TRON WALLET METHODS ==========

  _generateTronWallet() {
    const crypto = require('crypto');
    const privateKeyBytes = crypto.randomBytes(32);
    const privateKey = privateKeyBytes.toString('hex');
    const address = this.tronWeb.address.fromPrivateKey(privateKey);
    
    let publicKey = '';
    try {
      publicKey = this.tronWeb.utils.crypto.getPubKeyFromPriKey(privateKey);
    } catch (e) {
      publicKey = 'N/A';
    }
    
    return {
      success: true,
      address: address,
      privateKey: privateKey,
      publicKey: publicKey,
      network: this.network.name,
      networkKey: this.networkKey,
      chainId: this.network.chainId
    };
  }

  _generateTronFromSeed(seedPhrase) {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const privateKeyHex = seed.slice(0, 32).toString('hex');
    const address = this.tronWeb.address.fromPrivateKey(privateKeyHex);
    
    return {
      success: true,
      mnemonic: seedPhrase,
      address: address,
      privateKey: privateKeyHex,
      derivationPath: "m/44'/195'/0'/0/0",
      network: this.network.name,
      networkKey: this.networkKey,
      chainId: this.network.chainId
    };
  }

  _importTronWallet(privateKey) {
    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.slice(2);
    }
    
    const address = this.tronWeb.address.fromPrivateKey(privateKey);
    
    return {
      success: true,
      address: address,
      privateKey: privateKey,
      network: this.network.name,
      networkKey: this.networkKey,
      chainId: this.network.chainId
    };
  }

  // ========== SOLANA WALLET METHODS ==========

  _generateSolanaWallet() {
    const keypair = Keypair.generate();
    const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
    const privateKeyBase58 = this._base58Encode(keypair.secretKey);
    
    return {
      success: true,
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      privateKey: privateKeyBase64,
      privateKeyBase64: privateKeyBase64,
      privateKeyBase58: privateKeyBase58,
      secretKey: Array.from(keypair.secretKey),
      network: this.network.name,
      networkKey: this.networkKey
    };
  }

  _generateSolanaFromSeed(seedPhrase) {
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const path = "m/44'/501'/0'/0'";
    const derivedSeed = derivePath(path, seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derivedSeed);
    
    const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
    const privateKeyBase58 = this._base58Encode(keypair.secretKey);
    
    return {
      success: true,
      mnemonic: seedPhrase,
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      privateKey: privateKeyBase64,
      privateKeyBase64: privateKeyBase64,
      privateKeyBase58: privateKeyBase58,
      secretKey: Array.from(keypair.secretKey),
      derivationPath: path,
      network: this.network.name,
      networkKey: this.networkKey
    };
  }

  _importSolanaWallet(privateKey) {
    let secretKey;
    privateKey = privateKey.trim();
    
    const isBase64 = /[+\/=]/.test(privateKey);
    
    if (isBase64) {
      secretKey = Buffer.from(privateKey, 'base64');
    } else if (privateKey.startsWith('[')) {
      secretKey = new Uint8Array(JSON.parse(privateKey));
    } else {
      secretKey = this._base58Decode(privateKey);
    }
    
    if (secretKey.length !== 64) {
      throw new Error(`Invalid key length: ${secretKey.length} bytes (expected 64)`);
    }
    
    const keypair = Keypair.fromSecretKey(secretKey);
    const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
    const privateKeyBase58 = this._base58Encode(keypair.secretKey);
    
    return {
      success: true,
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      privateKey: privateKeyBase64,
      privateKeyBase64: privateKeyBase64,
      privateKeyBase58: privateKeyBase58,
      secretKey: Array.from(keypair.secretKey),
      network: this.network.name,
      networkKey: this.networkKey
    };
  }

  // ========== BALANCE OPERATIONS ==========

  async getBalance(address) {
    try {
      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        return await this._getUTXOBalance(address);
      } else if (this.networkKey === 'tron') {
        return await this._getTronBalance(address);
      } else if (this.networkKey === 'solana') {
        return await this._getSolanaBalance(address);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _getUTXOBalance(address) {
    try {
      let balance = 0;
      
      if (this.networkKey === 'bitcoin') {
        const response = await axios.get(`${this.network.apiUrl}/address/${address}`, { 
          timeout: 30000 
        });
        const data = response.data;
        balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
      } else {
        // Litecoin
        try {
          const response = await axios.get(`${this.network.apiUrl}/addrs/${address}/balance`);
          balance = response.data.final_balance / 100000000;
        } catch (e) {
          const altResponse = await axios.get(`https://litecoinspace.org/testnet/api/address/${address}`);
          balance = (altResponse.data.chain_stats.funded_txo_sum - altResponse.data.chain_stats.spent_txo_sum) / 100000000;
        }
      }

      return {
        success: true,
        address: address,
        balance: balance,
        symbol: this.network.symbol,
        network: this.network.name
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, address: address, balance: 0 };
      }
      return { success: false, error: error.message };
    }
  }

  async _getTronBalance(address) {
    const balance = await this.tronWeb.trx.getBalance(address);
    const balanceTRX = balance / Math.pow(10, this.network.decimals);
    
    return {
      success: true,
      address: address,
      balance: balanceTRX,
      balanceSun: balance,
      symbol: this.network.symbol,
      network: this.network.name
    };
  }

  async _getSolanaBalance(address) {
    const publicKey = new PublicKey(address);
    const balance = await this.connection.getBalance(publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    return {
      success: true,
      address: address,
      balance: balanceSOL,
      balanceLamports: balance,
      symbol: this.network.symbol,
      network: this.network.name
    };
  }

  // ========== UTXO OPERATIONS ==========

  async getUTXOs(address) {
    if (this.networkKey !== 'bitcoin' && this.networkKey !== 'litecoin') {
      return { success: false, error: 'UTXOs only available for Bitcoin and Litecoin' };
    }

    try {
      let utxos = [];
      
      if (this.networkKey === 'bitcoin') {
        const response = await axios.get(`${this.network.apiUrl}/address/${address}/utxo`, { 
          timeout: 30000 
        });
        utxos = response.data;
      } else {
        // Litecoin
        try {
          const response = await axios.get(`${this.network.apiUrl}/addrs/${address}?unspentOnly=true`);
          utxos = response.data.txrefs || [];
        } catch (e) {
          const altResponse = await axios.get(`https://litecoinspace.org/testnet/api/address/${address}/utxo`);
          utxos = altResponse.data.map(utxo => ({
            tx_hash: utxo.txid,
            tx_output_n: utxo.vout,
            value: utxo.value
          }));
        }
      }

      return {
        success: true,
        utxos: utxos,
        count: utxos.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== SEND NATIVE CURRENCY ==========

  async sendNative(fromAddress, toAddress, amount, privateKey) {
    try {
      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        return await this._sendUTXO(fromAddress, toAddress, amount, privateKey);
      } else if (this.networkKey === 'tron') {
        return await this._sendTRX(fromAddress, toAddress, amount, privateKey);
      } else if (this.networkKey === 'solana') {
        return await this._sendSOL(fromAddress, toAddress, amount, privateKey);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _sendUTXO(fromAddress, toAddress, amount, privateKey) {
    console.log(`\n=== ${this.network.name.toUpperCase()} TRANSACTION ===`);
    console.log(`From: ${fromAddress}`);
    console.log(`To: ${toAddress}`);
    console.log(`Amount: ${amount} ${this.network.symbol}`);

    const balanceResult = await this.getBalance(fromAddress);
    if (!balanceResult.success || balanceResult.balance <= 0) {
      throw new Error('No funds available in wallet');
    }

    const utxoResult = await this.getUTXOs(fromAddress);
    if (!utxoResult.success || utxoResult.utxos.length === 0) {
      throw new Error('No UTXOs available for spending');
    }

    const keyPair = ECPair.fromWIF(privateKey, this.network.network);
    const psbt = new bitcoin.Psbt({ network: this.network.network });

    let inputSum = 0;
    const targetAmount = Math.floor(amount * 100000000);
    const feeAmount = 2000;

    for (const utxo of utxoResult.utxos) {
      if (inputSum >= targetAmount + feeAmount) break;
      
      const txid = utxo.txid || utxo.tx_hash;
      const vout = utxo.vout !== undefined ? utxo.vout : utxo.tx_output_n;
      
      const rawTxResult = await this._getRawTransaction(txid);
      if (!rawTxResult.success) continue;
      
      try {
        psbt.addInput({
          hash: txid,
          index: vout,
          nonWitnessUtxo: Buffer.from(rawTxResult.rawTx, 'hex')
        });
        
        inputSum += utxo.value;
      } catch (error) {
        console.warn(`Failed to add UTXO:`, error.message);
      }
    }

    if (inputSum < targetAmount + feeAmount) {
      throw new Error(`Insufficient balance. Need ${(targetAmount + feeAmount) / 100000000} ${this.network.symbol}`);
    }

    psbt.addOutput({
      address: toAddress,
      value: targetAmount
    });

    const change = inputSum - targetAmount - feeAmount;
    if (change > 0) {
      psbt.addOutput({
        address: fromAddress,
        value: change
      });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const txId = psbt.extractTransaction().getId();

    await this._broadcastTransaction(txHex);

    return {
      success: true,
      txid: txId,
      txHash: txId,
      fee: feeAmount / 100000000,
      explorerUrl: `${this.network.explorerUrl}/tx/${txId}`,
      message: 'Transaction sent successfully',
      network: this.network.name
    };
  }

  async _sendTRX(fromAddress, toAddress, amount, privateKey) {
    this.tronWeb.setPrivateKey(privateKey);
    
    const balanceResult = await this.getBalance(fromAddress);
    if (!balanceResult.success) throw new Error('Failed to check balance');

    const amountSun = amount * Math.pow(10, this.network.decimals);
    const estimatedFee = 0.3;
    const totalNeeded = amount + estimatedFee;

    if (balanceResult.balance < totalNeeded) {
      throw new Error(`Insufficient balance. Need ${totalNeeded} TRX, have ${balanceResult.balance} TRX`);
    }

    const transaction = await this.tronWeb.trx.sendTransaction(toAddress, amountSun);
    
    if (!transaction.result) {
      throw new Error('Transaction failed');
    }

    return {
      success: true,
      txHash: transaction.txid,
      from: fromAddress,
      to: toAddress,
      amount: amount,
      explorerUrl: `${this.network.explorerUrl}/transaction/${transaction.txid}`,
      network: this.network.name
    };
  }

  async _sendSOL(fromAddress, toAddress, amount, privateKey) {
    let secretKey;
    
    if (/[+\/=]/.test(privateKey)) {
      secretKey = Buffer.from(privateKey, 'base64');
    } else {
      secretKey = this._base58Decode(privateKey);
    }
    
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(toAddress);

    if (fromKeypair.publicKey.toString() !== fromAddress) {
      throw new Error('Private key does not match the from address');
    }

    const balanceResult = await this.getBalance(fromAddress);
    if (!balanceResult.success) throw new Error('Failed to check balance');

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const estimatedFee = 0.000005;
    const totalNeeded = amount + estimatedFee;

    if (balanceResult.balance < totalNeeded) {
      throw new Error(`Insufficient balance. Need ${totalNeeded} SOL, have ${balanceResult.balance} SOL`);
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: lamports
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [fromKeypair]
    );

    return {
      success: true,
      signature: signature,
      txHash: signature,
      from: fromAddress,
      to: toAddress,
      amount: amount,
      explorerUrl: `${this.network.explorerUrl}/tx/${signature}?cluster=devnet`,
      network: this.network.name
    };
  }

  // ========== TOKEN OPERATIONS ==========

  async getTokenInfo(tokenAddress) {
    if (this.networkKey === 'tron') {
      return await this._getTronTokenInfo(tokenAddress);
    } else if (this.networkKey === 'solana') {
      return await this._getSolanaTokenInfo(tokenAddress);
    }
    return { success: false, error: 'Tokens not supported on this network' };
  }

  async getTokenBalance(walletAddress, tokenAddress) {
    if (this.networkKey === 'tron') {
      return await this._getTronTokenBalance(walletAddress, tokenAddress);
    } else if (this.networkKey === 'solana') {
      return await this._getSolanaTokenBalance(walletAddress, tokenAddress);
    }
    return { success: false, error: 'Tokens not supported on this network' };
  }

  async sendToken(fromAddress, toAddress, tokenAddress, amount, privateKey) {
    if (this.networkKey === 'tron') {
      return await this._sendTronToken(fromAddress, toAddress, tokenAddress, amount, privateKey);
    } else if (this.networkKey === 'solana') {
      return await this._sendSolanaToken(fromAddress, toAddress, tokenAddress, amount, privateKey);
    }
    return { success: false, error: 'Tokens not supported on this network' };
  }

  // ========== TRON TOKEN METHODS ==========

  async _getTronTokenInfo(tokenAddress) {
    if (!this.tronWeb.isAddress(tokenAddress)) {
      throw new Error('Invalid token contract address');
    }

    let name = 'Unknown', symbol = 'Unknown', decimals = 18;

    try {
      const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'name()', {}, [], tokenAddress
      );
      if (txObj?.constant_result?.[0]) {
        const hexStr = txObj.constant_result[0];
        const cleanHex = hexStr.replace(/^0+/, '');
        if (cleanHex.length > 0) {
          const nameHex = cleanHex.substring(64);
          name = this.tronWeb.toUtf8('0x' + nameHex).replace(/\0/g, '');
        }
      }
    } catch (e) {}

    try {
      const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'symbol()', {}, [], tokenAddress
      );
      if (txObj?.constant_result?.[0]) {
        const hexStr = txObj.constant_result[0];
        const cleanHex = hexStr.replace(/^0+/, '');
        if (cleanHex.length > 0) {
          const symbolHex = cleanHex.substring(64);
          symbol = this.tronWeb.toUtf8('0x' + symbolHex).replace(/\0/g, '');
        }
      }
    } catch (e) {}

    try {
      const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'decimals()', {}, [], tokenAddress
      );
      if (txObj?.constant_result?.[0]) {
        decimals = parseInt(txObj.constant_result[0], 16);
      }
    } catch (e) {}

    return {
      success: true,
      tokenAddress: tokenAddress,
      name: name,
      symbol: symbol,
      decimals: decimals,
      network: this.network.name
    };
  }

  async _getTronTokenBalance(walletAddress, tokenAddress) {
    if (!this.tronWeb.isAddress(walletAddress) || !this.tronWeb.isAddress(tokenAddress)) {
      throw new Error('Invalid address');
    }

    const parameter = [{ type: 'address', value: walletAddress }];
    const txObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
      tokenAddress, 'balanceOf(address)', {}, parameter, tokenAddress
    );

    if (!txObj?.constant_result?.[0]) {
      throw new Error('No balance data returned');
    }

    const balance = parseInt(txObj.constant_result[0], 16);
    
    let decimals = 18, symbol = 'TOKEN';
    
    try {
      const decTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'decimals()', {}, [], tokenAddress
      );
      if (decTxObj?.constant_result?.[0]) {
        decimals = parseInt(decTxObj.constant_result[0], 16);
      }
    } catch (e) {}
    
    try {
      const symTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'symbol()', {}, [], tokenAddress
      );
      if (symTxObj?.constant_result?.[0]) {
        const hexStr = symTxObj.constant_result[0];
        const cleanHex = hexStr.replace(/^0+/, '');
        if (cleanHex.length > 0) {
          const symbolHex = cleanHex.substring(64);
          symbol = this.tronWeb.toUtf8('0x' + symbolHex).replace(/\0/g, '');
        }
      }
    } catch (e) {}

    const formattedBalance = balance / Math.pow(10, decimals);

    return {
      success: true,
      walletAddress: walletAddress,
      tokenAddress: tokenAddress,
      balance: formattedBalance,
      balanceRaw: balance.toString(),
      decimals: decimals,
      symbol: symbol,
      network: this.network.name
    };
  }

  async _sendTronToken(fromAddress, toAddress, tokenAddress, amount, privateKey) {
    console.log(`\n=== TRC20 TOKEN TRANSFER ===`);
    
    if (!this.tronWeb.isAddress(fromAddress) || !this.tronWeb.isAddress(toAddress) || !this.tronWeb.isAddress(tokenAddress)) {
      throw new Error('Invalid address');
    }

    this.tronWeb.setPrivateKey(privateKey);
    
    const derivedAddress = this.tronWeb.address.fromPrivateKey(privateKey);
    if (derivedAddress.toLowerCase() !== fromAddress.toLowerCase()) {
      throw new Error('Private key does not match from address');
    }

    let decimals = 18, symbol = 'TOKEN';
    
    try {
      const decTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'decimals()', {}, [], tokenAddress
      );
      if (decTxObj?.constant_result?.[0]) {
        decimals = parseInt(decTxObj.constant_result[0], 16);
      }
    } catch (e) {}
    
    try {
      const symTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress, 'symbol()', {}, [], tokenAddress
      );
      if (symTxObj?.constant_result?.[0]) {
        const hexStr = symTxObj.constant_result[0];
        const cleanHex = hexStr.replace(/^0+/, '');
        if (cleanHex.length > 0) {
          const symbolHex = cleanHex.substring(64);
          symbol = this.tronWeb.toUtf8('0x' + symbolHex).replace(/\0/g, '');
        }
      }
    } catch (e) {}

    const multiplier = Math.pow(10, decimals);
    const amountStr = (amount * multiplier).toLocaleString('fullwide', {useGrouping: false});
    const amountInTokenUnits = amountStr.split('.')[0];

    const balanceTxObj = await this.tronWeb.transactionBuilder.triggerConstantContract(
      tokenAddress, 'balanceOf(address)', {}, [{type: 'address', value: fromAddress}], tokenAddress
    );

    if (!balanceTxObj?.constant_result?.[0]) {
      throw new Error('Could not check balance');
    }

    const balance = BigInt('0x' + balanceTxObj.constant_result[0]);
    const amountBigInt = BigInt(amountInTokenUnits);

    if (balance < amountBigInt) {
      const formattedBalance = Number(balance) / multiplier;
      throw new Error(`Insufficient token balance. Need ${amount} ${symbol}, have ${formattedBalance} ${symbol}`);
    }

    const nativeBalance = await this.getBalance(fromAddress);
    if (!nativeBalance.success || nativeBalance.balance < 10) {
      throw new Error(`Insufficient TRX balance for fees. Need at least 10 TRX`);
    }

    const functionSelector = 'transfer(address,uint256)';
    const parameter = [
      {type: 'address', value: toAddress},
      {type: 'uint256', value: amountInTokenUnits}
    ];

    const tx = await this.tronWeb.transactionBuilder.triggerSmartContract(
      tokenAddress,
      functionSelector,
      { feeLimit: 100000000, callValue: 0 },
      parameter,
      fromAddress
    );

    if (!tx?.transaction) {
      throw new Error('Failed to build transaction');
    }

    const signedTx = await this.tronWeb.trx.sign(tx.transaction, privateKey);
    const broadcast = await this.tronWeb.trx.sendRawTransaction(signedTx);

    if (!broadcast?.result) {
      throw new Error(broadcast.message || 'Transaction broadcast failed');
    }

    const txHash = broadcast.transaction?.txID || broadcast.txid;

    return {
      success: true,
      txHash: txHash,
      from: fromAddress,
      to: toAddress,
      tokenAddress: tokenAddress,
      amount: amount,
      symbol: symbol,
      explorerUrl: `${this.network.explorerUrl}/transaction/${txHash}`,
      network: this.network.name,
      message: `Successfully sent ${amount} ${symbol}`
    };
  }

  // ========== SOLANA TOKEN METHODS ==========

  async _getSolanaTokenInfo(tokenAddress) {
    const mintPublicKey = new PublicKey(tokenAddress);
    const mintInfo = await getMint(this.connection, mintPublicKey);
    
    return {
      success: true,
      tokenAddress: tokenAddress,
      mintAuthority: mintInfo.mintAuthority?.toString() || 'None',
      supply: (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toString(),
      decimals: mintInfo.decimals,
      isInitialized: mintInfo.isInitialized,
      freezeAuthority: mintInfo.freezeAuthority?.toString() || 'None',
      network: this.network.name
    };
  }

  async _getSolanaTokenBalance(walletAddress, tokenAddress) {
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenAddress);
    
    const mintInfo = await getMint(this.connection, mintPublicKey);
    
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: mintPublicKey }
    );

    let balance = 0;
    let tokenAccountAddress = null;

    if (tokenAccounts.value.length > 0) {
      const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
      balance = Number(accountInfo.tokenAmount.amount) / Math.pow(10, mintInfo.decimals);
      tokenAccountAddress = tokenAccounts.value[0].pubkey.toString();
    }

    return {
      success: true,
      walletAddress: walletAddress,
      tokenAddress: tokenAddress,
      tokenAccountAddress: tokenAccountAddress,
      balance: balance,
      decimals: mintInfo.decimals,
      network: this.network.name
    };
  }

  async _sendSolanaToken(fromAddress, toAddress, tokenAddress, amount, privateKey) {
    console.log(`\n=== SPL TOKEN TRANSFER ===`);
    
    let secretKey;
    
    if (/[+\/=]/.test(privateKey)) {
      secretKey = Buffer.from(privateKey, 'base64');
    } else {
      secretKey = this._base58Decode(privateKey);
    }
    
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(toAddress);
    const mintPublicKey = new PublicKey(tokenAddress);

    if (fromKeypair.publicKey.toString() !== fromAddress) {
      throw new Error('Private key does not match the from address');
    }

    const mintInfo = await getMint(this.connection, mintPublicKey);
    const amountInTokenUnits = Math.floor(amount * Math.pow(10, mintInfo.decimals));

    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair,
      mintPublicKey,
      fromKeypair.publicKey
    );

    const accountInfo = await getAccount(this.connection, sourceTokenAccount.address);
    if (Number(accountInfo.amount) < amountInTokenUnits) {
      const formattedBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
      throw new Error(`Insufficient token balance. Need ${amount}, have ${formattedBalance}`);
    }

    const destTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair,
      mintPublicKey,
      toPublicKey
    );

    const transaction = new Transaction().add(
      createTransferInstruction(
        sourceTokenAccount.address,
        destTokenAccount.address,
        fromKeypair.publicKey,
        amountInTokenUnits,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [fromKeypair]
    );

    return {
      success: true,
      signature: signature,
      txHash: signature,
      from: fromAddress,
      to: toAddress,
      tokenAddress: tokenAddress,
      amount: amount,
      explorerUrl: `${this.network.explorerUrl}/tx/${signature}?cluster=devnet`,
      network: this.network.name,
      message: `Successfully sent ${amount} tokens`
    };
  }

  // ========== TRANSACTION STATUS ==========

  async getTransactionStatus(txHash) {
    try {
      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        return await this._getUTXOTransactionStatus(txHash);
      } else if (this.networkKey === 'tron') {
        return await this._getTronTransactionStatus(txHash);
      } else if (this.networkKey === 'solana') {
        return await this._getSolanaTransactionStatus(txHash);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _getUTXOTransactionStatus(txHash) {
    let apiUrl = this.network.apiUrl;
    if (this.networkKey === 'litecoin') {
      apiUrl = 'https://litecoinspace.org/testnet/api';
    }
    
    const response = await axios.get(`${apiUrl}/tx/${txHash}`);
    const tx = response.data;
    
    return {
      success: true,
      txid: tx.txid,
      status: tx.status?.confirmed ? 'Confirmed' : 'Unconfirmed',
      confirmations: tx.status?.block_height ? 1 : 0,
      blockHeight: tx.status?.block_height,
      explorerUrl: `${this.network.explorerUrl}/tx/${txHash}`,
      network: this.network.name
    };
  }

  async _getTronTransactionStatus(txHash) {
    const tx = await this.tronWeb.trx.getTransaction(txHash);
    
    if (!tx?.txID) {
      return { success: false, error: 'Transaction not found' };
    }

    const txInfo = await this.tronWeb.trx.getTransactionInfo(txHash);
    
    return {
      success: true,
      hash: tx.txID,
      blockNumber: txInfo.blockNumber,
      status: txInfo.result === 'SUCCESS' ? 'Success' : 'Failed',
      energyUsed: txInfo.receipt?.energy_usage_total || 0,
      netUsed: txInfo.receipt?.net_usage || 0,
      explorerUrl: `${this.network.explorerUrl}/transaction/${txHash}`,
      network: this.network.name
    };
  }

  async _getSolanaTransactionStatus(signature) {
    const status = await this.connection.getSignatureStatus(signature);
    
    if (!status?.value) {
      return { success: false, error: 'Transaction not found' };
    }

    const tx = await this.connection.getTransaction(signature);
    
    return {
      success: true,
      signature: signature,
      confirmationStatus: status.value.confirmationStatus,
      slot: status.value.slot,
      err: status.value.err,
      blockTime: tx?.blockTime,
      explorerUrl: `${this.network.explorerUrl}/tx/${signature}?cluster=devnet`,
      network: this.network.name
    };
  }

  // ========== HELPER METHODS ==========

  async _getRawTransaction(txid) {
    try {
      if (this.networkKey === 'bitcoin') {
        const response = await axios.get(`${this.network.apiUrl}/tx/${txid}/hex`, { timeout: 20000 });
        return { success: true, rawTx: response.data };
      } else {
        // Litecoin
        try {
          const response = await axios.get(`${this.network.apiUrl}/txs/${txid}?includeHex=true`);
          return { success: true, rawTx: response.data.hex };
        } catch (e) {
          const altResponse = await axios.get(`https://litecoinspace.org/testnet/api/tx/${txid}/hex`);
          return { success: true, rawTx: altResponse.data };
        }
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _broadcastTransaction(txHex) {
    try {
      if (this.networkKey === 'bitcoin') {
        await axios.post(`${this.network.apiUrl}/tx`, txHex, {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 30000
        });
      } else {
        // Litecoin
        try {
          await axios.post(`${this.network.apiUrl}/txs/push`, { tx: txHex });
        } catch (e) {
          await axios.post('https://litecoinspace.org/testnet/api/tx', txHex, {
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }
      return { success: true };
    } catch (error) {
      throw new Error(`Broadcast failed: ${error.message}`);
    }
  }

  _base58Encode(buffer) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes = Array.from(buffer);
    
    if (bytes.length === 0) return '';
    
    let digits = [0];
    for (let i = 0; i < bytes.length; i++) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }
    
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      digits.push(0);
    }
    
    return digits.reverse().map(d => ALPHABET[d]).join('');
  }

  _base58Decode(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes = [0];
    
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      const value = ALPHABET.indexOf(c);
      if (value === -1) throw new Error('Invalid Base58 character');
      
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] *= 58;
      }
      bytes[0] += value;
      
      let carry = 0;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
      bytes.push(0);
    }
    
    return new Uint8Array(bytes.reverse());
  }

  // ========== UTILITY METHODS ==========

  getFaucetInfo() {
    return {
      network: this.network.name,
      faucets: this.network.faucets,
      symbol: this.network.symbol
    };
  }

  isValidAddress(address) {
    try {
      if (this.networkKey === 'bitcoin' || this.networkKey === 'litecoin') {
        bitcoin.address.toOutputScript(address, this.network.network);
        return true;
      } else if (this.networkKey === 'tron') {
        return this.tronWeb.isAddress(address);
      } else if (this.networkKey === 'solana') {
        new PublicKey(address);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  static getAvailableNetworks() {
    return Object.keys(NETWORKS).map(key => ({
      key: key,
      ...NETWORKS[key]
    }));
  }

  static getNetworkByKey(networkKey) {
    return NETWORKS[networkKey] || null;
  }
}

module.exports = { NonEVMWallet, NETWORKS }; 