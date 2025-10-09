// Solana_wallet.js - Solana Devnet Wallet with SPL Token Support
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

const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

// Try to load bs58, but use manual implementation if it fails
let bs58;
try {
  bs58 = require('bs58');
  console.log('✅ bs58 library loaded');
} catch (error) {
  console.log('⚠️ bs58 library not available, using manual implementation');
  bs58 = null;
}

// Solana Devnet Configuration
const SOLANA_CONFIG = {
  name: 'Solana Devnet',
  symbol: 'SOL',
  decimals: 9,
  rpcUrl: 'https://api.devnet.solana.com',
  explorerUrl: 'https://explorer.solana.com',
  faucets: [
    'https://faucet.solana.com',
    'https://solfaucet.com'
  ]
};

class SolanaWallet {
  constructor() {
    this.network = SOLANA_CONFIG;
    
    try {
      this.connection = new Connection(SOLANA_CONFIG.rpcUrl, 'confirmed');
      console.log(`✅ Solana connection initialized for ${SOLANA_CONFIG.name}`);
    } catch (error) {
      console.error(`❌ Failed to initialize Solana connection:`, error.message);
      throw error;
    }
  }

  // ========== HELPER: Base58 Encode/Decode ==========
  
  base58Encode(buffer) {
    // Always use manual implementation for reliability
    return this.manualBase58Encode(buffer);
  }

  base58Decode(str) {
    // Always use manual implementation for reliability
    return this.manualBase58Decode(str);
  }

  manualBase58Encode(buffer) {
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
    
    // Add leading zeros
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      digits.push(0);
    }
    
