-- Admin Hierarchy & Soft Delete System Migration
-- Creates a hierarchical admin system with soft deletes

-- 1. Extend users table with admin hierarchy and soft delete
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_primary_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 2. Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level) WHERE admin_level IS NOT NULL;

-- 3. Update existing admin users to set admin levels
DO $$
DECLARE
    tenant_record RECORD;
    first_admin_id UUID;
BEGIN
    -- For each tenant, set the first admin as primary admin
    FOR tenant_record IN 
        SELECT DISTINCT tenant_id 
        FROM users 
        WHERE role = 'admin' AND tenant_id IS NOT NULL
    LOOP
        -- Find the first admin for this tenant (oldest by created_at)
        SELECT id INTO first_admin_id
        FROM users 
        WHERE tenant_id = tenant_record.tenant_id 
          AND role = 'admin'
          AND deleted_at IS NULL
        ORDER BY created_at ASC 
        LIMIT 1;
        
        IF first_admin_id IS NOT NULL THEN
            -- Set as primary admin
            UPDATE users 
            SET 
                admin_level = 'primary_admin',
                is_primary_admin = TRUE
            WHERE id = first_admin_id;
            
            -- Set other admins as sub admins
            UPDATE users 
            SET 
                admin_level = 'sub_admin',
                is_primary_admin = FALSE,
                created_by = first_admin_id
            WHERE tenant_id = tenant_record.tenant_id 
              AND role = 'admin' 
              AND id != first_admin_id
              AND deleted_at IS NULL;
              
            RAISE NOTICE 'Tenant %: Primary admin set, % sub-admins updated', 
                tenant_record.tenant_id, 
                (SELECT COUNT(*) FROM users WHERE tenant_id = tenant_record.tenant_id AND admin_level = 'sub_admin');
        END IF;
    END LOOP;
END $$;

