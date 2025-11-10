require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    // Ethereum Sepolia
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: [PRIVATE_KEY],
      layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    },
    // Polygon Amoy
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [PRIVATE_KEY],
      layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    },
    // Arbitrum Sepolia
    arbitrumSepolia: {
      url: "https://arbitrum-sepolia-rpc.publicnode.com",
      chainId: 421614,
      accounts: [PRIVATE_KEY],
      layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    },
    // Base Sepolia
    baseSepolia: {
      url: "https://base-sepolia-rpc.publicnode.com",
      chainId: 84532,
      accounts: [PRIVATE_KEY],
      layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    },
    // BNB Testnet
    bnbTestnet: {
      url: "https://bsc-testnet.public.blastapi.io",
      chainId: 97,
      accounts: [PRIVATE_KEY],
      layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    },
    // Avalanche Fuji
    fuji: {
      url: "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [PRIVATE_KEY],
      layerzeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  }
}; 