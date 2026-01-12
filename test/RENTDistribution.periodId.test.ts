/**
 * Regression test: periodId must come from PeriodStarted event
 * 
 * Root cause (2026-01-12): RPC read-after-write inconsistency caused
 * currentPeriodId() to return stale values after startPeriod() tx confirmed.
 * This led to claim() being called with wrong periodId.
 * 
 * Fix: Parse periodId from PeriodStarted event in transaction receipt.
 * 
 * This test ensures the pattern is followed and prevents regression.
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractTransactionReceipt } from "ethers";

/**
 * Helper: Extract periodId from PeriodStarted event in transaction receipt
 * This is the ONLY correct way to get periodId after startPeriod()
 */
async function getPeriodIdFromReceipt(
  receipt: ContractTransactionReceipt,
  distribution: Contract
): Promise<bigint> {
  const distributionAddress = await distribution.getAddress();
  
  const event = receipt.logs.find((log) => {
    if (log.address.toLowerCase() !== distributionAddress.toLowerCase()) {
      return false;
    }
    try {
      const parsed = distribution.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      return parsed?.name === "PeriodStarted";
    } catch {
      return false;
    }
  });
  
  if (!event) {
    throw new Error("PeriodStarted event not found");
  }
  
  const parsed = distribution.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  
  return parsed!.args.periodId;
}

describe("RENTDistribution - periodId sourcing", function () {
  let usdc: Contract;
  let rentToken: Contract;
  let distribution: Contract;
  let owner: any;
  let treasury: any;
  let holder: any;

  beforeEach(async function () {
    [owner, treasury, holder] = await ethers.getSigners();

    // Deploy mock tokens
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy(owner.address);

    const MockRENTToken = await ethers.getContractFactory("MockRENTToken");
    rentToken = await MockRENTToken.deploy(owner.address);

    // Deploy distribution contract
    const RENTDistribution = await ethers.getContractFactory("RENTDistribution");
    distribution = await RENTDistribution.deploy(
      await usdc.getAddress(),
      await rentToken.getAddress(),
      treasury.address,
      owner.address // owner
    );

    // Setup: mint tokens
    await usdc.mint(treasury.address, ethers.parseUnits("10000", 6));
    await rentToken.mint(holder.address, ethers.parseUnits("1000", 18));
  });

  describe("Event-driven periodId (regression prevention)", function () {
    it("should get correct periodId from PeriodStarted event", async function () {
      // Start period and get receipt
      const tx = await distribution.connect(treasury).startPeriod();
      const receipt = await tx.wait();

      // Get periodId from event (correct way)
      const periodIdFromEvent = await getPeriodIdFromReceipt(receipt!, distribution);

      // Get periodId from view (may be stale in production RPC)
      const periodIdFromView = await distribution.currentPeriodId();

      // In local hardhat network, they should match
      // But in production, periodIdFromView might be stale
      expect(periodIdFromEvent).to.equal(periodIdFromView);
      expect(periodIdFromEvent).to.equal(1n);
    });

    it("should successfully claim using periodId from event", async function () {
      // === Setup: Start period, deposit, finalize ===
      const startTx = await distribution.connect(treasury).startPeriod();
      const startReceipt = await startTx.wait();
      
      // Get periodId from event (SSOT)
      const periodId = await getPeriodIdFromReceipt(startReceipt!, distribution);

      // Deposit USDC
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(treasury).approve(await distribution.getAddress(), depositAmount);
      await distribution.connect(treasury).deposit(depositAmount);

      // Finalize
      await distribution.connect(treasury).finalizePeriod();

      // === Claim using periodId from event ===
      const claimable = await distribution.getClaimable(holder.address, periodId);
      expect(claimable).to.equal(depositAmount); // holder owns 100% of supply

      await distribution.connect(holder).claim(periodId);

      // Verify claim succeeded
      const holderBalance = await usdc.balanceOf(holder.address);
      expect(holderBalance).to.equal(depositAmount);
    });

    it("should fail to claim with wrong periodId", async function () {
      // Start period 1
      const tx1 = await distribution.connect(treasury).startPeriod();
      const receipt1 = await tx1.wait();
      const periodId1 = await getPeriodIdFromReceipt(receipt1!, distribution);

      // Deposit and finalize period 1
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(treasury).approve(await distribution.getAddress(), depositAmount);
      await distribution.connect(treasury).deposit(depositAmount);
      await distribution.connect(treasury).finalizePeriod();

      // Start period 2 (empty)
      const tx2 = await distribution.connect(treasury).startPeriod();
      const receipt2 = await tx2.wait();
      const periodId2 = await getPeriodIdFromReceipt(receipt2!, distribution);

      expect(periodId2).to.equal(periodId1 + 1n);

      // Trying to claim period 2 (empty) should return 0 claimable
      const claimablePeriod2 = await distribution.getClaimable(holder.address, periodId2);
      expect(claimablePeriod2).to.equal(0n);

      // Claiming period 1 should work
      const claimablePeriod1 = await distribution.getClaimable(holder.address, periodId1);
      expect(claimablePeriod1).to.equal(depositAmount);
    });
  });

  describe("blockTag consistency pattern", function () {
    it("should read consistent state using receipt blockNumber", async function () {
      // Start period
      const tx = await distribution.connect(treasury).startPeriod();
      const receipt = await tx.wait();
      const periodId = await getPeriodIdFromReceipt(receipt!, distribution);

      // Deposit
      const depositAmount = ethers.parseUnits("500", 6);
      await usdc.connect(treasury).approve(await distribution.getAddress(), depositAmount);
      const depositTx = await distribution.connect(treasury).deposit(depositAmount);
      const depositReceipt = await depositTx.wait();

      // Read totalDeposited at the specific block (consistent view)
      const period = await distribution.periods(periodId, {
        blockTag: depositReceipt!.blockNumber,
      });

      expect(period.totalDeposited).to.equal(depositAmount);
    });
  });
});

