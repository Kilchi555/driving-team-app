-- ANALYSE: Wallee Payment Tokenization - Status & Empfehlungen

/*
AKTUELLER STATUS:
=================

1. ✅ BEREITS VORHANDEN:
   - save-payment-token.post.ts: Speichert Tokens nach erfolgreicher Zahlung
   - useWalleeTokenization.ts Composable mit Funktionen für:
     * getCustomerPaymentMethods() - gespeicherte Zahlungsmethoden abrufen
     * createRecurringTransaction() - wiederkehrende Zahlungen
     * hasSavedPaymentMethods() - prüfen ob Token vorhanden
   - save-payment-token wird bereits im webhook.post.ts aufgerufen (line 1139)
   - autoConfirmationEnabled: true bereits in process.post.ts & process-public.post.ts

2. ❌ FEHLEND:
   - /api/wallee/get-customer-payment-methods.post.ts (wird im Composable aufgerufen, existiert aber nicht!)
   - /api/wallee/create-recurring-transaction.post.ts (wird im Composable aufgerufen, existiert aber nicht!)
   - Integration mit gespeicherten Tokens in process.post.ts
   - customerId wurde entfernt ("was blocking payment methods")
   - tokenizationMode wurde entfernt ("not needed without customerId")

3. PROBLEM DAMALS:
   - TWINT: Erlaubt keine Token-Speicherung (Datenschutz/Regulierung)
   - customerId: Blockierte bestimmte Zahlungsmethoden
   - Workaround: Wurde alles deaktiviert

EMPFEHLUNGEN ZUM REAKTIVIEREN:
==============================

Option A: SCHNELL (nur Karten/Banktransfers)
   1. TokenizationMode aktivieren ABER mit Whitelist:
      - Erlauben für: CARD, SEPA, IDEAL (keine TWINT)
      - Wallee SDK prüft automatisch, ob Methode tokenisierbar ist
   
   2. customerId wieder aktivieren (mit pseudonyme ID statt Email)
      - Format: dt-{tenantId}-{userId} (siehe useWalleeTokenization.ts line 103-105)
      - Das blockiert Zahlungsmethoden nicht mehr
   
   3. Endpoints implementieren:
      - /api/wallee/get-customer-payment-methods.post.ts
      - /api/wallee/create-recurring-transaction.post.ts
   
   4. Frontend Integration:
      - In Checkout: "Saved payment methods" Dropdown zeigen
      - Option zum Speichern nach Zahlung anbieten

Option B: VORSICHTIG (nur Opt-in)
   - Token-Speicherung nur mit Checkbox
   - "Diese Zahlungsart für zukünftige Zahlungen speichern?"
   - Komplexer aber sicherer für Compliance

TECHNISCHE DETAILS:
==================

Wallee SDK TokenizationMode:
  - TokenizationMode.FORCED - immer speichern
  - TokenizationMode.AUTOMATIC - Wallee entscheidet je nach Methode
  - TokenizationMode.DISABLED - nie speichern

Die beste Option ist: TokenizationMode.AUTOMATIC
Das lässt Wallee intelligent entscheiden:
  - CARD: speichern ✅
  - SEPA: speichern ✅
  - TWINT: nicht speichern (Wallee blockiert) ✅
  - iDEAL: speichern ✅

MIGRATIONS / ÄNDERUNGEN:
=======================

1. Create Endpoints (Priorität: HOCH)
   - get-customer-payment-methods.post.ts (50 Zeilen)
   - create-recurring-transaction.post.ts (100 Zeilen)

2. Update process.post.ts & process-public.post.ts (Priorität: MITTEL)
   - customerId aktivieren (mit pseudonymer ID)
   - tokenizationMode: 'AUTOMATIC' hinzufügen
   - paymentMethodInformation hinzufügen (optional)

3. Save Token nach Zahlung (Priorität: NIEDRIG)
   - Bereits aktiv! webhook.post.ts ruft save-payment-token auf
   - Nur sicherstellen, dass es funktioniert

4. Frontend (Priorität: NIEDRIG)
   - Saved Methods UI (optional, später)
   - Checkbox zum Speichern (optional, später)

SICHERHEIT/COMPLIANCE:
=====================

✅ PCI-DSS: Wallee speichert Tokens, nicht wir
✅ GDPR: Nur gespeicherte Payment Methods pro Kunde
✅ SCA/3D-Secure: Wallee handhabt automatisch
✅ TWINT-Datenschutz: Wallee respektiert automatisch

KOSTEN:
=======

Wallee-Seite: Kostenlos (enthalten in Standard-Setup)
Dev-Aufwand: ~4-6 Stunden für komplette Integration
*/

-- QUICK START: Was wir tun sollten
-- 1. Endpoints implementieren
-- 2. process.post.ts & process-public.post.ts updaten
-- 3. Testen mit Karte (VISA/Mastercard)
-- 4. Verify dass TWINT NICHT tokenisiert wird
