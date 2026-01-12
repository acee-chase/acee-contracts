/**
 * Deploy RENTDistribution with SSFShareToken as the weight token
 * 
 * This deploys a NEW instance of RENTDistribution where:
 *   - rentToken = SSFShareToken (investors' shares)
 *   - usdc = MockUSDC (payment token)
 *   - treasury = deployer (for demo)
 * 
 * The existing RENTDistribution (weighted by MockRENTToken) remains.
 * This new instance allows claim() weighted by SSFShareToken holdings.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-rentdist-sharetoken-testnet.ts --network base-sepolia
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface ContractInfo {
  version: string;
  address: string;
  deployTx: string;
  deployedAt: string;
}

interface DeploymentManifest {
  network: string;
  chainId: number;
  deployer: string;
  treasury: string;
  updatedAt: string;
  contracts: {
    MockUSDC: ContractInfo;
    SSFShareToken: ContractInfo;
    SSFShareSale: ContractInfo;
    [key: string]: ContractInfo;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying RENTDistribution_SSFShareToken with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Load existing deployment
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : "base-mainnet";
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found at ${deploymentPath}. Run deploy-share-sale-testnet.ts first.`);
  }

  const deployment: DeploymentManifest = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Loaded deployment from:", deploymentPath);

  // Verify SSFShareToken exists
  if (!deployment.contracts.SSFShareToken) {
    throw new Error("SSFShareToken not found in deployment. Run deploy-share-sale-testnet.ts first.");
  }

  const usdcAddress = deployment.contracts.MockUSDC.address;
  const shareTokenAddress = deployment.contracts.SSFShareToken.address;
  const treasuryAddress = deployer.address; // Use deployer as treasury for demo
  const ownerAddress = deployer.address;

  console.log("\nDeployment Parameters:");
  console.log("  USDC:         ", usdcAddress);
  console.log("  RentToken:    ", shareTokenAddress, "(SSFShareToken)");
  console.log("  Treasury:     ", treasuryAddress);
  console.log("  Owner:        ", ownerAddress);

  // Deploy RENTDistribution
  console.log("\nDeploying RENTDistribution_SSFShareToken...");
  const RENTDistribution = await ethers.getContractFactory("RENTDistribution");
  const rentDistribution = await RENTDistribution.deploy(
    usdcAddress,
    shareTokenAddress,
    treasuryAddress,
    ownerAddress
  );

  const receipt = await rentDistribution.deploymentTransaction()?.wait();
  const address = await rentDistribution.getAddress();
  const version = await rentDistribution.VERSION();

  console.log("\n✅ RENTDistribution_SSFShareToken deployed:");
  console.log("   Address:", address);
  console.log("   Version:", version);
  console.log("   Tx Hash:", receipt?.hash);
  console.log("   Block:  ", receipt?.blockNumber);

  // Verify configuration
  const rentToken = await rentDistribution.rentToken();
  const usdc = await rentDistribution.usdc();
  const treasury = await rentDistribution.treasury();

  console.log("\nContract State:");
  console.log("   rentToken (weight token):", rentToken);
  console.log("   usdc (payment token):    ", usdc);
  console.log("   treasury:                ", treasury);
  console.log("   acceptingDeposits:       ", await rentDistribution.acceptingDeposits());

  // Update deployment manifest
  deployment.contracts.RENTDistribution_SSFShareToken = {
    version: version,
    address: address,
    deployTx: receipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };
  deployment.updatedAt = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n✅ Updated deployment manifest:", deploymentPath);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("Contract: RENTDistribution_SSFShareToken");
  console.log("Address: ", address);
  console.log("Network: ", networkName);
  console.log("Explorer:", `https://sepolia.basescan.org/address/${address}`);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Run demo: npx hardhat run scripts/demo-rentdist-sharetoken.ts --network base-sepolia");
  console.log("  2. Commit updated deployments/base-sepolia.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
