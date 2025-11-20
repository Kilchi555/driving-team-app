# Wallee Multi-Tenant Configuration

## Overview

Wallee requires separate **Space IDs** for each sub-account. Each Space represents a separate merchant configuration, and transactions must be routed to the correct Space to be associated with the right merchant account.

## Database Schema

The `tenants` table now includes Wallee configuration fields:

```sql
ALTER TABLE tenants ADD COLUMN wallee_space_id INTEGER;
ALTER TABLE tenants ADD COLUMN wallee_user_id INTEGER;
ALTER TABLE tenants ADD COLUMN wallee_secret_key TEXT;
```

## Configuration Per Tenant

### Step 1: Get Wallee Credentials from Sub-Account

For each sub-account in Wallee:
1. Log in to Wallee dashboard
2. Select the sub-account (e.g., "Driving Team")
3. Go to: Settings → API Credentials
4. Copy:
   - **Space ID** (e.g., 82593)
   - **Application User ID** (e.g., 140526)
   - **API Secret Key** (e.g., `YOUR_SECRET_KEY`)

### Step 2: Update Tenant Configuration

Update the tenant record with Wallee credentials:

```sql
UPDATE tenants 
SET 
  wallee_space_id = 82593,
  wallee_user_id = 140526,
  wallee_secret_key = 'YOUR_WALLEE_SECRET_KEY'
WHERE slug = 'driving-team';
```

## How It Works

### Default Behavior (Backwards Compatible)

If a tenant has no custom Wallee configuration:
- The app falls back to environment variables
- All transactions use the default Space ID from `WALLEE_SPACE_ID`
- This ensures backwards compatibility with the main Simy.ch account

### Per-Tenant Routing

When a transaction is created:

1. **Frontend sends request with `tenantId`**
   ```javascript
   const response = await fetch('/api/wallee/create-transaction', {
     body: JSON.stringify({
       // ...
       tenantId: 'driving-team-uuid'
     })
   })
   ```

2. **Backend looks up Wallee config for that tenant**
   ```typescript
   const walleeConfig = await getWalleeConfigForTenant(tenantId)
   ```

3. **API creates transaction with correct Space ID**
   ```typescript
   const transactionService = new Wallee.api.TransactionService({
     space_id: walleeConfig.spaceId,  // e.g., 82593 for Driving Team
     user_id: walleeConfig.userId,
     api_secret: walleeConfig.apiSecret
   })
   ```

## Updated Endpoints

The following Wallee API endpoints now support multi-tenant configuration:

- ✅ `POST /api/wallee/create-transaction`
- ✅ `POST /api/wallee/authorize-payment`
- ✅ `POST /api/wallee/create-recurring-transaction`

Other endpoints should be updated similarly.

## Environment Variables (Default/Main Account)

For the main Simy.ch account, configure environment variables:

```env
WALLEE_SPACE_ID=82592
WALLEE_APPLICATION_USER_ID=140525
WALLEE_SECRET_KEY=ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8=
```

## Security Recommendations

1. **Store secrets securely**: Consider encrypting Wallee secret keys at rest in the database
2. **Use environment variables for main account**: Don't store main credentials in database
3. **Restrict database access**: Only backend services should read these columns
4. **Audit trail**: Log which tenant's Wallee config is being used for each transaction

## Example: Adding a New Sub-Account

```sql
-- 1. Create new tenant
INSERT INTO tenants (name, slug, is_active)
VALUES ('New Driving School', 'new-school', true)
RETURNING id;

-- 2. Get Wallee credentials from new sub-account in Wallee dashboard
-- (Settings → API Credentials → Copy Space ID, User ID, Secret Key)

-- 3. Update tenant with Wallee config
UPDATE tenants 
SET 
  wallee_space_id = 82594,        -- New sub-account Space ID
  wallee_user_id = 140527,        -- New sub-account User ID  
  wallee_secret_key = 'NEW_SECRET_KEY'  -- New sub-account Secret
WHERE slug = 'new-school';

-- 4. Test with: GET /api/wallee/test-connection?tenantId=<tenant-uuid>
```

## Testing

To test Wallee configuration for a specific tenant:

```bash
curl "http://localhost:3000/api/wallee/test-connection?tenantId=driving-team-uuid"
```

This will verify:
- Wallee credentials are valid
- Space ID is correct
- Connection to Wallee API succeeds

## Wallee Documentation Reference

See: https://app-wallee.com/de/doc/api/model/space

Key point: "Daten werden NICHT zwischen verschiedenen Spaces geteilt. Daher ist die korrekte Zuordnung jeder Transaktion zu ihrem jeweiligen Space entscheidend."

