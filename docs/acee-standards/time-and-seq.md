# Time and Sequencing

> Standards for timestamps and message sequencing in ACEE real-time systems.

## 1. Sequence Numbers (`seq`)

### Definition
- Server-assigned monotonically increasing integer
- Unique per table (not global)
- Included in EVERY server → client message

### Purpose
- Message ordering guarantee
- Gap detection for missed messages
- Resync trigger on sequence gaps

### Rules

1. **Starts at 1**: First message to a connection has `seq: 1`
2. **Monotonic**: Each subsequent message increments by 1
3. **Per-table**: Each table maintains its own sequence counter
4. **No gaps allowed**: If client detects gap, must request resync

### Implementation (Server)
```typescript
const tableSequences = new Map<string, number>();

function getNextSeq(tableId: string): number {
  const current = tableSequences.get(tableId) || 0;
  const next = current + 1;
  tableSequences.set(tableId, next);
  return next;
}

function sendMessage(ws: WebSocket, tableId: string, message: any): void {
  message.seq = getNextSeq(tableId);
  ws.send(JSON.stringify(message));
}
```

### Implementation (Client)
```typescript
let lastSeq: number | null = null;

function handleMessage(message: ServerMessage): void {
  if (message.seq !== undefined) {
    if (lastSeq !== null && message.seq !== lastSeq + 1) {
      console.warn(`Sequence gap detected: expected ${lastSeq + 1}, got ${message.seq}`);
      requestResync();
      return;
    }
    lastSeq = message.seq;
  }
  
  // Process message...
}
```

### Resync Behavior
- On resync request, server sends full state snapshot
- Snapshot has current `seq` value
- Client resets `lastSeq` to the snapshot's `seq`
- Gap detection resumes from there

## 2. Timestamps (`ts` / `timestamp`)

### Format
- **ISO 8601**: `YYYY-MM-DDTHH:mm:ss.sssZ`
- **UTC timezone**: Always use `Z` suffix
- **Millisecond precision**: Include `.sss`

### Examples
```
2025-12-12T12:00:00.000Z
2025-12-12T15:30:45.123Z
```

### Usage

#### Client Messages
```json
{
  "type": "action",
  "clientMsgId": "uuid",
  "action": "raise",
  "amount": 100,
  "timestamp": "2025-12-12T12:00:00.000Z"
}
```
- Used for logging and debugging
- NOT used for ordering (use `seq` instead)
- Client-generated timestamp (may have clock drift)

#### Server Messages
```json
{
  "type": "state",
  "seq": 5,
  "ts": "2025-12-12T12:00:00.123Z",
  "delta": { ... }
}
```
- Used for audit trail
- Used for debugging latency issues
- Server-generated timestamp (authoritative)

#### Settlement Events
```json
{
  "settlementId": "...",
  "timestamp": "2025-12-12T12:00:00.000Z",
  ...
}
```
- **Event timestamp**: When the hand completed (game server time)
- **created_at**: When platform recorded the settlement (platform time)
- Must be server-generated, not client-provided
- Used for audit and ordering

### Generation
```typescript
// Always use ISO 8601 UTC
const timestamp = new Date().toISOString();
// Result: "2024-01-01T12:00:00.000Z"
```

### Validation
```typescript
function isValidTimestamp(ts: string): boolean {
  const date = new Date(ts);
  return !isNaN(date.getTime()) && ts === date.toISOString();
}
```

## 3. Expiration Times (`exp`)

### JWT Expiration
- Format: Unix timestamp (seconds since epoch)
- Duration: 10 minutes (600 seconds) for gameToken
- Validation: Must check before accepting token

```typescript
// In JWT payload
{
  "exp": 1702454400,  // Unix timestamp
  "iat": 1702453800   // Issued 600 seconds before exp
}

// Validation
function isTokenExpired(payload: JWTPayload): boolean {
  return Math.floor(Date.now() / 1000) > payload.exp;
}
```

### API Response Expiration
- Format: ISO 8601 string
- Used for client display and caching

```json
{
  "gameToken": "...",
  "expiresAt": "2024-01-01T12:10:00.000Z"
}
```

## 4. Action Timeouts

### Action Time Limit
- `actionTimeLeft`: Seconds remaining for current player's action
- Decrements in real-time (client-side countdown)
- Server enforces and auto-folds on timeout

### Heartbeat Interval
- Server sends `pong` every 20 seconds
- Client should send `ping` if no message received in 30 seconds
- Connection considered dead after 60 seconds of silence

## 5. Idempotency TTL

### clientMsgId Cache
- TTL: 60 seconds
- Entries older than 60 seconds are evicted
- Safe to reuse clientMsgId after 60 seconds (but not recommended)

### Settlement Idempotency
- Permanent: settlementId never expires
- Duplicate settlements always return cached result

## 6. Clock Synchronization

### Server Authoritative
- All ordering decisions use `seq`, not timestamps
- Server generates authoritative timestamps
- Client timestamps are for logging only

### Drift Tolerance
- Client clocks may drift ±5 seconds
- Server should not rely on client timestamps for logic
- Timestamp validation can reject messages >60 seconds in future

## 7. Message Ordering Guarantees

### Within a Connection
- Messages are delivered in `seq` order
- No reordering allowed
- Gaps trigger resync

### Across Connections
- Different connections to same table see same `seq` values
- Actions from different clients are serialized by server
- State updates reflect all prior actions

### State Consistency
```
Time →
  
Connection A:     [join] → [action] → [result] → [state]
                    seq=1   seq=2      seq=3      seq=4

Connection B:     [join] → [result] → [state]
                    seq=1   seq=2      seq=3
                    
(Connection B sees A's action reflected in state at seq=3)
```

---

*Reference: [TRUTH_SUMMARY.md](../TRUTH_SUMMARY.md)*

