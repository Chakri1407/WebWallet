const hre = require("hardhat");
const { EndpointId } = require("@layerzerolabs/lz-definitions");

const ENDPOINT_IDS = {
  sepolia: EndpointId.SEPOLIA_V2_TESTNET,
  amoy: EndpointId.AMOY_V2_TESTNET
};

async function main() {
  const fs = require('fs');
  
  console.log("============================================");
  console.log("Verifying Bridge Setup");
  console.log("============================================");
  console.log("Network:", hre.network.name);
  console.log("");
  
  // Load adapter info
  const adapterFile = `deployments/${hre.network.name}-adapter.json`;
  const adapterInfo = JSON.parse(fs.readFileSync(adapterFile, 'utf8'));
  
  console.log("Adapter Address:", adapterInfo.adapterAddress);
  console.log("Token Address:", adapterInfo.tokenAddress);
  console.log("");
  
  // Get contracts
  const ERC20OFTAdapter = await hre.ethers.getContractFactory("ERC20OFTAdapter");
  const adapter = ERC20OFTAdapter.attach(adapterInfo.adapterAddress);
  
  const IERC20 = await hre.ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    adapterInfo.tokenAddress
  );
  
  // Check token info
  console.log("📊 Token Information:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const tokenContract = await hre.ethers.getContractAt(
    "WebWallet",
    adapterInfo.tokenAddress
  );
  const name = await tokenContract.name();
  const symbol = await tokenContract.symbol();
  const decimals = await tokenContract.decimals();
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals);
  console.log("");
  
  // Check adapter's token balance
  const adapterBalance = await IERC20.balanceOf(adapterInfo.adapterAddress);
  console.log("Adapter Token Balance:", hre.ethers.formatEther(adapterBalance), symbol);
  console.log("");
  
  // Check peer configurations
  console.log("🔗 Peer Configurations:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const peerNetworks = Object.keys(ENDPOINT_IDS).filter(n => n !== hre.network.name);
  
  for (const peerNetwork of peerNetworks) {
    const peerFile = `deployments/${peerNetwork}-adapter.json`;
    if (fs.existsSync(peerFile)) {
      const peerInfo = JSON.parse(fs.readFileSync(peerFile, 'utf8'));
      const peerEid = ENDPOINT_IDS[peerNetwork];
      
      try {
        const configuredPeer = await adapter.peers(peerEid);
        const expectedPeer = hre.ethers.zeroPadValue(peerInfo.adapterAddress, 32);
        
        if (configuredPeer === expectedPeer) {
          console.log(`✅ ${peerNetwork.toUpperCase()}: Correctly configured`);
          console.log(`   EID: ${peerEid}`);
          console.log(`   Address: ${peerInfo.adapterAddress}`);
        } else if (configuredPeer === hre.ethers.ZeroHash) {
          console.log(`❌ ${peerNetwork.toUpperCase()}: NOT configured`);
          console.log(`   Run: npx hardhat run scripts/configure-peers.js --network ${hre.network.name}`);
        } else {
          console.log(`⚠️  ${peerNetwork.toUpperCase()}: Misconfigured`);
          console.log(`   Expected: ${expectedPeer}`);
          console.log(`   Found: ${configuredPeer}`);
        }
      } catch (error) {
        console.log(`❌ ${peerNetwork.toUpperCase()}: Error checking peer`);
      }
      console.log("");
    }
  }
  
  console.log("✨ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 