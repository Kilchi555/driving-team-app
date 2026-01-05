# Audit Logging Fix - Complete Solution

## Problem Discovered

```
ERROR Failed to log audit entry - database error: { code: '23503',
  message: 'insert or update on table "audit_logs" violates foreign key constraint "audit_logs_user_id_fkey"',
  details: 'Key (user_id)=(99fceb0b-9aa5-4358-bb30-4301f022e61b) is not present in table "users".'
}
```

**Root Cause:** The code was trying to insert `auth.uid()` (99fceb0b...) into `user_id` column, but the Foreign Key expected `users.id` (89f9ae5d...).

## Solution

### 1. Database Schema Change (SQL Migration)

The `audit_logs` table now has:
- `user_id` - NULLABLE (Foreign Key to users.id)
- `auth_user_id` - Store auth.uid() when user lookup hasn't happened yet

**Key Changes:**
- `user_id` is now NULLABLE (not NOT NULL)
- Added `auth_user_id` column for audit logs before user lookup
- Both columns indexed for performance

### 2. Code Changes

#### `migrations/create_audit_logs_table.sql`
- Removed `NOT NULL` constraint from `user_id`
- Added `auth_user_id UUID` column
- Indexes on both user_id and auth_user_id
- 4 RLS Policies with service_role full access

#### `server/utils/audit.ts`
- AuditLogEntry interface now has optional user_id and auth_user_id
- At least one must be provided (user_id OR auth_user_id)
- logAudit accepts both

#### `server/api/payments/process.post.ts`
- Early auth failures: use only `auth_user_id`
- After user lookup: use `userData.id` (users.id)
- Error handling: use `userData?.id` if available
- All logs include `tenant_id`

## How to Execute SQL Migration

### Step 1: Go to Supabase Dashboard SQL Editor
https://app.supabase.com/project/unyjaetebnaexaflpyoc/sql/new

### Step 2: Copy and Execute This SQL

```sql
-- Create audit_logs table for application-wide audit logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  auth_user_id UUID,
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  
  -- Status & Result
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'error', 'started', 'failed', 'partial', 'skipped')),
  error_message TEXT,
  
  -- Additional Data
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  
  -- Tenant Information
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON public.audit_logs(tenant_id, action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "audit_logs_service_role_all" ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "audit_logs_authenticated_read_tenant" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'staff', 'tenant_admin')
        AND is_active = true
    )
  );

CREATE POLICY "audit_logs_super_admin_read_all" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

CREATE POLICY "audit_logs_authenticated_read_own" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );
```

## Audit Log Data Flow

### Early Stage (Auth/Rate Limit)
```
logAudit({
  auth_user_id: "99fceb0b-...",  // auth.uid()
  user_id: null,                  // Not yet known
  action: "process_payment",
  status: "failed",
  error_message: "Authentication required"
})
```

### After User Lookup
```
logAudit({
  user_id: "89f9ae5d-...",         // users.id ✅
  auth_user_id: "99fceb0b-...",   // Keep for reference
  action: "process_payment",
  status: "success",
  tenant_id: "64259d68-...",
  details: { transaction_id: 462470568 }
})
```

### Error Audit Log
```
logAudit({
  user_id: userData?.id,           // May be null if user lookup failed
  auth_user_id: authenticatedUserId,  // Always have this
  action: "process_payment",
  status: "error",
  error_message: "Payment not found"
})
```

## Expected Results After Migration

✅ **Before:**
```
ERROR Failed to log audit entry: {}
ERROR Failed to log audit entry - database error: { code: '23503', ... }
```

✅ **After:**
```
Audit entry logged successfully: process_payment success
Audit entry logged successfully: process_payment error
```

## Status

- ✅ Code committed and pushed
- ✅ Migration file ready
- ⏳ SQL needs to be executed in Supabase Dashboard

## Next Steps

1. **RUN THE SQL** in Supabase Dashboard
2. **Restart dev server** to pick up changes
3. **Test payment flow** - audit logs should write without errors
4. **Verify logs** - Check audit_logs table for entries

## Verification Query

After running migration, you can check:

```sql
SELECT 
  id,
  user_id,
  auth_user_id,
  action,
  status,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```
