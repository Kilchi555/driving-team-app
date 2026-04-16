-- Migration: add_invoiced_payment_status.sql
-- Entfernt den restrictiven CHECK-Constraint auf payments.payment_status
-- damit 'invoiced' und andere zukünftige Werte gesetzt werden können.

ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_payment_status_check;
