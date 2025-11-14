-- Check tenant payment settings (mit JSONB cast)
SELECT 
  (setting_value::jsonb)->'automatic_authorization_hours_before' as auth_hours,
  (setting_value::jsonb)->'automatic_payment_hours_before' as payment_hours,
  setting_value::jsonb
FROM tenant_settings
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND setting_key = 'payment_settings';
