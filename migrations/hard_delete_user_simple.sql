-- BENUTZER HART LÖSCHEN - EINFACHE VERSION
-- USER ID: ec7b4a85-2091-4ad8-b9f7-e791a2ab52df

BEGIN;

DELETE FROM payment_audit_logs WHERE payment_id IN (SELECT id FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df');
DELETE FROM payment_wallee_transactions WHERE payment_id IN (SELECT id FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df');
DELETE FROM payment_reminders WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';
DELETE FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

DELETE FROM discount_sales WHERE appointment_id IN (SELECT id FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df');
DELETE FROM product_sales WHERE appointment_id IN (SELECT id FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df');
DELETE FROM notes WHERE appointment_id IN (SELECT id FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df');
DELETE FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

DELETE FROM outbound_messages WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';
DELETE FROM audit_logs WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- WICHTIG: locations hat foreign key zu users, aber nur wenn dieser Benutzer Owner ist
-- Lösche locations die diesem Benutzer gehören
DELETE FROM locations WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

DELETE FROM users WHERE id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

COMMIT;
