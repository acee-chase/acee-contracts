# SSF V1 Mainnet Address Matrix

> **Status**: Production Mainnet  
> **Last Updated**: 2026-01-13  
> **Network**: Base Mainnet (Chain ID: 8453)  
> **SSOT**: This document is the single source of truth for SSF V1 mainnet addresses
> **Source**: Synced from sales-core-mvp/docs/ops/SSF_V1_MAINNET_ADDRESS_MATRIX.md

---

## Core Addresses

| Role | Address | Notes |
|------|---------|-------|
| **TREASURY** | `0x61bdD3AC52758C22038a169d761e36c2F224E7cd` | Owner of all contracts, receives net USDC from sales |
| **DEPLOYER** | `0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25` | Deploys contracts, will renounce admin after setup |
| **USDC (Base Native)** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base mainnet USDC (6 decimals) |

---

## Contract Addresses

| Contract | Address | Verify Link | Notes |
|----------|---------|-------------|-------|
| **SSFShareToken** | TBD | TBD | ERC20 token, MAX_SUPPLY=20,000 |
| **SSFShareSale** | TBD | TBD | Sale contract, paused on deploy |
| **SSFReserveVault** | TBD | TBD | Reserve vault for redemptions |

> **Note**: Contract addresses will be filled in after deployment. See `SSF_V1_MAINNET_DEPLOYMENT_LOG.md` for deployment details.

---

## Smoke Test Wallets

| Wallet | Address | Source | Status | Tags |
|--------|---------|--------|--------|------|
| **SMOKE_1** | `0x3a13D75C173D7321f8310A0E6F8Bc070afa2d80E` | User-controlled | `in_use` | `["smoke","mainnet-ssf-v1"]` |
| **SMOKE_2** | `0x3CBE9851fA5e5CdaF7dB1ae8Eef8819bB8Ecca32` | User-controlled | `in_use` | `["smoke","mainnet-ssf-v1"]` |

> **Note**: Private key storage locations are maintained in a separate private SSOT (not committed to git).

> **Selection Criteria**:
> - Must be from `test_wallets` or `vault_wallets(role='test')`
> - Status must be `idle` before selection
> - Must have usable private key
> - **NOT from `agent_wallets`** (too high attack surface)

---

## Sale Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Price per share** | 1,000 USDC | Locked in contract |
| **Max shares** | 20,000 | Total supply cap |
| **Per-wallet cap** | 1,000 shares | Max shares per wallet |
| **Max allowlist** | 100 addresses | Allowlist size limit |
| **Sale delay** | 72 hours | Delay before sale starts |
| **Sale duration** | 90 days | Sale window length |
| **Initial allowlist** | SMOKE_1, SMOKE_2 only | Only smoke wallets initially |

---

## Security Notes

1. **Deployer vs Treasury**: Deployer (`0x3De7...`) is different from Treasury (`0x61bd...`). Deployer will renounce admin after setup for security.

2. **Private Keys**: 
   - **NEVER** commit private keys to this document or any public repository
   - Private keys are stored in environment variables only

3. **Access Control**:
   - TREASURY has owner role on all contracts
   - Deployer has temporary admin during setup
   - All admin functions require owner role (TREASURY)

---

## Related Documents

- `docs/ops/SSF_V1_MAINNET_ROLE_MAP.md` - Role assignments and permissions
- `docs/ops/SSF_V1_MAINNET_DEPLOYMENT_LOG.md` - Deployment transaction log

---

**Last Updated**: 2026-01-13  
**Maintainer**: ACEE Engineering
