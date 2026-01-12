/**
 * Debug script to investigate claim failure
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Debugging claim issue with account:", deployer.address);

  // Load deployment info
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : "base-mainnet";
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Loaded deployment from:", deploymentPath);

  // Get contract instances
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.MockUSDC.address);
  const rentToken = await ethers.getContractAt("MockRENTToken", deployment.contracts.MockRENTToken.address);
  const distribution = await ethers.getContractAt("RENTDistribution", deployment.contracts.RENTDistribution.address);

  console.log("\n" + "=".repeat(60));
  console.log("DEBUG: Claim Issue Analysis");
  console.log("=".repeat(60));

  // Check current period ID
  const currentPeriodId = await distribution.currentPeriodId();
  console.log("\n[1] Current Period ID:", currentPeriodId.toString());

  // Check deployer balance
  const deployerRentBalance = await rentToken.balanceOf(deployer.address);
  const totalSupply = await rentToken.totalSupply();
  console.log("\n[2] Token Balances:");
  console.log("  Deployer RENT-SEN:", ethers.formatUnits(deployerRentBalance, 18));
  console.log("  Total Supply:", ethers.formatUnits(totalSupply, 18));

  // Check all periods
  console.log("\n[3] Period Status:");
  for (let i = 0; i <= Number(currentPeriodId); i++) {
    const period = await distribution.periods(i);
    const claimable = await distribution.getClaimable(deployer.address, i);
    const hasClaimed = await distribution.hasClaimed(i, deployer.address);
    
    console.log(`\n  Period ${i}:`);
    console.log("    totalDeposited:", ethers.formatUnits(period.totalDeposited, 6), "USDC");
    console.log("    snapshotSupply:", ethers.formatUnits(period.snapshotSupply, 18), "RENT-SEN");
    console.log("    finalized:", period.finalized);
    console.log("    claimable:", ethers.formatUnits(claimable, 6), "USDC");
    console.log("    hasClaimed:", hasClaimed);
    
    if (period.finalized && claimable > 0n && !hasClaimed) {
      console.log("    ✅ Can claim!");
    }
  }

  // Check which period should be used for claim
  console.log("\n[4] Recommendation:");
  for (let i = Number(currentPeriodId); i >= 0; i--) {
    const period = await distribution.periods(i);
    const claimable = await distribution.getClaimable(deployer.address, i);
    const hasClaimed = await distribution.hasClaimed(i, deployer.address);
    
    if (period.finalized && claimable > 0n && !hasClaimed) {
      console.log(`  Use Period ${i} for claim (claimable: ${ethers.formatUnits(claimable, 6)} USDC)`);
      break;
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

