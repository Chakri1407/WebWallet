// Litecoin_wallet.js - Litecoin Testnet Wallet
const bitcoin = require('bitcoinjs-lib');
const axios = require('axios');
const bip39 = require('bip39');
const bip32 = require('bip32');
const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');

const ECPair = ECPairFactory.default(ecc);

// Litecoin Testnet Configuration
const LITECOIN_CONFIG = {
  name: 'Litecoin Testnet',
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
};

class LitecoinWallet {
  constructor() {
    this.network = LITECOIN_CONFIG.network;
    console.log(`✅ Litecoin Testnet wallet initialized`);
  }

  // ========== WALLET GENERATION ==========

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
        network: LITECOIN_CONFIG.name,
        addressType: 'P2PKH (Legacy)'
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
      const root = bip32.BIP32Factory(ecc).fromSeed(seed, this.network);
      
      // Litecoin derivation path: m/44'/2'/0'/0/0
      const path = "m/44'/2'/0'/0/0";
      const child = root.derivePath(path);
      
      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: this.network
      });

      return {
        success: true,
        mnemonic: seedPhrase,
        address: address,
        privateKey: child.toWIF(),
        publicKey: child.publicKey.toString('hex'),
        derivationPath: path,
        network: LITECOIN_CONFIG.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  importFromPrivateKey(privateKey) {
    try {
      const keyPair = ECPair.fromWIF(privateKey, this.network);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: this.network
      });

      return {
        success: true,
        address: address,
        privateKey: keyPair.toWIF(),
        publicKey: keyPair.publicKey.toString('hex'),
        network: LITECOIN_CONFIG.name
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== BALANCE OPERATIONS ==========

  async getBalance(address) {
    try {
      // Try BlockCypher first
      try {
        const response = await axios.get(`${LITECOIN_CONFIG.apiUrl}/addrs/${address}/balance`);
        const satoshis = response.data.final_balance;
        const balance = satoshis / Math.pow(10, LITECOIN_CONFIG.decimals);

        return {
          success: true,
          address: address,
          balance: balance,
          balanceSatoshis: satoshis,
          unconfirmedBalance: response.data.unconfirmed_balance / Math.pow(10, LITECOIN_CONFIG.decimals),
          symbol: LITECOIN_CONFIG.symbol,
          network: LITECOIN_CONFIG.name
        };
      } catch (apiError) {
        // Fallback to alternative API (Blockstream)
        console.log('BlockCypher failed, trying alternative API...');
        
        // Use litecoinspace.org API as fallback
        const altApiUrl = `https://litecoinspace.org/testnet/api/address/${address}`;
        const altResponse = await axios.get(altApiUrl);
        
        const confirmedBalance = altResponse.data.chain_stats.funded_txo_sum - altResponse.data.chain_stats.spent_txo_sum;
        const unconfirmedBalance = altResponse.data.mempool_stats.funded_txo_sum - altResponse.data.mempool_stats.spent_txo_sum;
        
        const balance = confirmedBalance / Math.pow(10, LITECOIN_CONFIG.decimals);
        const unconfirmed = unconfirmedBalance / Math.pow(10, LITECOIN_CONFIG.decimals);

        return {
          success: true,
          address: address,
          balance: balance,
          balanceSatoshis: confirmedBalance,
          unconfirmedBalance: unconfirmed,
          symbol: LITECOIN_CONFIG.symbol,
          network: LITECOIN_CONFIG.name
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }

  async getUTXOs(address) {
    try {
      // Try BlockCypher first
      try {
        const response = await axios.get(`${LITECOIN_CONFIG.apiUrl}/addrs/${address}?unspentOnly=true`);
        
        return {
          success: true,
          utxos: response.data.txrefs || [],
          count: response.data.txrefs?.length || 0
        };
      } catch (apiError) {
        // Fallback to alternative API
        console.log('BlockCypher UTXO failed, trying alternative...');
        
        const altApiUrl = `https://litecoinspace.org/testnet/api/address/${address}/utxo`;
        const altResponse = await axios.get(altApiUrl);
        
        // Convert to BlockCypher format
        const utxos = altResponse.data.map(utxo => ({
          tx_hash: utxo.txid,
          tx_output_n: utxo.vout,
          value: utxo.value
        }));
        
        return {
          success: true,
          utxos: utxos,
          count: utxos.length
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }

  // ========== SEND TRANSACTION ==========

  async sendLTC(fromAddress, toAddress, amount, privateKey) {
    try {
      console.log(`\n=== LITECOIN TESTNET TRANSACTION ===`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amount} LTC`);

      // Get UTXOs
      const utxoResult = await this.getUTXOs(fromAddress);
      if (!utxoResult.success || utxoResult.count === 0) {
        throw new Error('No UTXOs available. Make sure address has funds.');
      }

      const utxos = utxoResult.utxos;
      const keyPair = ECPair.fromWIF(privateKey, this.network);

      // Convert amount to satoshis
      const amountSatoshis = Math.floor(amount * Math.pow(10, LITECOIN_CONFIG.decimals));
      
      // Estimate fee (simplified: 1000 satoshis per input + 1000 per output)
      const estimatedFee = (utxos.length * 1000) + (2 * 1000);
      const totalNeeded = amountSatoshis + estimatedFee;

      // Select UTXOs
      let selectedUTXOs = [];
      let totalInput = 0;
      
      for (const utxo of utxos) {
        selectedUTXOs.push(utxo);
        totalInput += utxo.value;
        if (totalInput >= totalNeeded) break;
      }

      if (totalInput < totalNeeded) {
        throw new Error(`Insufficient funds. Need ${totalNeeded} satoshis, have ${totalInput}`);
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network: this.network });

      // Add inputs
      for (const utxo of selectedUTXOs) {
        const txHex = await this.getTransactionHex(utxo.tx_hash);
        psbt.addInput({
          hash: utxo.tx_hash,
          index: utxo.tx_output_n,
          nonWitnessUtxo: Buffer.from(txHex, 'hex')
        });
      }

      // Add outputs
      psbt.addOutput({
        address: toAddress,
        value: amountSatoshis
      });

      // Add change output if needed
      const change = totalInput - amountSatoshis - estimatedFee;
      if (change > 546) { // Dust threshold
        psbt.addOutput({
          address: fromAddress,
          value: change
        });
      }

      // Sign all inputs
      selectedUTXOs.forEach((_, index) => {
        psbt.signInput(index, keyPair);
      });

      psbt.finalizeAllInputs();
      const txHex = psbt.extractTransaction().toHex();

      // Broadcast transaction
      const broadcastResult = await this.broadcastTransaction(txHex);

      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error);
      }

      console.log(`Transaction sent: ${broadcastResult.txHash}`);

      return {
        success: true,
        txHash: broadcastResult.txHash,
        from: fromAddress,
        to: toAddress,
        amount: amount,
        fee: estimatedFee / Math.pow(10, LITECOIN_CONFIG.decimals),
        explorerUrl: `${LITECOIN_CONFIG.explorerUrl}/tx/${broadcastResult.txHash}`,
        network: LITECOIN_CONFIG.name
      };

    } catch (error) {
      console.error('Transaction failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getTransactionHex(txHash) {
    try {
      // Try BlockCypher first
      try {
        const response = await axios.get(`${LITECOIN_CONFIG.apiUrl}/txs/${txHash}?includeHex=true`);
        return response.data.hex;
      } catch (apiError) {
        // Fallback to alternative API
        console.log('BlockCypher tx hex failed, trying alternative...');
        const altApiUrl = `https://litecoinspace.org/testnet/api/tx/${txHash}/hex`;
        const altResponse = await axios.get(altApiUrl);
        return altResponse.data;
      }
    } catch (error) {
      throw new Error(`Failed to get transaction hex: ${error.message}`);
    }
  }

  async broadcastTransaction(txHex) {
    try {
      // Try BlockCypher first
      try {
        const response = await axios.post(`${LITECOIN_CONFIG.apiUrl}/txs/push`, {
          tx: txHex
        });

        return {
          success: true,
          txHash: response.data.tx.hash
        };
      } catch (apiError) {
        // Fallback to alternative API
        console.log('BlockCypher broadcast failed, trying alternative...');
        const altApiUrl = 'https://litecoinspace.org/testnet/api/tx';
        const altResponse = await axios.post(altApiUrl, txHex, {
          headers: { 'Content-Type': 'text/plain' }
        });
        
        return {
          success: true,
          txHash: altResponse.data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // ========== TRANSACTION INFO ==========

  async getTransactionStatus(txHash) {
    try {
      const response = await axios.get(`${LITECOIN_CONFIG.apiUrl}/txs/${txHash}`);
      const tx = response.data;

      return {
        success: true,
        hash: tx.hash,
        blockHeight: tx.block_height,
        confirmations: tx.confirmations,
        confirmed: tx.confirmations > 0,
        fees: tx.fees,
        inputs: tx.inputs.length,
        outputs: tx.outputs.length,
        explorerUrl: `${LITECOIN_CONFIG.explorerUrl}/tx/${txHash}`,
        network: LITECOIN_CONFIG.name
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }

  // ========== UTILITY METHODS ==========

  getFaucetInfo() {
    return {
      network: LITECOIN_CONFIG.name,
      faucets: LITECOIN_CONFIG.faucets,
      symbol: LITECOIN_CONFIG.symbol
    };
  }

  isValidAddress(address) {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch (error) {
      return false;
    }
  }

  static getNetworkConfig() {
    return LITECOIN_CONFIG;
  }
}

module.exports = { LitecoinWallet, LITECOIN_CONFIG }; 