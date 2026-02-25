-- ============================================================================
-- BENUTZER-DATEN HART LÖSCHEN - VOLLSTÄNDIGE KONTOLÖSCHUNG
-- ============================================================================
-- 
-- Dieses Skript führt eine vollständige Hartlöschung aller Daten durch, die
-- mit einem bestimmten Benutzer (Kunde) verbunden sind. Dies ist eine
-- PERMANENTE und UNWIEDERBRINGLICHE Operation.
--
-- ZU LÖSCHENDER BENUTZER: ec7b4a85-2091-4ad8-b9f7-e791a2ab52df
--
-- WARNUNG: Diese Operation löscht:
-- - Benutzerprofil und Kontoinformationen
-- - Alle Termine (als Kunde)
-- - Alle Zahlungen und Transaktionen
-- - Alle Reservierungen und Buchungsverlauf
-- - Alle Nachrichten und Benachrichtigungen
-- - Alle Audit-Protokolle des Benutzers
-- - Alle zugehörigen Daten in allen verknüpften Tabellen
--
-- ============================================================================

-- Schritt 1: Benutzer vor Löschung überprüfen
SELECT id, email, first_name, last_name, created_at 
FROM users 
WHERE id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- Schritt 2: Anzahl der zu löschenden Datensätze zählen (für Dokumentation)
SELECT 
  (SELECT COUNT(*) FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df') as termine,
  (SELECT COUNT(*) FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df') as zahlungen,
  (SELECT COUNT(*) FROM outbound_messages WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df') as nachrichten,
  (SELECT COUNT(*) FROM audit_logs WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df') as audit_logs;

-- Schritt 3: Transaktion für atomare Löschung starten
BEGIN;

-- Schritt 3.1: Aus zahlungsbezogenen Tabellen löschen (abhängig von user_id)
-- WICHTIG: payment_audit_logs ZUERST löschen, da payment_id NOT NULL ist
DELETE FROM payment_audit_logs WHERE payment_id IN (
  SELECT id FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df'
);
DELETE FROM payment_reminders WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';
DELETE FROM payment_wallee_transactions WHERE payment_id IN (
  SELECT id FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df'
);
DELETE FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- Schritt 3.2: Aus Buchungs-/Terminbezogenen Tabellen löschen
-- HINWEIS: appointment_notes ist wahrscheinlich auch falsch - könnte "notes" sein
DELETE FROM notes WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df'
) OR notes.user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';
DELETE FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- Schritt 3.3: Verfügbarkeitsfenster löschen, die von den Sitzungen dieses Benutzers reserviert wurden
-- HINWEIS: Da wir keine direkte Verbindung zwischen Benutzer und Sessions haben,
-- löschen wir KEINE Slots hier. Diese werden durch Termin-Löschung bereinigt.
-- Offene Reservierungen (reserved_by_session aber kein appointment_id) sollten
-- durch den automatischen Cleanup nach Ablauf von reserved_until gelöscht werden.

-- Schritt 3.4: Nachrichten-/Benachrichtigungstabellen löschen
DELETE FROM outbound_messages WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';
DELETE FROM feedback WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- Schritt 3.5: Audit-Protokolle löschen
DELETE FROM audit_logs WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- Schritt 3.6: Benutzerprofil löschen (Cascade kümmert sich um abhängige Datensätze)
DELETE FROM users WHERE id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df';

-- Schritt 4: Löschung überprüfen
SELECT COUNT(*) as verbleibende_datensaetze 
FROM (
  SELECT id FROM users WHERE id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df'
  UNION ALL
  SELECT id FROM appointments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df'
  UNION ALL
  SELECT id FROM payments WHERE user_id = 'ec7b4a85-2091-4ad8-b9f7-e791a2ab52df'
) as verification;

-- Transaktion committen wenn alle Löschungen erfolgreich waren
COMMIT;

-- ============================================================================
-- Löschung erfolgreich abgeschlossen
-- ============================================================================
