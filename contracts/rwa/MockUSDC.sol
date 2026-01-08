// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testnet demo (6 decimals like real USDC)
 */
contract MockUSDC is ERC20, Ownable {
    constructor(address initialOwner) 
        ERC20("USD Coin (Mock)", "USDC") 
        Ownable(initialOwner) 
    {}

    /**
     * @notice Returns 6 decimals to match real USDC
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens to an address (owner only)
     * @param to Recipient address
     * @param amount Amount to mint (6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

