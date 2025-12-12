# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ACEE contracts, please report it responsibly.

### How to Report

1. **Do NOT** disclose the vulnerability publicly
2. **Do NOT** open a public GitHub issue
3. Email security findings to: security@acee.games
4. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on progress
- Credit in the security advisory (if desired)

### Scope

In scope:
- All Solidity contracts in `contracts/`
- Deployment scripts that affect contract security
- Configuration that affects contract behavior

Out of scope:
- Frontend/backend applications (report to respective repos)
- Third-party dependencies
- Social engineering

## Security Practices

### Development
- All contracts reviewed by at least 2 developers
- Comprehensive test coverage required
- Static analysis with Slither
- Fuzzing with Echidna

### Pre-deployment
- Internal security review
- External audit for mainnet contracts
- Bug bounty program (coming soon)

### Post-deployment
- Monitoring for unusual activity
- Incident response plan
- Upgrade path for critical issues

## Audit Reports

Available in `audits/` directory:
- (audits will be added as they are completed)

## Known Issues

Currently tracked issues and their status:
- (none at this time)

