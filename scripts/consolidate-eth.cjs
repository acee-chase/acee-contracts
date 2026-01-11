/**
 * Consolidate ETH from all known wallets to a target address
 * Uses wallet-matrix.json and generated-bot-wallets.json from ProofOfInfluence
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Target address to consolidate ETH to
const TARGET_ADDRESS = process.argv[2] || "0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25";

// RPC
const RPC_URL = "https://sepolia.base.org";

// Load wallets from ProofOfInfluence repo
function loadWallets() {
  const wallets = [];
  
  // Load wallet-matrix.json
  const walletMatrixPath = "/ws/ACEE/repos/ProofOfInfluence/config/wallet-matrix.json";
  if (fs.existsSync(walletMatrixPath)) {
    const matrix = JSON.parse(fs.readFileSync(walletMatrixPath, "utf8"));
    for (const w of matrix.wallets || []) {
      if (w.privateKey && w.address) {
        wallets.push({
          name: w.name || "unknown",
          address: w.address,
          privateKey: w.privateKey,
          source: "wallet-matrix.json"
        });
      }
    }
  }
  
  // Load generated-bot-wallets.json
  const botWalletsPath = "/ws/ACEE/repos/ProofOfInfluence/generated-bot-wallets.json";
  if (fs.existsSync(botWalletsPath)) {
    const bots = JSON.parse(fs.readFileSync(botWalletsPath, "utf8"));
    for (const w of bots) {
      if (w.privateKey && w.address) {
        wallets.push({
          name: w.label || w.envVar || "bot",
          address: w.address,
          privateKey: w.privateKey,
          source: "generated-bot-wallets.json"
        });
      }
    }
  }
  
  // Deduplicate by address
  const seen = new Set();
  return wallets.filter(w => {
    const key = w.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  console.log("=".repeat(70));
  console.log("💰 Consolidate ETH to Target Address");
  console.log("=".repeat(70));
  console.log(`🎯 Target: ${TARGET_ADDRESS}`);
  console.log(`📡 RPC: ${RPC_URL}`);
  console.log();
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallets = loadWallets();
  
  console.log(`📋 Found ${wallets.length} wallets with private keys\n`);
  
  // Check balances
  let totalAvailable = 0n;
  const walletsWithBalance = [];
  
  for (const w of wallets) {
    // Skip target address itself
    if (w.address.toLowerCase() === TARGET_ADDRESS.toLowerCase()) {
      console.log(`⏭️  ${w.name}: Target address, skipping`);
      continue;
    }
    
    const balance = await provider.getBalance(w.address);
    const balanceEth = Number(balance) / 1e18;
    
    if (balance > 0n) {
      console.log(`✅ ${w.name}: ${balanceEth.toFixed(6)} ETH (${w.address})`);
      totalAvailable += balance;
      walletsWithBalance.push({ ...w, balance });
    } else {
      console.log(`⚪ ${w.name}: 0 ETH`);
    }
  }
  
  const totalEth = Number(totalAvailable) / 1e18;
  console.log();
  console.log(`📊 Total available: ${totalEth.toFixed(6)} ETH`);
  console.log(`📊 Wallets with balance: ${walletsWithBalance.length}`);
  console.log();
  
  if (walletsWithBalance.length === 0) {
    console.log("❌ No wallets with ETH balance found");
    return;
  }
  
  // Check if --yes flag is provided
  const autoConfirm = process.argv.includes("--yes") || process.argv.includes("-y");
  if (!autoConfirm) {
    console.log("⚠️  Run with --yes to execute transfers");
    console.log(`   Example: node scripts/consolidate-eth.cjs ${TARGET_ADDRESS} --yes`);
    return;
  }
  
  // Execute transfers
  console.log("📝 Starting transfers...\n");
  
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;
  
  let totalTransferred = 0n;
  let successCount = 0;
  
  for (const w of walletsWithBalance) {
    console.log(`[${w.name}] Transferring from ${w.address}...`);
    
    // Calculate amount to send (balance - gas)
    const amountToSend = w.balance - gasCost;
    
    if (amountToSend <= 0n) {
      console.log(`   ⚠️  Balance too low for gas, skipping`);
      continue;
    }
    
    const amountEth = Number(amountToSend) / 1e18;
    console.log(`   Amount: ${amountEth.toFixed(6)} ETH`);
    
    try {
      const wallet = new ethers.Wallet(w.privateKey, provider);
      const tx = await wallet.sendTransaction({
        to: TARGET_ADDRESS,
        value: amountToSend,
        gasLimit: gasLimit,
      });
      
      console.log(`   TX: ${tx.hash}`);
      console.log(`   ⏳ Waiting...`);
      
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
        totalTransferred += amountToSend;
        successCount++;
      } else {
        console.log(`   ❌ Transaction reverted`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
    
    console.log();
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Final summary
  const targetBalance = await provider.getBalance(TARGET_ADDRESS);
  const targetEth = Number(targetBalance) / 1e18;
  const transferredEth = Number(totalTransferred) / 1e18;
  
  console.log("=".repeat(70));
  console.log("📊 Summary");
  console.log("=".repeat(70));
  console.log(`✅ Successful transfers: ${successCount}`);
  console.log(`💰 Total transferred: ${transferredEth.toFixed(6)} ETH`);
  console.log(`🎯 Target balance: ${targetEth.toFixed(6)} ETH`);
  console.log();
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

