// uniswap_testnet_integration.js - Uniswap V2 Router for Testnet Swaps
const { ethers } = require('ethers');

// Uniswap V2 Router ABI
const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function WETH() external pure returns (address)"
];

// ERC20 ABI
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Testnet DEX Router Addresses
const TESTNET_ROUTERS = {
  11155111: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', // Ethereum Sepolia - Uniswap V2
  80002: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',    // Polygon Amoy - Uniswap V2 Router
  421614: '0x101F443B4d1b059569D643917553c771E1b9663E',   // Arbitrum Sepolia
  84532: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',    // Base Sepolia
  97: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',       // BNB Testnet - PancakeSwap
  43113: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901',    // Avalanche Fuji
  338: '0x145677FC4d9b8F19B5D56d1820c48e0443049a30',      // Cronos Testnet
  44787: '0x1421bDe4B10e8dd459b3BCb598810B1337D56842'     // Celo Alfajores
};

// Wrapped Native Token Addresses - CORRECTED
const WRAPPED_NATIVE = {
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH (Sepolia)
  80002: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9',    // WMATIC (Amoy) - Verified correct
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',   // WETH (Arbitrum Sepolia)
  84532: '0x4200000000000000000000000000000000000006',    // WETH (Base Sepolia)
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',       // WBNB (BSC Testnet)
  43113: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c',    // WAVAX (Fuji)
  338: '0x6a3173618859C7cd40fAF6921b5E9eB6A76f1fD4',      // WCRO (Cronos Testnet)
  44787: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9'     // CELO (Alfajores)
};

// Common Testnet Token Addresses (examples)
const TESTNET_TOKENS = {
  // Polygon Amoy
  80002: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    USDT: '0xfd5840cd36d94d7229439859c0112a4185bc0255',
    DAI: '0x9a753f0f7886c9fbf63cf59d0d4423c5eface95b',
  },
  // Add more as needed
};

class UniswapTestnetIntegration {
  constructor(chainId, provider) {
    this.chainId = chainId;
    this.provider = provider;
    this.routerAddress = TESTNET_ROUTERS[chainId];
    this.wrappedNativeAddress = WRAPPED_NATIVE[chainId];

    if (!this.routerAddress) {
      throw new Error(`No DEX router configured for chain ID ${chainId}`);
    }

    this.router = new ethers.Contract(
      this.routerAddress,
      UNISWAP_V2_ROUTER_ABI,
      provider
    );

    console.log(`✅ Uniswap Router initialized for chain ${chainId}`);
    console.log(`   Router: ${this.routerAddress}`);
    console.log(`   Wrapped Native: ${this.wrappedNativeAddress}`);
  }

  /**
   * Check if this is a wrap/unwrap operation
   */
  isWrapOperation(fromToken, toToken) {
    const isFromNative = fromToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const isToNative = toToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const isFromWrapped = fromToken.toLowerCase() === this.wrappedNativeAddress.toLowerCase();
    const isToWrapped = toToken.toLowerCase() === this.wrappedNativeAddress.toLowerCase();

    // Native → Wrapped or Wrapped → Native
    return (isFromNative && isToWrapped) || (isFromWrapped && isToNative);
  }

