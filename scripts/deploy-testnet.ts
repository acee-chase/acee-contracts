/**
 * Deploy RWA contracts + mock tokens to Base Sepolia
 * 
 * IMMUTABLE + VERSIONED deployment strategy:
 * - Each contract has VERSION constant + Deployed event
 * - Saves deployments/<network>.json as SSOT for addresses
 * - Old versions can be retired via retire() function
 * 
 * Deploys:
 *   - MockUSDC (shared by both distribution contracts)
 *   - MockRENTToken (RENT-SEN for rental income)
 *   - MockAPPToken (APP-PREF for appreciation/exit)
 *   - RENTDistribution (periodic rental income distribution)
 *   - APPDistribution (exit/refinancing event distribution)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-testnet.ts --network base-sepolia
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface ContractDeployment {
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
    [key: string]: ContractDeployment;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(70));
  console.log("SSF RWA Deployment - IMMUTABLE + VERSIONED");
  console.log("=".repeat(70));
  console.log("\nDeploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("Treasury address:", treasuryAddress);

  const contracts: { [key: string]: ContractDeployment } = {};

  // 1. Deploy MockUSDC (shared)
  console.log("\n1. Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy(deployer.address);
  const mockUsdcReceipt = await mockUsdc.deploymentTransaction()?.wait();
  const mockUsdcAddress = await mockUsdc.getAddress();
  console.log("   MockUSDC deployed to:", mockUsdcAddress);
  contracts["MockUSDC"] = {
    version: "1.0.0",
    address: mockUsdcAddress,
    deployTx: mockUsdcReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };

  // 2. Deploy MockRENTToken (RENT-SEN)
  console.log("\n2. Deploying MockRENTToken (RENT-SEN)...");
  const MockRENTToken = await ethers.getContractFactory("MockRENTToken");
  const mockRent = await MockRENTToken.deploy(deployer.address);
  const mockRentReceipt = await mockRent.deploymentTransaction()?.wait();
  const mockRentAddress = await mockRent.getAddress();
  console.log("   MockRENTToken deployed to:", mockRentAddress);
  contracts["MockRENTToken"] = {
    version: "1.0.0",
    address: mockRentAddress,
    deployTx: mockRentReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };

  // 3. Deploy MockAPPToken (APP-PREF)
  console.log("\n3. Deploying MockAPPToken (APP-PREF)...");
  const MockAPPToken = await ethers.getContractFactory("MockAPPToken");
  const mockApp = await MockAPPToken.deploy(deployer.address);
  const mockAppReceipt = await mockApp.deploymentTransaction()?.wait();
  const mockAppAddress = await mockApp.getAddress();
  console.log("   MockAPPToken deployed to:", mockAppAddress);
  contracts["MockAPPToken"] = {
    version: "1.0.0",
    address: mockAppAddress,
    deployTx: mockAppReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };

  // 4. Deploy RENTDistribution
  console.log("\n4. Deploying RENTDistribution...");
  const RENTDistribution = await ethers.getContractFactory("RENTDistribution");
  const rentDistribution = await RENTDistribution.deploy(
    mockUsdcAddress,
    mockRentAddress,
    treasuryAddress,
    deployer.address
  );
  const rentDistReceipt = await rentDistribution.deploymentTransaction()?.wait(2); // Wait for 2 confirmations
  const rentDistributionAddress = await rentDistribution.getAddress();
  console.log("   RENTDistribution deployed to:", rentDistributionAddress);
  console.log("   Version: RENTDistribution@1.0.0");
  contracts["RENTDistribution"] = {
    version: "RENTDistribution@1.0.0",
    address: rentDistributionAddress,
    deployTx: rentDistReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };

  // 5. Deploy APPDistribution
  console.log("\n5. Deploying APPDistribution...");
  const APPDistribution = await ethers.getContractFactory("APPDistribution");
  const appDistribution = await APPDistribution.deploy(
    mockUsdcAddress,
    mockAppAddress,
    treasuryAddress,
    deployer.address
  );
  const appDistReceipt = await appDistribution.deploymentTransaction()?.wait(2); // Wait for 2 confirmations
  const appDistributionAddress = await appDistribution.getAddress();
  console.log("   APPDistribution deployed to:", appDistributionAddress);
  console.log("   Version: APPDistribution@1.0.0");
  contracts["APPDistribution"] = {
    version: "APPDistribution@1.0.0",
    address: appDistributionAddress,
    deployTx: appDistReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };

  // 6. Mint initial tokens for demo
  console.log("\n6. Minting initial tokens for demo...");
  
  // Mint 20,000 USDC to treasury (6 decimals) - enough for both demos
  const usdcAmount = ethers.parseUnits("20000", 6);
  await mockUsdc.mint(treasuryAddress, usdcAmount);
  console.log("   Minted 20,000 USDC to treasury");

  // Mint 1,000 RENT-SEN to deployer (for testing rental claims)
  const rentAmount = ethers.parseUnits("1000", 18);
  await mockRent.mint(deployer.address, rentAmount);
  console.log("   Minted 1,000 RENT-SEN to deployer");

  // Mint 500 APP-PREF to deployer (for testing exit claims)
  const appAmount = ethers.parseUnits("500", 18);
  await mockApp.mint(deployer.address, appAmount);
  console.log("   Minted 500 APP-PREF to deployer");

  // 7. Save deployment manifest (SSOT)
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : 
                      network.chainId === 8453n ? "base-mainnet" : "hardhat";

  const deploymentManifest: DeploymentManifest = {
    network: networkName,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    treasury: treasuryAddress,
    updatedAt: new Date().toISOString(),
    contracts,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save as <network>.json (SSOT format)
  const manifestPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(deploymentManifest, null, 2));
  console.log(`\n7. Deployment manifest saved to deployments/${networkName}.json`);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE - SSF RWA Dual-Token System");
  console.log("=".repeat(70));
  console.log("\n📦 Shared Infrastructure:");
  console.log("   MockUSDC:            ", contracts["MockUSDC"].address);
  console.log("                        v" + contracts["MockUSDC"].version);
  console.log("\n🏠 RENT-SEN (Rental Income Distribution):");
  console.log("   MockRENTToken:       ", contracts["MockRENTToken"].address);
  console.log("   RENTDistribution:    ", contracts["RENTDistribution"].address);
  console.log("                        " + contracts["RENTDistribution"].version);
  console.log("\n📈 APP-PREF (Appreciation/Exit Distribution):");
  console.log("   MockAPPToken:        ", contracts["MockAPPToken"].address);
  console.log("   APPDistribution:     ", contracts["APPDistribution"].address);
  console.log("                        " + contracts["APPDistribution"].version);
  console.log("\n🔑 Treasury:            ", treasuryAddress);
  console.log("\n📄 SSOT Manifest:        deployments/" + networkName + ".json");
  console.log("=".repeat(70));
  console.log("\n⚠️  IMMUTABLE CONTRACTS - To upgrade, deploy new version and retire() old one");
  console.log("=".repeat(70));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
