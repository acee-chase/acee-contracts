/**
 * SSF V1 Role Setup Script
 * 
 * Sets up roles after all contracts are deployed.
 */

import { ethers } from "hardhat";

const CONFIG = {
  treasury: "0x61bdD3AC52758C22038a169d761e36c2F224E7cd",
  shareToken: "0xB6c38Ef75401695db928ef124D9e430b923B2546",
  reserveVault: "0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3",
  shareSale: "0x52DbEa06AEb510E54b52C029eF7bD82cd33Ac5c4",
  renounceDeployerAdmin: true,
};

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(70));
  console.log("SSF V1 ROLE SETUP");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Nonce: ${await ethers.provider.getTransactionCount(deployer.address)}`);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId !== 8453n) {
    throw new Error(`Wrong chain! Expected 8453, got ${chainId}`);
  }

  const shareToken = await ethers.getContractAt("SSFShareToken", CONFIG.shareToken);

  // ============ Step 4: Grant MINTER_ROLE ============
  console.log("\n[4/7] Granting MINTER_ROLE to ShareSale...");
  
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  
  // Check if already granted
  const hasMinter = await shareToken.hasRole(MINTER_ROLE, CONFIG.shareSale);
  if (hasMinter) {
    console.log(`       ⏭️  Already granted`);
  } else {
    const tx1 = await shareToken.grantRole(MINTER_ROLE, CONFIG.shareSale);
    await tx1.wait();
    console.log(`       ✅ Granted`);
    console.log(`       tx: ${tx1.hash}`);
  }

  // ============ Step 5: Grant BURNER_ROLE ============
  console.log("\n[5/7] Granting BURNER_ROLE to ReserveVault...");

  const BURNER_ROLE = await shareToken.BURNER_ROLE();
  
  const hasBurner = await shareToken.hasRole(BURNER_ROLE, CONFIG.reserveVault);
  if (hasBurner) {
    console.log(`       ⏭️  Already granted`);
  } else {
    const tx2 = await shareToken.grantRole(BURNER_ROLE, CONFIG.reserveVault);
    await tx2.wait();
    console.log(`       ✅ Granted`);
    console.log(`       tx: ${tx2.hash}`);
  }

  // ============ Step 6: Transfer Admin to Treasury ============
  console.log("\n[6/7] Transferring DEFAULT_ADMIN_ROLE to Treasury...");

  const DEFAULT_ADMIN_ROLE = await shareToken.DEFAULT_ADMIN_ROLE();
  
  const treasuryHasAdmin = await shareToken.hasRole(DEFAULT_ADMIN_ROLE, CONFIG.treasury);
  if (treasuryHasAdmin) {
    console.log(`       ⏭️  Treasury already has admin`);
  } else {
    const tx3 = await shareToken.grantRole(DEFAULT_ADMIN_ROLE, CONFIG.treasury);
    await tx3.wait();
    console.log(`       ✅ Treasury is now admin`);
    console.log(`       tx: ${tx3.hash}`);
  }

  // ============ Step 7: Renounce Deployer Admin ============
  console.log("\n[7/7] Renouncing deployer's DEFAULT_ADMIN_ROLE...");

  const deployerHasAdmin = await shareToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (!deployerHasAdmin) {
    console.log(`       ⏭️  Deployer already renounced`);
  } else if (CONFIG.renounceDeployerAdmin) {
    const tx4 = await shareToken.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
    await tx4.wait();
    console.log(`       ✅ Deployer admin renounced`);
    console.log(`       tx: ${tx4.hash}`);
  } else {
    console.log(`       ⏭️  Skipped (renounceDeployerAdmin = false)`);
  }

  // ============ Verification ============
  console.log("\n" + "=".repeat(70));
  console.log("ROLE VERIFICATION");
  console.log("=".repeat(70));

  console.log(`MINTER_ROLE → ShareSale:     ${await shareToken.hasRole(MINTER_ROLE, CONFIG.shareSale)}`);
  console.log(`BURNER_ROLE → ReserveVault:  ${await shareToken.hasRole(BURNER_ROLE, CONFIG.reserveVault)}`);
  console.log(`ADMIN_ROLE  → Treasury:      ${await shareToken.hasRole(DEFAULT_ADMIN_ROLE, CONFIG.treasury)}`);
  console.log(`ADMIN_ROLE  → Deployer:      ${await shareToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)}`);

  console.log("\n✅ ROLE SETUP COMPLETE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ROLE SETUP FAILED:");
    console.error(error);
    process.exit(1);
  });
