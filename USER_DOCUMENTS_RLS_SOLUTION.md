# User Documents RLS - Final Solution

## Problem
Staff/Admin konnten keine Dokumente für Studenten hochladen. Die RLS Policy auf `user_documents` blockierte INSERTs.

## Root Cause
Die RLS Policy versuchte die Rolle aus `auth.jwt() ->> 'role'` zu lesen, aber das Supabase JWT enthält standardmäßig keine Custom Claims für die Rolle aus der `users`-Tabelle.

## Solution

### 1. Code-Änderung
**Datei:** `pages/customers.vue`
- `currentUser` prop wird jetzt an `EnhancedStudentModal` übergeben
- Dies stellt sicher, dass die `tenant_id` des Staff-Members beim Upload verwendet wird

### 2. RLS Helper Functions
Zwei SECURITY DEFINER Funktionen wurden erstellt, die die `users`-Tabelle abfragen und die RLS umgehen:

```sql
-- Gibt die Business-User-ID zurück
CREATE FUNCTION get_current_user_id() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
-- SELECT id FROM users WHERE auth_user_id = auth.uid()

-- Prüft ob User Staff/Admin im Tenant ist
CREATE FUNCTION is_staff_or_admin_in_tenant(check_tenant_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
-- Prüft role IN ('admin', 'staff') AND tenant_id = check_tenant_id
```

### 3. RLS Policies
Vier Policies verwenden die Helper-Funktionen:

#### SELECT Policy
```sql
USING (
  deleted_at IS NULL 
  AND (
    user_id = get_current_user_id()  -- Eigene Dokumente
    OR 
    is_staff_or_admin_in_tenant(tenant_id)  -- Staff/Admin im Tenant
  )
)
```

#### INSERT Policy
```sql
WITH CHECK (
  user_id = get_current_user_id()  -- Eigene Dokumente
  OR 
  is_staff_or_admin_in_tenant(tenant_id)  -- Staff/Admin im Tenant
)
```

#### UPDATE & DELETE Policies
Gleiche Logik wie SELECT/INSERT.

## Security Model

### ✅ Was funktioniert:
1. **Clients** können nur **eigene** Dokumente sehen/bearbeiten
2. **Staff/Admin** können **alle** Dokumente **im eigenen Tenant** sehen/bearbeiten
3. **Kein Cross-Tenant-Zugriff** möglich
4. **Soft-Delete** wird respektiert (deleted_at IS NULL)

### ⚠️ Testing-Hinweis:
- SQL Editor läuft als `service_role` (nicht als authenticated user)
- `auth.uid()` ist `null` im SQL Editor → Tests schlagen fehl
- **Das ist normal!** Die RLS funktioniert korrekt in der App mit authenticated users

## Files Changed
1. `pages/customers.vue` - Added `:current-user="currentUser"` prop
2. `components/EnhancedStudentModal.vue` - Removed debug logs
3. Database: Helper functions and RLS policies created

## SQL Migration File
Die finale Lösung ist in: `fix_user_documents_rls_final_simple.sql` (falls re-create nötig)

## Verification
✅ Upload tested successfully:
- Staff user can upload documents for students
- Document saved to storage
- Document record saved to database
- RLS allows the operation

