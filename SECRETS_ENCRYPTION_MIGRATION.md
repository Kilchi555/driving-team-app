# 🔒 Secrets Encryption Migration Guide

## Problem

Your SARI and other secrets are stored in the `tenant_secrets` table as **PLAINTEXT**. They need to be **encrypted** using AES-256-CBC.

## Solution

### Step 1: Deploy ENCRYPTION_KEY to Vercel ✅

First, ensure your `ENCRYPTION_KEY` environment variable is set in Vercel:

1. Go to **Vercel Dashboard → Project Settings → Environment Variables**
2. Add new variable:
   - **Name**: `ENCRYPTION_KEY`
   - **Value**: Your 64-character hex string (32 bytes for AES-256)
   - **Environments**: Check "Production" and "Preview"
3. Redeploy your application

### Step 2: Trigger Encryption Migration

Once `ENCRYPTION_KEY` is deployed and available on your server, run the migration:

#### Option A: Using cURL (Recommended)

```bash
curl -X POST https://your-app.vercel.app/api/admin/encrypt-secrets-migration \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Option B: Using the API

```javascript
// From your admin panel
const response = await fetch('/api/admin/encrypt-secrets-migration', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
})

const result = await response.json()
console.log('Migration result:', result)
```

### Expected Response

```json
{
  "success": true,
  "message": "Encryption migration completed successfully",
  "migration": {
    "total": 24,
    "encrypted": 20,
    "skipped": 4,
    "errors": 0,
    "details": [...]
  },
  "statusBefore": {
    "total": 24,
    "encrypted": 4,
    "plaintext": 20,
    "allEncrypted": false
  },
  "statusAfter": {
    "total": 24,
    "encrypted": 24,
    "plaintext": 0,
    "allEncrypted": true
  }
}
```

## What Happens

1. **Check Encryption Status**: Script checks which secrets are already encrypted vs plaintext
2. **Encrypt Plaintext**: Uses `encryptSecret()` to encrypt all plaintext values
3. **Update Database**: Stores encrypted values (format: `iv:ciphertext`) back in database
4. **Verify**: Checks final status to confirm all secrets are encrypted

## Encrypted Format

Encrypted secrets use the format: `iv:ciphertext`

- **iv**: 32 hex characters (16 bytes) - unique for each secret
- **ciphertext**: Hex-encoded encrypted data

Example:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c0d9e8f
```

## Security Notes

⚠️ **CRITICAL**: The `ENCRYPTION_KEY` must be:
- Kept **SECRET** (never commit to repo)
- Stored in Vercel Environment Variables (not accessible to frontend)
- **NEVER CHANGED** after migration (all secrets would become unreadable)
- At least 64 hex characters (32 bytes for AES-256)

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not set"

**Solution**: Verify `ENCRYPTION_KEY` is in Vercel Environment Variables and the app has been redeployed.

### Error: "ENCRYPTION_KEY must be 32 bytes (64 hex chars)"

**Solution**: Ensure your ENCRYPTION_KEY is exactly 64 hex characters.

### Error: "Unauthorized - Only super_admin can run this migration"

**Solution**: Ensure the Bearer token belongs to a user with `super_admin` role.

### Secrets Still Can't Be Decrypted

**Solution**: Check server logs for errors, ensure:
1. Migration completed successfully (all plaintext → encrypted)
2. ENCRYPTION_KEY is same value used for encryption
3. Secrets have the `iv:ciphertext` format

## Manual Verification

To check encryption status without running migration:

```bash
# Add this endpoint to check status only (read the migration file for details)
# This would show you which secrets are encrypted vs plaintext
```

## Files Involved

- **Migration Utility**: `server/utils/encrypt-secrets-migration.ts`
  - `encryptAllPlaintextSecrets()` - Main migration function
  - `checkEncryptionStatus()` - Diagnostic function
  - `isEncrypted()` - Helper to detect encryption

- **Migration Endpoint**: `server/api/admin/encrypt-secrets-migration.post.ts`
  - HTTP endpoint to trigger migration
  - Admin-only access control

- **Encryption**: `server/utils/encryption.ts`
  - `encryptSecret()` - Encrypt plaintext
  - `decryptSecret()` - Decrypt for usage

## Next Steps

After successful migration:

1. ✅ All secrets encrypted in database
2. ✅ Decryption works automatically when loading secrets
3. ✅ SARI endpoints should now work
4. ✅ Future new secrets will be encrypted automatically

## Additional Resources

- [Encryption Implementation](./server/utils/encryption.ts)
- [Secrets Loader](./server/utils/get-tenant-secrets-secure.ts)
- [SARI Credentials Loader](./server/utils/sari-credentials-secure.ts)
