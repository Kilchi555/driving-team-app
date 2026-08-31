-- Revoke client EXECUTE on server-only DEFINER RPCs (cash, invoice numbers, login counters).
-- Keep service_role. Do not touch RLS helper functions or browser-called RPCs.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'allocate_invoice_number',
        'allocate_quote_number',
        'allocate_correspondence_number',
        'append_exam_passed_category',
        'create_cash_transaction',
        'create_office_cash_register',
        'assign_staff_to_office_cash',
        'office_cash_deposit',
        'office_cash_withdrawal',
        'top_up_cash_balance',
        'withdraw_cash_transaction',
        'generate_next_customer_number',
        'get_payments_monthly_summary',
        'record_failed_login',
        'reset_failed_login_attempts',
        'backfill_accounting_from_payments'
      ])
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;
