/**
 * SSF V1 Production Deployment Script
 * 
 * ADMIN/ROLE FLOW:
 * 1. Deployer deploys all contracts (deployer = initial admin)
 * 2. Deployer grants MINTER_ROLE to Sale
 * 3. Deployer grants BURNER_ROLE to ReserveVault
 * 4. Deployer grants DEFAULT_ADMIN_ROLE to Treasury
 * 5. Deployer renounces DEFAULT_ADMIN_ROLE (optional but recommended)
 * 
 * POST-DEPLOYMENT (by Treasury):
 * - Treasury owns Sale and Vault (can pause/unpause/setAllowlist)
 * - Treasury is admin of Token (can grant/revoke roles if needed)
 * 
 * Base Mainnet Addresses (SSOT):
 * - USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * - TREASURY: 0x61bdD3AC52758C22038a169d761e36c2F224E7cd
 * - DEPLOYER: 0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25
 * 
 * Usage:
 * npx hardhat run scripts/deploy-ssf-v1-production.ts --network base-mainnet
 * 
 * Network key in hardhat.config.ts: "base-mainnet" (chainId 8453)
 * 
 * IMPORTANT: 
 * - Review CONFIG before running!
 * - Script REFUSES to deploy if chainId != 8453 (unless dryRun=true)
 * - DEPLOYER != TREASURY for security (deployer renounces admin after setup)
 */

import { ethers } from "hardhat";

// ============ CONFIGURATION - REVIEW BEFORE MAINNET ============
const CONFIG = {
  // Base Mainnet USDC
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",

  // Treasury multi-sig (final owner/admin of all contracts)
  // SSOT: docs/ops/SSF_V1_MAINNET_ADDRESS_MATRIX.md
  treasury: "0x61bdD3AC52758C22038a169d761e36c2F224E7cd",

  // Token config
  tokenName: "SSF Share Token",
  tokenSymbol: "SSF",

  // Sale timing
  saleDelayHours: 0, // IMMEDIATE - set to 0 for today's smoke test
  saleDurationDays: 90, // 90 day sale window

  // Rate limit for redemptions
  maxRedeemPerWindow: 500, // 500 shares per 7-day window

  // Safety flags
  renounceDeployerAdmin: true, // Set false to keep deployer as backup admin
  dryRun: true, // Set true to simulate without sending tx
};

