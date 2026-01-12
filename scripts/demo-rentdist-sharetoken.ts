/**
 * Demo script: E2E RENTDistribution weighted by SSFShareToken
 * 
 * This demonstrates the investor rental income claim flow:
 *   1. Investor buys shares via SSFShareSale (or already holds shares)
 *   2. Treasury deposits rental income (USDC)
 *   3. Investor claims pro-rata share based on SSFShareToken balance
 * 
 * Prerequisites:
 *   - RENTDistribution_SSFShareToken deployed (run deploy-rentdist-sharetoken-testnet.ts)
 *   - Deployer is on allowlist OR sale is configured for demo
 *   - Deployer has USDC (MockUSDC on testnet)
 * 
 * Usage:
 *   npx hardhat run scripts/demo-rentdist-sharetoken.ts --network base-sepolia
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
    RENTDistribution_SSFShareToken: ContractInfo;
    [key: string]: ContractInfo;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running ShareToken RentDist demo with account:", deployer.address);

  // Load deployment
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : "base-mainnet";
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found at ${deploymentPath}.`);
  }

  const deployment: DeploymentManifest = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Loaded deployment from:", deploymentPath);

  // Verify RENTDistribution_SSFShareToken exists
  if (!deployment.contracts.RENTDistribution_SSFShareToken) {
    throw new Error("RENTDistribution_SSFShareToken not found. Run deploy-rentdist-sharetoken-testnet.ts first.");
  }

  // Get contracts
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC.address);
  const shareToken = await ethers.getContractAt("SSFShareToken", deployment.contracts.SSFShareToken.address);
  const shareSale = await ethers.getContractAt("SSFShareSale", deployment.contracts.SSFShareSale.address);
  const rentDist = await ethers.getContractAt("RENTDistribution", deployment.contracts.RENTDistribution_SSFShareToken.address);

  console.log("\n" + "=".repeat(70));
  console.log("DEMO: SSFShareToken → Buy → Deposit → Claim (Rent Distribution)");
  console.log("=".repeat(70));

  // Step 1: Check initial state
  console.log("\n[Step 1] Initial State");
  const deployerShares = await shareToken.balanceOf(deployer.address);
  const deployerUsdc = await usdc.balanceOf(deployer.address);
  console.log("  Deployer SSFShareToken:", deployerShares.toString(), "shares");
  console.log("  Deployer USDC:         ", ethers.formatUnits(deployerUsdc, 6));

  // Step 2: Ensure deployer has shares (if not, buy some)
  let sharePurchaseTx = null;
  if (deployerShares === 0n) {
    console.log("\n[Step 2] Deployer has no shares. Attempting to buy via SSFShareSale...");
    
    // Check if on allowlist
    const isAllowlisted = await shareSale.allowlist(deployer.address);
    console.log("  On allowlist:", isAllowlisted);
    
    if (!isAllowlisted) {
      console.log("  Adding deployer to allowlist (testnet only)...");
      const addTx = await shareSale.setAllowlist([deployer.address], true);
      await addTx.wait();
      console.log("  ✓ Added to allowlist");
    }

    // Check if paused
    const isPaused = await shareSale.paused();
    console.log("  Paused:", isPaused);
    
    if (isPaused) {
      console.log("  Unpausing sale (testnet only)...");
      const unpauseTx = await shareSale.unpause();
      await unpauseTx.wait();
      console.log("  ✓ Unpaused");
    }

    // Check/set sale window
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const saleStart = await shareSale.saleStart();
    const saleEnd = await shareSale.saleEnd();
    
    if (currentTime < saleStart || currentTime > saleEnd) {
      console.log("  Adjusting sale window for demo...");
      const newStart = currentTime - 60n;
      const newEnd = currentTime + 3600n;
      const windowTx = await shareSale.setSaleWindow(newStart, newEnd);
      await windowTx.wait();
      console.log("  ✓ Sale window set");
    }

    // Buy 1 share
    const sharesToBuy = 1n;
    const pricePerShare = await shareSale.PRICE_PER_SHARE_USDC();
    const totalCost = sharesToBuy * pricePerShare;

    console.log("  Approving USDC spend...");
    const approveTx = await usdc.approve(deployment.contracts.SSFShareSale.address, totalCost);
    await approveTx.wait(1);
    console.log("  ✓ Approved");

    console.log("  Buying 1 share...");
    sharePurchaseTx = await shareSale.buy(sharesToBuy);
    await sharePurchaseTx.wait(1);
    console.log("  ✓ Purchased 1 share. Tx:", sharePurchaseTx.hash);

    const newBalance = await shareToken.balanceOf(deployer.address);
    console.log("  New SSFShareToken balance:", newBalance.toString());
  } else {
    console.log("\n[Step 2] Deployer already has", deployerShares.toString(), "shares. Skipping purchase.");
  }

  // Step 3: Start a new distribution period
  console.log("\n[Step 3] Starting new rent distribution period...");
  const startTx = await rentDist.startPeriod();
  const startReceipt = await startTx.wait();
  
  // Extract periodId from event
  const distAddress = await rentDist.getAddress();
  const periodStartedEvent = startReceipt?.logs.find((log) => {
    if (log.address.toLowerCase() !== distAddress.toLowerCase()) return false;
    try {
      const parsed = rentDist.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      return parsed?.name === "PeriodStarted";
    } catch {
      return false;
    }
  });
  
  if (!periodStartedEvent) {
    throw new Error("PeriodStarted event not found");
  }
  
  const parsedEvent = rentDist.interface.parseLog({
    topics: periodStartedEvent.topics as string[],
    data: periodStartedEvent.data,
  });
  const periodId = parsedEvent!.args.periodId;
  
  console.log("  Period started. ID:", periodId.toString());
  console.log("  Tx:", startTx.hash);

  // Step 4: Deposit rental income
  console.log("\n[Step 4] Treasury deposits 500 USDC (simulated rental income)...");
  const depositAmount = ethers.parseUnits("500", 6);
  
  const approveDepositTx = await usdc.approve(distAddress, depositAmount);
  await approveDepositTx.wait();
  console.log("  Approved. Tx:", approveDepositTx.hash);
  
  const depositTx = await rentDist.deposit(depositAmount);
  await depositTx.wait();
  console.log("  Deposited 500 USDC. Tx:", depositTx.hash);

  // Step 5: Finalize period
  console.log("\n[Step 5] Finalizing period", periodId.toString(), "...");
  const finalizeTx = await rentDist.finalizePeriod();
  await finalizeTx.wait();
  console.log("  Finalized. Tx:", finalizeTx.hash);

  // Wait for state propagation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 6: Check claimable
  console.log("\n[Step 6] Checking claimable amount...");
  const claimable = await rentDist.getClaimable(deployer.address, periodId);
  const period = await rentDist.periods(periodId);
  
  console.log("  Period State:");
  console.log("    totalDeposited:", ethers.formatUnits(period.totalDeposited, 6), "USDC");
  console.log("    snapshotSupply:", period.snapshotSupply.toString(), "shares");
  console.log("    finalized:     ", period.finalized);
  console.log("  Deployer claimable:", ethers.formatUnits(claimable, 6), "USDC");

  // Step 7: Claim
  console.log("\n[Step 7] Claiming rental income...");
  const claimTx = await rentDist.claim(periodId);
  await claimTx.wait();
  console.log("  Claimed! Tx:", claimTx.hash);

  // Final balances
  console.log("\n[Step 8] Final Balances");
  const finalUsdc = await usdc.balanceOf(deployer.address);
  const finalShares = await shareToken.balanceOf(deployer.address);
  console.log("  Deployer USDC:  ", ethers.formatUnits(finalUsdc, 6));
  console.log("  Deployer Shares:", finalShares.toString());

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("DEMO COMPLETE - SSFShareToken Weighted Rent Distribution");
  console.log("=".repeat(70));
  console.log("Transaction Hashes:");
  if (sharePurchaseTx) {
    console.log("  sharePurchase:  ", sharePurchaseTx.hash);
  }
  console.log("  startPeriod:    ", startTx.hash);
  console.log("  approveDeposit: ", approveDepositTx.hash);
  console.log("  deposit:        ", depositTx.hash);
  console.log("  finalizePeriod: ", finalizeTx.hash);
  console.log("  claim:          ", claimTx.hash);
  console.log("=".repeat(70));

  // Save demo results
  const demoResults = {
    network: networkName,
    timestamp: new Date().toISOString(),
    rentDistContract: distAddress,
    weightToken: "SSFShareToken",
    periodId: periodId.toString(),
    depositAmount: "500.000000",
    claimAmount: ethers.formatUnits(claimable, 6),
    snapshotSupply: period.snapshotSupply.toString(),
    transactions: {
      sharePurchase: sharePurchaseTx?.hash || null,
      startPeriod: startTx.hash,
      approveDeposit: approveDepositTx.hash,
      deposit: depositTx.hash,
      finalizePeriod: finalizeTx.hash,
      claim: claimTx.hash,
    },
  };

  const demoResultsPath = path.join(__dirname, "..", "deployments", `${networkName}-rentdist-sharetoken-demo.json`);
  fs.writeFileSync(demoResultsPath, JSON.stringify(demoResults, null, 2));
  console.log("\nDemo results saved to:", demoResultsPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
