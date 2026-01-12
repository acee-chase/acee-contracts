// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RENTDistribution
 * @notice Rental income distribution contract for SSF RWA project
 * @dev Treasury deposits USDC, RENT-SEN holders claim pro-rata
 * 
 * IMMUTABLE CONTRACT - No proxy upgradeability.
 * Future iterations via versioned deployments (V1/V2/...).
 * Old versions remain readable/claimable but disabled for new deposits.
 */
contract RENTDistribution is Ownable {
    using SafeERC20 for IERC20;

    // ============ VERSION ============
    string public constant VERSION = "RENTDistribution@1.0.0";
    
    // ============ IMMUTABLES ============
    IERC20 public immutable usdc;
    IERC20 public immutable rentToken;
    
    // ============ STATE ============
    address public treasury;
    bool public acceptingDeposits = true;  // Retire mechanism
    
    struct Period {
        uint256 totalDeposited;
        uint256 totalClaimed;
        uint256 snapshotSupply;
        uint64 startTime;
        uint64 endTime;
        bool finalized;
    }
    
    uint256 public currentPeriodId;
    mapping(uint256 => Period) public periods;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    // ============ EVENTS ============
    event Deployed(string version, uint256 chainId, address deployer, uint256 deployedAt);
    event Retired(uint256 timestamp);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event PeriodStarted(uint256 indexed periodId, uint64 startTime);
    event PeriodFinalized(uint256 indexed periodId, uint256 totalDeposited);
    event Deposited(uint256 indexed periodId, uint256 amount);
    event Claimed(uint256 indexed periodId, address indexed holder, uint256 amount);
    
    // ============ ERRORS ============
    error ZeroAddress();
    error PeriodNotFinalized();
    error AlreadyClaimed();
    error NoClaimable();
    error OnlyTreasury();
    error ContractRetired();
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _usdc, 
        address _rentToken, 
        address _treasury, 
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0) || _rentToken == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        usdc = IERC20(_usdc);
        rentToken = IERC20(_rentToken);
        treasury = _treasury;
        
        emit Deployed(VERSION, block.chainid, msg.sender, block.timestamp);
    }
    
    // ============ MODIFIERS ============
    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }
    
    modifier notRetired() {
        if (!acceptingDeposits) revert ContractRetired();
        _;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Retire this contract version - no new periods/deposits allowed
     * @dev Call this before migrating to a new version
     */
    function retire() external onlyOwner {
        acceptingDeposits = false;
        emit Retired(block.timestamp);
    }
    
    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }
    
    // ============ TREASURY FUNCTIONS ============
    
    /**
     * @notice Start a new distribution period
     * @dev Only callable when contract is not retired
     */
    function startPeriod() external onlyTreasury notRetired {
        currentPeriodId++;
        periods[currentPeriodId].startTime = uint64(block.timestamp);
        emit PeriodStarted(currentPeriodId, uint64(block.timestamp));
    }
    
    /**
     * @notice Deposit USDC for the current period
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external onlyTreasury notRetired {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        periods[currentPeriodId].totalDeposited += amount;
        emit Deposited(currentPeriodId, amount);
    }
    
    /**
     * @notice Finalize the current period, snapshot token supply
     * @dev Can be called even after retire (to finalize last period)
     */
    function finalizePeriod() external onlyTreasury {
        Period storage period = periods[currentPeriodId];
        period.endTime = uint64(block.timestamp);
        period.snapshotSupply = rentToken.totalSupply();
        period.finalized = true;
        emit PeriodFinalized(currentPeriodId, period.totalDeposited);
    }
    
    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Claim USDC from a finalized period
     * @dev Always available (even after retire) for historical periods
     * @param periodId The period ID to claim from
     */
    function claim(uint256 periodId) external {
        Period storage period = periods[periodId];
        if (!period.finalized) revert PeriodNotFinalized();
        if (hasClaimed[periodId][msg.sender]) revert AlreadyClaimed();
        
        uint256 claimable = getClaimable(msg.sender, periodId);
        if (claimable == 0) revert NoClaimable();
        
        hasClaimed[periodId][msg.sender] = true;
        period.totalClaimed += claimable;
        usdc.safeTransfer(msg.sender, claimable);
        emit Claimed(periodId, msg.sender, claimable);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Calculate claimable amount for a holder
     * @param holder Address of the RENT-SEN holder
     * @param periodId The period ID to check
     * @return Amount of USDC claimable (6 decimals)
     */
    function getClaimable(address holder, uint256 periodId) public view returns (uint256) {
        Period storage period = periods[periodId];
        if (!period.finalized || period.snapshotSupply == 0) return 0;
        if (hasClaimed[periodId][holder]) return 0;
        return (period.totalDeposited * rentToken.balanceOf(holder)) / period.snapshotSupply;
    }
}
