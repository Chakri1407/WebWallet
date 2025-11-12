const hre = require("hardhat");
const { Options } = require("@layerzerolabs/lz-v2-utilities");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("============================================");
  console.log("Setting Enforced Options for OFT Adapter");
  console.log("============================================");
  console.log("Network:", hre.network.name);
  console.log("Signer:", deployer.address);
  console.log("");
  
  // Load deployment info
  const fs = require('fs');
  const adapterFile = `deployments/${hre.network.name}-adapter.json`;
  
  if (!fs.existsSync(adapterFile)) {
    console.error("❌ Adapter deployment file not found!");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(adapterFile, 'utf8'));
  console.log("Adapter Address:", deployment.adapterAddress);
  console.log("");
  
  // OFT Adapter ABI with setEnforcedOptions
  const OFT_ADAPTER_ABI = [
    "function setEnforcedOptions((uint32 eid, uint16 msgType, bytes options)[] enforcedOptions) external"
  ];
  
  const adapter = new hre.ethers.Contract(
    deployment.adapterAddress,
    OFT_ADAPTER_ABI,
    deployer
  );
  
  // Get peer networks
  const peerNetworks = fs.readdirSync('deployments')
    .filter(f => f.endsWith('-adapter.json'))
    .map(f => f.replace('-adapter.json', ''))
    .filter(n => n !== hre.network.name);
  
  if (peerNetworks.length === 0) {
    console.log("⚠️  No peer networks found!");
    process.exit(0);
  }
  
  console.log("Setting enforced options for peers:", peerNetworks.join(', '));
  console.log("");
  
  // Endpoint IDs
  const ENDPOINT_IDS = {
    sepolia: 40161,
    amoy: 40267,
    arbitrumSepolia: 40231,
    baseSepolia: 40245,
    bnbTestnet: 40102,
    fuji: 40106
  };
  
  // Build enforced options array
  const enforcedOptions = [];
  
  for (const peerNetwork of peerNetworks) {
    const peerEid = ENDPOINT_IDS[peerNetwork];
    if (!peerEid) continue;
    
    // Create options with 200k gas for lzReceive
    const options = Options.newOptions()
      .addExecutorLzReceiveOption(200000, 0) // 200k gas, 0 msg.value
      .toHex();
    
    // SEND msgType = 1
    enforcedOptions.push({
      eid: peerEid,
      msgType: 1,
      options: options
    });
    
    console.log(`Adding enforced options for ${peerNetwork}:`);
    console.log(`  EID: ${peerEid}`);
    console.log(`  MsgType: 1 (SEND)`);
    console.log(`  Options: ${options}`);
    console.log("");
  }
  
  // Set enforced options
  console.log("🔧 Setting enforced options...");
  const tx = await adapter.setEnforcedOptions(enforcedOptions);
  console.log(`TX: ${tx.hash}`);
  console.log("⏳ Waiting for confirmation...");
  
  await tx.wait();
  console.log("✅ Enforced options set successfully!");
  console.log("");
  console.log("============================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 