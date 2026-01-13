/**
 * SSF V1 Testnet Deployment Script (Base Sepolia)
 * 
 * Uses existing MockUSDC from base-sepolia.json
 * Deploys fresh SSFShareToken, SSFReserveVault, SSFShareSale with V1 params
 * 
 * Usage:
 * npx hardhat run scripts/deploy-ssf-v1-testnet.ts --network base-sepolia
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Load existing deployments
const deploymentsPath = path.join(__dirname, "../deployments/base-sepolia.json");
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

// Testnet configuration - uses MockUSDC
const CONFIG = {
  mockUsdc: deployments.contracts.MockUSDC.address,
  treasury: deployments.treasury,
  
  // Token config
  tokenName: "SSF Share Token V1",
  tokenSymbol: "SSF-V1",
  
  // Sale timing (shorter for testing)
  saleDelaySeconds: 60, // 1 minute delay (vs 72h in prod)
  saleDurationSeconds: 7 * 24 * 60 * 60, // 7 days (vs 90 days in prod)
  
  // Rate limit for redemptions
  maxRedeemPerWindow: 100, // 100 shares per window
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("SSF V1 Testnet Deployment (Base Sepolia)");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: base-sepolia`);
  console.log(`MockUSDC: ${CONFIG.mockUsdc}`);
  console.log("");
  
  // Verify deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ETH balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient ETH for deployment gas");
  }
  
  // ============ Step 1: Deploy SSFShareToken ============
  console.log("\n[1/5] Deploying SSFShareToken V1...");
  
  const SSFShareToken = await ethers.getContractFactory("SSFShareToken");
  const shareToken = await SSFShareToken.deploy(
    CONFIG.tokenName,
    CONFIG.tokenSymbol,
    deployer.address // admin = deployer for testing
  );
  await shareToken.waitForDeployment();
  
  const shareTokenAddress = await shareToken.getAddress();
  console.log(`SSFShareToken V1 deployed: ${shareTokenAddress}`);
  
  // ============ Step 2: Deploy SSFReserveVault ============
  console.log("\n[2/5] Deploying SSFReserveVault...");
  
  const SSFReserveVault = await ethers.getContractFactory("SSFReserveVault");
  const reserveVault = await SSFReserveVault.deploy(
    CONFIG.mockUsdc,
    shareTokenAddress,
    CONFIG.treasury,
    deployer.address, // owner = deployer for testing
    CONFIG.maxRedeemPerWindow
  );
  await reserveVault.waitForDeployment();
  
  const reserveVaultAddress = await reserveVault.getAddress();
  console.log(`SSFReserveVault deployed: ${reserveVaultAddress}`);
  
  // ============ Step 3: Deploy SSFShareSale ============
  console.log("\n[3/5] Deploying SSFShareSale V1...");
  
  const now = Math.floor(Date.now() / 1000);
  const saleStart = now + CONFIG.saleDelaySeconds;
  const saleEnd = saleStart + CONFIG.saleDurationSeconds;
  
  console.log(`Sale window: ${new Date(saleStart * 1000).toISOString()} to ${new Date(saleEnd * 1000).toISOString()}`);
  
  const SSFShareSale = await ethers.getContractFactory("SSFShareSale");
  const shareSale = await SSFShareSale.deploy(
    CONFIG.mockUsdc,
    shareTokenAddress,
    reserveVaultAddress,
    CONFIG.treasury,
    deployer.address, // owner = deployer for testing
    saleStart,
    saleEnd
  );
  await shareSale.waitForDeployment();
  
  const shareSaleAddress = await shareSale.getAddress();
  console.log(`SSFShareSale V1 deployed: ${shareSaleAddress}`);
  
  // ============ Step 4: Grant MINTER_ROLE ============
  console.log("\n[4/5] Granting MINTER_ROLE to ShareSale...");
  
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  const grantMinterTx = await shareToken.grantRole(MINTER_ROLE, shareSaleAddress);
  await grantMinterTx.wait();
  console.log(`MINTER_ROLE granted: ${shareSaleAddress}`);
  
  // ============ Step 5: Grant BURNER_ROLE ============
  console.log("\n[5/5] Granting BURNER_ROLE to ReserveVault...");
  
  const BURNER_ROLE = await shareToken.BURNER_ROLE();
  const grantBurnerTx = await shareToken.grantRole(BURNER_ROLE, reserveVaultAddress);
  await grantBurnerTx.wait();
  console.log(`BURNER_ROLE granted: ${reserveVaultAddress}`);
  
  // ============ Update Deployments File ============
  const newDeployments = {
    ...deployments,
    updatedAt: new Date().toISOString(),
    contracts: {
      ...deployments.contracts,
      "SSFShareToken_V1": {
        version: "SSFShareToken@1.0.0-v1",
        address: shareTokenAddress,
        deployedAt: new Date().toISOString(),
      },
      "SSFReserveVault": {
        version: "SSFReserveVault@1.0.0",
        address: reserveVaultAddress,
        deployedAt: new Date().toISOString(),
      },
      "SSFShareSale_V1": {
        version: "SSFShareSale@1.0.0-v1",
        address: shareSaleAddress,
        saleStart,
        saleEnd,
        deployedAt: new Date().toISOString(),
      },
    },
  };
  
  fs.writeFileSync(deploymentsPath, JSON.stringify(newDeployments, null, 2));
  console.log("\nDeployments file updated.");
  
  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("TESTNET DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`
Contract Addresses:
  SSFShareToken V1:   ${shareTokenAddress}
  SSFReserveVault:    ${reserveVaultAddress}
  SSFShareSale V1:    ${shareSaleAddress}

Configuration:
  MockUSDC:       ${CONFIG.mockUsdc}
  Treasury:       ${CONFIG.treasury}
  Sale Start:     ${new Date(saleStart * 1000).toISOString()}
  Sale End:       ${new Date(saleEnd * 1000).toISOString()}

Roles Granted:
  MINTER_ROLE → ${shareSaleAddress}
  BURNER_ROLE → ${reserveVaultAddress}

Next Steps:
  1. Wait ${CONFIG.saleDelaySeconds}s for sale to start
  2. Add test wallet to allowlist: shareSale.setAllowlist([wallet], true)
  3. Unpause sale: shareSale.unpause()
  4. Test buy: approve MockUSDC, then shareSale.buy(shares)
  5. Test redeem: reserveVault.redeem(shares)
  `);
  
  return {
    shareToken: shareTokenAddress,
    reserveVault: reserveVaultAddress,
    shareSale: shareSaleAddress,
    saleStart,
    saleEnd,
  };
}

main()
  .then((result) => {
    console.log("\nDeployment result:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
