# Wallee Multi-Tenant Test Guide

## Phase 1: Database Migration ausführen

### 1a. Migration manuell in Supabase SQL Editor ausführen:

```sql
-- Add Wallee configuration columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_space_id INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_user_id INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_secret_key TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name LIKE 'wallee%';
```

**Or** use Supabase Studio:
1. Go to: Database → SQL Editor
2. Paste the SQL above
3. Click "Run"
4. Should show 3 new columns added

---

## Phase 2: Driving Team Sub-Account Credentials

### 2a. Get Wallee Credentials

1. **In Wallee Dashboard:**
   - Account: https://app-wallee.com (login with your credentials)
   - Select "Driving Team" sub-account from dropdown (if not already selected)
   - Go to: **Settings** → **API Credentials**
   - You'll see:
     - **Space ID** (e.g., `82593`)
     - **User ID** (e.g., `140526`) 
     - **Secret Key** (e.g., `YOUR_SECRET_HERE...`)

### 2b. Update Driving Team Tenant in Database

Run in Supabase SQL Editor:

```sql
-- First, verify the tenant exists and get its ID
SELECT id, name, slug FROM tenants WHERE slug = 'driving-team';

-- Update the tenant with Wallee credentials
UPDATE tenants 
SET 
  wallee_space_id = 82593,                    -- Replace with YOUR Space ID
  wallee_user_id = 140526,                    -- Replace with YOUR User ID
  wallee_secret_key = 'YOUR_SECRET_KEY_HERE' -- Replace with YOUR Secret Key
WHERE slug = 'driving-team'
RETURNING id, name, wallee_space_id, wallee_user_id;

-- Verify the update
SELECT id, name, slug, wallee_space_id, wallee_user_id, wallee_secret_key 
FROM tenants 
WHERE slug = 'driving-team';
```

**Expected output:**
```
id | name | slug | wallee_space_id | wallee_user_id
---|------|------|-----------------|---------------
<UUID> | Driving Team | driving-team | 82593 | 140526
```

---

## Phase 3: Test Wallee Connection

### 3a. Test the Helper Function

**Option A: Via cURL** (if you have `curl` installed)

```bash
# Test default/main account (Simy.ch)
curl -X GET "http://localhost:3000/api/wallee/test-connection" \
  -H "Content-Type: application/json"

# Test Driving Team sub-account (when implemented)
# (The endpoint needs to accept tenantId parameter - check implementation)
```

**Option B: Via Browser Console** (Frontend)

1. Open your app in browser: `http://localhost:3000`
2. Open DevTools (F12)
3. Go to Console tab
4. Paste this code:

```javascript
// Test connection to Wallee
const testWallee = async () => {
  try {
    const response = await fetch('/api/wallee/test-connection')
    const data = await response.json()
    logger.debug('✅ Wallee Connection Test:', data)
    return data
  } catch (error) {
    console.error('❌ Connection failed:', error)
  }
}

await testWallee()
```

**Expected successful response:**
```json
{
  "success": true,
  "spaceId": 82592,
  "spaceName": "Simy.ch",
  "connectionStatus": "✅ Connection successful",
  "walleeVersion": "..."
}
```

---

## Phase 4: Create Test Payment Transaction

### 4a. Create a Test Payment via API

**Option A: Via Postman or cURL**

```bash
curl -X POST "http://localhost:3000/api/wallee/create-transaction" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-ORDER-001",
    "amount": 9500,
    "currency": "CHF",
    "customerEmail": "test@example.com",
    "customerName": "Test Customer",
    "description": "Test Driving Lesson",
    "successUrl": "http://localhost:3000/payment-success",
    "failedUrl": "http://localhost:3000/payment-failed",
    "userId": "<TEST_USER_ID>",
    "tenantId": "<DRIVING_TEAM_TENANT_ID>"
  }'
```

**Option B: Via Frontend**

1. Complete the booking flow in your app
2. When payment screen appears, check browser console for:
   - Request being sent to `/api/wallee/create-transaction`
   - Look for the `tenantId` being passed

---

## Phase 5: Verify Correct Space ID Usage

### 5a. Check Server Logs

In your running dev server terminal, look for logs like:

```
🔧 SDK Config: { 
  spaceId: 82593,                    ← Should be Driving Team Space ID!
  userId: 140526, 
  apiSecretPreview: 'YOUR_SECRET...',
  forTenant: '<DRIVING_TEAM_TENANT_ID>'
}
```

