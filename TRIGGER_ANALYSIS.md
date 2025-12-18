-- ============================================================================
-- TRIGGER ZUSAMMENFASSUNG - ALLE TRIGGER IN DEINER DATENBANK
-- ============================================================================

-- WICHTIG: Diese Liste zeigt ALLE Trigger-Funktionen die in der DB existieren.
-- Nicht alle sind problematisch - viele sind notwendig!

-- ============================================================================
-- 1. UPDATED_AT AUTO-UPDATE TRIGGER (15 Stück) - ✅ UNBEDENKLICH
-- ============================================================================
-- Diese Trigger sind HARMLOS und NÜTZLICH - sie setzen automatisch updated_at = NOW()
-- Wenn jemand ein Record updated, wird der Timestamp automatisch gesetzt

FUNKTIONEN:
- set_updated_at_timestamp()                    [STANDARD FUNKTION]
- update_appointment_discounts_updated_at()     [appointment_discounts]
- update_cancellation_reasons_updated_at()      [cancellation_reasons]
- update_cash_registers_updated_at()            [cash_registers]
- update_courses_updated_at()                   [vehicles, rooms, courses, etc.]
- update_external_calendars_updated_at()        [external_calendars]
- update_general_resource_bookings_updated_at() [general_resource_bookings]
- update_general_resources_updated_at()         [general_resources]
- update_invited_customers_updated_at()         [invited_customers]
- update_password_reset_tokens_updated_at()     [password_reset_tokens]
- update_reglements_updated_at()                [reglements / tenant_reglements]
- update_staff_invitations_updated_at()         [staff_invitations]
- update_staff_working_hours_updated_at()       [staff_working_hours]
- update_updated_at_column()                    [ALLGEMEIN VERWENDETE FUNKTION]
- update_user_devices_updated_at()              [user_devices]

SOLLEN DIESE BLEIBEN? ✅ JA - Sie sind notwendig und harmlos!


-- ============================================================================
-- 2. BUSINESS LOGIC TRIGGER (3 Stück) - ⚠️ ÜBERPRÜFEN
-- ============================================================================
-- Diese Trigger führen KOMPLEXE GESCHÄFTSLOGIK aus - können zu Bugs führen!

-- A) trigger_cash_withdrawal()
--    Wann: Wenn cash_withdrawals.status = 'confirmed'
--    Was: Führt withdraw_cash_transaction() aus
--    ⚠️ WARNUNG: Könnte zu doppelten Auszahlungen führen wenn nicht richtig konfiguriert!
--    Überprüfung: Prüfe ob diese Funktion noch verwendet wird

-- B) trigger_update_cash_balance()
--    Wann: Nach INSERT/UPDATE/DELETE von cash_transactions
--    Was: Ruft update_cash_balance() für den Instructor auf
--    ⚠️ WARNUNG: Könnte zu veralteten Kassenständen führen wenn die Funktion fehlschlägt!
--    Überprüfung: Prüfe ob dein Cash-System noch aktiv ist

-- C) trigger_update_cash_balance_from_movements()
--    Wann: Nach INSERT von cash_movements
--    Was: Ruft update_cash_balance() auf
--    ⚠️ WARNUNG: Doppelter Trigger mit B? Könnte zu doppelten Updates führen!
--    EMPFEHLUNG: Checke ob beide Trigger notwendig sind oder ob einer gelöscht werden kann


-- ============================================================================
-- 3. STORAGE TRIGGER (5 Stück) - ✅ SUPABASE INTERN
-- ============================================================================
-- Diese sind von Supabase intern und sollten NICHT gelöscht werden!
-- Sie verwalten die Dateispeicher-Hierarchie

- delete_prefix_hierarchy_trigger()      [Löscht Prefix-Hierarchie]
- objects_insert_prefix_trigger()        [Erstellt Prefix beim Upload]
- objects_update_level_trigger()         [Aktualisiert Ebene]
- objects_update_prefix_trigger()        [Aktualisiert Prefix]
- prefixes_insert_trigger()              [Erstellt Prefix]
- update_updated_at_column() [storage]   [Storage-Timestamp]

