// layerzero_bridge.js - LayerZero Cross-Chain Token Bridge
const { ethers } = require('ethers');
const { 
  LAYERZERO_ENDPOINTS, 
  LAYERZERO_OFT_ADAPTER_ABI,
  DEFAULT_ENFORCED_OPTIONS,
  GAS_LIMITS,
  addressToBytes32,
  bytes32ToAddress,
  createEnforcedOptions
} = require('./layerzero_config');

// ERC20 ABI for approvals
const ERC20_APPROVAL_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

class LayerZeroBridge {
  constructor(sourceNetworkKey, networks) {
    if (!LAYERZERO_ENDPOINTS[sourceNetworkKey]) {
      throw new Error(`LayerZero not supported for network: ${sourceNetworkKey}`);
    }

    this.sourceNetwork = networks[sourceNetworkKey];
    this.sourceNetworkKey = sourceNetworkKey;
    this.layerzeroConfig = LAYERZERO_ENDPOINTS[sourceNetworkKey];
    this.networks = networks;
    
    try {
      this.provider = new ethers.JsonRpcProvider(this.sourceNetwork.rpcUrl);
      console.log(`✅ LayerZero Bridge initialized for ${this.sourceNetwork.name}`);
    } catch (error) {
      console.error(`❌ Failed to initialize LayerZero Bridge:`, error.message);
      throw error;
    }
  }

  // ========== BRIDGE INFORMATION ==========

  getSupportedNetworks() {
    return Object.entries(LAYERZERO_ENDPOINTS)
      .filter(([key]) => key !== this.sourceNetworkKey)
      .map(([key, config]) => ({
        key: key,
        name: config.name,
        endpointId: config.endpointId,
        chainId: this.networks[key]?.chainId
      }));
  }

  getDestinationEndpointId(destinationNetworkKey) {
    const endpoint = LAYERZERO_ENDPOINTS[destinationNetworkKey];
    if (!endpoint) {
      throw new Error(`LayerZero not supported for destination: ${destinationNetworkKey}`);
    }
    return endpoint.endpointId;
  }

  // ========== QUOTE & ESTIMATION ==========

  async quoteCrossChainSend(oftAdapterAddress, destinationNetworkKey, recipientAddress, amount) {
    try {
      console.log(`\n=== QUOTING CROSS-CHAIN TRANSFER ===`);
      console.log(`Source: ${this.sourceNetwork.name}`);
      console.log(`Destination: ${destinationNetworkKey}`);
      console.log(`Amount: ${amount}`);

      const dstEid = this.getDestinationEndpointId(destinationNetworkKey);
      const oftAdapter = new ethers.Contract(
        oftAdapterAddress, 
        LAYERZERO_OFT_ADAPTER_ABI, 
        this.provider
      );

      // Get token decimals
      const tokenAddress = await oftAdapter.token();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_APPROVAL_ABI, this.provider);
      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();

      const amountLD = ethers.parseUnits(amount.toString(), decimals);
      const minAmountLD = amountLD * 95n / 100n; // 5% slippage tolerance

      const sendParam = {
        dstEid: dstEid,
        to: addressToBytes32(recipientAddress),
        amountLD: amountLD,
        minAmountLD: minAmountLD,
        extraOptions: DEFAULT_ENFORCED_OPTIONS,
        composeMsg: '0x',
        oftCmd: '0x'
      };

      console.log('Requesting quote from LayerZero...');
      const feeQuote = await oftAdapter.quoteSend(sendParam, false);

      const nativeFeeEth = ethers.formatEther(feeQuote.nativeFee);
      
      console.log(`Quote received: ${nativeFeeEth} ${this.sourceNetwork.symbol}`);

      return {
        success: true,
        nativeFee: feeQuote.nativeFee.toString(),
        nativeFeeFormatted: parseFloat(nativeFeeEth),
        lzTokenFee: feeQuote.lzTokenFee.toString(),
        currency: this.sourceNetwork.symbol,
        amountToSend: amount,
        tokenSymbol: symbol,
        estimatedGas: GAS_LIMITS.CROSS_CHAIN_SEND,
        sourceNetwork: this.sourceNetwork.name,
        destinationNetwork: this.networks[destinationNetworkKey].name
      };

    } catch (error) {
      console.error('Quote error:', error.message);
      return { 
        success: false, 
        error: `Failed to get quote: ${error.message}` 
      };
    }
  }

  // ========== TOKEN APPROVAL ==========

  async approveTokenForBridge(tokenAddress, oftAdapterAddress, amount, privateKey) {
    try {
      console.log(`\n=== APPROVING TOKEN FOR BRIDGE ===`);
      console.log(`Token: ${tokenAddress}`);
      console.log(`OFT Adapter: ${oftAdapterAddress}`);

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_APPROVAL_ABI, wallet);

      // Get token info
      const [decimals, symbol, currentAllowance] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.allowance(wallet.address, oftAdapterAddress)
      ]);

      const amountToApprove = ethers.parseUnits(amount.toString(), decimals);

      console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, decimals)} ${symbol}`);

      if (currentAllowance >= amountToApprove) {
        console.log('Sufficient allowance already exists');
        return {
          success: true,
          message: 'Sufficient allowance already exists',
          currentAllowance: ethers.formatUnits(currentAllowance, decimals),
          symbol: symbol
        };
      }

      console.log(`Approving ${amount} ${symbol}...`);
      
      const tx = await tokenContract.approve(oftAdapterAddress, amountToApprove, {
        gasLimit: GAS_LIMITS.ADAPTER_APPROVAL
      });

      console.log(`Approval transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log('Approval confirmed!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        approvedAmount: amount,
        symbol: symbol,
        explorerUrl: `${this.sourceNetwork.explorerUrl}/tx/${receipt.hash}`,
        message: `Successfully approved ${amount} ${symbol} for bridging`
      };

    } catch (error) {
      console.error('Approval error:', error.message);
      return { 
        success: false, 
        error: `Token approval failed: ${error.message}` 
      };
    }
  }

  // ========== CROSS-CHAIN TRANSFER ==========

  async sendCrossChain(
    oftAdapterAddress,
    destinationNetworkKey,
    recipientAddress,
    amount,
    privateKey,
    slippageTolerance = 5
  ) {
    try {
      console.log(`\n=== CROSS-CHAIN TOKEN TRANSFER VIA LAYERZERO ===`);
      console.log(`Source: ${this.sourceNetwork.name}`);
      console.log(`Destination: ${this.networks[destinationNetworkKey].name}`);
      console.log(`Recipient: ${recipientAddress}`);
      console.log(`Amount: ${amount}`);

      // Validate inputs
      if (!ethers.isAddress(oftAdapterAddress)) {
        throw new Error('Invalid OFT Adapter address');
      }
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const oftAdapter = new ethers.Contract(
        oftAdapterAddress,
        LAYERZERO_OFT_ADAPTER_ABI,
        wallet
      );

      // Get token info
      const tokenAddress = await oftAdapter.token();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_APPROVAL_ABI, this.provider);
      
      const [decimals, symbol, balance] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.balanceOf(wallet.address)
      ]);

      console.log(`Token: ${symbol}, Balance: ${ethers.formatUnits(balance, decimals)}`);

      const amountLD = ethers.parseUnits(amount.toString(), decimals);

      // Check balance
      if (balance < amountLD) {
        throw new Error(`Insufficient ${symbol} balance. Need ${amount}, have ${ethers.formatUnits(balance, decimals)}`);
      }

      // Check approval
      const allowance = await tokenContract.allowance(wallet.address, oftAdapterAddress);
      if (allowance < amountLD) {
        return {
          success: false,
          error: 'Insufficient token approval',
          message: `Please approve ${amount} ${symbol} for the OFT Adapter first`,
          requiredApproval: amount,
          currentApproval: ethers.formatUnits(allowance, decimals),
          needsApproval: true
        };
      }

      const dstEid = this.getDestinationEndpointId(destinationNetworkKey);
      const minAmountLD = amountLD * BigInt(100 - slippageTolerance) / 100n;

      const sendParam = {
        dstEid: dstEid,
        to: addressToBytes32(recipientAddress),
        amountLD: amountLD,
        minAmountLD: minAmountLD,
        extraOptions: DEFAULT_ENFORCED_OPTIONS,
        composeMsg: '0x',
        oftCmd: '0x'
      };

      console.log('Getting fee quote...');
      const feeQuote = await oftAdapter.quoteSend(sendParam, false);
      console.log(`LayerZero fee: ${ethers.formatEther(feeQuote.nativeFee)} ${this.sourceNetwork.symbol}`);

      // Check native balance for fees
      const nativeBalance = await this.provider.getBalance(wallet.address);
      const requiredNative = feeQuote.nativeFee * 110n / 100n; // Add 10% buffer

      if (nativeBalance < requiredNative) {
        const needed = ethers.formatEther(requiredNative);
        const have = ethers.formatEther(nativeBalance);
        throw new Error(`Insufficient ${this.sourceNetwork.symbol} for fees. Need ~${needed}, have ${have}`);
      }

      const fee = {
        nativeFee: feeQuote.nativeFee,
        lzTokenFee: 0n
      };

      console.log('Sending cross-chain transaction...');
      
      const tx = await oftAdapter.send(
        sendParam,
        fee,
        wallet.address, // refund address
        {
          value: feeQuote.nativeFee,
          gasLimit: GAS_LIMITS.CROSS_CHAIN_SEND
        }
      );

      console.log(`Transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Transaction confirmed!');

      // Parse events to get LayerZero message GUID
      let guid = null;
      for (const log of receipt.logs) {
        try {
          const parsed = oftAdapter.interface.parseLog(log);
          if (parsed && parsed.name === 'OFTSent') {
            guid = parsed.args.guid;
            break;
          }
        } catch (e) {
          // Not an OFT event, skip
        }
      }

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        layerzeroGuid: guid,
        from: wallet.address,
        to: recipientAddress,
        amount: amount,
        symbol: symbol,
        sourceNetwork: this.sourceNetwork.name,
        destinationNetwork: this.networks[destinationNetworkKey].name,
        layerzeroFee: ethers.formatEther(feeQuote.nativeFee),
        feeCurrency: this.sourceNetwork.symbol,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${this.sourceNetwork.explorerUrl}/tx/${receipt.hash}`,
        layerZeroScanUrl: `https://testnet.layerzeroscan.com/tx/${receipt.hash}`,
        message: `Successfully bridged ${amount} ${symbol} to ${this.networks[destinationNetworkKey].name}`,
        estimatedDeliveryTime: '5-20 minutes'
      };

    } catch (error) {
      console.error('Cross-chain transfer error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========== PEER CONFIGURATION (FOR OFT ADAPTER DEPLOYMENT) ==========

  async configurePeer(oftAdapterAddress, destinationNetworkKey, destinationOftAddress, privateKey) {
    try {
      console.log(`\n=== CONFIGURING LAYERZERO PEER ===`);
      console.log(`Source: ${this.sourceNetwork.name}`);
      console.log(`Destination: ${destinationNetworkKey}`);

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const oftAdapter = new ethers.Contract(
        oftAdapterAddress,
        LAYERZERO_OFT_ADAPTER_ABI,
        wallet
      );

      const dstEid = this.getDestinationEndpointId(destinationNetworkKey);
      const peerBytes32 = addressToBytes32(destinationOftAddress);

      console.log(`Setting peer for EID ${dstEid}...`);
      
      const tx = await oftAdapter.setPeer(dstEid, peerBytes32);
      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log('Peer configured successfully!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        sourceNetwork: this.sourceNetwork.name,
        destinationNetwork: destinationNetworkKey,
        destinationEid: dstEid,
        peerAddress: destinationOftAddress,
        explorerUrl: `${this.sourceNetwork.explorerUrl}/tx/${receipt.hash}`
      };

    } catch (error) {
      console.error('Peer configuration error:', error.message);
      return {
        success: false,
        error: `Failed to configure peer: ${error.message}`
      };
    }
  }

  async setEnforcedOptions(oftAdapterAddress, destinationNetworkKey, privateKey, gasAmount = 200000) {
    try {
      console.log(`\n=== SETTING ENFORCED OPTIONS ===`);

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const oftAdapter = new ethers.Contract(
        oftAdapterAddress,
        LAYERZERO_OFT_ADAPTER_ABI,
        wallet
      );

      const dstEid = this.getDestinationEndpointId(destinationNetworkKey);
      const options = createEnforcedOptions(gasAmount);

      const enforcedOptions = [{
        eid: dstEid,
        msgType: 1, // SEND message type
        options: options
      }];

      console.log(`Setting options for EID ${dstEid} with ${gasAmount} gas...`);
      
      const tx = await oftAdapter.setEnforcedOptions(enforcedOptions);
      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log('Enforced options set successfully!');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        destinationEid: dstEid,
        gasAmount: gasAmount,
        explorerUrl: `${this.sourceNetwork.explorerUrl}/tx/${receipt.hash}`
      };

    } catch (error) {
      console.error('Set enforced options error:', error.message);
      return {
        success: false,
        error: `Failed to set enforced options: ${error.message}`
      };
    }
  }

  // ========== UTILITY METHODS ==========

  async checkPeerConfiguration(oftAdapterAddress, destinationNetworkKey) {
    try {
      const oftAdapter = new ethers.Contract(
        oftAdapterAddress,
        LAYERZERO_OFT_ADAPTER_ABI,
        this.provider
      );

      const dstEid = this.getDestinationEndpointId(destinationNetworkKey);
      const peerBytes32 = await oftAdapter.peers(dstEid);
      
      if (peerBytes32 === '0x' + '0'.repeat(64)) {
        return {
          success: true,
          configured: false,
          message: 'Peer not configured',
          destinationEid: dstEid
        };
      }

      const peerAddress = bytes32ToAddress(peerBytes32);

      return {
        success: true,
        configured: true,
        peerAddress: peerAddress,
        destinationEid: dstEid,
        destinationNetwork: destinationNetworkKey
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  static getSupportedNetworks() {
    return Object.entries(LAYERZERO_ENDPOINTS).map(([key, config]) => ({
      key: key,
      name: config.name,
      endpointId: config.endpointId
    }));
  }
}

module.exports = { LayerZeroBridge }; 