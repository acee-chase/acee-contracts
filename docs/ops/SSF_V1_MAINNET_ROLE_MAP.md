# SSF V1 Mainnet Role Map

> **Status**: Production Mainnet  
> **Last Updated**: 2026-01-13  
> **Network**: Base Mainnet (Chain ID: 8453)  
> **Source**: Synced from sales-core-mvp/docs/ops/SSF_V1_MAINNET_ROLE_MAP.md

---

## SSFShareToken Roles

| Role | Assigned To | Purpose | Notes |
|------|-------------|---------|-------|
| **DEFAULT_ADMIN_ROLE** | `0x61bdD3AC52758C22038a169d761e36c2F224E7cd` (TREASURY) | Full admin control | Can grant/revoke all roles |
| **MINTER_ROLE** | SSFShareSale contract | Mint tokens on purchase | Granted after Sale deployment |
| **BURNER_ROLE** | SSFReserveVault contract | Burn tokens on redeem | Granted after Vault deployment |

---

## SSFShareSale Roles

| Role | Assigned To | Purpose |
|------|-------------|---------|
| **owner** | `0x61bdD3AC52758C22038a169d761e36c2F224E7cd` (TREASURY) | Contract owner, full admin control |

### Owner Functions
- `setAllowlist(address[], bool)` - Manage allowlist
- `setSaleWindow(uint64, uint64)` - Set sale time window
- `pause()` / `unpause()` - Pause/unpause sale

---

## SSFReserveVault Roles

| Role | Assigned To | Purpose |
|------|-------------|---------|
| **owner** | `0x61bdD3AC52758C22038a169d761e36c2F224E7cd` (TREASURY) | Contract owner, full admin control |

### Owner Functions
- `setRateLimit(uint256)` - Set redemption rate limit
- `pause()` / `unpause()` - Pause/unpause redemptions
- `sweepExcess()` - Return excess USDC to treasury

---

## Deployer Role (Temporary)

| Role | Address | Purpose | Status |
|------|---------|---------|--------|
| **Deployer** | `0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25` | Deploy contracts, initial setup | **Will renounce after setup** |

### Deployer Actions (One-time)
1. Deploy all contracts
2. Grant MINTER_ROLE to SSFShareSale
3. Grant BURNER_ROLE to SSFReserveVault
4. Grant DEFAULT_ADMIN_ROLE to TREASURY
5. **Renounce deployer admin** (`renounceDeployerAdmin=true`)

---

**Last Updated**: 2026-01-13  
**Maintainer**: ACEE Engineering