// ============ DEPLOYMENT SCRIPT ============
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(70));
  console.log("SSF V1 PRODUCTION DEPLOYMENT");
  console.log("=".repeat(70));

  // ============ Pre-flight Checks ============
  console.log("\n[PRE-FLIGHT CHECKS]");
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Treasury:  ${CONFIG.treasury}`);
  console.log(`Network:   ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Chain ID:  ${(await ethers.provider.getNetwork()).chainId}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH`);

  // Validate chain ID (Base Mainnet = 8453)
  const chainId = (await ethers.provider.getNetwork()).chainId;

  if (!CONFIG.dryRun && chainId !== 8453n) {
    throw new Error(`FATAL: Refusing to deploy — expected Base Mainnet chainId=8453, got ${chainId}`);
  }

  if (chainId !== 8453n) {
    if (CONFIG.dryRun) {
      console.warn(`\n⚠️  WARNING: Not on Base Mainnet (chainId ${chainId}) but dryRun=true. Proceeding...`);
    } else {
      throw new Error(`PRODUCTION DEPLOYMENT PROTECTION: Not on Base Mainnet (chainId ${chainId}). Current network must be 8453.`);
    }
  }

  if (balance < ethers.parseEther("0.02")) {
    throw new Error("Insufficient ETH for deployment (need ~0.02 ETH)");
  }

  // Validate addresses
  if (CONFIG.usdc === ethers.ZeroAddress || CONFIG.treasury === ethers.ZeroAddress) {
    throw new Error("Invalid address in CONFIG");
  }

  if (CONFIG.dryRun) {
    console.log("\n🔸 DRY RUN MODE - No transactions will be sent");
  }

  console.log("\n" + "-".repeat(70));
  console.log("DEPLOYMENT PARAMETERS:");
  console.log("-".repeat(70));
  console.log(`Token Name:       ${CONFIG.tokenName}`);
  console.log(`Token Symbol:     ${CONFIG.tokenSymbol}`);
  console.log(`USDC:             ${CONFIG.usdc}`);
  console.log(`Treasury:         ${CONFIG.treasury}`);
  console.log(`Sale Delay:       ${CONFIG.saleDelayHours} hours`);
  console.log(`Sale Duration:    ${CONFIG.saleDurationDays} days`);
  console.log(`Max Redeem/Window: ${CONFIG.maxRedeemPerWindow} shares`);
  console.log(`Renounce Admin:   ${CONFIG.renounceDeployerAdmin}`);
  console.log("-".repeat(70));

  // ============ Step 1: Deploy SSFShareToken ============
  console.log("\n[1/7] Deploying SSFShareToken...");
  console.log("       Admin: DEPLOYER (temporary, will transfer to treasury)");

  const SSFShareToken = await ethers.getContractFactory("SSFShareToken");

  let shareToken: any;
  let shareTokenAddress: string;

  if (CONFIG.dryRun) {
    shareTokenAddress = "0x" + "1".repeat(40);
    console.log(`       [DRY RUN] Would deploy to: ${shareTokenAddress}`);
  } else {
    shareToken = await SSFShareToken.deploy(
      CONFIG.tokenName,
      CONFIG.tokenSymbol,
      deployer.address // IMPORTANT: deployer is initial admin (not treasury)
    );
    await shareToken.waitForDeployment();
    shareTokenAddress = await shareToken.getAddress();
    console.log(`       ✅ Deployed: ${shareTokenAddress}`);
  }

  // ============ Step 2: Deploy SSFReserveVault ============
  console.log("\n[2/7] Deploying SSFReserveVault...");
  console.log("       Owner: TREASURY");

  const SSFReserveVault = await ethers.getContractFactory("SSFReserveVault");

  let reserveVault: any;
  let reserveVaultAddress: string;

  if (CONFIG.dryRun) {
    reserveVaultAddress = "0x" + "2".repeat(40);
    console.log(`       [DRY RUN] Would deploy to: ${reserveVaultAddress}`);
  } else {
    reserveVault = await SSFReserveVault.deploy(
      CONFIG.usdc,
      shareTokenAddress,
      CONFIG.treasury,
      CONFIG.treasury, // owner = treasury
      CONFIG.maxRedeemPerWindow
    );
    await reserveVault.waitForDeployment();
    reserveVaultAddress = await reserveVault.getAddress();
    console.log(`       ✅ Deployed: ${reserveVaultAddress}`);
  }

  // ============ Step 3: Deploy SSFShareSale ============
  console.log("\n[3/7] Deploying SSFShareSale...");
  console.log("       Owner: TREASURY");

  const now = Math.floor(Date.now() / 1000);
  // saleStart = now - 60 to ensure immediate buyability (smoke test today)
  const saleStart = now - 60;
  const saleEnd = saleStart + (CONFIG.saleDurationDays * 24 * 60 * 60);

  console.log(`       Sale Start: ${new Date(saleStart * 1000).toISOString()}`);
  console.log(`       Sale End:   ${new Date(saleEnd * 1000).toISOString()}`);

  const SSFShareSale = await ethers.getContractFactory("SSFShareSale");

  let shareSale: any;
  let shareSaleAddress: string;

  if (CONFIG.dryRun) {
    shareSaleAddress = "0x" + "3".repeat(40);
    console.log(`       [DRY RUN] Would deploy to: ${shareSaleAddress}`);
  } else {
    shareSale = await SSFShareSale.deploy(
      CONFIG.usdc,
      shareTokenAddress,
      reserveVaultAddress,
      CONFIG.treasury,
      CONFIG.treasury, // owner = treasury
      saleStart,
      saleEnd
    );
    await shareSale.waitForDeployment();
    shareSaleAddress = await shareSale.getAddress();
    console.log(`       ✅ Deployed: ${shareSaleAddress}`);
  }

  // ============ Step 4: Grant MINTER_ROLE to ShareSale ============
  console.log("\n[4/7] Granting MINTER_ROLE to ShareSale...");

  if (CONFIG.dryRun) {
    console.log(`       [DRY RUN] Would grant MINTER_ROLE`);
  } else {
    const MINTER_ROLE = await shareToken.MINTER_ROLE();
    const tx1 = await shareToken.grantRole(MINTER_ROLE, shareSaleAddress);
    await tx1.wait();
    console.log(`       ✅ Granted: ${shareSaleAddress}`);
    console.log(`       tx: ${tx1.hash}`);
  }

  // ============ Step 5: Grant BURNER_ROLE to ReserveVault ============
  console.log("\n[5/7] Granting BURNER_ROLE to ReserveVault...");

  if (CONFIG.dryRun) {
    console.log(`       [DRY RUN] Would grant BURNER_ROLE`);
  } else {
    const BURNER_ROLE = await shareToken.BURNER_ROLE();
    const tx2 = await shareToken.grantRole(BURNER_ROLE, reserveVaultAddress);
    await tx2.wait();
    console.log(`       ✅ Granted: ${reserveVaultAddress}`);
    console.log(`       tx: ${tx2.hash}`);
  }

  // ============ Step 6: Transfer Admin to Treasury ============
  console.log("\n[6/7] Transferring DEFAULT_ADMIN_ROLE to Treasury...");

  if (CONFIG.dryRun) {
    console.log(`       [DRY RUN] Would grant DEFAULT_ADMIN_ROLE to treasury`);
  } else {
    const DEFAULT_ADMIN_ROLE = await shareToken.DEFAULT_ADMIN_ROLE();
    const tx3 = await shareToken.grantRole(DEFAULT_ADMIN_ROLE, CONFIG.treasury);
    await tx3.wait();
    console.log(`       ✅ Treasury is now admin: ${CONFIG.treasury}`);
    console.log(`       tx: ${tx3.hash}`);
  }

  // ============ Step 7: Renounce Deployer Admin (Optional) ============
  console.log("\n[7/7] Renouncing deployer's DEFAULT_ADMIN_ROLE...");

  if (!CONFIG.renounceDeployerAdmin) {
    console.log(`       ⏭️  Skipped (renounceDeployerAdmin = false)`);
    console.log(`       ⚠️  Deployer still has admin access`);
  } else if (CONFIG.dryRun) {
    console.log(`       [DRY RUN] Would renounce DEFAULT_ADMIN_ROLE`);
  } else {
    const DEFAULT_ADMIN_ROLE = await shareToken.DEFAULT_ADMIN_ROLE();
    const tx4 = await shareToken.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
    await tx4.wait();
    console.log(`       ✅ Deployer admin renounced`);
    console.log(`       tx: ${tx4.hash}`);
  }

  // ============ Summary ============
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));

  console.log(`
