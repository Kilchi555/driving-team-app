-- Migration: Encrypt all plaintext secrets in tenant_secrets table
-- Date: 2026-02-06
-- 
-- This migration encrypts all plaintext secrets in the tenant_secrets table.
-- Plaintext secrets are those that don't follow the "iv:ciphertext" format.
-- 
-- NOTE: This requires ENCRYPTION_KEY to be set in your environment.
-- The encryption happens on the client-side (via the application layer).
-- This SQL file serves as a template for the migration logic.

-- Step 1: Check current status of secrets (diagnostic query)
SELECT 
  id,
  tenant_id,
  secret_type,
  secret_value,
  CASE 
    WHEN secret_value LIKE '%:%' AND LENGTH(SPLIT_PART(secret_value, ':', 1)) = 32 
    THEN 'encrypted'
    ELSE 'plaintext'
  END as encryption_status,
  created_at,
  updated_at
FROM tenant_secrets
WHERE secret_type IN ('SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD')
ORDER BY tenant_id, secret_type;

-- Step 2: (This would be handled by application code, not pure SQL)
-- The application will:
-- 1. Read all plaintext secrets (those not in "iv:ciphertext" format)
-- 2. Encrypt each using AES-256-CBC with the ENCRYPTION_KEY
-- 3. Update the secret_value column with encrypted data in "iv:ciphertext" format

-- Step 3: After application migration runs, verify all secrets are encrypted
SELECT 
  COUNT(*) as total_secrets,
  SUM(CASE 
    WHEN secret_value LIKE '%:%' AND LENGTH(SPLIT_PART(secret_value, ':', 1)) = 32 
    THEN 1 
    ELSE 0 
  END) as encrypted_count,
  SUM(CASE 
    WHEN NOT (secret_value LIKE '%:%' AND LENGTH(SPLIT_PART(secret_value, ':', 1)) = 32)
    THEN 1 
    ELSE 0 
  END) as plaintext_count
FROM tenant_secrets;

-- If you need to MANUALLY encrypt a specific secret (for testing):
-- UPDATE tenant_secrets 
-- SET secret_value = 'iv_hex:ciphertext_hex'
-- WHERE id = 'specific_id'
-- AND secret_type = 'SARI_CLIENT_ID';