-- 4. Create function for soft delete with audit trail
CREATE OR REPLACE FUNCTION soft_delete_user(
    user_id_to_delete UUID,
    deleting_user_id UUID,
    reason TEXT DEFAULT 'Admin action'
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user RECORD;
    deleting_user RECORD;
    can_delete BOOLEAN := FALSE;
BEGIN
    -- Get target user info
    SELECT * INTO target_user 
    FROM users 
    WHERE id = user_id_to_delete AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or already deleted';
    END IF;
    
    -- Get deleting user info
    SELECT * INTO deleting_user 
    FROM users 
    WHERE id = deleting_user_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleting user not found or deleted';
    END IF;
    
    -- Check deletion permissions
    IF deleting_user.role = 'master_admin' THEN
        -- Master admin can delete anyone
        can_delete := TRUE;
    ELSIF deleting_user.admin_level = 'primary_admin' AND target_user.admin_level = 'sub_admin' THEN
        -- Primary admin can delete sub admins in same tenant
        IF deleting_user.tenant_id = target_user.tenant_id THEN
            can_delete := TRUE;
        END IF;
    ELSIF deleting_user.admin_level = 'primary_admin' AND target_user.role IN ('client', 'staff') THEN
        -- Primary admin can delete regular users in same tenant
        IF deleting_user.tenant_id = target_user.tenant_id THEN
            can_delete := TRUE;
        END IF;
    ELSIF deleting_user.admin_level = 'sub_admin' AND target_user.role IN ('client', 'staff') THEN
        -- Sub admin can delete regular users in same tenant
        IF deleting_user.tenant_id = target_user.tenant_id THEN
            can_delete := TRUE;
        END IF;
    END IF;
    
    -- Prevent self-deletion of primary admin
    IF target_user.is_primary_admin = TRUE AND deleting_user.role != 'master_admin' THEN
        can_delete := FALSE;
    END IF;
    
    IF NOT can_delete THEN
        RAISE EXCEPTION 'Insufficient permissions to delete this user';
    END IF;
    
    -- Perform soft delete
    UPDATE users 
    SET 
        deleted_at = NOW(),
        deleted_by = deleting_user_id,
        delete_reason = reason,
        is_active = FALSE
    WHERE id = user_id_to_delete;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to restore soft deleted user
CREATE OR REPLACE FUNCTION restore_deleted_user(
    user_id_to_restore UUID,
    restoring_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user RECORD;
    restoring_user RECORD;
    can_restore BOOLEAN := FALSE;
BEGIN
    -- Get target user info
    SELECT * INTO target_user 
    FROM users 
    WHERE id = user_id_to_restore AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or not deleted';
    END IF;
    
    -- Get restoring user info
    SELECT * INTO restoring_user 
    FROM users 
    WHERE id = restoring_user_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Restoring user not found';
    END IF;
    
    -- Check restore permissions (similar to delete permissions)
    IF restoring_user.role = 'master_admin' THEN
        can_restore := TRUE;
    ELSIF restoring_user.admin_level = 'primary_admin' THEN
        IF restoring_user.tenant_id = target_user.tenant_id THEN
            can_restore := TRUE;
        END IF;
    END IF;
    
    IF NOT can_restore THEN
        RAISE EXCEPTION 'Insufficient permissions to restore this user';
    END IF;
    
    -- Restore user
    UPDATE users 
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        delete_reason = NULL,
        is_active = TRUE
    WHERE id = user_id_to_restore;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update RLS policies to respect soft deletes
DROP POLICY IF EXISTS "users_tenant_isolation" ON users;

CREATE POLICY "users_tenant_isolation" ON users
    FOR ALL TO authenticated
    USING (
        -- Master admin sees all non-deleted users
        (auth.jwt() ->> 'role')::text = 'master_admin' AND deleted_at IS NULL
        OR
        -- Primary/Sub admins see users in their tenant (non-deleted)
        (
            (auth.jwt() ->> 'role')::text IN ('admin') 
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
            AND deleted_at IS NULL
        )
        OR
        -- Regular users see only themselves (non-deleted)
        (
            auth_user_id = auth.uid() 
            AND deleted_at IS NULL
        )
    );

-- 7. Create view for active users only
CREATE OR REPLACE VIEW active_users AS
SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    role,
    admin_level,
    is_primary_admin,
    is_active,
    tenant_id,
    created_at,
    created_by
FROM users 
WHERE deleted_at IS NULL;

-- 8. Create audit log table for user management actions
CREATE TABLE IF NOT EXISTS user_management_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- 'soft_delete', 'restore', 'role_change', etc.
    target_user_id UUID NOT NULL REFERENCES users(id),
    performed_by UUID NOT NULL REFERENCES users(id),
    
    -- Context
    reason TEXT,
    old_values JSONB,
    new_values JSONB,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    tenant_id UUID REFERENCES tenants(id)
);

-- 9. Create index for audit log
CREATE INDEX IF NOT EXISTS idx_user_audit_target ON user_management_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_performer ON user_management_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_user_audit_created ON user_management_audit(created_at);

-- 10. Create function to log user management actions
CREATE OR REPLACE FUNCTION log_user_management_action(
    action_type VARCHAR(50),
    target_id UUID,
    performer_id UUID,
    reason_text TEXT DEFAULT NULL,
    old_vals JSONB DEFAULT NULL,
    new_vals JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    performer_tenant UUID;
BEGIN
    -- Get performer's tenant
    SELECT tenant_id INTO performer_tenant 
    FROM users 
    WHERE id = performer_id;
    
    -- Insert audit record
    INSERT INTO user_management_audit (
        action,
        target_user_id,
        performed_by,
        reason,
        old_values,
        new_values,
        tenant_id
    ) VALUES (
        action_type,
        target_id,
        performer_id,
        reason_text,
        old_vals,
        new_vals,
        performer_tenant
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== ADMIN HIERARCHY & SOFT DELETE SYSTEM ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin Levels:';
    RAISE NOTICE '• master_admin: Can manage all users across all tenants';
    RAISE NOTICE '• primary_admin: Can manage all users in their tenant (cannot be deleted by sub-admins)';
    RAISE NOTICE '• sub_admin: Can manage regular users in their tenant';
    RAISE NOTICE '';
    RAISE NOTICE 'Soft Delete Features:';
    RAISE NOTICE '• All deletes are soft (deleted_at timestamp)';
    RAISE NOTICE '• Audit trail with reason and deleting user';
    RAISE NOTICE '• Restore functionality available';
    RAISE NOTICE '• RLS policies respect soft deletes';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '• SELECT soft_delete_user(user_id, deleting_user_id, ''reason'');';
    RAISE NOTICE '• SELECT restore_deleted_user(user_id, restoring_user_id);';
    RAISE NOTICE '• Use active_users view for normal queries';
    RAISE NOTICE '';
    RAISE NOTICE 'Primary Admins Set: %', (
        SELECT COUNT(*) FROM users WHERE is_primary_admin = TRUE
    );
    RAISE NOTICE 'Sub Admins Set: %', (
        SELECT COUNT(*) FROM users WHERE admin_level = 'sub_admin'
    );
END $$;
