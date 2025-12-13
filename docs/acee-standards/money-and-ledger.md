# Money and Ledger

> Financial boundaries and settlement rules for ACEE game systems.
> These rules are NON-NEGOTIABLE for security and integrity.

## 1. The Golden Rule

> **Game servers NEVER mutate user balances directly.**
> **The Platform is the SOLE ledger authority.**

This separation ensures:
- No balance manipulation by game servers
- Single source of truth for financials
- Auditable transaction history
- Simplified reconciliation

## 2. Architecture Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                       PLATFORM                              │
│  (ProofOfInfluence - Ledger Authority)                     │
│                                                             │
│  • User balances (readonly to game servers)                │
│  • Buy-in validation and fund freezing                     │
│  • Settlement processing and payout                        │
│  • Transaction history and audit                           │
└───────────────────────────────────────────────────────────┘
                           │
                           │ Settlement Events (HTTP POST)
                           │ (one-way: game → platform)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     GAME SERVER                             │
│  (acee-poker, acee-mahjong)                                │
│                                                             │
│  • Game logic and state management                         │
│  • Action validation                                       │
│  • Winner determination                                    │
│  • Settlement event emission (deltas only)                 │
│                                                             │
│  ❌ CANNOT: Read real balances                             │
│  ❌ CANNOT: Modify balances                                │
│  ❌ CANNOT: Process payments                               │
└─────────────────────────────────────────────────────────────┘
```

## 3. Settlement Event Structure

### Event Format
```typescript
interface SettlementEvent {
  settlementId: string;      // Idempotency key: ${tableId}:${handId}
  tableId: string;           // UUID
  tournamentId?: string;     // Optional tournament context
  handId: string;            // UUID
  gameType: 'poker' | 'mahjong';
  results: SettlementResult[];
  auditHash?: string;        // Optional SHA256 of game events
  timestamp: string;         // ISO 8601
  metadata?: object;         // Optional game-specific data
}

interface SettlementResult {
  userId: string;
  amount: number;            // Integer cents: Positive = win, Negative = loss (semantically a delta)
  position?: number;         // Final position in hand
}
```

### Delta Semantics
- `amount` field name is canonical (backwards compatible)
- Semantically, `amount` represents a **delta** (change), not an absolute balance
- Values must be **integer cents** to avoid floating point issues
- Positive values indicate winnings
- Negative values indicate losses
- The platform applies deltas to user balances
- **Note**: Field name is `amount` (not `delta`) for backwards compatibility with existing code

### Example
```json
{
  "settlementId": "550e8400-e29b-41d4-a716-446655440000:123e4567-e89b-12d3-a456-426614174000",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "handId": "123e4567-e89b-12d3-a456-426614174000",
  "gameType": "poker",
  "results": [
    { "userId": "user-1", "amount": 150, "position": 1 },
    { "userId": "user-2", "amount": -100, "position": 2 },
    { "userId": "user-3", "amount": -50, "position": 3 }
  ],
  "timestamp": "2024-01-01T12:10:00.000Z"
}
```

## 4. Zero-Sum Requirement

> **The sum of all `amount` values in a settlement MUST equal zero.**

This ensures:
- No chips are created or destroyed
- Rake/fees are handled separately (if applicable)
- Easy reconciliation and auditing

### Validation
```typescript
function validateSettlement(event: SettlementEvent): boolean {
  const sum = event.results.reduce((acc, r) => acc + r.amount, 0);
  return sum === 0;
}
```

### Failure Handling
If zero-sum validation fails:
- Platform rejects the settlement with `INVALID_SETTLEMENT` error
- Game server must log and investigate
- Hand may need manual resolution

## 5. Buy-In Flow

### Step 1: Enter Game (Platform)
```
Client → Platform: POST /api/game/enter
{
  "gameType": "poker",
  "buyIn": 100,
  "tournamentId": "optional"
}

Platform Actions:
1. Verify user has sufficient balance
2. Freeze buyIn amount (mark as unavailable)
3. Generate gameToken with buyIn claim
4. Return gameToken, tableId, joinUrl
```

### Step 2: Join Table (Game Server)
```
Client → Game Server: WebSocket connect with gameToken

Game Server Actions:
1. Verify gameToken signature
2. Extract buyIn from token claims
3. Initialize player with buyIn as starting stack
4. Do NOT query platform for balance
```

### Step 3: Play (Game Server)
```
Game Server Actions:
- Track in-game chips (stack) per player
- Validate actions against stack
- Manage pot and betting rounds
- Determine winners
```

### Step 4: Settlement (Game Server → Platform)
```
Game Server → Platform: POST /api/game/settle
{
  "settlementId": "...",
  "results": [...]
}

Platform Actions:
1. Validate zero-sum
2. Check idempotency (settlementId)
3. Apply deltas to user balances
4. Unfreeze funds
5. Return acknowledgment
```

## 6. Error Handling

### Settlement Errors
| Error | Action |
|-------|--------|
| `INVALID_SETTLEMENT` | Fix results and retry with new settlementId |
| `DUPLICATE_SETTLEMENT` | Safe to ignore (already processed) |
| `NETWORK_ERROR` | Retry with same settlementId (idempotent) |

### Retry Strategy
```typescript
async function settleWithRetry(event: SettlementEvent, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await settlementClient.settle(event);
    } catch (error) {
      if (error.code === 'INVALID_SETTLEMENT') {
        throw error; // Don't retry validation errors
      }
      // Retry network/server errors
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Settlement failed after retries');
}
```

## 7. Audit Trail

### Platform Responsibilities
- Store all settlement events in `game_settlements` table
- Log all balance mutations with settlement reference
- Provide reconciliation API for auditors

### Game Server Responsibilities
- Log all game events leading to settlement
- Optionally provide `auditHash` (SHA256 of events)
- Store game history for replay if needed

## 8. MVP Simplifications

For initial implementation:
- Settlement is log-only (no actual balance mutations)
- No rake/fee handling
- No side pots (reject actions exceeding stack)
- No all-in with side pot calculations

These will be added in future iterations.

---

*Reference: [TRUTH_SUMMARY.md](../TRUTH_SUMMARY.md)*

