# SSF V1 Mainnet Deployment Log

> **Status**: ✅ DEPLOYED  
> **Deployment Date**: 2026-01-14  
> **Network**: Base Mainnet (Chain ID: 8453)  
> **Deployer**: `0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25`

---

## Contract Addresses

| Contract | Address | Basescan |
|----------|---------|----------|
| **SSFShareToken** | `0xB6c38Ef75401695db928ef124D9e430b923B2546` | [View](https://basescan.org/address/0xB6c38Ef75401695db928ef124D9e430b923B2546) |
| **SSFReserveVault** | `0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3` | [View](https://basescan.org/address/0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3) |
| **SSFShareSale** | `0x52DbEa06AEb510E54b52C029eF7bD82cd33Ac5c4` | [View](https://basescan.org/address/0x52DbEa06AEb510E54b52C029eF7bD82cd33Ac5c4) |

---

## Pre-Deployment Checklist

- [x] Deployment script updated with correct treasury address (`0x61bd...`)
- [x] Chain ID hard gate (8453) verified in script
- [x] Hardhat network key verified (`base-mainnet`)
- [x] Deployer has sufficient Base ETH (0.0386 ETH)
- [x] Treasury has sufficient Base ETH (0.018 ETH)
- [x] SMOKE_1 selected and funded (0.01 ETH + 1007 USDC)
- [x] Dry run completed successfully

---

## Post-Deployment Setup

### Role Grants

| Action | TX Hash | Status |
|--------|---------|--------|
| Grant MINTER_ROLE to SSFShareSale | `0x1d955ecf94f9cce9c152d112b165116a86fa1c2250ab99f9ff73d3f3aa5dd727` | ✅ |
| Grant BURNER_ROLE to SSFReserveVault | `0xbedf4946b5145b4e8d105c96ed6b18764ac27bd5fb695ca7f671a58cca299ca2` | ✅ |
| Grant DEFAULT_ADMIN_ROLE to TREASURY | `0xa4b1d5cb06127d8674c29c75f61ef9d0453430aa3ce4ae47fe48c11a5747458f` | ✅ |
| Renounce deployer admin | `0x6de4e2a563dcf521c28ca5eafa8b37343b8096ce6c0b2f9afc5d6e8d8427f1c0` | ✅ |

### Allowlist Setup

| Action | TX Hash | Status |
|--------|---------|--------|
| Add SMOKE_1 to allowlist | TBD | Pending |

---

## Sale Window

| Field | Value |
|-------|-------|
| **saleStart** | `1768354248` (2026-01-14 01:30:48 UTC) |
| **saleEnd** | `1776130248` (2026-04-14 01:30:48 UTC) |
| **Sale duration** | 90 days |
| **Sale paused** | `true` (deploy default) |

---

## Verification Commands

```bash
# Verify SSFShareToken
npx hardhat verify --network base-mainnet 0xB6c38Ef75401695db928ef124D9e430b923B2546 "SSF Share Token" "SSF" 0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25

# Verify SSFReserveVault
npx hardhat verify --network base-mainnet 0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 0xB6c38Ef75401695db928ef124D9e430b923B2546 0x61bdD3AC52758C22038a169d761e36c2F224E7cd 0x61bdD3AC52758C22038a169d761e36c2F224E7cd 500

# Verify SSFShareSale
npx hardhat verify --network base-mainnet 0x52DbEa06AEb510E54b52C029eF7bD82cd33Ac5c4 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 0xB6c38Ef75401695db928ef124D9e430b923B2546 0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3 0x61bdD3AC52758C22038a169d761e36c2F224E7cd 0x61bdD3AC52758C22038a169d761e36c2F224E7cd 1768354248 1776130248
```

---

## Smoke Test Log

| Step | TX Hash | Status |
|------|---------|--------|
| TREASURY: setAllowlist([SMOKE_1], true) | TBD | Pending |
| TREASURY: unpause() | TBD | Pending |
| SMOKE_1: approve 1000 USDC | TBD | Pending |
| SMOKE_1: buy(1) | TBD | Pending |
| Verify: 50/50 split | TBD | Pending |
| Optional: TREASURY pause() | TBD | Optional |

---

**Last Updated**: 2026-01-14  
**Maintainer**: ACEE Engineering
