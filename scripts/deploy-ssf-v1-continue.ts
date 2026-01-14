/**
 * SSF V1 Continue Deployment Script
 * 
 * Continues from where deploy-ssf-v1-production.ts failed.
 * SSFShareToken already deployed at: 0xB6c38Ef75401695db928ef124D9e430b923B2546
 */

import { ethers } from "hardhat";

const CONFIG = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  treasury: "0x61bdD3AC52758C22038a169d761e36c2F224E7cd",
  shareToken: "0xB6c38Ef75401695db928ef124D9e430b923B2546", // ALREADY DEPLOYED
  maxRedeemPerWindow: 500,
  saleDurationDays: 90,
  renounceDeployerAdmin: true,
};

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(70));
  console.log("SSF V1 CONTINUE DEPLOYMENT");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Treasury: ${CONFIG.treasury}`);
  console.log(`ShareToken (existing): ${CONFIG.shareToken}`);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId !== 8453n) {
    throw new Error(`Wrong chain! Expected 8453, got ${chainId}`);
  }

  // ============ Step 2: Deploy SSFReserveVault ============
  console.log("\n[2/7] Deploying SSFReserveVault...");

  const SSFReserveVault = await ethers.getContractFactory("SSFReserveVault");
  const reserveVault = await SSFReserveVault.deploy(
    CONFIG.usdc,
    CONFIG.shareToken,
    CONFIG.treasury,
    CONFIG.treasury,
    CONFIG.maxRedeemPerWindow
  );
  await reserveVault.waitForDeployment();
  const reserveVaultAddress = await reserveVault.getAddress();
  console.log(`       ✅ Deployed: ${reserveVaultAddress}`);

  // ============ Step 3: Deploy SSFShareSale ============
  console.log("\n[3/7] Deploying SSFShareSale...");

  const now = Math.floor(Date.now() / 1000);
  const saleStart = now - 60;
  const saleEnd = saleStart + (CONFIG.saleDurationDays * 24 * 60 * 60);

  console.log(`       Sale Start: ${new Date(saleStart * 1000).toISOString()}`);
  console.log(`       Sale End:   ${new Date(saleEnd * 1000).toISOString()}`);

  const SSFShareSale = await ethers.getContractFactory("SSFShareSale");
  const shareSale = await SSFShareSale.deploy(
    CONFIG.usdc,
    CONFIG.shareToken,
    reserveVaultAddress,
    CONFIG.treasury,
    CONFIG.treasury,
    saleStart,
    saleEnd
  );
  await shareSale.waitForDeployment();
  const shareSaleAddress = await shareSale.getAddress();
  console.log(`       ✅ Deployed: ${shareSaleAddress}`);

  // ============ Step 4: Grant MINTER_ROLE ============
  console.log("\n[4/7] Granting MINTER_ROLE to ShareSale...");
  
  const shareToken = await ethers.getContractAt("SSFShareToken", CONFIG.shareToken);
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  const tx1 = await shareToken.grantRole(MINTER_ROLE, shareSaleAddress);
  await tx1.wait();
  console.log(`       ✅ Granted: ${shareSaleAddress}`);
  console.log(`       tx: ${tx1.hash}`);

  // ============ Step 5: Grant BURNER_ROLE ============
  console.log("\n[5/7] Granting BURNER_ROLE to ReserveVault...");

  const BURNER_ROLE = await shareToken.BURNER_ROLE();
  const tx2 = await shareToken.grantRole(BURNER_ROLE, reserveVaultAddress);
  await tx2.wait();
  console.log(`       ✅ Granted: ${reserveVaultAddress}`);
  console.log(`       tx: ${tx2.hash}`);

  // ============ Step 6: Transfer Admin to Treasury ============
  console.log("\n[6/7] Transferring DEFAULT_ADMIN_ROLE to Treasury...");

  const DEFAULT_ADMIN_ROLE = await shareToken.DEFAULT_ADMIN_ROLE();
  const tx3 = await shareToken.grantRole(DEFAULT_ADMIN_ROLE, CONFIG.treasury);
  await tx3.wait();
  console.log(`       ✅ Treasury is now admin`);
  console.log(`       tx: ${tx3.hash}`);

  // ============ Step 7: Renounce Deployer Admin ============
  console.log("\n[7/7] Renouncing deployer's DEFAULT_ADMIN_ROLE...");

  if (CONFIG.renounceDeployerAdmin) {
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
  SSFShareToken:    ${CONFIG.shareToken}
  SSFReserveVault:  ${reserveVaultAddress}
  SSFShareSale:     ${shareSaleAddress}

SALE WINDOW:
  Start: ${new Date(saleStart * 1000).toISOString()}
  End:   ${new Date(saleEnd * 1000).toISOString()}
  saleStart (unix): ${saleStart}
  saleEnd (unix): ${saleEnd}
`);

  return {
    shareToken: CONFIG.shareToken,
    reserveVault: reserveVaultAddress,
    shareSale: shareSaleAddress,
    saleStart,
    saleEnd,
    txHashes: {
      minterRole: tx1.hash,
      burnerRole: tx2.hash,
      adminTransfer: tx3.hash,
    }
  };
}

main()
  .then((result) => {
    console.log("\nDEPLOYMENT RESULT (JSON):");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });
