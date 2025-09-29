-- PostgreSQL Functions for Office Cash Register Management

-- Function: Deposit money into office cash register
CREATE OR REPLACE FUNCTION office_cash_deposit(
    p_register_id UUID,
    p_amount_rappen INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER := 0;
    v_new_balance INTEGER;
    v_performed_by UUID;
    v_register_exists BOOLEAN;
BEGIN
    -- Get current user
    SELECT u.id INTO v_performed_by
    FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL;
    
    IF v_performed_by IS NULL THEN
        RAISE EXCEPTION 'User not found or not active';
    END IF;
    
    -- Check if register exists and user has access
    SELECT EXISTS(
        SELECT 1 FROM office_cash_registers ocr
        JOIN users u ON u.tenant_id = ocr.tenant_id
        WHERE ocr.id = p_register_id
          AND u.id = v_performed_by
          AND ocr.is_active = TRUE
    ) INTO v_register_exists;
    
    IF NOT v_register_exists THEN
        RAISE EXCEPTION 'Office cash register not found or access denied';
    END IF;
    
    -- Get current balance or create new balance record
    SELECT current_balance_rappen INTO v_current_balance
    FROM cash_balances
    WHERE office_cash_register_id = p_register_id;
    
    IF v_current_balance IS NULL THEN
        -- Create new balance record
        INSERT INTO cash_balances (
            office_cash_register_id,
            instructor_id,
            register_type,
            current_balance_rappen
        ) VALUES (
            p_register_id,
            v_performed_by,
            'office',
            p_amount_rappen
        );
        
        v_current_balance := 0;
        v_new_balance := p_amount_rappen;
    ELSE
        -- Update existing balance
        UPDATE cash_balances 
        SET current_balance_rappen = current_balance_rappen + p_amount_rappen,
            updated_at = NOW()
        WHERE office_cash_register_id = p_register_id;
        
        v_new_balance := v_current_balance + p_amount_rappen;
    END IF;
    
    -- Create movement record
    INSERT INTO cash_movements (
        office_cash_register_id,
        instructor_id,
        register_type,
        movement_type,
        amount_rappen,
        balance_before_rappen,
        balance_after_rappen,
        performed_by,
        notes
    ) VALUES (
        p_register_id,
        v_performed_by,
        'office',
        'deposit',
        p_amount_rappen,
        v_current_balance,
        v_new_balance,
        v_performed_by,
        p_notes
    );
    
    RAISE NOTICE 'Office cash deposit successful: % Rappen', p_amount_rappen;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Withdraw money from office cash register
CREATE OR REPLACE FUNCTION office_cash_withdrawal(
    p_register_id UUID,
    p_amount_rappen INTEGER,
    p_notes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER := 0;
    v_new_balance INTEGER;
    v_performed_by UUID;
    v_register_exists BOOLEAN;
BEGIN
    -- Get current user
    SELECT u.id INTO v_performed_by
    FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL;
    
    IF v_performed_by IS NULL THEN
        RAISE EXCEPTION 'User not found or not active';
    END IF;
    
    -- Check if register exists and user has access
    SELECT EXISTS(
        SELECT 1 FROM office_cash_registers ocr
        JOIN users u ON u.tenant_id = ocr.tenant_id
        WHERE ocr.id = p_register_id
          AND u.id = v_performed_by
          AND ocr.is_active = TRUE
    ) INTO v_register_exists;
    
    IF NOT v_register_exists THEN
        RAISE EXCEPTION 'Office cash register not found or access denied';
    END IF;
    
    -- Get current balance
    SELECT current_balance_rappen INTO v_current_balance
    FROM cash_balances
    WHERE office_cash_register_id = p_register_id;
    
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'No balance record found for this office cash register';
    END IF;
    
    -- Check if sufficient funds
    IF v_current_balance < p_amount_rappen THEN
        RAISE EXCEPTION 'Insufficient funds. Available: % Rappen, Requested: % Rappen', 
            v_current_balance, p_amount_rappen;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount_rappen;
    
    -- Update balance
    UPDATE cash_balances 
    SET current_balance_rappen = v_new_balance,
        updated_at = NOW()
    WHERE office_cash_register_id = p_register_id;
    
    -- Create movement record
    INSERT INTO cash_movements (
        office_cash_register_id,
        instructor_id,
        register_type,
        movement_type,
        amount_rappen,
        balance_before_rappen,
        balance_after_rappen,
        performed_by,
        notes
    ) VALUES (
        p_register_id,
        v_performed_by,
        'office',
        'withdrawal',
        p_amount_rappen,
        v_current_balance,
        v_new_balance,
        v_performed_by,
        p_notes
    );
    
    RAISE NOTICE 'Office cash withdrawal successful: % Rappen', p_amount_rappen;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get office cash register balance
CREATE OR REPLACE FUNCTION get_office_cash_balance(p_register_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER := 0;
BEGIN
    SELECT COALESCE(current_balance_rappen, 0) INTO v_balance
    FROM cash_balances
    WHERE office_cash_register_id = p_register_id;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== OFFICE CASH FUNCTIONS CREATED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '• office_cash_deposit(register_id, amount_rappen, notes)';
    RAISE NOTICE '• office_cash_withdrawal(register_id, amount_rappen, notes)';
    RAISE NOTICE '• get_office_cash_balance(register_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage from frontend:';
    RAISE NOTICE '• supabase.rpc(''office_cash_deposit'', {p_register_id: id, p_amount_rappen: 5000, p_notes: ''note''})';
    RAISE NOTICE '• supabase.rpc(''office_cash_withdrawal'', {p_register_id: id, p_amount_rappen: 2000, p_notes: ''reason''})';
    RAISE NOTICE '';
END $$;
