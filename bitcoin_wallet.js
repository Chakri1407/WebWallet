// bitcoin_wallet.js - Bitcoin Testnet Wallet Manager
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const crypto = require('crypto');
const axios = require('axios');
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('bip32');
const ECPairFactory = require('ecpair').ECPairFactory;

// Initialize with ecc
const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

class BitcoinWallet {
  constructor() {
    this.network = bitcoin.networks.testnet;
    this.apiUrl = 'https://blockstream.info/testnet/api';
  }

  generateWallet() {
    try {
      const keyPair = ECPair.makeRandom({ network: this.network });
      
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: this.network
      });
      
      return {
        success: true,
        address: address,
        privateKey: keyPair.toWIF(),
        publicKey: keyPair.publicKey.toString('hex'),
        network: 'Bitcoin Testnet'
      };
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

      const seed = bip39.mnemonicToSeedSync(seedPhrase);
      const root = bip32.fromSeed(seed, this.network);
      const path = "m/44'/1'/0'/0/0";
      const child = root.derivePath(path);
      
      const keyPair = ECPair.fromPrivateKey(child.privateKey, { network: this.network });
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: this.network
      });
      
      return {
        success: true,
        mnemonic: seedPhrase,
        address: address,
        privateKey: keyPair.toWIF(),
        publicKey: keyPair.publicKey.toString('hex'),
        derivationPath: path,
        network: 'Bitcoin Testnet'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  importFromPrivateKey(privateKeyWIF) {
    try {
      const keyPair = ECPair.fromWIF(privateKeyWIF, this.network);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: this.network
      });
      
      return {
        success: true,
        address: address,
        privateKey: privateKeyWIF,
        publicKey: keyPair.publicKey.toString('hex'),
        network: 'Bitcoin Testnet'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getBalance(address) {
    try {
      console.log(`Fetching balance for ${address}...`);
      const response = await axios.get(`${this.apiUrl}/address/${address}`, { 
        timeout: 30000,
        headers: { 'User-Agent': 'BitcoinWallet/1.0' }
      });
      
      const data = response.data;
      const balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
      
      console.log(`Balance for ${address}: ${balance} BTC`);
      return {
        success: true,
        address: address,
        balance: balance,
        transactions: data.chain_stats.tx_count
      };
    } catch (error) {
      console.error(`Balance fetch error:`, error.message);
      if (error.response?.status === 404) {
        return { success: true, address: address, balance: 0, transactions: 0 };
      }
      return { success: false, error: error.message };
    }
  }

  async getUTXOs(address) {
    try {
      console.log(`Fetching UTXOs for ${address}...`);
      const response = await axios.get(`${this.apiUrl}/address/${address}/utxo`, { 
        timeout: 30000,
        headers: { 'User-Agent': 'BitcoinWallet/1.0' }
      });
      console.log(`Found ${response.data.length} UTXOs`);
      return { success: true, utxos: response.data };
    } catch (error) {
      console.error(`UTXO fetch error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getRawTransaction(txid, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching raw transaction ${txid} (attempt ${i + 1})`);
        const response = await axios.get(`${this.apiUrl}/tx/${txid}/hex`, { 
          timeout: 20000,
          headers: { 'User-Agent': 'BitcoinWallet/1.0' }
        });
        return { success: true, rawTx: response.data };
      } catch (error) {
        if (i === retries - 1) {
          return { success: false, error: error.message };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async sendBitcoin(fromAddress, toAddress, amountBTC, privateKeyWIF) {
    try {
      console.log(`\n=== BITCOIN TRANSACTION ===`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amountBTC} BTC`);

      if (!fromAddress || !toAddress || !amountBTC || !privateKeyWIF) {
        throw new Error('Missing required parameters');
      }

      if (amountBTC <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const balanceResult = await this.getBalance(fromAddress);
      if (!balanceResult.success) {
        throw new Error(`Failed to check balance: ${balanceResult.error}`);
      }

      console.log(`Available balance: ${balanceResult.balance} BTC`);

      if (balanceResult.balance <= 0) {
        throw new Error('No funds available in wallet');
      }

      const utxoResult = await this.getUTXOs(fromAddress);
      if (!utxoResult.success || utxoResult.utxos.length === 0) {
        throw new Error('No UTXOs available for spending');
      }

      const keyPair = ECPair.fromWIF(privateKeyWIF, this.network);
      
      const { address: derivedAddress } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: this.network
      });

      if (derivedAddress !== fromAddress) {
        throw new Error('Private key does not match the from address');
      }

      const psbt = new bitcoin.Psbt({ network: this.network });

      let inputSum = 0;
      const targetAmount = Math.floor(amountBTC * 100000000);
      const feeAmount = 2000;

      console.log(`Target: ${targetAmount} sats, Fee: ${feeAmount} sats`);

      for (const utxo of utxoResult.utxos) {
        if (inputSum >= targetAmount + feeAmount) break;
        
        const rawTxResult = await this.getRawTransaction(utxo.txid);
        if (!rawTxResult.success) continue;
        
        try {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            nonWitnessUtxo: Buffer.from(rawTxResult.rawTx, 'hex')
          });
          
          inputSum += utxo.value;
          console.log(`Added UTXO: ${utxo.value} sats, Total: ${inputSum} sats`);
        } catch (error) {
          console.warn(`Failed to add UTXO:`, error.message);
        }
      }

      if (inputSum < targetAmount + feeAmount) {
        throw new Error(`Insufficient balance. Need ${(targetAmount + feeAmount) / 100000000} BTC`);
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

      console.log('Signing transaction...');
      psbt.signAllInputs(keyPair);
      psbt.finalizeAllInputs();

      const txHex = psbt.extractTransaction().toHex();
      const txId = psbt.extractTransaction().getId();
      
      console.log(`Transaction ID: ${txId}`);

      console.log('Broadcasting...');
      await axios.post(`${this.apiUrl}/tx`, txHex, {
        headers: { 
          'Content-Type': 'text/plain',
          'User-Agent': 'BitcoinWallet/1.0'
        },
        timeout: 30000
      });

      console.log('Transaction sent successfully!');
      return {
        success: true,
        txid: txId,
        fee: feeAmount / 100000000,
        explorerUrl: `https://blockstream.info/testnet/tx/${txId}`,
        message: 'Transaction sent successfully'
      };

    } catch (error) {
      console.error('Transaction failed:', error.message);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  async getTransactionStatus(txid) {
    try {
      const response = await axios.get(`${this.apiUrl}/tx/${txid}`, { 
        timeout: 15000,
        headers: { 'User-Agent': 'BitcoinWallet/1.0' }
      });
      const tx = response.data;
      
      return {
        success: true,
        txid: tx.txid,
        status: tx.status.confirmed ? 'Confirmed' : 'Unconfirmed',
        confirmations: tx.status.block_height ? 1 : 0,
        fee: tx.fee / 100000000,
        explorerUrl: `https://blockstream.info/testnet/tx/${txid}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getFaucets() {
    return [
      'https://bitcoinfaucet.uo1.net/',
      'https://testnet-faucet.mempool.co/',
      'https://coinfaucet.eu/en/btc-testnet/'
    ];
  }
}

module.exports = BitcoinWallet; 