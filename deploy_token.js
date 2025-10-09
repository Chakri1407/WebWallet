// deploy_token.js - Deploy SPL Token on Solana Devnet (Using Existing Wallet)
const { 
  Connection, 
  Keypair, 
  PublicKey,
  clusterApiUrl
} = require('@solana/web3.js');

const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint
} = require('@solana/spl-token');

// ========== CONFIGURATION ==========
// Your existing wallet details
const YOUR_WALLET = {
  address: 'Ha8xAt36P3SwUZzTXZFPpda3DzcwgKFafeQYLsAN13fd',
  privateKeyBase58: '38tBakJrZSJcHi95EB3av8g1NoJWYNuCmkoiySQK86r5sadQbbwgqK3BwQKTNpMnhjJ7SMyL7FHecUeuj7gXDmhR'
};

const TOKEN_DECIMALS = 6;           // 6 decimals (like USDC)
const MINT_AMOUNT = 1000000;        // 1 million tokens

// Token info (for reference only, not stored on-chain)
const TOKEN_INFO = {
  name: 'My Test Token',
  symbol: 'MTT',
  description: 'A test token deployed on Solana Devnet'
};

// Helper function to decode Base58 private key
function base58Decode(str) {
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

async function deployToken() {
  try {
    console.log('🚀 Starting SPL Token Deployment on Devnet...\n');
    console.log('📝 Token Info (for reference):');
    console.log(`   Name: ${TOKEN_INFO.name}`);
    console.log(`   Symbol: ${TOKEN_INFO.symbol}`);
    console.log(`   Description: ${TOKEN_INFO.description}`);
    console.log(`   Decimals: ${TOKEN_DECIMALS}`);
    console.log(`   Initial Supply: ${MINT_AMOUNT.toLocaleString()}`);

    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    console.log('\n✅ Connected to Solana Devnet');

    // Import your existing wallet using Base58 private key
    console.log('\n🔑 Importing your wallet...');
    const secretKey = base58Decode(YOUR_WALLET.privateKeyBase58);
    const payer = Keypair.fromSecretKey(secretKey);
    
    console.log('✅ Wallet imported successfully!');
    console.log('   Address:', payer.publicKey.toString());
    
    // Verify it matches
    if (payer.publicKey.toString() !== YOUR_WALLET.address) {
      throw new Error('Private key does not match the expected address!');
    }

    // Check SOL balance
    console.log('\n💰 Checking SOL balance...');
    const balance = await connection.getBalance(payer.publicKey);
    const balanceSOL = balance / 1e9;
    console.log(`   Balance: ${balanceSOL.toFixed(9)} SOL`);
    
    if (balanceSOL < 0.01) {
      console.log('\n⚠️  WARNING: Low SOL balance!');
      console.log('   You need at least 0.01 SOL to deploy a token.');
      console.log('   Please get SOL from a faucet:');
      console.log('   - https://faucet.solana.com');
      console.log('   - https://solfaucet.com');
      throw new Error('Insufficient SOL balance');
    }

    // Create the token mint
    console.log('\n🪙 Creating SPL Token (this will cost ~0.002 SOL)...');
    const mint = await createMint(
      connection,
      payer,                    // Payer (your wallet)
      payer.publicKey,          // Mint authority (your wallet)
      payer.publicKey,          // Freeze authority (your wallet)
      TOKEN_DECIMALS            // Decimals
    );

    console.log('\n✅ TOKEN CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 Token Mint Address:', mint.toString());
    console.log('═══════════════════════════════════════════════');

    // Get mint info
    const mintInfo = await getMint(connection, mint);
    console.log('\n📊 Token Information:');
    console.log('   Decimals:', mintInfo.decimals);
    console.log('   Supply:', mintInfo.supply.toString());
    console.log('   Mint Authority:', mintInfo.mintAuthority.toString());

    // Create token account for your wallet
    console.log('\n💼 Creating token account for your wallet...');
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );
    console.log('✅ Token Account:', tokenAccount.address.toString());

    // Mint tokens directly to your wallet
    console.log('\n⚡ Minting tokens to your wallet...');
    const mintAmount = MINT_AMOUNT * Math.pow(10, mintInfo.decimals);
    const mintSignature = await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer.publicKey,
      mintAmount
    );
    console.log(`✅ Minted ${MINT_AMOUNT.toLocaleString()} ${TOKEN_INFO.symbol} tokens!`);
    console.log('   Transaction:', mintSignature);

    // Verify balance
    console.log('\n🔍 Verifying token balance...');
    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.address);
    const finalBalance = Number(tokenBalance.value.amount) / Math.pow(10, TOKEN_DECIMALS);
    console.log(`   Your Token Balance: ${finalBalance.toLocaleString()} ${TOKEN_INFO.symbol}`);

    // Check remaining SOL
    const finalSOLBalance = await connection.getBalance(payer.publicKey);
    console.log(`   Remaining SOL: ${(finalSOLBalance / 1e9).toFixed(9)} SOL`);

    // Final Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('🎊 DEPLOYMENT COMPLETE!');
    console.log('═══════════════════════════════════════════════');
    console.log('\n📋 TOKEN DETAILS:\n');
    
    console.log('💎 TOKEN INFORMATION:');
    console.log(`   Name: ${TOKEN_INFO.name}`);
    console.log(`   Symbol: ${TOKEN_INFO.symbol}`);
    console.log('   Token Mint Address:');
    console.log('   ' + mint.toString());
    console.log('   Decimals:', TOKEN_DECIMALS);
    console.log('   Total Supply:', MINT_AMOUNT.toLocaleString());
    
    console.log('\n👤 YOUR WALLET:');
    console.log('   Address:', payer.publicKey.toString());
    console.log('   Token Account:', tokenAccount.address.toString());
    console.log(`   Token Balance: ${finalBalance.toLocaleString()} ${TOKEN_INFO.symbol}`);

    console.log('\n🔗 EXPLORER LINKS:');
    console.log('   Token Mint:');
    console.log('   https://explorer.solana.com/address/' + mint.toString() + '?cluster=devnet');
    console.log('\n   Mint Transaction:');
    console.log('   https://explorer.solana.com/tx/' + mintSignature + '?cluster=devnet');
    console.log('\n   Your Wallet:');
    console.log('   https://explorer.solana.com/address/' + payer.publicKey.toString() + '?cluster=devnet');
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ All tokens are now in your wallet!');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Copy the Token Mint Address above');
    console.log('   2. Open your wallet frontend: http://localhost:3003');
    console.log('   3. Import your wallet using the private key');
    console.log('   4. Go to "SPL Tokens" tab');
    console.log('   5. Paste the Token Mint Address');
    console.log('   6. Click "Check Token Balance"');
    console.log('   7. You should see your 1,000,000 tokens! 🎉');
    console.log('═══════════════════════════════════════════════\n');

    return {
      tokenAddress: mint.toString(),
      tokenName: TOKEN_INFO.name,
      tokenSymbol: TOKEN_INFO.symbol,
      decimals: TOKEN_DECIMALS,
      totalSupply: MINT_AMOUNT,
      walletAddress: payer.publicKey.toString(),
      tokenAccount: tokenAccount.address.toString(),
      mintSignature: mintSignature,
      tokenBalance: finalBalance
    };

  } catch (error) {
    console.error('\n❌ Error deploying token:', error.message);
    
    if (error.message.includes('airdrop')) {
      console.log('\n💡 TIP: The devnet faucet might be rate-limited.');
      console.log('   Try these alternatives:');
      console.log('   1. Wait 5-10 minutes and try again');
      console.log('   2. Use web faucets:');
      console.log('      - https://faucet.solana.com');
      console.log('      - https://solfaucet.com');
    }
    
    throw error;
  }
}

// Run the deployment
if (require.main === module) {
  deployToken()
    .then(result => {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed');
      process.exit(1);
    });
}

module.exports = { deployToken }; 