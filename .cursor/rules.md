# ACEE Contracts Project Standards

> This file enforces company-wide standards for AI assistants working on ACEE smart contracts.

## Required Standards (MUST Follow)

Before generating any code, you MUST read and follow:

1. **ACEE Standards** (located in the ACEE meta repo):
   - `standards/naming.md` - Naming conventions
   - `standards/terminology.md` - Domain terms
   - `standards/money-and-ledger.md` - Financial boundaries

## Smart Contract Rules

### Naming Conventions
- Contract names: PascalCase (`POIToken`, `StakingRewards`)
- Function names: camelCase (`stake`, `withdraw`, `getBalance`)
- Events: PascalCase (`Staked`, `Withdrawn`, `RewardPaid`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_SUPPLY`, `REWARD_RATE`)

### Security Requirements
1. All external calls use checks-effects-interactions pattern
2. Use OpenZeppelin contracts where applicable
3. Emit events for all state changes
4. Include NatSpec documentation
5. Comprehensive test coverage (>90%)

### Code Style
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title POIToken
 * @notice Proof of Influence governance token
 * @dev ERC20 with governance extensions
 */
contract POIToken is ERC20 {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor() ERC20("Proof of Influence", "POI") {
        // Constructor logic
    }
    
    /**
     * @notice Mint new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}
```

## Testing Requirements

1. Unit tests for all functions
2. Integration tests for workflows
3. Fuzz testing for critical functions
4. Gas optimization tests

## Deployment Requirements

1. Deploy to testnet first
2. Verify contracts on block explorer
3. Document deployment addresses
4. Update deployments/ directory

---

*These rules are derived from ACEE standards and must be followed by all AI assistants.*