  /**
   * Get quote for token swap
   */
  async getQuote(fromToken, toToken, amount) {
    try {
      console.log('\n=== GETTING SWAP QUOTE ===');
      console.log(`From: ${fromToken}`);
      console.log(`To: ${toToken}`);
      console.log(`Amount: ${amount}`);

      // Check if this is a wrap/unwrap (1:1 exchange)
      if (this.isWrapOperation(fromToken, toToken)) {
        console.log('This is a wrap/unwrap operation (1:1 exchange)');
        
        const fromTokenInfo = await this.getTokenInfo(fromToken);
        const toTokenInfo = await this.getTokenInfo(toToken);

        return {
          success: true,
          chainId: this.chainId,
          fromToken: fromTokenInfo,
          toToken: toTokenInfo,
          fromTokenAmount: amount.toString(),
          toTokenAmount: amount.toString(), // 1:1 for wrap/unwrap
          path: [fromToken, toToken],
          router: this.routerAddress,
          isWrapOperation: true
        };
      }

      // Build path for regular swap
      const path = this.buildPath(fromToken, toToken);
      console.log(`Path: ${path.join(' → ')}`);

      // Get amounts out
      try {
        const amounts = await this.router.getAmountsOut(amount, path);
        const outputAmount = amounts[amounts.length - 1];

        // Get token info
        const fromTokenInfo = await this.getTokenInfo(fromToken);
        const toTokenInfo = await this.getTokenInfo(toToken);

        console.log(`Quote: ${ethers.formatUnits(amount, fromTokenInfo.decimals)} ${fromTokenInfo.symbol} → ${ethers.formatUnits(outputAmount, toTokenInfo.decimals)} ${toTokenInfo.symbol}`);

        return {
          success: true,
          chainId: this.chainId,
          fromToken: fromTokenInfo,
          toToken: toTokenInfo,
          fromTokenAmount: amount.toString(),
          toTokenAmount: outputAmount.toString(),
          path: path,
          router: this.routerAddress,
          isWrapOperation: false
        };
      } catch (routerError) {
        console.error('Router call failed:', routerError.message);
        
        // Return helpful error message
        return {
          success: false,
          error: 'No liquidity available for this token pair',
          details: 'This token pair may not have a liquidity pool on this testnet.',
          suggestion: 'Try POL ↔ WMATIC (wrap/unwrap) or switch to BNB Testnet for more token pairs.'
        };
      }
    } catch (error) {
      console.error('Quote error:', error.message);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get swap quote. Check if token addresses are valid.'
      };
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress) {
    try {
      // Check if it's native token
      if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return {
          address: tokenAddress,
          symbol: this.getNativeSymbol(),
          name: this.getNativeSymbol(),
          decimals: 18,
          isNative: true
        };
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);

      return {
        address: tokenAddress,
        symbol,
        name,
        decimals: Number(decimals),
        isNative: false
      };
    } catch (error) {
      console.error('Token info error:', error.message);
      throw error;
    }
  }

  /**
   * Get native token symbol based on chain
   */
  getNativeSymbol() {
    const symbols = {
      11155111: 'ETH',
      80002: 'POL',
      421614: 'ETH',
      84532: 'ETH',
      97: 'BNB',
      43113: 'AVAX',
      338: 'CRO',
      44787: 'CELO'
    };
    return symbols[this.chainId] || 'ETH';
  }

  /**
   * Build swap path
   */
  buildPath(fromToken, toToken) {
    const isFromNative = fromToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const isToNative = toToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    // If from is native, use wrapped native
    const from = isFromNative ? this.wrappedNativeAddress : fromToken;
    const to = isToNative ? this.wrappedNativeAddress : toToken;

    // Check if trying to swap token to itself (shouldn't happen)
    if (from.toLowerCase() === to.toLowerCase()) {
      console.warn('Warning: Trying to swap token to itself!');
      console.warn(`From: ${from}, To: ${to}`);
      // If swapping native to wrapped (or vice versa), this is actually a wrap/unwrap
      // For now, return the path anyway - the router will handle it
    }

    // Direct path (most common)
    return [from, to];
  }

  /**
   * Check token allowance
   */
  async checkAllowance(tokenAddress, walletAddress) {
    try {
      if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return {
          success: true,
          allowance: ethers.MaxUint256.toString(),
          needsApproval: false,
          message: 'Native token does not require approval'
        };
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const allowance = await tokenContract.allowance(walletAddress, this.routerAddress);

      return {
        success: true,
        allowance: allowance.toString(),
        spenderAddress: this.routerAddress,
        needsApproval: allowance === 0n
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve token
   */
  async approveToken(tokenAddress, wallet, amount = null) {
    try {
      console.log('\n=== APPROVING TOKEN ===');
      console.log(`Token: ${tokenAddress}`);
      console.log(`Spender: ${this.routerAddress}`);

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      const approvalAmount = amount || ethers.MaxUint256;

      const tx = await tokenContract.approve(this.routerAddress, approvalAmount);
      console.log(`Approval tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log('Approval confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Approval error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute swap
   */
  async executeSwap(fromToken, toToken, amount, wallet, slippagePercent = 1) {
    try {
      console.log('\n=== EXECUTING SWAP ===');

      // Check if this is a wrap/unwrap operation
      if (this.isWrapOperation(fromToken, toToken)) {
        return await this.executeWrapUnwrap(fromToken, toToken, amount, wallet);
      }

      // Get quote first for regular swaps
      const quote = await this.getQuote(fromToken, toToken, amount);
      if (!quote.success) {
        throw new Error('Failed to get quote: ' + quote.error);
      }

      // Calculate minimum output with slippage
      const minOutput = (BigInt(quote.toTokenAmount) * BigInt(100 - slippagePercent)) / 100n;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      console.log(`Min output (${slippagePercent}% slippage): ${ethers.formatUnits(minOutput, quote.toToken.decimals)} ${quote.toToken.symbol}`);
      console.log(`Deadline: ${new Date(deadline * 1000).toISOString()}`);

      const router = new ethers.Contract(this.routerAddress, UNISWAP_V2_ROUTER_ABI, wallet);

      let tx;
      const isFromNative = fromToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const isToNative = toToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      // Build proper path for router
      const path = [];
      if (isFromNative) {
        path.push(this.wrappedNativeAddress);
      } else {
        path.push(fromToken);
      }
      
      if (isToNative) {
        path.push(this.wrappedNativeAddress);
      } else {
        path.push(toToken);
      }

      console.log(`Router path: ${path.join(' → ')}`);

      if (isFromNative) {
        // Native → Token
        console.log('Swap type: Native → ERC20');
        tx = await router.swapExactETHForTokens(
          minOutput,
          path,
          wallet.address,
          deadline,
          { value: amount }
        );
      } else if (isToNative) {
        // Token → Native
        console.log('Swap type: ERC20 → Native');
        tx = await router.swapExactTokensForETH(
          amount,
          minOutput,
          path,
          wallet.address,
          deadline
        );
      } else {
        // Token → Token
        console.log('Swap type: ERC20 → ERC20');
        tx = await router.swapExactTokensForTokens(
          amount,
          minOutput,
          path,
          wallet.address,
          deadline
        );
      }

      console.log(`Swap tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log('Swap confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        fromAmount: ethers.formatUnits(amount, quote.fromToken.decimals),
        toAmount: ethers.formatUnits(quote.toTokenAmount, quote.toToken.decimals)
      };
    } catch (error) {
      console.error('Swap error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute wrap/unwrap operation
   */
  async executeWrapUnwrap(fromToken, toToken, amount, wallet) {
    try {
      console.log('\n=== EXECUTING WRAP/UNWRAP ===');
      
      const isFromNative = fromToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const WETH_ABI = [
        "function deposit() payable",
        "function withdraw(uint256 amount)"
      ];

      const wrappedContract = new ethers.Contract(this.wrappedNativeAddress, WETH_ABI, wallet);

      let tx;
      if (isFromNative) {
        // Wrap: Native → Wrapped
        console.log(`Wrapping ${ethers.formatEther(amount)} native token...`);
        tx = await wrappedContract.deposit({ value: amount });
      } else {
        // Unwrap: Wrapped → Native
        console.log(`Unwrapping ${ethers.formatEther(amount)} wrapped token...`);
        tx = await wrappedContract.withdraw(amount);
      }

      console.log(`Wrap/Unwrap tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log('Wrap/Unwrap confirmed!');

      const fromTokenInfo = await this.getTokenInfo(fromToken);
      const toTokenInfo = await this.getTokenInfo(toToken);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        fromToken: fromTokenInfo,
        toToken: toTokenInfo,
        fromAmount: ethers.formatUnits(amount, 18),
        toAmount: ethers.formatUnits(amount, 18), // 1:1 for wrap/unwrap
        isWrapOperation: true
      };
    } catch (error) {
      console.error('Wrap/Unwrap error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute swap with auto approval
   */
  async swapWithAutoApproval(fromToken, toToken, amount, wallet, slippagePercent = 1) {
    try {
      // Check if approval needed
      if (fromToken.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        console.log('Checking token allowance...');

        const allowanceResult = await this.checkAllowance(fromToken, wallet.address);
        if (!allowanceResult.success) {
          throw new Error('Failed to check allowance: ' + allowanceResult.error);
        }

        const currentAllowance = BigInt(allowanceResult.allowance);
        const requiredAmount = BigInt(amount);

        if (currentAllowance < requiredAmount) {
          console.log('Insufficient allowance, approving...');
          const approvalResult = await this.approveToken(fromToken, wallet);

          if (!approvalResult.success) {
            throw new Error('Approval failed: ' + approvalResult.error);
          }

          console.log('Approval successful, waiting 3 seconds...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('Sufficient allowance available');
        }
      }

      // Execute swap
      return await this.executeSwap(fromToken, toToken, amount, wallet, slippagePercent);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { UniswapTestnetIntegration, TESTNET_ROUTERS, WRAPPED_NATIVE }; 