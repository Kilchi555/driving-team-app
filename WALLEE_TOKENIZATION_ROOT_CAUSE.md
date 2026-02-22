-- ANALYSE: Warum Tokenization damals fehlgeschlagen ist

/*
TIMELINE DER PROBLEME:
======================

1. INITIAL (Mid-December 2025):
   ✅ Token Storage implementiert
   ✅ tokenizationMode: FORCE
   ✅ customerId: dt-{tenantId}-{userId}
   
   ❌ RESULTAT: Payments bei TWINT & bestimmten Karten FAILED
   
   GRUND: TokenizationMode.FORCE bedeutet:
   - "Token-Speicherung ist ERFORDERLICH"
   - Wenn Zahlungsmethode Tokenization nicht unterstützt → Zahlung FAILED
   - TWINT unterstützt keine Token-Speicherung → ALLE TWINT-Payments FAILED

2. VERSUCH 1 (Jan 12, 17:36 UTC):
   ✅ Changed: TokenizationMode.FORCE → TokenizationMode.ALLOW
   
   ABER: Payments STILL FAILING!
   
   GRUND: customerId war FALSCH!
   - Wallee erkennt die customerId nicht
   - Wallee kann keine Payment Methods zu dieser ID zuordnen
   - Wallee denkt: "Diese Customer ID hat KEINE payment methods"
   - Fehler: "There is no payment method configured which is applicable"
   
   DAS IST DER KRITISCHE FEHLER!

3. VERSUCH 2 (Jan 12, 19:41 UTC):
   ✅ Removed: customerId
   ✅ Removed: tokenizationMode
   
   RESULTAT: ✅ Payments funktionieren wieder!
   
   ABER: Token-Speicherung ist DISABLED
   - Keine Tokens mehr gespeichert
   - Alle Implementierung wertlos

WARUM ES FEHLGESCHLAGEN IST:
=============================

The Problem: customerId Format
- Was benutzt: dt-{tenantId}-{userId}
- Wallee erwartet: Eindeutige Identifier pro Kunde
- ABER: Wallee musste diese ID KENNEN
- Wenn customerId NICHT in Wallee bekannt ist:
  → Wallee ignoriert sie
  → Wallee findet keine Payment Methods für diese ID
  → Wallee sagt: "No payment method applicable"

Wallee Customer IDs:
- Wallee hat sein EIGENES Concept von "customers"
- Diese sind NICHT automatisch mit tenantId+userId verlinkt
- Man muss customerId explizit mit Wallee synchronisieren ODER
- Wallee TokenService nutzen, um IDs zu managen

THE REAL SOLUTION:
==================

Statt customerId: Verwende Wallee's TokenService!

Option 1: TokenizationMode.AUTOMATIC (EMPFOHLEN)
- Keine customerId nötig
- Wallee entscheidet intelligente pro Zahlungsmethode:
  * VISA/Mastercard: speichern → ✅
  * iDEAL: speichern → ✅
  * TWINT: NICHT speichern → ✅ (Wallee blockiert automatisch)
- Tokens werden trotzdem von Wallee verwaltet
- Kein explizites "customer" management nötig

Option 2: Wallee Payment Method Tokens (fortgeschrittener)
- Implementiere Wallee's Token Management API
- Speichern Sie Tokens direkt bei Wallee (als IDs)
- Ein Token pro Customer + Zahlungsmethode
- Erlaubt "1-Click Checkout"

Option 3: Custom customerId Management (kompliziert)
- Erstelle "virtual customers" in Wallee
- Speichere customerId ↔ userId Mapping
- Komplexer, aber maximale Kontrolle

WARUM Option 1 (AUTOMATIC) BEST IST:
====================================

✅ Einfach: Keine Custom Logic nötig
✅ Sicher: Wallee entscheidet was tokenisierbar ist
✅ Flexibel: Funktioniert mit ALLEN Zahlungsmethoden
✅ Pflegeleicht: Keine Sync-Probleme
✅ Wallee-approved: Das ist die Empfohlene Methode

IMPLEMENTATION (Option 1 - TokenizationMode.AUTOMATIC):
========================================================

In process.post.ts (TransactionCreate):

```typescript
const transactionCreate: Wallee.model.TransactionCreate = {
  lineItems: lineItems,
  currency: 'CHF',
  autoConfirmationEnabled: true,
  chargeRetryEnabled: false,
  
  // ✅ IMPORTANT: NO customerId needed with AUTOMATIC mode!
  // Wallee manages tokenization per payment method automatically
  
  tokenizationMode: Wallee.model.TokenizationMode.AUTOMATIC,
  
  // Optional: Store metadata for our own tracking
  metaData: {
    payment_id: payment.id,
    user_id: userData.id,
    tenant_id: tenantId
  },
  
  merchantReference: merchantReference,
  successUrl: ...,
  failedUrl: ...
}
```

TESTING STRATEGY:
=================

BEFORE deploying, testen Sie:

1. ✅ VISA/Mastercard:
   - Payment machen
   - Prüfen: Token in webhook_logs?
   - Prüfen: Token in customer_payment_methods?

2. ✅ iDEAL:
   - Payment machen
   - Verify token saved

3. ✅ TWINT:
   - Payment machen
   - Verify: KEIN Token gespeichert (wichtig!)
   - TWINT muss IMMER neu autorisiert werden

4. ✅ SEPA:
   - Payment machen
   - Verify token saved

WENN ALLES FUNKTIONIERT:
========================

Dann können wir:
- Endpoints implementieren (get-customer-payment-methods, create-recurring)
- "Saved Payments" UI bauen
- Recurring Payments ermöglichen (für Abos, etc.)
- 1-Click Checkout anbieten

WARNUNG:
========

❌ NICHT: Nochmal ein custom customerId Format versuchen
❌ NICHT: Ohne Wallee TokenService arbeiten
❌ NICHT: TWINT tokenisieren (ist nicht erlaubt!)

✅ DO: TokenizationMode.AUTOMATIC verwenden
✅ DO: Wallee's intelligente Entscheidungen vertrauen
✅ DO: Gründlich mit TWINT testen vor Production
*/
