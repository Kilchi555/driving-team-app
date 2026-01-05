# Audit Logging Fix - Create audit_logs Table

## Problem
- Die `audit_logs` Tabelle existierte **nicht**
- Der Code in `server/utils/audit.ts` versuchte in eine nicht-existierende Tabelle zu schreiben
- Error: `ERROR Failed to log audit entry: {}`

## Lösung
- Neue Migration: `migrations/create_audit_logs_table.sql` erstellt die Tabelle mit RLS

## Schritte zum Ausführen

### 1. Supabase Dashboard SQL Editor
Gehen Sie zu: https://app.supabase.com/project/unyjaetebnaexaflpyoc/sql/new

Kopieren Sie diese SQL und führen Sie sie aus:

```sql
-- Create audit_logs table for application-wide audit logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
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

-- Create indexes
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
-- 1. Service role (API servers) can do everything
CREATE POLICY "audit_logs_service_role_all" ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Admins can read their tenant's audit logs
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

-- 3. Super admins can read all audit logs
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

-- 4. Users can read their own audit log entries
CREATE POLICY "audit_logs_authenticated_read_own" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );
```

### 2. Tabelle wird erstellt mit:

✅ **Columns:**
- `id` - UUID primary key
- `user_id` - Wer hat es gemacht (NOT NULL)
- `action` - Was wurde gemacht (z.B. 'process_payment')
- `resource_type` - Welcher Resource Typ (z.B. 'payment')
- `resource_id` - Welche ID wurde betroffen
- `status` - Erfolg/Fehler
- `error_message` - Bei Fehlern
- `details` - JSONB für Extra-Daten
- `ip_address` - Client IP
- `tenant_id` - Welcher Mandant
- `created_at`, `updated_at` - Timestamps

✅ **RLS Policies:**
1. `service_role` - Kann alles (für Server APIs)
2. `authenticated` (admin/staff) - Kann Tenant Logs lesen
3. `authenticated` (super_admin) - Kann alle Logs lesen
4. `authenticated` - Kann eigene Logs lesen

✅ **Indexes:**
- Auf user_id, action, resource_type, tenant_id, status, created_at
- Composite Index auf tenant_id + action

### 3. Code Changes

✅ Enhanced `server/utils/audit.ts`:
- Bessere Error-Messages statt nur `{}`
- Zeigt code, message, details, hint
- Success-Logging

## Test

Nach der Migration:
```
✅ Audit entry logged successfully: process_payment success
```

Statt:
```
❌ ERROR Failed to log audit entry: {}
```

## Status

- Migration erstellt: ✅
- Error-Handling verbessert: ✅
- Ready zum Ausführen: ✅
