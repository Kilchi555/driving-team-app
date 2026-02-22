-- ANALYSE: Payment Method Tokenization - Wie Wallee den Kunden "erkennt"

/*
WALLEE CUSTOMER IDENTIFICATION:
==============================

Es gibt 2 Wege wie Wallee einen Kunden "erkennt":

1. VIA customerId (von uns übermittelt):
   - Wir müssen customerId in TransactionCreate setzen
   - Format: "dt-{tenantId}-{userId}"
   - Wallee speichert Tokens gegen diese Customer ID
   - Bei nächster Zahlung -> selbe customerId -> Wallee zeigt "Saved Methods"
   
   Problem damals: Format war falsch, blockierte Payment Methods
   Lösung: TokenizationMode.AUTOMATIC (braucht keine customerId!)

2. VIA Token (bei Recurring Payments):
   - Kunbe zahlt -> Wallee erstellt einen Token
   - Token wird in customer_payment_methods gespeichert
   - Bei nächster Zahlung Token in TransactionCreate mitgeben
   - Wallee erkennt den Token -> Zahlung ohne neu autorisieren

UNSER AKTUELLER ANSATZ (TokenizationMode.AUTOMATIC):
===================================================

✅ Was funktioniert:
   - Tokens werden VON WALLEE erstellt (wenn Methode tokenisierbar ist)
   - Tokens werden bei erfolgreicher Zahlung versucht zu speichern
   - save-payment-token.post.ts hat komplexe Token-Hol-Logik

❌ Was NICHT funktioniert:
   - customerId wird NICHT mitgesendet (haben wir entfernt)
   - Daher kann Wallee Tokens nicht an Customer verlinken
   - Tokens werden zwar gespeichert, aber nicht bei nächster Zahlung verwendet
   - Resultat: Jede Zahlung fragt neu nach Methode

WAS WIR IMPLEMENTIEREN SOLLTEN:
==============================

Option A: customerId + TokenizationMode.AUTOMATIC (EMPFOHLEN)
   1. Aktiviere customerId in process.post.ts & process-public.post.ts
      Format: dt-{tenantId}-{userId}
   
   2. Wallee wird dann:
      - Tokens an diese Customer ID speichern
      - Bei nächster Zahlung (gleiche customerId) Saved Methods anbieten
      - Automatisch tokenisieren wenn möglich
   
   3. Frontend kann dann:
      - getCustomerPaymentMethods() aufrufen -> zeigt gespeicherte Methoden
      - Kunde wählt eine -> createRecurringTransaction() mit Token
      - Zahlung ohne neu autorisieren (1-Click Checkout!)

Option B: Nur Token-basiert (komplexer)
   - Keine customerId
   - Tokens manuell speichern & verlinken
   - Frontend managed Tokens
   - Komplexer, aber möglich

WARUM Option A BESSER IST:
==========================

✅ Einfacher: Wallee managed alles
✅ Zuverlässig: Wallee-Best-Practice
✅ Sicher: Keine Tokens im Frontend
✅ TWINT-sicher: TokenizationMode.AUTOMATIC blockiert TWINT automatisch
✅ Zukunftssicher: 1-Click Checkout funktioniert sofort

CODE ÄNDERUNGEN (Option A):
==========================

In process.post.ts & process-public.post.ts:

```typescript
const transactionCreate: Wallee.model.TransactionCreate = {
  lineItems,
  currency: 'CHF',
  autoConfirmationEnabled: true,
  chargeRetryEnabled: false,
  
  // ✅ ADD DIESE 2 ZEILEN:
  customersEmailAddress: userData.email,  // ← füge das hinzu
  customerId: generateCustomerId(userData.id, tenantId),  // ← füge das hinzu
  
  tokenizationMode: Wallee.model.TokenizationMode.AUTOMATIC,  // ← schon vorhanden
  
  merchantReference: merchantReference,
  successUrl: ...,
  failedUrl: ...
}

// Helper function:
function generateCustomerId(userId: string, tenantId: string): string {
  return `dt-${tenantId}-${userId}`
}
```

Dann wird automatisch:
1. Bei erfolgreicher Zahlung: Token gespeichert + an customerId verlinkt
2. Bei nächster Zahlung: Gleiche customerId -> Wallee bietet "Saved Methods" an
3. Kunde kann sparen oder erneut neue Methode verwenden

TESTING PLAN:
=============

1. Zahlung mit Karte #1 -> Token sollte gespeichert werden
2. Zahlung #2 mit GLEICHER Kunde -> "Your saved cards" Option sollte erscheinen
3. Auf "saved card" klicken -> 1-Click Checkout (keine neu autorisieren nötig!)
4. TWINT: Sollte NIE tokenisiert werden

TABELLEN:
=========

customer_payment_methods:
  - wallee_customer_id: "dt-{tenantId}-{userId}"
  - wallee_token: Token ID von Wallee
  - payment_method_type: "VISA", "MASTERCARD", "IDEAL", etc.
  - is_active: true/false

useWalleeTokenization.ts:
  - getCustomerPaymentMethods() - zeigt Tokens für Kunde
  - createRecurringTransaction() - macht Payment mit Token

NEXT STEPS:
===========

1. Aktiviere customerId in process.post.ts & process-public.post.ts
2. Test mit Karte (sollte Token speichern)
3. Test mit gleicher Kunde (sollte "saved cards" zeigen)
4. Implementiere Frontend UI (optional für MVP)
*/
