/**
 * Demo script: Full E2E flow for RENTDistribution
 * 
 * Prerequisites:
 *   - Contracts deployed (run deploy-testnet.ts first)
 *   - Deployer has RENT-SEN tokens
 *   - Treasury has USDC
 * 
 * Usage:
 *   npx hardhat run scripts/demo-rent-distribution.ts --network base-sepolia
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  contracts: {
    MockUSDC: string;
    MockRENTToken: string;
    RENTDistribution: string;
  };
  treasury: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running demo with account:", deployer.address);

  // Load deployment info
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : "base-mainnet";
  const deploymentPath = path.join(__dirname, "..", "deployments", networkName, "ssf-deployment.json");
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found at ${deploymentPath}. Run deploy-testnet.ts first.`);
  }

  const deployment: DeploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Loaded deployment from:", deploymentPath);

  // Get contract instances
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC);
  const rentToken = await ethers.getContractAt("MockRENTToken", deployment.contracts.MockRENTToken);
  const distribution = await ethers.getContractAt("RENTDistribution", deployment.contracts.RENTDistribution);

  console.log("\n" + "=".repeat(60));
  console.log("DEMO: USDC Subscribe → Deposit → Claim");
  console.log("=".repeat(60));

  // Step 1: Check balances
  console.log("\n[Step 1] Initial Balances");
  const treasuryUsdcBalance = await usdc.balanceOf(deployment.treasury);
  const deployerRentBalance = await rentToken.balanceOf(deployer.address);
  console.log("  Treasury USDC:     ", ethers.formatUnits(treasuryUsdcBalance, 6));
  console.log("  Deployer RENT-SEN: ", ethers.formatUnits(deployerRentBalance, 18));

  // Step 2: Start a new distribution period
  console.log("\n[Step 2] Starting Period 1...");
  const startTx = await distribution.startPeriod();
  await startTx.wait();
  const currentPeriodId = await distribution.currentPeriodId();
  console.log("  Period started. ID:", currentPeriodId.toString());
  console.log("  Tx:", startTx.hash);

  // Step 3: Treasury approves and deposits USDC
  console.log("\n[Step 3] Treasury deposits 1,000 USDC...");
  const depositAmount = ethers.parseUnits("1000", 6);
  
  // Approve
  const approveTx = await usdc.approve(deployment.contracts.RENTDistribution, depositAmount);
  await approveTx.wait();
  console.log("  Approved. Tx:", approveTx.hash);

  // Deposit
  const depositTx = await distribution.deposit(depositAmount);
  await depositTx.wait();
  console.log("  Deposited 1,000 USDC. Tx:", depositTx.hash);

  // Step 4: Finalize period
  console.log("\n[Step 4] Finalizing Period 1...");
  const finalizeTx = await distribution.finalizePeriod();
  await finalizeTx.wait();
  console.log("  Period finalized. Tx:", finalizeTx.hash);

  // Step 5: Check claimable amount
  console.log("\n[Step 5] Checking claimable amount...");
  const claimable = await distribution.getClaimable(deployer.address, currentPeriodId);
  console.log("  Deployer claimable:", ethers.formatUnits(claimable, 6), "USDC");

  // Step 6: Claim
  console.log("\n[Step 6] Claiming...");
  const claimTx = await distribution.claim(currentPeriodId);
  await claimTx.wait();
  console.log("  Claimed! Tx:", claimTx.hash);

  // Step 7: Final balances
  console.log("\n[Step 7] Final Balances");
  const finalDeployerUsdc = await usdc.balanceOf(deployer.address);
  console.log("  Deployer USDC balance:", ethers.formatUnits(finalDeployerUsdc, 6));

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEMO COMPLETE");
  console.log("=".repeat(60));
  console.log("Transaction Hashes (for DB record):");
  console.log("  startPeriod:    ", startTx.hash);
  console.log("  deposit:        ", depositTx.hash);
  console.log("  finalizePeriod: ", finalizeTx.hash);
  console.log("  claim:          ", claimTx.hash);
  console.log("=".repeat(60));

  // Save demo results
  const demoResults = {
    network: networkName,
    timestamp: new Date().toISOString(),
    periodId: currentPeriodId.toString(),
    depositAmount: "1000.000000",
    claimAmount: ethers.formatUnits(claimable, 6),
    transactions: {
      startPeriod: startTx.hash,
      deposit: depositTx.hash,
      finalizePeriod: finalizeTx.hash,
      claim: claimTx.hash,
    },
  };

  const demoResultsPath = path.join(__dirname, "..", "deployments", networkName, "demo-results.json");
  fs.writeFileSync(demoResultsPath, JSON.stringify(demoResults, null, 2));
  console.log("\nDemo results saved to:", demoResultsPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

