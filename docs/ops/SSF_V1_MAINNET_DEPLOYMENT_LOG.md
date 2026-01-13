# SSF V1 Mainnet Deployment Log

> **Status**: Pending Deployment  
> **Last Updated**: 2026-01-13  
> **Network**: Base Mainnet (Chain ID: 8453)  
> **Deployer**: `0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25`
> **Source**: Synced from sales-core-mvp/docs/ops/SSF_V1_MAINNET_DEPLOYMENT_LOG.md

---

## Pre-Deployment Checklist

- [x] Deployment script updated with correct treasury address (`0x61bd...`)
- [x] Chain ID hard gate (8453) verified in script
- [x] Hardhat network key verified (`base-mainnet`)
- [ ] Deployer has sufficient Base ETH (≥ 0.03 ETH)
- [ ] Treasury has sufficient Base ETH (≥ 0.01 ETH)
- [ ] SMOKE_1/2 selected and funded
- [ ] Dry run completed successfully

---

## Deployment Transactions

### SSFShareToken

| Field | Value |
|-------|-------|
| **Contract Address** | TBD |
| **Deployment TX** | TBD |
| **Block Number** | TBD |
| **Gas Used** | TBD |
| **Basescan Link** | TBD |
| **Status** | Pending |

---

### SSFReserveVault

| Field | Value |
|-------|-------|
| **Contract Address** | TBD |
| **Deployment TX** | TBD |
| **Block Number** | TBD |
| **Gas Used** | TBD |
| **Basescan Link** | TBD |
| **Status** | Pending |

---

### SSFShareSale

| Field | Value |
|-------|-------|
| **Contract Address** | TBD |
| **Deployment TX** | TBD |
| **Block Number** | TBD |
| **Gas Used** | TBD |
| **Basescan Link** | TBD |
| **Status** | Pending |

---

## Post-Deployment Setup

### Role Grants

| Action | TX Hash | Status |
|--------|---------|--------|
| Grant MINTER_ROLE to SSFShareSale | TBD | Pending |
| Grant BURNER_ROLE to SSFReserveVault | TBD | Pending |
| Grant DEFAULT_ADMIN_ROLE to TREASURY | TBD | Pending |
| Renounce deployer admin | TBD | Pending |

### Allowlist Setup

| Action | TX Hash | Status |
|--------|---------|--------|
| Add SMOKE_1 to allowlist | TBD | Pending |
| Add SMOKE_2 to allowlist | TBD | Pending |

---

## Sale Window

| Field | Value |
|-------|-------|
| **saleStart** | TBD (now + 72h) |
| **saleEnd** | TBD (saleStart + 90 days) |
| **Sale paused** | TBD |
| **Vault paused** | TBD |

---

## Verification Commands

```bash
# Verify contracts on Basescan
npx hardhat verify --network base-mainnet [TOKEN_ADDRESS] "SSF Share Token" "SSF" [DEPLOYER_ADDRESS]
npx hardhat verify --network base-mainnet [VAULT_ADDRESS] [USDC] [TOKEN] [TREASURY] [TREASURY] [MAX_REDEEM]
npx hardhat verify --network base-mainnet [SALE_ADDRESS] [USDC] [TOKEN] [VAULT] [TREASURY] [TREASURY] [START] [END]
```

---

**Last Updated**: 2026-01-13  
**Maintainer**: ACEE Engineering