### 5b. Check Payment in Wallee Dashboard

1. **In Wallee:**
   - Switch to "Driving Team" sub-account
   - Go to: **Transactions** or **Payments**
   - Look for your test payment with ID `TEST-ORDER-001`
   - Should appear here (not in parent account)

2. **In Parent Account (Simy.ch):**
   - Switch back to parent account
   - Transactions should NOT appear here

---

## Phase 6: Test Fallback Behavior

### 6a. Test without Tenant-Specific Config

Edit the request to NOT include `tenantId`:

```bash
curl -X POST "http://localhost:3000/api/wallee/create-transaction" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-ORDER-NO-TENANT",
    "amount": 5000,
    "currency": "CHF",
    "customerEmail": "test@example.com",
    "customerName": "Test Customer",
    "description": "Test - No Tenant ID"
  }'
```

**Expected behavior:**
- Should use environment variable Space ID (82592 = Simy.ch)
- Log should show: `ℹ️ No tenantId provided, using default Wallee config from env`

---

## Common Issues & Troubleshooting

### Issue 1: "Invalid credentials" Error

**Problem:** Getting 401 Unauthorized

**Solution:**
```javascript
// 1. Verify credentials are correct
logger.debug('Space ID:', process.env.WALLEE_SPACE_ID)
logger.debug('User ID:', process.env.WALLEE_APPLICATION_USER_ID)

// 2. Check in Wallee dashboard Settings → API Credentials
// 3. Ensure credentials match exactly (copy/paste to avoid typos)
```

### Issue 2: Payment Goes to Wrong Space

**Problem:** Payment appears in parent account instead of sub-account

**Solution:**
```sql
-- Verify Driving Team has correct Space ID
SELECT slug, wallee_space_id FROM tenants WHERE slug = 'driving-team';

-- Should show:
-- driving-team | 82593

-- If NULL or wrong value, update it:
UPDATE tenants 
SET wallee_space_id = 82593 
WHERE slug = 'driving-team';
```

### Issue 3: "Tenant not found" Error

**Problem:** Getting "Could not fetch Wallee config for tenant"

**Solution:**
1. Verify `tenantId` in request matches a real tenant UUID
2. Check tenant actually exists:
```sql
SELECT id, slug FROM tenants WHERE id = '<YOUR_TENANT_ID>';
```

### Issue 4: Still Using Default Space

**Problem:** Even with `tenantId`, payment goes to default space

**Solution:**
```javascript
// 1. Verify function loads config
logger.debug('getWalleeConfigForTenant loaded')

// 2. Check import in endpoint file
// Should have:
// import { getWalleeConfigForTenant } from '~/server/utils/wallee-config'

// 3. Verify await is used:
// const config = await getWalleeConfigForTenant(tenantId)

// 4. Restart dev server if you just added the import
```

---

## Test Checklist

- [ ] Database columns added (`wallee_space_id`, `wallee_user_id`, `wallee_secret_key`)
- [ ] Driving Team tenant updated with sub-account credentials
- [ ] Wallee connection test passes
- [ ] Payment transaction created successfully
- [ ] Payment appears in Driving Team Wallee dashboard (not parent)
- [ ] Server logs show correct Space ID (`82593`)
- [ ] Fallback works (payment without `tenantId` uses env variables)
- [ ] Both spaces work independently

---

## Next Steps

Once tests pass:

1. **Update other Wallee endpoints** to use same pattern:
   - `save-payment-token.post.ts`
   - `get-customer-payment-methods.post.ts`
   - `sync-payment-methods.post.ts`
   - All other wallet endpoints

2. **Add tenant dropdown** to admin dashboard to switch between accounts

3. **Create automated tests** to verify correct Space routing

4. **Update documentation** for other tenants

---

## Getting Your Wallee Credentials

### Where to find them:

1. **Space ID:**
   - Wallee Dashboard → Settings → Basic
   - Or API Credentials page
   - Format: Integer (e.g., `82593`)

2. **User ID (Application User):**
   - Settings → Security → Application Users
   - Format: Integer (e.g., `140526`)

3. **Secret Key:**
   - Settings → API Credentials
   - Format: Base64-encoded string
   - ⚠️ Only visible once at creation - save it securely!

---

