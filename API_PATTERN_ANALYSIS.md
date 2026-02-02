# ✅ API PATTERN ANALYSIS - How APIs Are Built

**Status:** CORRECTING NEW APIs Based on Existing Pattern

---

## 🎯 CORRECT PATTERN (From Existing APIs)

### Example: `/server/api/auth/login.post.ts`

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Create Supabase client DIRECTLY in the API
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Use the client for queries
    const { data, error } = await adminSupabase
      .from('users')
      .select('*')
    
    // Return response
    return { success: true, data }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
})
```

---

## ❌ INCORRECT PATTERN (Our New APIs)

**Problem:** We tried to use `useSupabaseAdmin()` from a composable

```typescript
// ❌ WRONG - This doesn't exist!
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'

const supabase = useSupabaseAdmin()  // ❌ File doesn't exist!
```

---

## ✅ WHAT WE NEED TO FIX

### Our New APIs That Need Fixing:

1. `/server/api/admin/cash-operations.post.ts`
2. `/server/api/admin/evaluation-system.post.ts`
3. `/server/api/documents/upload.post.ts`
4. `/server/api/staff/evaluation-history.post.ts`
5. `/server/api/system/availability-data.post.ts`
6. `/server/api/system/secure-operations.post.ts`

### Fix Pattern:

Replace:
```typescript
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'
const supabase = useSupabaseAdmin()
```

With:
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Key Points About API Pattern

1. ✅ **Direct Client Creation**: Each API creates its own Supabase client
2. ✅ **Environment Variables**: Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. ✅ **Error Handling**: Uses h3's `createError()` for HTTP responses
4. ✅ **Validation**: Validates input with `readBody`
5. ✅ **Logging**: Uses logger utility for debugging
6. ✅ **No Composables**: Doesn't use `useSupabaseAdmin` or similar

---

## Import Fixes Also Needed

**Remove incorrect imports:**
```typescript
// ❌ Remove these - they don't exist or aren't needed in server context
import { getServerSession } from '#auth'  // May need fixing based on auth setup
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'  // Doesn't exist
```

**Keep/Use correct imports:**
```typescript
// ✅ Correct imports for server APIs
import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
```

---

## Next Action

Fix all 6 new API files by:
1. Removing `useSupabaseAdmin` import
2. Removing `getServerSession` import (if not used elsewhere)
3. Adding direct Supabase client creation
4. Following existing pattern from `/server/api/auth/login.post.ts`

---

Generated: 2026-01-28
