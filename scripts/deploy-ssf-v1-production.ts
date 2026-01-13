/**
 * SSF V1 Production Deployment Script
 * 
 * Deployment Order:
 * 1. Deploy SSFShareToken
 * 2. Deploy SSFReserveVault
 * 3. Deploy SSFShareSale
 * 4. Grant MINTER_ROLE to Sale
 * 5. Grant BURNER_ROLE to ReserveVault
 * 
 * Base Mainnet Addresses:
 * - USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * - Treasury: 0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25
 * 
 * Usage:
 * npx hardhat run scripts/deploy-ssf-v1-production.ts --network base
 */

import { ethers } from "hardhat";

// Base Mainnet configuration
const CONFIG = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  treasury: "0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25",
  
  // Token config
  tokenName: "SSF Share Token",
  tokenSymbol: "SSF",
  
  // Sale timing
  saleDelayHours: 72, // 72 hours after deployment
  saleDurationDays: 90, // 90 day sale window
  
  // Rate limit for redemptions
  maxRedeemPerWindow: 500, // 500 shares per 7-day window
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("SSF V1 Production Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log("");
  
  // Verify deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ETH balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient ETH for deployment gas");
  }
  
  // ============ Step 1: Deploy SSFShareToken ============
  console.log("\n[1/5] Deploying SSFShareToken...");
  
  const SSFShareToken = await ethers.getContractFactory("SSFShareToken");
  const shareToken = await SSFShareToken.deploy(
    CONFIG.tokenName,
    CONFIG.tokenSymbol,
    CONFIG.treasury // admin = treasury
  );
  await shareToken.waitForDeployment();
  
  const shareTokenAddress = await shareToken.getAddress();
  console.log(`SSFShareToken deployed: ${shareTokenAddress}`);
  
  // ============ Step 2: Deploy SSFReserveVault ============
  console.log("\n[2/5] Deploying SSFReserveVault...");
  
  const SSFReserveVault = await ethers.getContractFactory("SSFReserveVault");
  const reserveVault = await SSFReserveVault.deploy(
    CONFIG.usdc,
    shareTokenAddress,
    CONFIG.treasury,
    CONFIG.treasury, // owner = treasury
    CONFIG.maxRedeemPerWindow
  );
  await reserveVault.waitForDeployment();
  
  const reserveVaultAddress = await reserveVault.getAddress();
  console.log(`SSFReserveVault deployed: ${reserveVaultAddress}`);
  
  // ============ Step 3: Deploy SSFShareSale ============
  console.log("\n[3/5] Deploying SSFShareSale...");
  
  const now = Math.floor(Date.now() / 1000);
  const saleStart = now + (CONFIG.saleDelayHours * 60 * 60);
  const saleEnd = saleStart + (CONFIG.saleDurationDays * 24 * 60 * 60);
  
  console.log(`Sale window: ${new Date(saleStart * 1000).toISOString()} to ${new Date(saleEnd * 1000).toISOString()}`);
  
  const SSFShareSale = await ethers.getContractFactory("SSFShareSale");
  const shareSale = await SSFShareSale.deploy(
    CONFIG.usdc,
    shareTokenAddress,
    reserveVaultAddress,
    CONFIG.treasury,
    CONFIG.treasury, // owner = treasury
    saleStart,
    saleEnd
  );
  await shareSale.waitForDeployment();
  
  const shareSaleAddress = await shareSale.getAddress();
  console.log(`SSFShareSale deployed: ${shareSaleAddress}`);
  
  // ============ Step 4: Grant MINTER_ROLE ============
  console.log("\n[4/5] Granting MINTER_ROLE to ShareSale...");
  
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  const grantMinterTx = await shareToken.connect(deployer).grantRole(MINTER_ROLE, shareSaleAddress);
  await grantMinterTx.wait();
  console.log(`MINTER_ROLE granted: ${shareSaleAddress}`);
  
  // ============ Step 5: Grant BURNER_ROLE ============
  console.log("\n[5/5] Granting BURNER_ROLE to ReserveVault...");
  
  const BURNER_ROLE = await shareToken.BURNER_ROLE();
  const grantBurnerTx = await shareToken.connect(deployer).grantRole(BURNER_ROLE, reserveVaultAddress);
  await grantBurnerTx.wait();
  console.log(`BURNER_ROLE granted: ${reserveVaultAddress}`);
  
  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`
Contract Addresses:
  SSFShareToken:   ${shareTokenAddress}
  SSFReserveVault: ${reserveVaultAddress}
  SSFShareSale:    ${shareSaleAddress}

Configuration:
  USDC:           ${CONFIG.usdc}
  Treasury:       ${CONFIG.treasury}
  Sale Start:     ${new Date(saleStart * 1000).toISOString()}
  Sale End:       ${new Date(saleEnd * 1000).toISOString()}

Roles Granted:
  MINTER_ROLE → ${shareSaleAddress}
  BURNER_ROLE → ${reserveVaultAddress}

Next Steps:
  1. Verify contracts on Basescan
  2. Add allowlist addresses: shareSale.setAllowlist([...], true)
  3. Test with internal purchase
  4. Unpause sale: shareSale.unpause()
  `);
  
  // Output for verification commands
  console.log("Verification Commands:");
  console.log(`npx hardhat verify --network base ${shareTokenAddress} "${CONFIG.tokenName}" "${CONFIG.tokenSymbol}" ${CONFIG.treasury}`);
  console.log(`npx hardhat verify --network base ${reserveVaultAddress} ${CONFIG.usdc} ${shareTokenAddress} ${CONFIG.treasury} ${CONFIG.treasury} ${CONFIG.maxRedeemPerWindow}`);
  console.log(`npx hardhat verify --network base ${shareSaleAddress} ${CONFIG.usdc} ${shareTokenAddress} ${reserveVaultAddress} ${CONFIG.treasury} ${CONFIG.treasury} ${saleStart} ${saleEnd}`);
  
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
