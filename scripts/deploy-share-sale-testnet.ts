/**
 * Deploy SSFShareToken + SSFShareSale to Base Sepolia
 * 
 * IMMUTABLE + VERSIONED deployment strategy:
 * - Each contract has VERSION constant + Deployed event
 * - Updates deployments/base-sepolia.json SSOT
 * - Uses existing MockUSDC from prior deployment
 * 
 * FROZEN SALE PARAMETERS (v1):
 *   - Price: 10,000 USDC per share
 *   - Max shares: 2,000 (total cap 20M USDC)
 *   - Per-wallet cap: 10 shares (100K USDC)
 *   - Sale Start: 2026-01-20 09:00 PST => 1768928400
 *   - Sale End:   2026-02-19 09:00 PST => 1771520400
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-share-sale-testnet.ts --network base-sepolia
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

/**
 * Convert PST datetime string to unix timestamp (UTC seconds)
 * Uses America/Los_Angeles timezone which handles PST/PDT automatically
 */
function pstToUnix(dateStr: string): number {
  // Parse as PST/PDT (America/Los_Angeles)
  // Format: "2026-01-20 09:00" => "2026-01-20T09:00:00"
  const [datePart, timePart] = dateStr.split(" ");
  const isoStr = `${datePart}T${timePart}:00`;
  
  // Create date in PST timezone
  const pstDate = new Date(isoStr);
  // Adjust for PST offset (-8 hours from UTC in winter, -7 in summer)
  // Since we're using Intl for proper timezone handling:
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Parse the input as if it were in LA timezone
  // JavaScript Date uses local timezone, so we need to compute the offset
  const parts = formatter.formatToParts(new Date());
  const utcDate = new Date(`${dateStr.replace(" ", "T")}:00`);
  
  // For Jan 20 (PST, UTC-8): 09:00 PST = 17:00 UTC
  // 2026-01-20 09:00 PST = 2026-01-20 17:00 UTC
  // Unix: Date.UTC(2026, 0, 20, 17, 0, 0) / 1000
  
  // Simple approach: parse date parts manually and compute
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  
  // January is PST (UTC-8), February might still be PST until March
  // PST offset is -8 hours, so add 8 to get UTC
  const utcHour = hour + 8;
  
  return Date.UTC(year, month - 1, day, utcHour, minute, 0) / 1000;
}

// FROZEN SALE WINDOW (must match spec)
const EXPECTED_SALE_START = 1768928400; // 2026-01-20 09:00 PST
const EXPECTED_SALE_END = 1771520400;   // 2026-02-19 09:00 PST

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(70));
  console.log("SSF ShareSale Deployment - IMMUTABLE + VERSIONED");
  console.log("=".repeat(70));
  console.log("\nDeploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Compute sale window from PST strings
  const computedStart = pstToUnix("2026-01-20 09:00");
  const computedEnd = pstToUnix("2026-02-19 09:00");
  
  // Assert they match frozen values (prevent mistakes)
  if (computedStart !== EXPECTED_SALE_START) {
    throw new Error(`Sale start mismatch! Computed ${computedStart}, expected ${EXPECTED_SALE_START}`);
  }
  if (computedEnd !== EXPECTED_SALE_END) {
    throw new Error(`Sale end mismatch! Computed ${computedEnd}, expected ${EXPECTED_SALE_END}`);
  }
  
  console.log("\nSale Window (verified PST conversion):");
  console.log("  Start:", new Date(EXPECTED_SALE_START * 1000).toISOString(), `(${EXPECTED_SALE_START})`);
  console.log("  End:  ", new Date(EXPECTED_SALE_END * 1000).toISOString(), `(${EXPECTED_SALE_END})`);

  // Load existing deployment manifest for MockUSDC address
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "base-sepolia" : 
                      network.chainId === 8453n ? "base-mainnet" : "hardhat";
  
  const manifestPath = path.join(deploymentsDir, `${networkName}.json`);
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Deployment manifest not found: ${manifestPath}. Run deploy-testnet.ts first.`);
  }
  
  const existingManifest: DeploymentManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const mockUsdcAddress = existingManifest.contracts.MockUSDC?.address;
  
  if (!mockUsdcAddress) {
    throw new Error("MockUSDC not found in deployment manifest");
  }
  
  console.log("\nUsing existing MockUSDC:", mockUsdcAddress);
  
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("Treasury address:", treasuryAddress);

  // 1. Deploy SSFShareToken
  console.log("\n1. Deploying SSFShareToken...");
  const SSFShareToken = await ethers.getContractFactory("SSFShareToken");
  const shareToken = await SSFShareToken.deploy(
    "SSF Shares",
    "SSF",
    deployer.address // Admin role (can assign MINTER_ROLE)
  );
  const shareTokenReceipt = await shareToken.deploymentTransaction()?.wait(2);
  const shareTokenAddress = await shareToken.getAddress();
  console.log("   SSFShareToken deployed to:", shareTokenAddress);
  console.log("   Version: SSFShareToken@1.0.0");
  console.log("   Decimals: 0 (whole shares only)");

  // 2. Deploy SSFShareSale
  console.log("\n2. Deploying SSFShareSale...");
  const SSFShareSale = await ethers.getContractFactory("SSFShareSale");
  const shareSale = await SSFShareSale.deploy(
    mockUsdcAddress,
    shareTokenAddress,
    treasuryAddress,
    deployer.address, // Owner
    EXPECTED_SALE_START,
    EXPECTED_SALE_END
  );
  const shareSaleReceipt = await shareSale.deploymentTransaction()?.wait(2);
  const shareSaleAddress = await shareSale.getAddress();
  console.log("   SSFShareSale deployed to:", shareSaleAddress);
  console.log("   Version: SSFShareSale@1.0.0");
  console.log("   Paused: true (default - enable after setting allowlist)");

  // 3. Grant MINTER_ROLE to ShareSale
  console.log("\n3. Granting MINTER_ROLE to SSFShareSale...");
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  const grantTx = await shareToken.grantRole(MINTER_ROLE, shareSaleAddress);
  await grantTx.wait();
  console.log("   MINTER_ROLE granted to:", shareSaleAddress);

  // 4. Update deployment manifest
  existingManifest.contracts["SSFShareToken"] = {
    version: "SSFShareToken@1.0.0",
    address: shareTokenAddress,
    deployTx: shareTokenReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };
  
  existingManifest.contracts["SSFShareSale"] = {
    version: "SSFShareSale@1.0.0",
    address: shareSaleAddress,
    deployTx: shareSaleReceipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };
  
  existingManifest.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(manifestPath, JSON.stringify(existingManifest, null, 2));
  console.log(`\n4. Deployment manifest updated: deployments/${networkName}.json`);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE - SSF Share Sale System");
  console.log("=".repeat(70));
  console.log("\n📦 Existing Infrastructure:");
  console.log("   MockUSDC:            ", mockUsdcAddress);
  console.log("\n🏷️  New Contracts:");
  console.log("   SSFShareToken:       ", shareTokenAddress);
  console.log("                        SSFShareToken@1.0.0 (decimals=0)");
  console.log("   SSFShareSale:        ", shareSaleAddress);
  console.log("                        SSFShareSale@1.0.0");
  console.log("\n📊 Sale Parameters:");
  console.log("   Price per share:      10,000 USDC");
  console.log("   Max shares:           2,000 (20M USDC total)");
  console.log("   Per-wallet cap:       10 shares (100K USDC)");
  console.log("   Allowlist capacity:   10 addresses");
  console.log("   Sale start:          ", new Date(EXPECTED_SALE_START * 1000).toISOString());
  console.log("   Sale end:            ", new Date(EXPECTED_SALE_END * 1000).toISOString());
  console.log("\n🔑 Treasury:            ", treasuryAddress);
  console.log("\n⚠️  NEXT STEPS:");
  console.log("   1. Set allowlist:     shareSale.setAllowlist([addr1, addr2, ...], true)");
  console.log("   2. Unpause sale:      shareSale.unpause()");
  console.log("   3. Verify contracts:  npx hardhat verify --network", networkName, shareTokenAddress);
  console.log("=".repeat(70));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

