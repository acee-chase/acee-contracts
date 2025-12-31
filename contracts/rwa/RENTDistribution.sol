// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RENTDistribution
 * @notice Rental income distribution contract for SSF RWA project
 * @dev Treasury deposits USDC, RENT-SEN holders claim pro-rata
 */
contract RENTDistribution is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable rentToken;
    address public treasury;
    
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
    
    event PeriodStarted(uint256 indexed periodId, uint64 startTime);
    event PeriodFinalized(uint256 indexed periodId, uint256 totalDeposited);
    event Deposited(uint256 indexed periodId, uint256 amount);
    event Claimed(uint256 indexed periodId, address indexed holder, uint256 amount);
    
    error ZeroAddress();
    error PeriodNotFinalized();
    error AlreadyClaimed();
    error NoClaimable();
    error OnlyTreasury();
    
    constructor(address _usdc, address _rentToken, address _treasury, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _rentToken == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        rentToken = IERC20(_rentToken);
        treasury = _treasury;
    }
    
    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }
    
    function startPeriod() external onlyTreasury {
        currentPeriodId++;
        periods[currentPeriodId].startTime = uint64(block.timestamp);
        emit PeriodStarted(currentPeriodId, uint64(block.timestamp));
    }
    
    function deposit(uint256 amount) external onlyTreasury {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        periods[currentPeriodId].totalDeposited += amount;
        emit Deposited(currentPeriodId, amount);
    }
    
    function finalizePeriod() external onlyTreasury {
        Period storage period = periods[currentPeriodId];
        period.endTime = uint64(block.timestamp);
        period.snapshotSupply = rentToken.totalSupply();
        period.finalized = true;
        emit PeriodFinalized(currentPeriodId, period.totalDeposited);
    }
    
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
    
    function getClaimable(address holder, uint256 periodId) public view returns (uint256) {
        Period storage period = periods[periodId];
        if (!period.finalized || period.snapshotSupply == 0) return 0;
        if (hasClaimed[periodId][holder]) return 0;
        return (period.totalDeposited * rentToken.balanceOf(holder)) / period.snapshotSupply;
    }
}
