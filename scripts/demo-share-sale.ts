/**
 * Demo script for SSFShareSale
 * 
 * Demonstrates the full purchase flow:
 *   1. (Optionally) Add deployer to allowlist (testnet only)
 *   2. Approve USDC spend
 *   3. Buy shares
 *   4. Verify ShareToken balance
 * 
 * For testnet demo, this script will:
 *   - Set allowlist to include deployer if empty
 *   - Unpause sale if paused
 *   - Mint USDC to deployer if needed
 * 
 * Usage:
 *   npx hardhat run scripts/demo-share-sale.ts --network base-sepolia
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
  console.log("SSF ShareSale Demo");
  console.log("=".repeat(70));
  console.log("\nRunning as:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Load deployment manifest
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : 
                      network.chainId === 8453n ? "base-mainnet" : "hardhat";
  
  const manifestPath = path.join(deploymentsDir, `${networkName}.json`);
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Deployment manifest not found: ${manifestPath}`);
  }
  
  const manifest: DeploymentManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  
  const mockUsdcAddress = manifest.contracts.MockUSDC?.address;
  const shareTokenAddress = manifest.contracts.SSFShareToken?.address;
  const shareSaleAddress = manifest.contracts.SSFShareSale?.address;
  
  if (!mockUsdcAddress || !shareTokenAddress || !shareSaleAddress) {
    throw new Error("Required contracts not found in manifest. Run deploy-share-sale-testnet.ts first.");
  }
  
  console.log("\n📦 Contracts:");
  console.log("   MockUSDC:        ", mockUsdcAddress);
  console.log("   SSFShareToken:   ", shareTokenAddress);
  console.log("   SSFShareSale:    ", shareSaleAddress);

  // Get contract instances
  const mockUsdc = await ethers.getContractAt("MockUSDC", mockUsdcAddress);
  const shareToken = await ethers.getContractAt("SSFShareToken", shareTokenAddress);
  const shareSale = await ethers.getContractAt("SSFShareSale", shareSaleAddress);

  // Check current state
  const isPaused = await shareSale.paused();
  const isAllowlisted = await shareSale.allowlist(deployer.address);
  const sharesBefore = await shareToken.balanceOf(deployer.address);
  
  console.log("\n📊 Current State:");
  console.log("   Paused:", isPaused);
  console.log("   Deployer allowlisted:", isAllowlisted);
  console.log("   Deployer shares:", sharesBefore.toString());

  // For testnet: Setup if needed
  if (networkName === "base-sepolia" || networkName === "hardhat") {
    // 1. Add deployer to allowlist if not already
    if (!isAllowlisted) {
      console.log("\n🔧 [Testnet Setup] Adding deployer to allowlist...");
      const tx1 = await shareSale.setAllowlist([deployer.address], true);
      await tx1.wait();
      console.log("   ✓ Allowlist updated");
    }
    
    // 2. Unpause if paused
    if (isPaused) {
      console.log("\n🔧 [Testnet Setup] Unpausing sale...");
      const tx2 = await shareSale.unpause();
      await tx2.wait();
      console.log("   ✓ Sale unpaused");
    }
    
    // 3. Override sale window for testnet demo (set to now)
    // This allows immediate testing without waiting for actual sale window
    const now = Math.floor(Date.now() / 1000);
    const saleStart = await shareSale.saleStart();
    
    if (BigInt(now) < saleStart) {
      console.log("\n🔧 [Testnet Setup] Adjusting sale window for demo...");
      const tx3 = await shareSale.setSaleWindow(now - 60, now + 3600); // Start 1min ago, end in 1hr
      await tx3.wait();
      console.log("   ✓ Sale window adjusted for demo");
    }
    
    // 4. Ensure deployer has USDC
    const usdcBalance = await mockUsdc.balanceOf(deployer.address);
    const requiredUsdc = ethers.parseUnits("10000", 6); // 10,000 USDC for 1 share
    
    if (usdcBalance < requiredUsdc) {
      console.log("\n🔧 [Testnet Setup] Minting USDC to deployer...");
      const mintTx = await mockUsdc.mint(deployer.address, ethers.parseUnits("50000", 6)); // 50K USDC
      await mintTx.wait();
      console.log("   ✓ Minted 50,000 USDC to deployer");
    }
  }

  // Demo: Buy 1 share
  console.log("\n" + "=".repeat(70));
  console.log("DEMO: Purchase 1 Share");
  console.log("=".repeat(70));

  const sharesToBuy = 1;
  const pricePerShare = await shareSale.PRICE_PER_SHARE_USDC();
  const totalCost = pricePerShare * BigInt(sharesToBuy);
  
  console.log("\n📝 Purchase Details:");
  console.log("   Shares to buy:", sharesToBuy);
  console.log("   Price per share:", ethers.formatUnits(pricePerShare, 6), "USDC");
  console.log("   Total cost:", ethers.formatUnits(totalCost, 6), "USDC");

  // Step 1: Approve USDC
  console.log("\n1️⃣  Approving USDC spend...");
  const approveTx = await mockUsdc.approve(shareSaleAddress, totalCost);
  const approveReceipt = await approveTx.wait();
  console.log("   ✓ Approved");
  console.log("   Tx:", approveReceipt?.hash);

  // Step 2: Buy shares
  console.log("\n2️⃣  Buying share...");
  const buyTx = await shareSale.buy(sharesToBuy);
  const buyReceipt = await buyTx.wait(2); // Wait for 2 confirmations
  console.log("   ✓ Purchase complete");
  console.log("   Tx:", buyReceipt?.hash);

  // Wait for RPC state to settle (Base Sepolia RPC can lag)
  console.log("   ⏳ Waiting for RPC state to settle...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Verify
  console.log("\n3️⃣  Verifying...");
  const sharesAfter = await shareToken.balanceOf(deployer.address);
  const sharesSold = await shareSale.sharesSold();
  const purchasedByDeployer = await shareSale.purchasedShares(deployer.address);
  
  console.log("   Deployer shares (before):", sharesBefore.toString());
  console.log("   Deployer shares (after):", sharesAfter.toString());
  console.log("   Total shares sold:", sharesSold.toString());
  console.log("   Deployer purchased:", purchasedByDeployer.toString());

  // Verify balance increased
  const expectedIncrease = BigInt(sharesToBuy);
  const actualIncrease = sharesAfter - sharesBefore;
  
  if (actualIncrease === expectedIncrease) {
    console.log("\n✅ SUCCESS: Share balance increased by", sharesToBuy);
  } else {
    console.log("\n❌ FAILED: Expected increase", sharesToBuy, "but got", actualIncrease.toString());
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("DEMO COMPLETE");
  console.log("=".repeat(70));
  console.log("\n📄 Transaction Hashes:");
  console.log("   Approve:", approveReceipt?.hash);
  console.log("   Buy:", buyReceipt?.hash);
  console.log("\n🔗 Explorer Links:");
  const explorerBase = networkName === "base-mainnet" 
    ? "https://basescan.org" 
    : "https://sepolia.basescan.org";
  console.log("   Approve:", `${explorerBase}/tx/${approveReceipt?.hash}`);
  console.log("   Buy:", `${explorerBase}/tx/${buyReceipt?.hash}`);
  console.log("=".repeat(70));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

