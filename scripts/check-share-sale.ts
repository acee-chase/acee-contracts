import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const manifest = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "base-sepolia.json"), "utf8"));
  
  const shareToken = await ethers.getContractAt("SSFShareToken", manifest.contracts.SSFShareToken.address);
  const shareSale = await ethers.getContractAt("SSFShareSale", manifest.contracts.SSFShareSale.address);
  
  const deployerAddress = "0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25";
  
  console.log("ShareToken balance:", (await shareToken.balanceOf(deployerAddress)).toString());
  console.log("Shares sold:", (await shareSale.sharesSold()).toString());
  console.log("Purchased by deployer:", (await shareSale.purchasedShares(deployerAddress)).toString());
  console.log("Allowlist count:", (await shareSale.allowlistCount()).toString());
  console.log("Paused:", await shareSale.paused());
}

main().catch(console.error);

