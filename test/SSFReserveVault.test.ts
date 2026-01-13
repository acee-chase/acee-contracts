/**
 * SSFReserveVault Unit Tests
 * 
 * Tests the complete SSF V1 flow:
 * - Buy shares: USDC splits 50% treasury / 50% reserve
 * - Redeem shares: Burn tokens, receive floor price (500 USDC)
 * - Sweep excess: Owner can withdraw above required reserve
 * - Rate limiting: Max redemptions per window
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SSFReserveVault", function () {
  let usdc: Contract;
  let shareToken: Contract;
  let shareSale: Contract;
  let reserveVault: Contract;
  
  let owner: Signer;
  let treasury: Signer;
  let buyer: Signer;
  
  const PRICE_PER_SHARE = ethers.parseUnits("1000", 6); // 1,000 USDC
  const FLOOR_PRICE = ethers.parseUnits("500", 6); // 500 USDC
  const MAX_REDEEM_PER_WINDOW = 100n; // 100 shares per window
  
  beforeEach(async function () {
    [owner, treasury, buyer] = await ethers.getSigners();
    
    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy(await owner.getAddress());
    
    // Deploy SSFShareToken
    const SSFShareToken = await ethers.getContractFactory("SSFShareToken");
    shareToken = await SSFShareToken.deploy(
      "SSF Share Token",
      "SSF",
      await owner.getAddress()
    );
    
    // Deploy SSFReserveVault
    const SSFReserveVault = await ethers.getContractFactory("SSFReserveVault");
    reserveVault = await SSFReserveVault.deploy(
      await usdc.getAddress(),
      await shareToken.getAddress(),
      await treasury.getAddress(),
      await owner.getAddress(),
      MAX_REDEEM_PER_WINDOW
    );
    
    // Deploy SSFShareSale (72h delay for sale start)
    const now = await time.latest();
    const saleStart = now + 72 * 60 * 60; // +72 hours
    const saleEnd = saleStart + 90 * 24 * 60 * 60; // +90 days
    
    const SSFShareSale = await ethers.getContractFactory("SSFShareSale");
    shareSale = await SSFShareSale.deploy(
      await usdc.getAddress(),
      await shareToken.getAddress(),
      await reserveVault.getAddress(),
      await treasury.getAddress(),
      await owner.getAddress(),
      saleStart,
      saleEnd
    );
    
    // Grant roles
    const MINTER_ROLE = await shareToken.MINTER_ROLE();
    const BURNER_ROLE = await shareToken.BURNER_ROLE();
    await shareToken.connect(owner).grantRole(MINTER_ROLE, await shareSale.getAddress());
    await shareToken.connect(owner).grantRole(BURNER_ROLE, await reserveVault.getAddress());
    
    // Setup: mint USDC to buyer (enough for 200 shares at 1000 USDC each)
    await usdc.mint(await buyer.getAddress(), ethers.parseUnits("250000", 6)); // 250K USDC
    
    // Allowlist buyer
    await shareSale.connect(owner).setAllowlist([await buyer.getAddress()], true);
    
    // Advance time to sale start and unpause
    await time.increaseTo(saleStart);
    await shareSale.connect(owner).unpause();
  });
  
  describe("Purchase Flow", function () {
    it("should split USDC 50/50 between treasury and reserve", async function () {
      const shares = 1n;
      const cost = shares * PRICE_PER_SHARE;
      const expectedReserve = cost / 2n; // 500 USDC
      const expectedTreasury = cost - expectedReserve; // 500 USDC
      
      // Approve and buy
      await usdc.connect(buyer).approve(await shareSale.getAddress(), cost);
      await shareSale.connect(buyer).buy(shares);
      
      // Check balances
      const treasuryBalance = await usdc.balanceOf(await treasury.getAddress());
      const reserveBalance = await usdc.balanceOf(await reserveVault.getAddress());
      
      expect(treasuryBalance).to.equal(expectedTreasury);
      expect(reserveBalance).to.equal(expectedReserve);
    });
    
    it("should mint tokens to buyer", async function () {
      const shares = 5n;
      const cost = shares * PRICE_PER_SHARE;
      
      await usdc.connect(buyer).approve(await shareSale.getAddress(), cost);
      await shareSale.connect(buyer).buy(shares);
      
      const buyerBalance = await shareToken.balanceOf(await buyer.getAddress());
      expect(buyerBalance).to.equal(shares);
    });
  });
  
  describe("Redemption Flow", function () {
    beforeEach(async function () {
      // Buy 10 shares first
      const shares = 10n;
      const cost = shares * PRICE_PER_SHARE;
      await usdc.connect(buyer).approve(await shareSale.getAddress(), cost);
      await shareSale.connect(buyer).buy(shares);
    });
    
    it("should redeem shares at floor price (500 USDC)", async function () {
      const sharesToRedeem = 1n;
      const expectedPayout = sharesToRedeem * FLOOR_PRICE;
      
      const buyerUsdcBefore = await usdc.balanceOf(await buyer.getAddress());
      const reserveBefore = await usdc.balanceOf(await reserveVault.getAddress());
      const tokensBefore = await shareToken.balanceOf(await buyer.getAddress());
      
      await reserveVault.connect(buyer).redeem(sharesToRedeem);
      
      const buyerUsdcAfter = await usdc.balanceOf(await buyer.getAddress());
      const reserveAfter = await usdc.balanceOf(await reserveVault.getAddress());
      const tokensAfter = await shareToken.balanceOf(await buyer.getAddress());
      
      // Buyer receives floor price
      expect(buyerUsdcAfter - buyerUsdcBefore).to.equal(expectedPayout);
      
      // Reserve decreases by payout
      expect(reserveBefore - reserveAfter).to.equal(expectedPayout);
      
      // Token supply decreases by 1
      expect(tokensBefore - tokensAfter).to.equal(sharesToRedeem);
    });
    
    it("should burn tokens on redemption", async function () {
      const totalSupplyBefore = await shareToken.totalSupply();
      
      await reserveVault.connect(buyer).redeem(3n);
      
      const totalSupplyAfter = await shareToken.totalSupply();
      expect(totalSupplyBefore - totalSupplyAfter).to.equal(3n);
    });
    
    it("should emit Redeemed event", async function () {
      const shares = 2n;
      const payout = shares * FLOOR_PRICE;
      
      await expect(reserveVault.connect(buyer).redeem(shares))
        .to.emit(reserveVault, "Redeemed")
        .withArgs(await buyer.getAddress(), shares, payout);
    });
    
    it("should revert on zero shares", async function () {
      await expect(reserveVault.connect(buyer).redeem(0n))
        .to.be.revertedWithCustomError(reserveVault, "ZeroShares");
    });
  });
  
  describe("Sweep Excess", function () {
    beforeEach(async function () {
      // Buy 10 shares (5000 USDC goes to reserve)
      const shares = 10n;
      const cost = shares * PRICE_PER_SHARE;
      await usdc.connect(buyer).approve(await shareSale.getAddress(), cost);
      await shareSale.connect(buyer).buy(shares);
    });
    
    it("should calculate required reserve based on supply", async function () {
      const supply = await shareToken.totalSupply();
      const expected = supply * FLOOR_PRICE;
      
      expect(await reserveVault.requiredReserveUSDC()).to.equal(expected);
    });
    
    it("should not allow sweeping below required reserve", async function () {
      // Required = 10 shares * 500 USDC = 5000 USDC
      // Balance = 5000 USDC
      // Excess = 0
      
      await expect(reserveVault.connect(owner).sweepExcess(1n))
        .to.be.revertedWithCustomError(reserveVault, "ExceedsExcess");
    });
    
    it("should allow sweeping excess after partial redemption", async function () {
      // Redeem 5 shares -> burns tokens, pays out 2500 USDC
      // Remaining supply: 5 shares
      // Required reserve: 5 * 500 = 2500 USDC
      // Balance: 5000 - 2500 = 2500 USDC
      // Excess: 0 USDC
      
      await reserveVault.connect(buyer).redeem(5n);
      
      // Still no excess
      expect(await reserveVault.excessReserveUSDC()).to.equal(0n);
      
      // Manually add excess for testing
      await usdc.mint(await reserveVault.getAddress(), ethers.parseUnits("1000", 6));
      
      expect(await reserveVault.excessReserveUSDC()).to.equal(ethers.parseUnits("1000", 6));
      
      const treasuryBefore = await usdc.balanceOf(await treasury.getAddress());
      await reserveVault.connect(owner).sweepExcess(ethers.parseUnits("1000", 6));
      const treasuryAfter = await usdc.balanceOf(await treasury.getAddress());
      
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("1000", 6));
    });
  });
  
  describe("Rate Limiting", function () {
    beforeEach(async function () {
      // Buy 200 shares (more than window limit)
      const shares = 200n;
      const cost = shares * PRICE_PER_SHARE;
      await usdc.connect(buyer).approve(await shareSale.getAddress(), cost);
      await shareSale.connect(buyer).buy(shares);
    });
    
    it("should enforce max redemptions per window", async function () {
      // Window limit is 100 shares
      // Try to redeem 101 should fail
      
      await expect(reserveVault.connect(buyer).redeem(101n))
        .to.be.revertedWithCustomError(reserveVault, "RateLimitExceeded");
    });
    
    it("should track redemptions within window", async function () {
      // Redeem 50, then 50 more should work
      await reserveVault.connect(buyer).redeem(50n);
      await reserveVault.connect(buyer).redeem(50n);
      
      // Next redemption should fail (at limit)
      await expect(reserveVault.connect(buyer).redeem(1n))
        .to.be.revertedWithCustomError(reserveVault, "RateLimitExceeded");
    });
    
    it("should reset window after duration", async function () {
      // Redeem 100 (at limit)
      await reserveVault.connect(buyer).redeem(100n);
      
      // Advance past window
      await time.increase(7 * 24 * 60 * 60 + 1); // 7 days + 1 second
      
      // Should be able to redeem again
      await expect(reserveVault.connect(buyer).redeem(1n)).to.not.be.reverted;
    });
    
    it("should return remaining capacity", async function () {
      expect(await reserveVault.remainingRedeemCapacity()).to.equal(MAX_REDEEM_PER_WINDOW);
      
      await reserveVault.connect(buyer).redeem(30n);
      expect(await reserveVault.remainingRedeemCapacity()).to.equal(70n);
    });
  });
  
  describe("Pausable", function () {
    beforeEach(async function () {
      const shares = 10n;
      const cost = shares * PRICE_PER_SHARE;
      await usdc.connect(buyer).approve(await shareSale.getAddress(), cost);
      await shareSale.connect(buyer).buy(shares);
    });
    
    it("should block redemptions when paused", async function () {
      await reserveVault.connect(owner).pause();
      
      await expect(reserveVault.connect(buyer).redeem(1n))
        .to.be.revertedWithCustomError(reserveVault, "EnforcedPause");
    });
    
    it("should allow redemptions after unpause", async function () {
      await reserveVault.connect(owner).pause();
      await reserveVault.connect(owner).unpause();
      
      await expect(reserveVault.connect(buyer).redeem(1n)).to.not.be.reverted;
    });
  });
  
  describe("View Functions", function () {
    it("should return correct floor price", async function () {
      expect(await reserveVault.floorPrice()).to.equal(FLOOR_PRICE);
    });
    
    it("should return zero required reserve with no supply", async function () {
      expect(await reserveVault.requiredReserveUSDC()).to.equal(0n);
    });
  });
  
  describe("Integration: Full Lifecycle", function () {
    it("should handle buy -> partial redeem -> sweep flow", async function () {
      // 1. Buy 100 shares
      const buyShares = 100n;
      const buyCost = buyShares * PRICE_PER_SHARE;
      await usdc.connect(buyer).approve(await shareSale.getAddress(), buyCost);
      await shareSale.connect(buyer).buy(buyShares);
      
      // Reserve should have 50,000 USDC
      expect(await usdc.balanceOf(await reserveVault.getAddress()))
        .to.equal(ethers.parseUnits("50000", 6));
      
      // 2. Redeem 20 shares -> receive 10,000 USDC
      await reserveVault.connect(buyer).redeem(20n);
      
      // Reserve should have 40,000 USDC
      expect(await usdc.balanceOf(await reserveVault.getAddress()))
        .to.equal(ethers.parseUnits("40000", 6));
      
      // Required reserve: 80 shares * 500 = 40,000 USDC
      expect(await reserveVault.requiredReserveUSDC())
        .to.equal(ethers.parseUnits("40000", 6));
      
      // No excess to sweep
      expect(await reserveVault.excessReserveUSDC()).to.equal(0n);
      
      // 3. Add bonus USDC to vault (simulating yield or other income)
      await usdc.mint(await reserveVault.getAddress(), ethers.parseUnits("5000", 6));
      
      // 4. Sweep excess
      expect(await reserveVault.excessReserveUSDC())
        .to.equal(ethers.parseUnits("5000", 6));
      
      await reserveVault.connect(owner).sweepExcess(ethers.parseUnits("5000", 6));
      
      // Reserve back to required minimum
      expect(await usdc.balanceOf(await reserveVault.getAddress()))
        .to.equal(await reserveVault.requiredReserveUSDC());
    });
  });
});