SOLLEN DIESE BLEIBEN? ✅ JA - Das ist Supabase Storage Verwaltung!


-- ============================================================================
-- ZUSAMMENFASSUNG & EMPFEHLUNGEN
-- ============================================================================

✅ SOLLEN BLEIBEN (insgesamt 20 Trigger):
   - Alle 15 UPDATED_AT Trigger
   - Alle 5 Storage Trigger
   GRUND: Sie sind notwendig und harmlos

⚠️ ZU ÜBERPRÜFEN (insgesamt 3 Trigger):
   - trigger_cash_withdrawal()
   - trigger_update_cash_balance()
   - trigger_update_cash_balance_from_movements()
   
   FRAGEN:
   1. Ist dein Cash-System noch aktiv?
   2. Brauchst du alle 3 oder können sie gelöscht werden?
   3. Gibt es Duplikate (B und C machen ähnliches)?

❌ SOLLEN GELÖSCHT WERDEN:
   - Momentan NICHTS! Alle sind entweder notwendig oder hilfreich.


-- ============================================================================
-- CASH-SYSTEM DETAILANALYSE
-- ============================================================================
-- Diese 3 Trigger sind miteinander verbunden und könnten sich ÜBERSCHNEIDEN:

-- Trigger 1: trigger_update_cash_balance()
--   - Wann: AFTER INSERT/UPDATE/DELETE auf cash_transactions
--   - Action: PERFORM update_cash_balance(NEW.instructor_id)
--   - Nutzen: Aktualisiert Kassenstand wenn Transaktionen sich ändern

-- Trigger 2: trigger_update_cash_balance_from_movements()
--   - Wann: AFTER INSERT auf cash_movements
--   - Action: PERFORM update_cash_balance(NEW.instructor_id)
--   - Nutzen: Aktualisiert Kassenstand wenn Bewegungen hinzugefügt werden
--   ⚠️ PROBLEM: Ist das anders als cash_transactions? Oder Duplikat?

-- Trigger 3: trigger_cash_withdrawal()
--   - Wann: BEFORE UPDATE auf cash_withdrawals (status -> 'confirmed')
--   - Action: PERFORM withdraw_cash_transaction(NEW.id)
--   - Nutzen: Verarbeitet automatisch Auszahlungen

FRAGE FÜR DICH:
- Hast du noch ein aktives Cash-Register-System?
- Oder ist das outdated?
- Falls ja: Sind alle 3 Trigger notwendig oder Duplikate?


-- ============================================================================
-- WIE DU VORGEHEN SOLLTEST
-- ============================================================================

1. UPDATED_AT Trigger:
   ✅ Alle lassen wie sie sind - vollständig harmlos

2. Storage Trigger:
   ✅ Alle lassen wie sie sind - Supabase intern

3. Cash Trigger:
   ⚠️ Überprüfen:
   
   a) Fragst dich: "Nutze ich noch das Cash-Register System?"
      - JA? → Alle 3 brauchen wahrscheinlich zu bleiben
      - NEIN? → Alle 3 sollten gelöscht werden
   
   b) Falls JA: Frag ob trigger_update_cash_balance() und 
      trigger_update_cash_balance_from_movements() Duplikate sind
      - Falls JA: Eine davon löschen


-- ============================================================================
-- ABSCHLIESSENDE FRAGEN AN DICH
-- ============================================================================

1. ❓ Ist dein Cash-Register-System noch aktiv?
2. ❓ Verwendest du noch cash_transactions und cash_movements?
3. ❓ Gibt es noch automated cash withdrawals?
4. ❓ Oder ist das alles legacy-code der nicht mehr genutzt wird?

ANTWORTE JA/NEIN und ich kann dir sagen welche Trigger gelöscht werden können!

