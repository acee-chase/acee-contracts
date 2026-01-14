# SSF V1 Mainnet Deployment Log

> **Status**: ✅ DEPLOYED + SMOKE TEST + VERIFIED  
> **Deployment Date**: 2026-01-14  
> **Network**: Base Mainnet (Chain ID: 8453)  
> **Deployer**: `0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25`

---

## Contract Addresses

| Contract | Address | Verified |
|----------|---------|----------|
| **SSFShareToken** | `0xB6c38Ef75401695db928ef124D9e430b923B2546` | [✅ View Code](https://basescan.org/address/0xB6c38Ef75401695db928ef124D9e430b923B2546#code) |
| **SSFReserveVault** | `0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3` | [✅ View Code](https://basescan.org/address/0x61C750787b63f8D5E1640cc0115E22aEe4CABeB3#code) |
| **SSFShareSale** | `0x52DbEa06AEb510E54b52C029eF7bD82cd33Ac5c4` | [✅ View Code](https://basescan.org/address/0x52DbEa06AEb510E54b52C029eF7bD82cd33Ac5c4#code) |

---

## Role Grants

| Action | TX Hash | Status |
|--------|---------|--------|
| Grant MINTER_ROLE to SSFShareSale | `0x1d955ecf94f9cce9c152d112b165116a86fa1c2250ab99f9ff73d3f3aa5dd727` | ✅ |
| Grant BURNER_ROLE to SSFReserveVault | `0xbedf4946b5145b4e8d105c96ed6b18764ac27bd5fb695ca7f671a58cca299ca2` | ✅ |
| Grant DEFAULT_ADMIN_ROLE to TREASURY | `0xa4b1d5cb06127d8674c29c75f61ef9d0453430aa3ce4ae47fe48c11a5747458f` | ✅ |
| Renounce deployer admin | `0x6de4e2a563dcf521c28ca5eafa8b37343b8096ce6c0b2f9afc5d6e8d8427f1c0` | ✅ |

---

## Smoke Test (2026-01-14)

### Transactions

| Step | Action | TX Hash | Status |
|------|--------|---------|--------|
| 1 | TREASURY: setAllowlist([SMOKE_1], true) | `0x72886e0afdf46825577adc35caef38e267a456e9704b403100bd3b803162824f` | ✅ |
| 2 | TREASURY: unpause() | `0x4b736fa54afc5f24296725e6861ff50dc9025db75427f91cc1969fa446100066` | ✅ |
| 3 | SMOKE_1: approve(1000 USDC) | `0x9752bd64706c97fca4b6828c9fd4d6ead3023103ec1fcf50b6883c151c427cae` | ✅ |
| 4 | SMOKE_1: buy(1) | `0x9bae93f8a108d50876514e7c782f919d1163c86f0b3bd74b55399c61a4712e84` | ✅ |
| 5 | TREASURY: pause() | `0xa4f21b6e44fb59aa889d63fec9faca15f0a1ec2ea5adfa40093baa8ba1947875` | ✅ |

### Balance Evidence (50/50 Split Verified)

| Account | Before | After | Change |
|---------|--------|-------|--------|
| TREASURY USDC | 0 | 500,000,000 | **+500 USDC** ✅ |
| ReserveVault USDC | 0 | 500,000,000 | **+500 USDC** ✅ |
| SMOKE_1 USDC | 1,007,081,634 | 7,081,634 | -1000 USDC |
| SMOKE_1 SSF Token | 0 | 1 | **+1 SSF** ✅ |

---

## Sale Window

| Field | Value |
|-------|-------|
| **saleStart** | `1768354248` (2026-01-14 01:30:48 UTC) |
| **saleEnd** | `1776130248` (2026-04-14 01:30:48 UTC) |
| **Sale duration** | 90 days |
| **Current status** | **PAUSED** (after smoke test) |
| **sharesSold** | 1 |

---

## Key Addresses

| Role | Address |
|------|---------|
| **TREASURY** | `0x61bdD3AC52758C22038a169d761e36c2F224E7cd` |
| **DEPLOYER** | `0x3De7B44eab1BD638ff3465d71a7FdFEA8c3b5E25` |
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **SMOKE_1** | `0x3a13D75C173D7321f8310A0E6F8Bc070afa2d80E` |

---

**Last Updated**: 2026-01-14 02:15 UTC  
**Maintainer**: ACEE Engineering
