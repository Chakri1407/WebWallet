const hre = require("hardhat");

/**
 * Deploy OFT Adapter for an existing ERC20 token
 * This needs to be run on each chain where you want to bridge the token
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying OFT Adapter with account:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  
  // GET THESE VALUES:
  // 1. The existing ERC20 token address on this chain
  // 2. LayerZero endpoint for this chain (from hardhat.config.js)
  // 3. Delegate/owner address (usually your wallet)
  
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || ""; // <-- SET THIS
  const LZ_ENDPOINT = hre.network.config.layerzeroEndpoint;
  const DELEGATE = deployer.address;
  
  if (!TOKEN_ADDRESS) {
    console.error("❌ TOKEN_ADDRESS not set! Set it in .env file");
    process.exit(1);
  }
  
  console.log("\nDeployment Parameters:");
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("LZ Endpoint:", LZ_ENDPOINT);
  console.log("Delegate:", DELEGATE);
  
  // Deploy OFT Adapter
  const ERC20OFTAdapter = await hre.ethers.getContractFactory("ERC20OFTAdapter");
  const oftAdapter = await ERC20OFTAdapter.deploy(
    TOKEN_ADDRESS,
    LZ_ENDPOINT,
    DELEGATE
  );
  
  await oftAdapter.waitForDeployment();
  const adapterAddress = await oftAdapter.getAddress();
  
  console.log("\n✅ OFT Adapter deployed to:", adapterAddress);
  console.log("\n📋 Save this address - you'll need it to:");
  console.log("1. Configure peers on other chains");
  console.log("2. Approve tokens for bridging");
  console.log("3. Send cross-chain transactions");
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    tokenAddress: TOKEN_ADDRESS,
    adapterAddress: adapterAddress,
    lzEndpoint: LZ_ENDPOINT,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  const filename = `deployments/${hre.network.name}-adapter.json`;
  fs.mkdirSync('deployments', { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 