// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISSFShareToken {
    function totalSupply() external view returns (uint256);
    function burnFrom(address from, uint256 shares) external;
}

/**
 * @title SSFReserveVault
 * @notice Holds USDC reserve backing SSF share floor price
 * @dev Receives 50% of all purchases, pays out floor price on redemption
 * 
 * FLOOR PRICE: 500 USDC per share (50% of 1,000 USDC issue price)
 * 
 * Features:
 *   - redeem(shares): Burn tokens, receive floor price in USDC
 *   - sweepExcess(): Owner can withdraw USDC above required reserve
 *   - Rate limiting: Max redemptions per window to prevent bank runs
 * 
 * IMMUTABLE CONTRACT - No proxy upgradeability.
 * Future iterations via versioned deployments (V1/V2/...).
 */
contract SSFReserveVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ VERSION ============
    string public constant VERSION = "SSFReserveVault@1.0.0";
    
    // ============ FROZEN PARAMETERS ============
    uint256 public constant FLOOR_BPS = 5_000; // 50% of issue price
    uint256 public constant ISSUE_PRICE = 1_000_000_000; // 1,000 USDC (6 decimals)
    
    // ============ IMMUTABLES ============
    IERC20 public immutable usdc;
    ISSFShareToken public immutable shareToken;
    address public immutable treasury;
    
    // ============ RATE LIMIT STATE ============
    uint256 public redeemWindowStart;
    uint256 public redeemWindowDuration = 7 days;
    uint256 public maxRedeemPerWindow;
    uint256 public redeemedThisWindow;
    
    // ============ EVENTS ============
    event Deployed(string version, uint256 chainId, address deployer, uint256 deployedAt);
    event Redeemed(address indexed holder, uint256 shares, uint256 usdcPayout);
    event ExcessSwept(address indexed to, uint256 amount);
    event RateLimitUpdated(uint256 maxRedeemPerWindow, uint256 windowDuration);
    
    // ============ ERRORS ============
    error ZeroAddress();
    error ZeroShares();
    error InsufficientReserve();
    error RateLimitExceeded();
    error ExceedsExcess();
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _usdc,
        address _shareToken,
        address _treasury,
        address _owner,
        uint256 _maxRedeemPerWindow
    ) Ownable(_owner) {
        if (_usdc == address(0) || _shareToken == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        
        usdc = IERC20(_usdc);
        shareToken = ISSFShareToken(_shareToken);
        treasury = _treasury;
        
        // Initialize rate limit
        redeemWindowStart = block.timestamp;
        maxRedeemPerWindow = _maxRedeemPerWindow;
        
        emit Deployed(VERSION, block.chainid, msg.sender, block.timestamp);
        emit RateLimitUpdated(_maxRedeemPerWindow, redeemWindowDuration);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Calculate floor price per share
     * @return Floor price in USDC (6 decimals)
     */
    function floorPrice() public pure returns (uint256) {
        return (ISSUE_PRICE * FLOOR_BPS) / 10_000; // 500 USDC
    }
    
    /**
     * @notice Calculate required USDC reserve based on current token supply
     * @return Required USDC amount to cover all potential redemptions
     */
    function requiredReserveUSDC() public view returns (uint256) {
        return shareToken.totalSupply() * floorPrice();
    }
    
    /**
     * @notice Calculate excess USDC above required reserve
     * @return Excess USDC that can be swept to treasury
     */
    function excessReserveUSDC() public view returns (uint256) {
        uint256 balance = usdc.balanceOf(address(this));
        uint256 required = requiredReserveUSDC();
        return balance > required ? balance - required : 0;
    }
    
    /**
     * @notice Check remaining redemption capacity this window
     * @return Shares that can still be redeemed in current window
     */
    function remainingRedeemCapacity() public view returns (uint256) {
        if (maxRedeemPerWindow == 0) return type(uint256).max; // No limit
        
        // Check if we're in a new window
        if (block.timestamp >= redeemWindowStart + redeemWindowDuration) {
            return maxRedeemPerWindow;
        }
        
        return maxRedeemPerWindow > redeemedThisWindow 
            ? maxRedeemPerWindow - redeemedThisWindow 
            : 0;
    }
    
    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Redeem shares for USDC at floor price
     * @dev Burns tokens, pays USDC. Subject to rate limits.
     * @param shares Number of shares to redeem
     */
    function redeem(uint256 shares) external nonReentrant whenNotPaused {
        if (shares == 0) {
            revert ZeroShares();
        }
        
        // Check and update rate limit
        _checkAndUpdateRateLimit(shares);
        
        // Calculate payout
        uint256 payout = shares * floorPrice();
        
        // Verify sufficient reserve
        if (usdc.balanceOf(address(this)) < payout) {
            revert InsufficientReserve();
        }
        
        // Burn tokens first (checks approval and balance)
        shareToken.burnFrom(msg.sender, shares);
        
        // Pay USDC
        usdc.safeTransfer(msg.sender, payout);
        
        emit Redeemed(msg.sender, shares, payout);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Sweep excess USDC to treasury
     * @dev Cannot withdraw below required reserve
     * @param amount USDC amount to sweep
     */
    function sweepExcess(uint256 amount) external onlyOwner {
        uint256 excess = excessReserveUSDC();
        
        if (amount > excess) {
            revert ExceedsExcess();
        }
        
        usdc.safeTransfer(treasury, amount);
        
        emit ExcessSwept(treasury, amount);
    }
    
    /**
     * @notice Update rate limit parameters
     * @param _maxRedeemPerWindow Max shares redeemable per window (0 = no limit)
     * @param _windowDuration Window duration in seconds
     */
    function setRateLimit(uint256 _maxRedeemPerWindow, uint256 _windowDuration) external onlyOwner {
        maxRedeemPerWindow = _maxRedeemPerWindow;
        redeemWindowDuration = _windowDuration;
        emit RateLimitUpdated(_maxRedeemPerWindow, _windowDuration);
    }
    
    /**
     * @notice Pause redemptions (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause redemptions
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ INTERNAL ============
    
    /**
     * @notice Check rate limit and update window if needed
     * @param shares Number of shares being redeemed
     */
    function _checkAndUpdateRateLimit(uint256 shares) internal {
        // No limit if maxRedeemPerWindow is 0
        if (maxRedeemPerWindow == 0) return;
        
        // Check if we need to start a new window
        if (block.timestamp >= redeemWindowStart + redeemWindowDuration) {
            redeemWindowStart = block.timestamp;
            redeemedThisWindow = 0;
        }
        
        // Check limit
        if (redeemedThisWindow + shares > maxRedeemPerWindow) {
            revert RateLimitExceeded();
        }
        
        // Update counter
        redeemedThisWindow += shares;
    }
}
