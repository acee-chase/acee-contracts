/**
 * SSF V1 Final Deployment Script
 * 
 * Deploys ShareSale and completes role setup.
 * SSFShareToken: 0xB6c38Ef75401695db928ef124D9e430b923B2546
 * SSFReserveVault: 0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3
 */

import { ethers } from "hardhat";

const CONFIG = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  treasury: "0x61bdD3AC52758C22038a169d761e36c2F224E7cd",
  shareToken: "0xB6c38Ef75401695db928ef124D9e430b923B2546",
  reserveVault: "0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3",
  saleDurationDays: 90,
  renounceDeployerAdmin: true,
};

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(70));
  console.log("SSF V1 FINAL DEPLOYMENT - ShareSale + Roles");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Nonce: ${await ethers.provider.getTransactionCount(deployer.address)}`);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId !== 8453n) {
    throw new Error(`Wrong chain! Expected 8453, got ${chainId}`);
  }

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
    CONFIG.reserveVault,
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
  console.log(`       ✅ Granted`);
  console.log(`       tx: ${tx1.hash}`);

  // ============ Step 5: Grant BURNER_ROLE ============
  console.log("\n[5/7] Granting BURNER_ROLE to ReserveVault...");

  const BURNER_ROLE = await shareToken.BURNER_ROLE();
  const tx2 = await shareToken.grantRole(BURNER_ROLE, CONFIG.reserveVault);
  await tx2.wait();
  console.log(`       ✅ Granted`);
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

  let tx4Hash = "";
  if (CONFIG.renounceDeployerAdmin) {
    const tx4 = await shareToken.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
    await tx4.wait();
    tx4Hash = tx4.hash;
    console.log(`       ✅ Deployer admin renounced`);
    console.log(`       tx: ${tx4.hash}`);
  }

  // ============ Summary ============
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));

  const result = {
    contracts: {
      SSFShareToken: CONFIG.shareToken,
      SSFReserveVault: CONFIG.reserveVault,
      SSFShareSale: shareSaleAddress,
    },
    saleWindow: {
      start: new Date(saleStart * 1000).toISOString(),
      end: new Date(saleEnd * 1000).toISOString(),
      startUnix: saleStart,
      endUnix: saleEnd,
    },
    txHashes: {
      minterRole: tx1.hash,
      burnerRole: tx2.hash,
      adminTransfer: tx3.hash,
      adminRenounce: tx4Hash,
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });
