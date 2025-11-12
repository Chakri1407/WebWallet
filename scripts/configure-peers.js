const hre = require("hardhat");
const { EndpointId } = require("@layerzerolabs/lz-definitions");

/**
 * Configure peer adapters between chains
 * Run this after deploying adapters on both chains
 */

// LayerZero Endpoint IDs for testnets
const ENDPOINT_IDS = {
  sepolia: EndpointId.SEPOLIA_V2_TESTNET,          // 40161
  amoy: EndpointId.AMOY_V2_TESTNET,                // 40267
  arbitrumSepolia: EndpointId.ARBSEP_V2_TESTNET,   // 40231
  baseSepolia: EndpointId.BASESEP_V2_TESTNET,      // 40245
  bnbTestnet: EndpointId.BSC_V2_TESTNET,           // 40102
  fuji: EndpointId.AVALANCHE_V2_TESTNET            // 40106
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Configuring peers for:", hre.network.name);
  console.log("Signer:", deployer.address);
  
  // Load deployment info for current network
  const fs = require('fs');
  const currentDeployment = JSON.parse(
    fs.readFileSync(`deployments/${hre.network.name}-adapter.json`, 'utf8')
  );
  
  console.log("\nCurrent Adapter:", currentDeployment.adapterAddress);
  
  // Get the adapter contract
  const ERC20OFTAdapter = await hre.ethers.getContractFactory("ERC20OFTAdapter");
  const adapter = ERC20OFTAdapter.attach(currentDeployment.adapterAddress);
  
  // List all available peer networks
  const availableNetworks = fs.readdirSync('deployments')
    .filter(f => f.endsWith('-adapter.json'))
    .map(f => f.replace('-adapter.json', ''))
    .filter(n => n !== hre.network.name);
  
  console.log("\n📋 Available peer networks:", availableNetworks.join(', '));
  console.log("\n⚙️  Configuring peers...\n");
  
  // Configure each peer
  for (const peerNetwork of availableNetworks) {
    try {
      const peerDeployment = JSON.parse(
        fs.readFileSync(`deployments/${peerNetwork}-adapter.json`, 'utf8')
      );
      
      const peerEid = ENDPOINT_IDS[peerNetwork];
      if (!peerEid) {
        console.log(`⚠️  No Endpoint ID found for ${peerNetwork}, skipping...`);
        continue;
      }
      
      // Convert address to bytes32 format
      const peerAddressBytes32 = hre.ethers.zeroPadValue(
        peerDeployment.adapterAddress,
        32
      );
      
      console.log(`Setting peer: ${peerNetwork}`);
      console.log(`  EID: ${peerEid}`);
      console.log(`  Address: ${peerDeployment.adapterAddress}`);
      
      const tx = await adapter.setPeer(peerEid, peerAddressBytes32);
      console.log(`  Transaction: ${tx.hash}`);
      
      await tx.wait();
      console.log(`  ✅ Peer set successfully!\n`);
      
    } catch (error) {
      console.error(`❌ Error setting peer for ${peerNetwork}:`, error.message);
    }
  }
  
  console.log("\n🎉 Peer configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 