# Naming Conventions

> Canonical naming rules derived from existing ProofOfInfluence implementation.
> All ACEE projects MUST follow these conventions.

## 1. Field Names (camelCase)

All field names in JSON messages, TypeScript interfaces, and API responses use **camelCase**.

### Message Envelope Fields
| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type identifier |
| `seq` | number | Server-assigned sequence number |
| `clientMsgId` | string (UUID) | Client-generated idempotency key |
| `timestamp` | string (ISO 8601) | Timestamp |

### Table State Fields
| Field | Type | Description |
|-------|------|-------------|
| `tableId` | string (UUID) | Table identifier |
| `players` | array | Array of player seats |
| `pot` | number | Current pot amount |
| `communityCards` | array | Community cards |
| `currentPlayer` | string | userId of current player |
| `actionTimeLeft` | number | Seconds remaining for action |
| `phase` | string | Current game phase |
| `minBet` | number | Minimum bet amount |
| `currentBet` | number | Current bet to call |

### Player Seat Fields
| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Player identifier |
| `position` | number | Seat position (1-based) |
| `stack` | number | Player chip count |
| `bet` | number | Current bet in this round |
| `status` | string | Player status |
| `cards` | array | Hole cards |

### JWT Claims
| Field | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (standard claim) |
| `sid` | string | Session ID |
| `tid` | string | Tournament ID |
| `table` | string | Table ID |
| `gameType` | string | Game type |
| `buyIn` | number | Buy-in amount |
| `exp` | number | Expiration timestamp |
| `iat` | number | Issued at timestamp |
| `iss` | string | Issuer |

## 2. Database Naming (snake_case)

All database tables, columns, and indexes use **snake_case**.

### Tables
- `game_settlements`
- `game_tables`
- `game_hands`
- `game_actions`

### Columns
- `settlement_id`
- `table_id`
- `tournament_id`
- `hand_id`
- `created_at`
- `updated_at`

### Indexes
- `game_settlements_settlement_id_unique`
- `game_settlements_table_id_idx`

## 3. ID Formats

### UUID v4 (Required)
- `tableId` - Table identifier
- `handId` - Hand identifier
- `clientMsgId` - Client-generated idempotency key

### Composite Key
- `settlementId` - Format: `${tableId}:${handId}`

### Flexible String
- `tournamentId` - May be UUID or custom string
- `userId` - May be UUID or custom string

## 4. Environment Variables (SCREAMING_SNAKE_CASE)

All environment variables use **SCREAMING_SNAKE_CASE**.

### Platform Variables
- `GAME_WS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_ALGORITHM`
- `JWT_ISSUER`
- `SETTLEMENT_API_TOKEN`

### Frontend Variables
- `VITE_GAME_WS_URL`
- `VITE_API_BASE`

### Game Server Variables
- `ACEE_JWKS_URL`
- `ACEE_PUBLIC_KEY_PEM`
- `SETTLEMENT_API_BASE_URL`

## 5. Message Type Names (snake_case)

All WebSocket message type names use **snake_case**.

### Server → Client
- `joined`
- `state`
- `action_result`
- `pong`
- `error`

### Client → Server
- `action`
- `resync`
- `ping`

## 6. Error Code Names (SCREAMING_SNAKE_CASE)

All error codes use **SCREAMING_SNAKE_CASE**.

- `INVALID_MESSAGE`
- `UNKNOWN_MESSAGE_TYPE`
- `PARSE_ERROR`
- `AUTH_FAILED`
- `TABLE_NOT_FOUND`
- `NOT_YOUR_TURN`
- `INVALID_ACTION`
- `INSUFFICIENT_STACK`

## 7. Enum Value Names (kebab-case)

### Game Types
- `poker`
- `mahjong`

### Player Status
- `active`
- `folded`
- `all-in`
- `sitting-out`

### Game Phases
- `waiting`
- `preflop`
- `flop`
- `turn`
- `river`
- `showdown`
- `finished`

### Actions
- `fold`
- `call`
- `raise`
- `check`
- `bet`

## 8. File Naming

### TypeScript/JavaScript
- Files: `camelCase.ts` or `kebab-case.ts`
- Tests: `*.test.ts`
- Types: `types.ts`
- Index: `index.ts`

### Configuration
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.gitignore`

### Documentation
- `README.md`
- `CHANGELOG.md`
- `kebab-case.md`

---

*Reference: [TRUTH_SUMMARY.md](../TRUTH_SUMMARY.md)*

