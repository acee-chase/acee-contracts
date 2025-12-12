# acee-contracts

> Public smart contracts for the ACEE ecosystem.

## Overview

This repository contains the Solidity smart contracts that power the ACEE platform, including:

- Token contracts (POI Token)
- Staking and rewards
- Escrow and vesting
- Game-related contracts (future)

## Directory Structure

```
acee-contracts/
├── contracts/          # Solidity source files
├── scripts/           # Deployment scripts
├── test/              # Contract tests
├── audits/            # Security audit reports
├── deployments/       # Deployment artifacts by network
├── .cursor/           # AI assistant rules
└── hardhat.config.ts  # Hardhat configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or pnpm

### Installation

```bash
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy

```bash
# Local
npm run deploy:local

# Testnet (Base Sepolia)
npm run deploy:testnet

# Mainnet (Base)
npm run deploy:mainnet
```

## Contracts

### POI Token
ERC-20 token with governance features.

### Staking Rewards
Stake POI tokens to earn rewards.

### Escrow
Secure escrow for transactions.

### Vesting Vault
Token vesting with configurable schedules.

## Security

### Audits
All contracts undergo security audits before mainnet deployment. Reports are available in the `audits/` directory.

### Bug Bounty
Please report security vulnerabilities responsibly. See `SECURITY.md` for details.

## Deployments

### Base Sepolia (Testnet)
- POI Token: `0x...`
- Staking: `0x...`

### Base (Mainnet)
- POI Token: `0x...`
- Staking: `0x...`

## Standards Compliance

This repository follows [ACEE Standards](https://github.com/acee-chase/ACEE):
- Naming conventions
- Security guidelines
- Testing requirements

## License

MIT License - see [LICENSE](./LICENSE)

