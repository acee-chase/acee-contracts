// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockAPPToken
 * @notice Mock APP-PREF token for testnet demo
 * @dev Mintable ERC20 for testing APPDistribution claims
 */
contract MockAPPToken is ERC20, Ownable {
    constructor(address initialOwner) 
        ERC20("APP-PREF Token", "APP-PREF") 
        Ownable(initialOwner) 
    {}

    /**
     * @notice Mint tokens to an address (owner only)
     * @param to Recipient address
     * @param amount Amount to mint (18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

