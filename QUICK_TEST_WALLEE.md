# Quick Test: Wallee Multi-Tenant Setup

## 5-Minute Quick Test

### Step 1: Get Your Wallee Credentials (2 min)

1. Go to: https://app-wallee.com
2. Login with your credentials
3. Make sure "Driving Team" sub-account is selected
4. Go to: **Settings → API Credentials**
5. Copy these values:
   ```
   Space ID: 82593           (your actual value)
   User ID: 140526           (your actual value)
   Secret Key: abc123...     (your actual value)
   ```

### Step 2: Update Database (1 min)

Go to Supabase → SQL Editor and run:

```sql
UPDATE tenants 
SET 
  wallee_space_id = 82593,
  wallee_user_id = 140526,
  wallee_secret_key = 'PASTE_YOUR_SECRET_KEY_HERE'
WHERE slug = 'driving-team'
RETURNING id, slug, wallee_space_id, wallee_user_id;
```

Verify the output shows your values:
```
✅ driving-team | 82593 | 140526
```

### Step 3: Test Configuration (2 min)

**Option A: Via Browser**

1. Open your app: http://localhost:3000
2. Open DevTools (F12 → Console)
3. Paste this:

```javascript
// Test the debug endpoint
const testConfig = async (tenantSlug = 'driving-team') => {
  // First get tenant ID from database
  const tenantResponse = await fetch(`/api/tenant/${tenantSlug}`)
  const tenant = await tenantResponse.json()
  
  if (!tenant?.id) {
    console.error('Tenant not found:', tenantSlug)
    return
  }
  
  // Then test config
  const response = await fetch(`/api/wallee/debug-tenant-config?tenantId=${tenant.id}&verbose=true`)
  const data = await response.json()
  logger.debug('Wallee Config Debug:', data)
  return data
}

await testConfig()
```

**Option B: Direct cURL**

```bash
# First, get Driving Team tenant ID
curl -X GET "http://localhost:3000/api/tenant/driving-team" \
  -H "Content-Type: application/json"

# Then test config (replace <TENANT_ID> with the actual UUID)
curl -X GET "http://localhost:3000/api/wallee/debug-tenant-config?tenantId=<TENANT_ID>&verbose=true" \
  -H "Content-Type: application/json"
```

**Expected output:**
```json
{
  "status": "success",
  "tenantId": "<TENANT_ID>",
  "config": {
    "spaceId": 82593,          ← Should be YOUR Space ID
    "userId": 140526,          ← Should be YOUR User ID
    "apiSecretPreview": "abc123..."
  },
  "isUsingDefault": false      ← Should be FALSE (not using fallback)
}
```

✅ If you see `"isUsingDefault": false` → **SUCCESS!**

---

## Troubleshooting

### "isUsingDefault": true

**Problem:** Still using default config, not tenant-specific

**Fix:**
```sql
-- Verify credentials were saved
SELECT slug, wallee_space_id, wallee_user_id, wallee_secret_key 
FROM tenants 
WHERE slug = 'driving-team';

-- If wallee_space_id is NULL, update again:
UPDATE tenants 
SET wallee_space_id = 82593,
    wallee_user_id = 140526,
    wallee_secret_key = 'YOUR_SECRET'
WHERE slug = 'driving-team';
```

### "Error: Could not fetch Wallee config"

**Problem:** Backend can't reach database

**Fix:**
1. Verify Supabase service role key is set in `.env`
2. Check your internet connection
3. Look at server logs for detailed error

### "Invalid credentials"

**Problem:** Space ID, User ID, or Secret Key is wrong

**Fix:**
1. Double-check you copied values from "Driving Team" sub-account (not parent)
2. Paste values again carefully (watch for extra spaces)
3. Go back to Wallee → Settings → API Credentials and verify values match exactly

---

## Next: Test a Real Transaction

Once config test passes:

1. Go through the booking flow: http://localhost:3000/services/driving-team
2. Complete a booking
3. Check server logs for:
   ```
   🔧 SDK Config: { spaceId: 82593, ...
   ```
4. Complete payment
5. Go to Wallee → Switch to "Driving Team" → Transactions
6. You should see your test payment there ✅

---

## Server Logs to Watch

When creating a transaction, you should see:

```
🚀 Wallee Transaction Creation (SDK)...
📨 Received body: { orderId: '...', amount: 9500, tenantId: '...', ... }
🔧 SDK Config: { 
  spaceId: 82593,           ← Correct!
  userId: 140526,           ← Correct!
  forTenant: '...'          ← Your tenant UUID
}
```

If you see `spaceId: 82592` → Wrong! Check database update.

---

## All Done? ✅

If tests pass:
- [ ] Config debug shows correct Space ID
- [ ] `isUsingDefault: false`
- [ ] Server logs show correct tenant ID
- [ ] Test payment appears in Driving Team Wallee dashboard

Then the multi-tenant Wallee setup is working! 🎉

Next: Update remaining endpoints and test in production.

