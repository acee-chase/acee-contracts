/**
 * Deploy SSFShareTokenTest + SSFShareSaleTest10 to Base Mainnet
 * 
 * TEST DEPLOYMENT for E2E validation with real USDC but minimal exposure.
 * 
 * TEST PARAMETERS (test10):
 *   - Price: 10 USDC per share
 *   - Max shares: 10 (total cap 100 USDC)
 *   - Per-wallet cap: 1 share
 *   - Allowlist: 2 addresses max (Chase wallets only)
 *   - Default: PAUSED
 *   - Sale window: 1 hour from deployment
 * 
 * IMPORTANT: This uses REAL USDC on Base mainnet!
 * Circle USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-share-sale-base-mainnet-test10.ts --network base-mainnet
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
  mode: string;
  deployer: string;
  treasury: string;
  updatedAt: string;
  contracts: {
    USDC: ContractDeployment;
    SSFShareToken: ContractDeployment;
    SSFShareSale: ContractDeployment;
  };
}

// Circle USDC on Base Mainnet
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(70));
  console.log("⚠️  BASE MAINNET - TEST10 DEPLOYMENT (Real USDC, Minimal Exposure)");
  console.log("=".repeat(70));
  console.log("\nDeploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Verify we're on Base mainnet
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 8453n) {
    throw new Error(`Wrong network! Expected Base mainnet (8453), got ${network.chainId}`);
  }
  console.log("\n✅ Network verified: Base Mainnet (chainId: 8453)");
  
  // Sale window: starts now, ends in 1 hour
  const now = Math.floor(Date.now() / 1000);
  const saleStart = now;
  const saleEnd = now + 3600; // 1 hour
  
  console.log("\n📅 Sale Window (1 hour test window):");
  console.log("   Start:", new Date(saleStart * 1000).toISOString());
  console.log("   End:  ", new Date(saleEnd * 1000).toISOString());
  
  // Treasury is deployer for test
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("\n💰 Treasury:", treasuryAddress);
  console.log("💵 USDC (Circle):", BASE_MAINNET_USDC);
  
  // 1. Deploy SSFShareTokenTest
  console.log("\n1. Deploying SSFShareTokenTest...");
  const SSFShareTokenTest = await ethers.getContractFactory("SSFShareTokenTest");
  const shareToken = await SSFShareTokenTest.deploy(deployer.address);
  const shareTokenReceipt = await shareToken.deploymentTransaction()?.wait(2);
  const shareTokenAddress = await shareToken.getAddress();
  console.log("   ✅ SSFShareTokenTest deployed to:", shareTokenAddress);
  console.log("   Version:", await shareToken.VERSION());
  console.log("   TX:", shareTokenReceipt?.hash);
  
  // 2. Deploy SSFShareSaleTest10
  console.log("\n2. Deploying SSFShareSaleTest10...");
  const SSFShareSaleTest10 = await ethers.getContractFactory("SSFShareSaleTest10");
  const shareSale = await SSFShareSaleTest10.deploy(
    BASE_MAINNET_USDC,
    shareTokenAddress,
    treasuryAddress,
    deployer.address,
    saleStart,
    saleEnd
  );
  const shareSaleReceipt = await shareSale.deploymentTransaction()?.wait(2);
  const shareSaleAddress = await shareSale.getAddress();
  console.log("   ✅ SSFShareSaleTest10 deployed to:", shareSaleAddress);
  console.log("   Version:", await shareSale.VERSION());
  console.log("   TX:", shareSaleReceipt?.hash);
  console.log("   Paused:", await shareSale.paused(), "(default - requires unpause)");
  
  // 3. Grant MINTER_ROLE to ShareSale
  console.log("\n3. Granting MINTER_ROLE to SSFShareSaleTest10...");
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  const grantTx = await shareToken.grantRole(MINTER_ROLE, shareSaleAddress);
  await grantTx.wait();
  console.log("   ✅ MINTER_ROLE granted");
  
  // 4. Write deployment manifest
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const manifest: DeploymentManifest = {
    network: "base-mainnet",
    chainId: 8453,
    mode: "test10",
    deployer: deployer.address,
    treasury: treasuryAddress,
    updatedAt: new Date().toISOString(),
    contracts: {
      USDC: {
        version: "Circle-USDC",
        address: BASE_MAINNET_USDC,
        deployTx: "n/a (official Circle USDC)",
        deployedAt: "n/a",
      },
      SSFShareToken: {
        version: "SSFShareToken@Test",
        address: shareTokenAddress,
        deployTx: shareTokenReceipt?.hash || "",
        deployedAt: new Date().toISOString(),
      },
      SSFShareSale: {
        version: "SSFShareSale@1.0.1-test10",
        address: shareSaleAddress,
        deployTx: shareSaleReceipt?.hash || "",
        deployedAt: new Date().toISOString(),
      },
    },
  };
  
  const manifestPath = path.join(deploymentsDir, "base-mainnet-test10.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n4. ✅ Manifest saved: deployments/base-mainnet-test10.json`);
  
  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("🎉 TEST10 DEPLOYMENT COMPLETE - Base Mainnet");
  console.log("=".repeat(70));
  console.log("\n📋 Test Parameters:");
  console.log("   Price per share:     10 USDC");
  console.log("   Max shares:          10 (100 USDC total cap)");
  console.log("   Per-wallet cap:      1 share (10 USDC)");
  console.log("   Allowlist capacity:  2 addresses");
  console.log("   Default state:       PAUSED");
  console.log("\n📦 Contracts:");
  console.log("   USDC (Circle):       ", BASE_MAINNET_USDC);
  console.log("   SSFShareTokenTest:   ", shareTokenAddress);
  console.log("   SSFShareSaleTest10:  ", shareSaleAddress);
  console.log("\n🔗 Explorer Links:");
  console.log("   Token:", `https://basescan.org/address/${shareTokenAddress}`);
  console.log("   Sale: ", `https://basescan.org/address/${shareSaleAddress}`);
  console.log("\n⚠️  ADMIN OPS REQUIRED (run with cast or Basescan):");
  console.log(`   1. Add to allowlist:  cast send ${shareSaleAddress} "setAllowlist(address[],bool)" "[<CHASE_WALLET>]" true`);
  console.log(`   2. Unpause:           cast send ${shareSaleAddress} "unpause()"`);
  console.log(`   3. (after test) Pause: cast send ${shareSaleAddress} "pause()"`);
  console.log("=".repeat(70));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
