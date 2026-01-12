import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking with account:", deployer.address);
  
  // Check if we can read from the SSFShareToken to verify contracts work
  const shareToken = await ethers.getContractAt("SSFShareToken", "0xc10CA2551c5ebC6862Cb6Dc08AB3e82BF1a0A3F2");
  console.log("SSFShareToken totalSupply:", (await shareToken.totalSupply()).toString());
  
  // Try to deploy RENTDistribution
  console.log("\nDeploying RENTDistribution_SSFShareToken...");
  const RENTDistribution = await ethers.getContractFactory("RENTDistribution");
  const rentDist = await RENTDistribution.deploy(
    "0x264317fF0788B04A6Dd523D7B2444Def50c655ce", // USDC
    "0xc10CA2551c5ebC6862Cb6Dc08AB3e82BF1a0A3F2", // SSFShareToken
    deployer.address, // treasury
    deployer.address  // owner
  );
  
  const receipt = await rentDist.deploymentTransaction()?.wait(2);
  const address = await rentDist.getAddress();
  console.log("Deployed at:", address);
  console.log("Tx hash:", receipt?.hash);
  
  // Wait a bit then read VERSION
  await new Promise(r => setTimeout(r, 3000));
  try {
    const version = await rentDist.VERSION();
    console.log("VERSION:", version);
  } catch (e) {
    console.log("VERSION read failed, but deployment succeeded. Address:", address);
  }
  
  // Update deployment file
  const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  deployment.contracts.RENTDistribution_SSFShareToken = {
    version: "RENTDistribution@1.0.0",
    address: address,
    deployTx: receipt?.hash || "",
    deployedAt: new Date().toISOString(),
  };
  deployment.updatedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("Updated deployments/base-sepolia.json");
}

main().catch(console.error);
