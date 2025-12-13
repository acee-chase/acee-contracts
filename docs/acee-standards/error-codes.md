# Error Codes

> Standardized error codes used across ACEE projects.
> All services MUST use these exact codes for consistency.

## 1. Error Response Format

### WebSocket Errors
```json
{
  "type": "error",
  "seq": 5,
  "code": "INVALID_ACTION",
  "message": "Cannot bet: insufficient chips",
  "clientMsgId": "uuid-if-available"
}
```

### HTTP API Errors
```json
{
  "message": "Error description for users",
  "error": "Detailed error for developers",
  "code": "ERROR_CODE"
}
```

## 2. Authentication Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `AUTH_REQUIRED` | 401 | No authentication provided | Login required |
| `AUTH_FAILED` | 401 | Invalid or expired token | Re-authenticate |
| `TOKEN_EXPIRED` | 401 | Token has expired | Refresh token |
| `INVALID_TOKEN` | 401 | Malformed or invalid token | Get new token |
| `FORBIDDEN` | 403 | Insufficient permissions | Contact admin |

## 3. Validation Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `INVALID_REQUEST` | 400 | Request body validation failed | Check request format |
| `INVALID_MESSAGE` | N/A | WebSocket message invalid | Check message format |
| `MISSING_FIELD` | 400 | Required field missing | Provide required field |
| `INVALID_FORMAT` | 400 | Field format incorrect | Check field format |
| `INVALID_UUID` | 400 | Invalid UUID format | Use valid UUID v4 |

## 4. Game Logic Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `TABLE_NOT_FOUND` | 404 | Table does not exist | Use valid tableId |
| `TABLE_FULL` | 409 | Table has no available seats | Join different table |
| `NOT_YOUR_TURN` | 400 | Action when not current player | Wait for your turn |
| `INVALID_ACTION` | 400 | Action type not allowed | Check allowed actions |
| `INVALID_AMOUNT` | 400 | Bet/raise amount invalid | Check min/max limits |
| `INSUFFICIENT_STACK` | 400 | Not enough chips | Reduce bet amount |
| `HAND_OVER` | 400 | Hand already completed | Wait for next hand |
| `ALREADY_FOLDED` | 400 | Player already folded | Wait for next hand |

## 5. Settlement Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `INVALID_SETTLEMENT` | 400 | Settlement validation failed | Fix results array |
| `DUPLICATE_SETTLEMENT` | 200 | Settlement already processed | Safe to ignore |
| `SETTLEMENT_REJECTED` | 400 | Platform rejected settlement | Check error details |
| `ZERO_SUM_VIOLATION` | 400 | Results don't sum to zero | Fix amounts |
| `USER_NOT_IN_GAME` | 400 | userId not in this game | Check userIds |

## 6. Connection Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `CONNECTION_LOST` | N/A | WebSocket disconnected | Reconnect |
| `CONNECTION_TIMEOUT` | N/A | Connection timed out | Reconnect |
| `MAX_CONNECTIONS` | 503 | Server at capacity | Retry later |
| `RECONNECT_REQUIRED` | N/A | Must reconnect to continue | Reconnect |

## 7. Server Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error | Retry or report |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down | Retry later |
| `PARSE_ERROR` | 400 | Failed to parse message | Check JSON format |
| `UNKNOWN_MESSAGE_TYPE` | 400 | Message type not recognized | Check message type |

## 8. Error Code Mapping

### From Ad-hoc to Standard
When migrating existing code, map errors as follows:

```typescript
// Old → New mappings
const ERROR_MAP: Record<string, string> = {
  'Missing clientMsgId': 'INVALID_MESSAGE',
  'Unknown message type': 'UNKNOWN_MESSAGE_TYPE',
  'Failed to parse': 'PARSE_ERROR',
  'Not authenticated': 'AUTH_REQUIRED',
  'Invalid token': 'INVALID_TOKEN',
};
```

## 9. Error Handling Patterns

### Client-Side
```typescript
function handleError(error: ErrorMessage): void {
  switch (error.code) {
    case 'AUTH_FAILED':
    case 'TOKEN_EXPIRED':
      // Redirect to login
      redirectToLogin();
      break;
      
    case 'NOT_YOUR_TURN':
    case 'INVALID_ACTION':
      // Show user-friendly message
      showToast(error.message);
      break;
      
    case 'INTERNAL_ERROR':
    case 'SERVICE_UNAVAILABLE':
      // Retry with backoff
      scheduleRetry();
      break;
      
    default:
      // Log unknown error
      console.error('Unknown error:', error);
  }
}
```

### Server-Side
```typescript
function createError(code: string, message: string, details?: object): ErrorResponse {
  return {
    type: 'error',
    code,
    message,
    ...details,
  };
}

// Usage
sendMessage(ws, tableId, createError(
  'INSUFFICIENT_STACK',
  'Cannot bet 500: only 200 chips remaining',
  { available: 200, requested: 500 }
));
```

## 10. Error Logging

### Required Fields
All errors should be logged with:
- `code`: Standard error code
- `message`: Human-readable message
- `timestamp`: ISO 8601 timestamp
- `tableId`: If applicable
- `userId`: If available
- `clientMsgId`: If from client action

### Example Log Format
```json
{
  "level": "error",
  "code": "INVALID_ACTION",
  "message": "Cannot raise: minimum raise is 20",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-1",
  "clientMsgId": "789e0123-e45b-67c8-d901-234567890abc",
  "context": {
    "minRaise": 20,
    "attemptedRaise": 10
  }
}
```

---

*Reference: [TRUTH_SUMMARY.md](../TRUTH_SUMMARY.md)*

