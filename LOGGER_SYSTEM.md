# Logger System Documentation

## Overview

The app now uses a centralized logging system for better debugging, monitoring, and production readiness.

## Features

- **Environment-aware**: Debug logs only show in development
- **Centralized**: All logs stored in database for later analysis
- **Error tracking**: Errors automatically sent to server
- **Zero-impact**: Logging failures don't break the app
- **Type-safe**: Full TypeScript support

## Usage

### Basic Usage

```typescript
import { logger } from '~/utils/logger'

// Debug logs - only in development
logger.debug('ComponentName', 'Debug message', { data: 'value' })

// Info logs - always shown
logger.info('ComponentName', 'User logged in', { userId: '123' })

// Warnings - always shown
logger.warn('ComponentName', 'Unusual behavior detected', { issue: '...' })

// Errors - always shown + sent to server
logger.error('ComponentName', 'Payment failed', error)
```

### Using in Vue Components

```vue
<script setup lang="ts">
import { logger } from '~/utils/logger'

const processPayment = async () => {
  try {
    logger.debug('PaymentComponent', 'Processing payment...')
    // ... payment logic
    logger.info('PaymentComponent', 'Payment successful', { id: paymentId })
  } catch (error) {
    logger.error('PaymentComponent', 'Payment processing failed', error)
  }
}
</script>
```

### Using $logger in templates

```vue
<template>
  <button @click="$logger.info('Button', 'Clicked')">
    Click me
  </button>
</template>
```

## Log Levels

| Level | Dev Show | Prod Show | Sent to Server | Use Case |
|-------|----------|-----------|----------------|----------|
| **debug** | ✅ Yes | ❌ No | ❌ No | Detailed internal state (passwords, sensitive data) |
| **info** | ✅ Yes | ✅ Yes | ❌ No | Important business events |
| **warn** | ✅ Yes | ✅ Yes | ❌ No | Unexpected but recoverable issues |
| **error** | ✅ Yes | ✅ Yes | ✅ **YES** | Critical failures, exceptions |

## Database

Errors are automatically saved to the `error_logs` table:

```sql
- id: UUID
- level: 'error' (only errors are stored)
- component: String (e.g., 'PaymentComponent')
- message: String
- data: JSONB (error details)
- url: String (page URL when error occurred)
- user_agent: String (browser info)
- user_id: UUID (user who triggered error)
- tenant_id: UUID (tenant context)
- created_at: Timestamp
```

## Admin Features

### View Error Logs (Admin Dashboard)

```typescript
const { errorLogs, loading, fetchErrorLogs, getStatistics } = useErrorLogs()

// Fetch errors from last 24 hours
await fetchErrorLogs({ hours: 24, level: 'error', limit: 100 })

// Get statistics
const stats = await getStatistics(24)
// Returns: { totalErrors: 15, byComponent: { PaymentComponent: 8, ... } }

// Clear old logs (older than 30 days)
await clearOldLogs(30)
```

## Configuration

### Development vs Production

Logs automatically adapt based on `NODE_ENV`:

```bash
# Development - all debug logs visible
NODE_ENV=development npm run dev

# Production - only info/warn/error visible
NODE_ENV=production npm run build
```

### Disable Logging

To disable logging (not recommended):

```typescript
// In env file
VITE_DISABLE_LOGGING=true
```

## Best Practices

### ✅ DO

```typescript
logger.debug('Component', 'User action started', { userId, action })
logger.error('API', 'Request failed', error)
logger.info('Auth', 'User logged in successfully')
```

### ❌ DON'T

```typescript
logger.debug('something')  // Use logger instead
logger.error('Component', 'Error:', { password: user.password })  // No sensitive data!
logger.debug('Component', 'Starting...', entireUserObject)  // Too verbose
```

## Sensitive Data

**NEVER log:**
- Passwords
- API Keys / Tokens
- Personal identification numbers
- Credit card data
- Full user objects (extract only needed fields)

**Instead do:**
```typescript
// ❌ WRONG
logger.error('Payment', 'Failed', { card: fullCardData })

// ✅ RIGHT
logger.error('Payment', 'Failed', { cardLast4: '4242', error: error.message })
```

## Migration from console.log

We've provided a script to automatically migrate:

```bash
chmod +x scripts/replace-console-logs.sh
bash scripts/replace-console-logs.sh
```

Then:
1. Manually add `import { logger } from '~/utils/logger'` where needed
2. Run `npm run lint` to fix any issues
3. Review changes with `git diff`

## Server-Side Logging

Errors can also be logged server-side:

```typescript
// server/api/some-endpoint.ts
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ...
    logger.info('ApiEndpoint', 'Processing request')
  } catch (error) {
    logger.error('ApiEndpoint', 'Request failed', error)
  }
})
```

## Integration with Sentry (Optional, Future)

To add error tracking:

```typescript
import * as Sentry from "@sentry/nuxt"

// In logger.ts or plugin
if (logEntry.level === 'error') {
  Sentry.captureException(error, {
    tags: {
      component: logEntry.component
    }
  })
}
```

## Testing

To test the logger:

```typescript
// Open browser console
useLogger().error('Test', 'This is a test error')

// Should see in console and send to /api/logs/save
```

Check the `error_logs` table to verify it was saved.

