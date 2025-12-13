# Terminology

> Domain-specific terms used across ACEE projects.
> All projects MUST use these exact terms - do NOT invent synonyms.

## 1. Core Entities

### Table
A game session where players compete. Each table has a unique `tableId`.

### Hand
A single round of play from deal to showdown/conclusion. Each hand has a unique `handId`.

### Tournament
An organized competition with registration, buy-in, and prize structure. Has a `tournamentId`.

### Settlement
The financial resolution of a hand, distributing pot to winners. Identified by `settlementId`.

## 2. Game Types

| Term | Description |
|------|-------------|
| `poker` | Texas Hold'em poker |
| `mahjong` | Chinese/Japanese mahjong |

## 3. Player Status

| Status | Description |
|--------|-------------|
| `active` | Player is in the hand and can act |
| `folded` | Player has folded and is out of the hand |
| `all-in` | Player has bet all chips and can't act further |
| `sitting-out` | Player is at table but not in current hand |

## 4. Game Phases (Poker)

| Phase | Description |
|-------|-------------|
| `waiting` | Waiting for enough players to start |
| `preflop` | Before community cards are dealt |
| `flop` | First 3 community cards dealt |
| `turn` | Fourth community card dealt |
| `river` | Fifth community card dealt |
| `showdown` | Cards revealed, winner determined |
| `finished` | Hand complete, pot distributed |

## 5. Player Actions

| Action | Description |
|--------|-------------|
| `fold` | Surrender hand, forfeit any bets |
| `call` | Match the current bet |
| `raise` | Increase the current bet |
| `check` | Pass without betting (only if no bet to call) |
| `bet` | Place a bet when no current bet exists |

## 6. Financial Terms

### Buy-In
The amount a player must pay to enter a game or tournament.

### Stack
A player's current chip count at the table.

### Pot
The total chips wagered in the current hand.

### Delta
The change in a player's balance after settlement (positive = win, negative = loss).

### Ledger
The authoritative record of all player balances, owned by the platform.

## 7. Technical Terms

### gameToken
A short-lived JWT issued by the platform for authenticating to game servers.

### seq (Sequence Number)
Server-assigned monotonically increasing number for message ordering.

### clientMsgId
Client-generated UUID for action idempotency.

### settlementId
Unique identifier for a settlement event, used as idempotency key.

### Snapshot
Complete state of a table at a point in time.

### Delta (State)
Partial state update containing only changed fields.

### Resync
Client request to receive a full state snapshot.

## 8. Architecture Terms

### Platform
The ProofOfInfluence system: authentication, payments, ledger, tournament management.

### Game Server
The real-time game logic server (e.g., acee-poker) handling gameplay.

### Gateway
The WebSocket server that manages connections and dispatches to game engines.

### Engine
The game-specific logic module (poker engine, mahjong engine).

## 9. Protocol Terms

### Idempotency
Property where duplicate requests produce the same result without side effects.

### TTL (Time To Live)
Duration an idempotency cache entry is valid (typically 60 seconds).

### Heartbeat
Periodic ping/pong messages to maintain connection health.

### Message Envelope
Standard wrapper fields included in all messages (type, seq, clientMsgId, etc.).

## 10. Abbreviations

| Abbr | Full Term |
|------|-----------|
| WS | WebSocket |
| JWT | JSON Web Token |
| JWKS | JSON Web Key Set |
| UUID | Universally Unique Identifier |
| ISO | International Organization for Standardization |

---

*Reference: [TRUTH_SUMMARY.md](../TRUTH_SUMMARY.md)*

