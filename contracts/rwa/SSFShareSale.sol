// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISSFShareToken {
    function mint(address to, uint256 shares) external;
}

/**
 * @title SSFShareSale
 * @notice Allowlist-based share sale accepting USDC for ShareTokens
 * @dev USDC flows directly to treasury (contract never holds funds)
 * 
 * FROZEN SALE PARAMETERS (v1):
 *   - Price: 10,000 USDC per share
 *   - Max shares: 2,000 (total cap 20M USDC)
 *   - Per-wallet cap: 10 shares (100K USDC)
 *   - Allowlist capacity: 10 addresses
 * 
 * IMMUTABLE CONTRACT - No proxy upgradeability.
 * Future iterations via versioned deployments (V1/V2/...).
 */
contract SSFShareSale is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ VERSION ============
    string public constant VERSION = "SSFShareSale@1.0.0";
    
    // ============ FROZEN PARAMETERS ============
    uint256 public constant PRICE_PER_SHARE_USDC = 10_000_000_000; // 10,000 USDC (6 decimals)
    uint256 public constant MAX_SHARES = 2_000;
    uint256 public constant MAX_SHARES_PER_WALLET = 10;
    uint256 public constant MAX_ALLOWLIST = 10;
    
    // ============ IMMUTABLES ============
    IERC20 public immutable usdc;
    ISSFShareToken public immutable shareToken;
    address public immutable treasury;
    
    // ============ STATE ============
    uint64 public saleStart;
    uint64 public saleEnd;
    uint256 public sharesSold;
    uint256 public allowlistCount;
    
    mapping(address => bool) public allowlist;
    mapping(address => uint256) public purchasedShares;
    
    // ============ EVENTS ============
    event Deployed(string version, uint256 chainId, address deployer, uint256 deployedAt);
    event SaleWindowUpdated(uint64 start, uint64 end);
    event AllowlistUpdated(address[] addresses, bool allowed);
    event Purchased(address indexed buyer, uint256 shares, uint256 usdcCost);
    
    // ============ ERRORS ============
    error ZeroAddress();
    error NotAllowlisted();
    error SaleNotActive();
    error InvalidShareAmount();
    error WalletCapExceeded();
    error SaleCapExceeded();
    error AllowlistCapExceeded();
    error InvalidSaleWindow();
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _usdc,
        address _shareToken,
        address _treasury,
        address _owner,
        uint64 _saleStart,
        uint64 _saleEnd
    ) Ownable(_owner) {
        if (_usdc == address(0) || _shareToken == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        if (_saleEnd <= _saleStart) {
            revert InvalidSaleWindow();
        }
        
        usdc = IERC20(_usdc);
        shareToken = ISSFShareToken(_shareToken);
        treasury = _treasury;
        saleStart = _saleStart;
        saleEnd = _saleEnd;
        
        // Deploy paused by default until allowlist is set
        _pause();
        
        emit Deployed(VERSION, block.chainid, msg.sender, block.timestamp);
        emit SaleWindowUpdated(_saleStart, _saleEnd);
    }
    
    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Purchase shares with USDC
     * @dev Requires: not paused, allowlisted, within sale window, caps not exceeded
     * @param shares Number of shares to purchase (whole number)
     */
    function buy(uint256 shares) external nonReentrant whenNotPaused {
        // 1. Check allowlist
        if (!allowlist[msg.sender]) {
            revert NotAllowlisted();
        }
        
        // 2. Check sale window
        if (block.timestamp < saleStart || block.timestamp > saleEnd) {
            revert SaleNotActive();
        }
        
        // 3. Validate share amount
        if (shares == 0) {
            revert InvalidShareAmount();
        }
        
        // 4. Check per-wallet cap
        if (purchasedShares[msg.sender] + shares > MAX_SHARES_PER_WALLET) {
            revert WalletCapExceeded();
        }
        
        // 5. Check total sale cap
        if (sharesSold + shares > MAX_SHARES) {
            revert SaleCapExceeded();
        }
        
        // 6. Calculate cost
        uint256 cost = shares * PRICE_PER_SHARE_USDC;
        
        // 7. Transfer USDC directly to treasury (contract never holds funds)
        usdc.safeTransferFrom(msg.sender, treasury, cost);
        
        // 8. Update state
        purchasedShares[msg.sender] += shares;
        sharesSold += shares;
        
        // 9. Mint shares to buyer
        shareToken.mint(msg.sender, shares);
        
        emit Purchased(msg.sender, shares, cost);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set or remove addresses from allowlist
     * @dev Enforces MAX_ALLOWLIST capacity when adding addresses
     * @param addresses Array of addresses to update
     * @param allowed Whether to add (true) or remove (false)
     */
    function setAllowlist(address[] calldata addresses, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            if (addr == address(0)) continue;
            
            bool wasAllowed = allowlist[addr];
            
            if (allowed && !wasAllowed) {
                // Adding new address - check capacity
                if (allowlistCount >= MAX_ALLOWLIST) {
                    revert AllowlistCapExceeded();
                }
                allowlist[addr] = true;
                allowlistCount++;
            } else if (!allowed && wasAllowed) {
                // Removing address
                allowlist[addr] = false;
                allowlistCount--;
            }
        }
        
        emit AllowlistUpdated(addresses, allowed);
    }
    
    /**
     * @notice Update sale window (emergency use only)
     * @param _start New start timestamp (unix seconds UTC)
     * @param _end New end timestamp (unix seconds UTC)
     */
    function setSaleWindow(uint64 _start, uint64 _end) external onlyOwner {
        if (_end <= _start) {
            revert InvalidSaleWindow();
        }
        saleStart = _start;
        saleEnd = _end;
        emit SaleWindowUpdated(_start, _end);
    }
    
    /**
     * @notice Pause the sale (stops all purchases)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the sale (enables purchases if window is active)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Check remaining shares available for purchase
     */
    function remainingShares() external view returns (uint256) {
        return MAX_SHARES - sharesSold;
    }
    
    /**
     * @notice Check remaining shares a wallet can purchase
     * @param wallet Address to check
     */
    function remainingSharesForWallet(address wallet) external view returns (uint256) {
        return MAX_SHARES_PER_WALLET - purchasedShares[wallet];
    }
    
    /**
     * @notice Check if sale is currently active
     */
    function isSaleActive() external view returns (bool) {
        return !paused() && 
               block.timestamp >= saleStart && 
               block.timestamp <= saleEnd &&
               sharesSold < MAX_SHARES;
    }
}

