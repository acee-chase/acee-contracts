# Environment Variables

> Canonical list of environment variables used across ACEE projects.
> Each variable has a single owner responsible for setting it.

## 1. Platform Variables (ProofOfInfluence)

These variables are owned and set by the platform backend.

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `GAME_WS_URL` | `ws://localhost:8787` | No | WebSocket server URL for game connections |
| `JWT_PRIVATE_KEY` | (none) | Production | JWT signing key (PEM format for RS256) |
| `JWT_DEV_KEY` | `dev-secret-key-change-in-production` | Development | Fallback key for development only |
| `JWT_ALGORITHM` | `HS256` | No | JWT algorithm (HS256 for dev, RS256 for prod) |
| `JWT_ISSUER` | `proofofinfluence` | No | JWT issuer claim value |
| `SETTLEMENT_API_TOKEN` | (none) | Production | Shared secret for settlement API auth (constant-time comparison) |
| `ALLOW_UNAUTHENTICATED_SETTLEMENT` | `false` | Development | Set to "true" to bypass auth in dev (requires explicit flag) |

### Usage Example
```bash
# Development
GAME_WS_URL=ws://localhost:8787
JWT_DEV_KEY=dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ISSUER=proofofinfluence

# Production
GAME_WS_URL=wss://poker.acee.games
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
JWT_ALGORITHM=RS256
JWT_ISSUER=proofofinfluence
SETTLEMENT_API_TOKEN=your-secure-token
```

## 2. Frontend Variables (Client)

These variables are used by the frontend application.

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `VITE_GAME_WS_URL` | `ws://localhost:8787` | No | WebSocket URL for game connections |
| `VITE_API_BASE` | `/api` | No | API base path for HTTP requests |

### Usage Example
```bash
# client/.env.local
VITE_GAME_WS_URL=ws://localhost:8787
VITE_API_BASE=/api
```

## 3. Game Server Variables (acee-poker, acee-games)

These variables are used by game servers to authenticate and communicate with the platform.

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `ACEE_JWKS_URL` | (none) | Prod (Option A) | JWKS endpoint for token verification |
| `ACEE_PUBLIC_KEY_PEM` | (none) | Prod (Option B) | Public key for token verification |
| `SETTLEMENT_API_BASE_URL` | (none) | Yes | Platform settlement endpoint URL |
| `SETTLEMENT_API_TOKEN` | (none) | Yes | Shared secret for settlement API auth |
| `PORT` | `8787` | No | WebSocket server port |

### Usage Example
```bash
# Option A: JWKS-based verification
ACEE_JWKS_URL=https://proofofinfluence.com/.well-known/jwks.json
SETTLEMENT_API_BASE_URL=https://proofofinfluence.com
SETTLEMENT_API_TOKEN=your-secure-token
PORT=8788

# Option B: PEM-based verification
ACEE_PUBLIC_KEY_PEM=-----BEGIN PUBLIC KEY-----...
SETTLEMENT_API_BASE_URL=http://localhost:5000
SETTLEMENT_API_TOKEN=dev-token
PORT=8788
```

## 4. Infrastructure Variables

These variables are used for local development infrastructure.

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `acee` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `acee` | PostgreSQL password |
| `POSTGRES_DB` | `acee_games_dev` | PostgreSQL database |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |

## 5. Port Assignments

| Port | Service | Environment |
|------|---------|-------------|
| `5000` | Platform API (ProofOfInfluence) | All |
| `5173` | Frontend dev server (Vite) | Development |
| `8787` | Mock WS Server | Development |
| `8788` | Real Poker Server (acee-poker) | All |
| `5432` | PostgreSQL | All |
| `6379` | Redis | All |

## 6. Ownership Rules

### Platform Owns
- JWT key generation and signing
- JWKS endpoint exposure
- Settlement API endpoint
- `SETTLEMENT_API_TOKEN` value

### Game Server Owns
- Token verification implementation
- Settlement event emission
- Nothing related to user authentication or balances

### Frontend Owns
- WebSocket connection URL (from platform or env)
- API base path
- Token storage (short-term only)

## 7. Security Notes

### Secrets (MUST NOT commit to git)
- `JWT_PRIVATE_KEY`
- `SETTLEMENT_API_TOKEN`
- Any database passwords

### Safe to Commit
- Default values in `.env.example`
- Public URLs
- Port numbers
- Algorithm choices

### Template Files
Each repo should have an `.env.example` with:
- All required variables listed
- Safe default values where applicable
- Comments explaining each variable

---

*Reference: [TRUTH_SUMMARY.md](../TRUTH_SUMMARY.md)*