    return digits.reverse().map(d => ALPHABET[d]).join('');
  }

  manualBase58Decode(str) {
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
    
    // Add leading zeros
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
      bytes.push(0);
    }
    
    return new Uint8Array(bytes.reverse());
  }

  // ========== WALLET GENERATION ==========

  generateWallet() {
    try {
      const keypair = Keypair.generate();
      
      // Return both Base64 (our format) and Base58 (Phantom format)
      const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      const privateKeyBase58 = this.base58Encode(keypair.secretKey);
      
      return {
        success: true,
        address: keypair.publicKey.toString(),
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKeyBase64,  // Default format
        privateKeyBase64: privateKeyBase64,
        privateKeyBase58: privateKeyBase58,  // Phantom format
        secretKey: Array.from(keypair.secretKey),
        network: SOLANA_CONFIG.name
      };
    } catch (error) {
      console.error('Generate wallet error:', error);
      return { success: false, error: error.message };
    }
  }

  generateFromSeed(mnemonic = null) {
    try {
      const seedPhrase = mnemonic || bip39.generateMnemonic();
      
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const seed = bip39.mnemonicToSeedSync(seedPhrase);
      
      // Solana derivation path: m/44'/501'/0'/0'
      const path = "m/44'/501'/0'/0'";
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      
      const keypair = Keypair.fromSeed(derivedSeed);
      
      // Return both Base64 and Base58 formats
      const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      const privateKeyBase58 = this.base58Encode(keypair.secretKey);
      
      return {
        success: true,
        mnemonic: seedPhrase,
        address: keypair.publicKey.toString(),
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKeyBase64,  // Default format
        privateKeyBase64: privateKeyBase64,
        privateKeyBase58: privateKeyBase58,  // Phantom format
        secretKey: Array.from(keypair.secretKey),
        derivationPath: path,
        network: SOLANA_CONFIG.name
      };
    } catch (error) {
      console.error('Generate from seed error:', error);
      return { success: false, error: error.message };
    }
  }

  importFromPrivateKey(privateKey) {
    try {
      let secretKey;
      let detectedFormat = 'unknown';
      
      // Trim whitespace
      privateKey = privateKey.trim();
      
      // 1. Check for Base64 format (contains +, /, or = characters)
      const isBase64 = /[+\/=]/.test(privateKey);
      
      if (isBase64) {
        console.log('Detected format: Base64 (Generated wallet format)');
        detectedFormat = 'Base64';
        try {
          secretKey = Buffer.from(privateKey, 'base64');
          if (secretKey.length !== 64) {
            throw new Error(`Invalid key length: ${secretKey.length} bytes (expected 64)`);
          }
        } catch (e) {
          throw new Error(`Base64 decode failed: ${e.message}`);
        }
      } 
      // 2. Check if it starts with '[' for JSON array format
      else if (privateKey.startsWith('[')) {
        console.log('Detected format: JSON Array');
        detectedFormat = 'JSON Array';
        try {
          const parsed = JSON.parse(privateKey);
          secretKey = new Uint8Array(parsed);
          if (secretKey.length !== 64) {
            throw new Error(`Invalid key length: ${secretKey.length} bytes (expected 64)`);
          }
        } catch (e) {
          throw new Error(`JSON array parse failed: ${e.message}`);
        }
      }
      // 3. Try Base58 format (Phantom wallet format) - typically 87-88 characters
      else {
        console.log('Detected format: Base58 (Phantom wallet format)');
        detectedFormat = 'Base58 (Phantom)';
        try {
          secretKey = this.base58Decode(privateKey);
          
          if (secretKey.length !== 64) {
            throw new Error(`Invalid key length: ${secretKey.length} bytes (expected 64)`);
          }
        } catch (e) {
          throw new Error(`Base58 decode failed: ${e.message}. Ensure the key is in valid Base58, Base64, or JSON array format.`);
        }
      }
      
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Return both formats
      const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      const privateKeyBase58 = this.base58Encode(keypair.secretKey);
      
      return {
        success: true,
        address: keypair.publicKey.toString(),
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKeyBase64,  // Default format
        privateKeyBase64: privateKeyBase64,
        privateKeyBase58: privateKeyBase58,  // Phantom format
        secretKey: Array.from(keypair.secretKey),
        detectedFormat: detectedFormat,
        network: SOLANA_CONFIG.name
      };
    } catch (error) {
      console.error('Import error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== NATIVE SOL OPERATIONS ==========

  async getBalance(address) {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      
      return {
        success: true,
        address: address,
        balance: balanceSOL,
        balanceLamports: balance,
        symbol: SOLANA_CONFIG.symbol,
        network: SOLANA_CONFIG.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSOL(fromAddress, toAddress, amount, privateKey) {
    try {
      console.log(`\n=== SOLANA TRANSACTION ===`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amount} SOL`);

      // Decode private key - support both formats
      let secretKey;
      try {
        // Try Base64 first
        if (/[+\/=]/.test(privateKey)) {
          secretKey = Buffer.from(privateKey, 'base64');
        } 
        // Try Base58
        else {
          secretKey = this.base58Decode(privateKey);
        }
      } catch (e) {
        // Try JSON array as fallback
        try {
          secretKey = new Uint8Array(JSON.parse(privateKey));
        } catch (e2) {
          throw new Error('Invalid private key format');
        }
      }
      
      const fromKeypair = Keypair.fromSecretKey(secretKey);
      const toPublicKey = new PublicKey(toAddress);

      // Verify the keypair matches the from address
      if (fromKeypair.publicKey.toString() !== fromAddress) {
        throw new Error('Private key does not match the from address');
      }

      // Check balance
      const balanceResult = await this.getBalance(fromAddress);
      if (!balanceResult.success) throw new Error('Failed to check balance');

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      // Estimate fee (5000 lamports = 0.000005 SOL typical)
      const estimatedFee = 0.000005;
      const totalNeeded = amount + estimatedFee;

      if (balanceResult.balance < totalNeeded) {
        throw new Error(`Insufficient balance. Need ${totalNeeded} SOL, have ${balanceResult.balance} SOL`);
      }

      console.log('Creating transaction...');
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

      console.log('Sending transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair]
      );

      console.log(`Transaction confirmed: ${signature}`);

      return {
        success: true,
        signature: signature,
        from: fromAddress,
        to: toAddress,
        amount: amount,
        explorerUrl: `${SOLANA_CONFIG.explorerUrl}/tx/${signature}?cluster=devnet`,
        network: SOLANA_CONFIG.name
      };

    } catch (error) {
      console.error('Transaction failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== SPL TOKEN OPERATIONS ==========

  async getTokenInfo(tokenAddress) {
    try {
      console.log(`Getting SPL token info for: ${tokenAddress}`);
      
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
        network: SOLANA_CONFIG.name
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
      console.log(`Getting token balance for wallet: ${walletAddress}`);
      console.log(`Token mint: ${tokenAddress}`);
      
      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(tokenAddress);
      
      // Get mint info for decimals
      const mintInfo = await getMint(this.connection, mintPublicKey);
      
      // Get or create associated token account
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
        network: SOLANA_CONFIG.name
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
      console.log(`\n=== SPL TOKEN TRANSFER ===`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Token: ${tokenAddress}`);
      console.log(`Amount: ${amount}`);

      // Decode private key - support both formats
      let secretKey;
      try {
        // Try Base64 first
        if (/[+\/=]/.test(privateKey)) {
          secretKey = Buffer.from(privateKey, 'base64');
        } 
        // Try Base58
        else {
          secretKey = this.base58Decode(privateKey);
        }
      } catch (e) {
        // Try JSON array as fallback
        try {
          secretKey = new Uint8Array(JSON.parse(privateKey));
        } catch (e2) {
          throw new Error('Invalid private key format');
        }
      }
      
      const fromKeypair = Keypair.fromSecretKey(secretKey);
      const toPublicKey = new PublicKey(toAddress);
      const mintPublicKey = new PublicKey(tokenAddress);

      // Verify the keypair matches the from address
      if (fromKeypair.publicKey.toString() !== fromAddress) {
        throw new Error('Private key does not match the from address');
      }

      // Get mint info
      const mintInfo = await getMint(this.connection, mintPublicKey);
      const amountInTokenUnits = Math.floor(amount * Math.pow(10, mintInfo.decimals));

      console.log(`Amount in token units: ${amountInTokenUnits}`);

      // Get or create source token account
      console.log('Getting source token account...');
      const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        mintPublicKey,
        fromKeypair.publicKey
      );

      // Check balance
      const accountInfo = await getAccount(this.connection, sourceTokenAccount.address);
      if (Number(accountInfo.amount) < amountInTokenUnits) {
        const formattedBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
        throw new Error(`Insufficient token balance. Need ${amount}, have ${formattedBalance}`);
      }

      // Get or create destination token account
      console.log('Getting destination token account...');
      const destTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        mintPublicKey,
        toPublicKey
      );

      console.log('Creating transfer instruction...');
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

      console.log('Sending transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair]
      );

      console.log(`Transaction confirmed: ${signature}`);

      return {
        success: true,
        signature: signature,
        from: fromAddress,
        to: toAddress,
        tokenAddress: tokenAddress,
        amount: amount,
        explorerUrl: `${SOLANA_CONFIG.explorerUrl}/tx/${signature}?cluster=devnet`,
        network: SOLANA_CONFIG.name,
        message: `Successfully sent ${amount} tokens`
      };

    } catch (error) {
      console.error('Token transfer failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ========== TRANSACTION INFO ==========

  async getTransactionStatus(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      if (!status || !status.value) {
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
        explorerUrl: `${SOLANA_CONFIG.explorerUrl}/tx/${signature}?cluster=devnet`,
        network: SOLANA_CONFIG.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async requestAirdrop(address, amount = 1) {
    try {
      console.log(`Requesting ${amount} SOL airdrop to ${address}...`);
      
      const publicKey = new PublicKey(address);
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);
      
      console.log(`Airdrop successful: ${signature}`);

      return {
        success: true,
        signature: signature,
        amount: amount,
        message: `Successfully airdropped ${amount} SOL`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========== UTILITY METHODS ==========

  getFaucetInfo() {
    return {
      network: SOLANA_CONFIG.name,
      faucets: SOLANA_CONFIG.faucets,
      symbol: SOLANA_CONFIG.symbol
    };
  }

  isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  static getNetworkConfig() {
    return SOLANA_CONFIG;
  }
}

module.exports = { SolanaWallet, SOLANA_CONFIG }; 