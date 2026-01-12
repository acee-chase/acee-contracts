// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SSFShareToken
 * @notice ERC20 token representing shares in SSF (1 token = 1 share)
 * @dev Decimals=0 for whole shares only. MINTER_ROLE for ShareSale contract.
 * 
 * IMMUTABLE CONTRACT - No proxy upgradeability.
 * Future iterations via versioned deployments (V1/V2/...).
 */
contract SSFShareToken is ERC20, AccessControl {
    // ============ VERSION ============
    string public constant VERSION = "SSFShareToken@1.0.0";
    
    // ============ ROLES ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // ============ EVENTS ============
    event Deployed(string version, uint256 chainId, address deployer, uint256 deployedAt);
    
    // ============ CONSTRUCTOR ============
    constructor(
        string memory name,
        string memory symbol,
        address admin
    ) ERC20(name, symbol) {
        require(admin != address(0), "SSFShareToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        emit Deployed(VERSION, block.chainid, msg.sender, block.timestamp);
    }
    
    // ============ OVERRIDES ============
    
    /**
     * @notice Override decimals to return 0 (whole shares only)
     * @dev 1 token = 1 share, no fractional shares allowed
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }
    
    // ============ MINTER FUNCTIONS ============
    
    /**
     * @notice Mint shares to an address
     * @dev Only callable by MINTER_ROLE (ShareSale contract)
     * @param to Recipient address
     * @param shares Number of shares to mint
     */
    function mint(address to, uint256 shares) external onlyRole(MINTER_ROLE) {
        _mint(to, shares);
    }
}