CONTRACT ADDRESSES:
  SSFShareToken:    ${shareTokenAddress}
  SSFReserveVault:  ${reserveVaultAddress}
  SSFShareSale:     ${shareSaleAddress}

OWNERSHIP/ADMIN:
  Token Admin:      ${CONFIG.treasury} (treasury)
  Vault Owner:      ${CONFIG.treasury} (treasury)
  Sale Owner:       ${CONFIG.treasury} (treasury)
  Deployer Admin:   ${CONFIG.renounceDeployerAdmin ? "RENOUNCED" : "RETAINED"}

ROLES:
  MINTER_ROLE →     ${shareSaleAddress}
  BURNER_ROLE →     ${reserveVaultAddress}

SALE WINDOW:
  Start: ${new Date(saleStart * 1000).toISOString()}
  End:   ${new Date(saleEnd * 1000).toISOString()}
`);

  // ============ Next Steps for Treasury ============
  console.log("=".repeat(70));
  console.log("NEXT STEPS (Execute from Treasury wallet):");
  console.log("=".repeat(70));
  console.log(`
1. VERIFY CONTRACTS ON BASESCAN:
   npx hardhat verify --network base-mainnet ${shareTokenAddress} "${CONFIG.tokenName}" "${CONFIG.tokenSymbol}" ${deployer.address}
   npx hardhat verify --network base-mainnet ${reserveVaultAddress} ${CONFIG.usdc} ${shareTokenAddress} ${CONFIG.treasury} ${CONFIG.treasury} ${CONFIG.maxRedeemPerWindow}
   npx hardhat verify --network base-mainnet ${shareSaleAddress} ${CONFIG.usdc} ${shareTokenAddress} ${reserveVaultAddress} ${CONFIG.treasury} ${CONFIG.treasury} ${saleStart} ${saleEnd}

2. ADD ALLOWLIST (from Treasury):
   shareSale.setAllowlist([investor1, investor2, ...], true)

3. TEST INTERNAL PURCHASE (before public):
   - Have treasury address buy 1 share
   - Verify 50/50 split

4. UNPAUSE SALE (from Treasury):
   shareSale.unpause()
`);

  // ============ Rollback Instructions ============
  console.log("=".repeat(70));
  console.log("ROLLBACK / EMERGENCY:");
  console.log("=".repeat(70));
  console.log(`
If something goes wrong:

1. PAUSE SALE (from Treasury):
   shareSale.pause()

2. PAUSE REDEMPTIONS (from Treasury):
   reserveVault.pause()

3. REVOKE MINTER_ROLE (from Treasury - token admin):
   shareToken.revokeRole(MINTER_ROLE, ${shareSaleAddress})

4. REVOKE BURNER_ROLE (from Treasury - token admin):
   shareToken.revokeRole(BURNER_ROLE, ${reserveVaultAddress})

NOTE: Contracts are immutable. To "rollback", deploy new contracts
and redirect users. Old contracts remain on-chain forever.
`);

  return {
    shareToken: shareTokenAddress,
    reserveVault: reserveVaultAddress,
    shareSale: shareSaleAddress,
    saleStart,
    saleEnd,
    config: CONFIG,
  };
}

main()
  .then((result) => {
    console.log("\n" + "=".repeat(70));
    console.log("DEPLOYMENT RESULT (JSON):");
    console.log("=".repeat(70));
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });
