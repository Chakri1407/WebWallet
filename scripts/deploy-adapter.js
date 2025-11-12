const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("============================================");
  console.log("Deploying OFT Adapter");
  console.log("============================================");
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("");
  
  // Read token address from deployment file
  const fs = require('fs');
  const tokenFile = `deployments/${hre.network.name}-token.json`;
  
  if (!fs.existsSync(tokenFile)) {
    console.error("❌ Token deployment file not found!");
    console.error(`Please deploy token first on ${hre.network.name}`);
    process.exit(1);
  }
  
  const tokenDeployment = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  const TOKEN_ADDRESS = tokenDeployment.tokenAddress;
  const LZ_ENDPOINT = hre.network.config.layerzeroEndpoint;
  const DELEGATE = deployer.address;
  
  console.log("Deployment Parameters:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("LZ Endpoint:", LZ_ENDPOINT);
  console.log("Delegate:", DELEGATE);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");
  
  if (balance === 0n) {
    console.error("❌ ERROR: No balance! Get testnet tokens from faucet first.");
    process.exit(1);
  }
  
  console.log("Deploying OFT Adapter...\n");
  
  // Deploy OFT Adapter
  const ERC20OFTAdapter = await hre.ethers.getContractFactory("ERC20OFTAdapter");
  const adapter = await ERC20OFTAdapter.deploy(
    TOKEN_ADDRESS,
    LZ_ENDPOINT,
    DELEGATE
  );
  
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  
  console.log("✅ OFT Adapter deployed!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Adapter Address:", adapterAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💾 SAVE THIS ADDRESS!\n");
  
  // Save deployment info
  const adapterInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    tokenAddress: TOKEN_ADDRESS,
    adapterAddress: adapterAddress,
    lzEndpoint: LZ_ENDPOINT,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `deployments/${hre.network.name}-adapter.json`, 
    JSON.stringify(adapterInfo, null, 2)
  );
  
  console.log(`📁 Deployment info saved to: deployments/${hre.network.name}-adapter.json`);
  
  const explorers = {
    sepolia: `https://sepolia.etherscan.io/address/${adapterAddress}`,
    amoy: `https://amoy.polygonscan.com/address/${adapterAddress}`,
    arbitrumSepolia: `https://sepolia.arbiscan.io/address/${adapterAddress}`,
    baseSepolia: `https://sepolia.basescan.org/address/${adapterAddress}`
  };
  
  if (explorers[hre.network.name]) {
    console.log("\n🔗 View on Explorer:");
    console.log(explorers[hre.network.name]);
  }
  
  console.log("\n✨ Adapter deployment complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Deploy adapter on other chain");
  console.log("2. Run configure-peers.js on both chains");
  console.log("3. Test the bridge!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 