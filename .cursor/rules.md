# ACEE Project Standards

> This file enforces company-wide standards for AI assistants working on ACEE projects.

## Required Standards (MUST Follow)

Before generating any code, you MUST read and follow:

0. **Naming Conventions (Canon v1)** - **CRITICAL**: All naming decisions must follow:
   - `docs/ops/NAMING_CONVENTIONS.md` - **Authoritative naming canon** (mirror) for company, platform, products, repos, services, env vars, and identifiers
   - **Canonical source**: `acee-chase/ACEE` → `standards/NAMING_CONVENTIONS.md` (ACEE meta repo)
   - **MUST** use ACEE top-level namespace for infrastructure (env groups, canonical env vars)
   - **MUST** describe ProofOfInfluence as a module under ACEE platform
   - **MUST NOT** introduce new `proofofinfluence-*` or `poi-<env>-*` top-level infra names
   - Env groups must follow pattern: `acee-<module>-<env>-<purpose>` (e.g., `acee-contracts-prod-config`)
   - Canonical cross-service env vars must use `ACEE_*` prefix (e.g., `ACEE_API_BASE_URL`)

1. **ACEE Standards** (located in the ACEE meta repo or `docs/acee-standards/`):
   - `standards/naming.md` - Field names, database columns, environment variables
   - `standards/terminology.md` - Domain terms (do NOT invent new terms)
   - `standards/env-vars.md` - Environment variable ownership
   - `standards/ids-and-keys.md` - ID formats, idempotency rules
   - `standards/money-and-ledger.md` - Financial boundaries
   - `standards/time-and-seq.md` - Timestamps and sequencing
   - `standards/error-codes.md` - Error codes

## Golden Rules

1. **DO NOT** invent new field names if working names exist
2. **DO NOT** invent new terminology - use exact terms from standards
3. **Follow existing patterns** - derive from standards, not imagination
4. **Security first** - All contracts must be audited before mainnet deployment

---

**Last Updated**: 2025-12-13  
**Maintainer**: ACEE Engineering
