const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("============================================");
  console.log("Deploying WebWallet Token (WWT)");
  console.log("============================================");
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("");
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("\n❌ ERROR: No balance! Get testnet tokens from faucet first.");
    process.exit(1);
  }
  
  console.log("\nDeploying WebWallet Token...");
  
  const WebWallet = await hre.ethers.getContractFactory("WebWallet");
  const token = await WebWallet.deploy();
  
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  
  console.log("\n✅ WebWallet Token (WWT) deployed!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Token Address:", tokenAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💾 SAVE THIS ADDRESS!\n");
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    tokenAddress: tokenAddress,
    tokenName: "Web Wallet Token",
    tokenSymbol: "WWT",
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.mkdirSync('deployments', { recursive: true });
  fs.writeFileSync(
    `deployments/${hre.network.name}-token.json`, 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`📁 Deployment info saved to: deployments/${hre.network.name}-token.json`);
  console.log("\n🔗 View on Explorer:");
  
  const explorers = {
    sepolia: `https://sepolia.etherscan.io/address/${tokenAddress}`,
    amoy: `https://amoy.polygonscan.com/address/${tokenAddress}`,
    arbitrumSepolia: `https://sepolia.arbiscan.io/address/${tokenAddress}`,
    baseSepolia: `https://sepolia.basescan.org/address/${tokenAddress}`
  };
  
  if (explorers[hre.network.name]) {
    console.log(explorers[hre.network.name]);
  }
  
  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 