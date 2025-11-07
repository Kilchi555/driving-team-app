# Wie funktioniert Wallee Tokenization?

## 📚 Offizielle Wallee Dokumentation

Die Tokenization-Funktion ist in der offiziellen Wallee API-Dokumentation dokumentiert:

### 🔍 Wo finden Sie die Tokenization-Dokumentation:

1. **Transaction Create API:**
   - **Dokumentation:** https://app-wallee.com/doc/api/web-service#transaction-service
   - **Endpoint:** `POST /api/transaction/create`
   - **Parameter:** `TransactionCreate.tokenizationEnabled` (Boolean)
   - **Beschreibung:** Wenn `true`, speichert Wallee automatisch die Zahlungsmethode für wiederholte Zahlungen

2. **Transaction Read API (Token abrufen):**
   - **Dokumentation:** https://app-wallee.com/doc/api/web-service#transaction-service
   - **Endpoint:** `GET /api/transaction/read/{id}`
   - **Response-Feld:** `Transaction.paymentMethodToken` (String)
   - **Wichtig:** Der Token ist nur verfügbar, wenn `tokenizationEnabled = true` war und die Zahlung erfolgreich war

3. **Transaction Model (SDK):**
   - Im SDK finden Sie: `Wallee.model.TransactionCreate`
   - Property: `tokenizationEnabled: boolean`
   - Property: `customerId: string` (wichtig: muss konsistent sein für denselben Kunden)

4. **Customer Management:**
   - Die `customerId` muss konsistent sein, damit Wallee mehrere Zahlungsmethoden demselben Kunden zuordnen kann
   - Dokumentation: Siehe "Customer ID" in Transaction Create

### 📖 Spezifische Dokumentationsstellen:

**1. Transaction Create API:**
- **URL:** https://app-wallee.com/doc/api/web-service#transaction-service
- **Methode:** Scrollen Sie zur Methode `create(spaceId, transaction)`
- **Parameter:** Im `TransactionCreate` Objekt finden Sie:
  - `tokenizationEnabled` (Boolean) - Aktiviert/Deaktiviert Tokenization
  - `customerId` (String) - Muss für Tokenization gesetzt sein

**2. Transaction Model (Response):**
- Nach erfolgreicher Zahlung: `Transaction.paymentMethodToken` enthält den Token
- Der Token ist nur verfügbar wenn:
  - `tokenizationEnabled = true` war
  - `customerId` gesetzt war
  - Zahlung erfolgreich war (`state = SUCCESSFUL` oder `FULFILL`)

**3. Wallee Developer Portal:**
- **Hauptseite:** https://app-wallee.com/doc/api/web-service
- **Transaction Service:** https://app-wallee.com/doc/api/web-service#transaction-service
- **Navigation:** 
  1. Gehen Sie zu "Transaction Service"
  2. Klicken Sie auf `create(spaceId, transaction)`
  3. Sehen Sie die Liste aller Parameter des `TransactionCreate` Objekts
  4. Suchen Sie nach `tokenizationEnabled`

**4. SDK TypeScript Definitions:**
Im installierten SDK finden Sie die Typen:
- `node_modules/wallee/lib/model/TransactionCreate.d.ts`
- `node_modules/wallee/lib/model/Transaction.d.ts`
- Hier sehen Sie alle verfügbaren Properties inkl. `tokenizationEnabled` und `paymentMethodToken`

### 💻 SDK-Dokumentation:
- **NPM Package:** https://www.npmjs.com/package/@wallee/sdk
- **GitHub Repository:** https://github.com/wallee-payment/wallee-web-sdk
- **Type Definitions:** Im SDK-Package unter `node_modules/@wallee/sdk/` finden Sie die TypeScript-Definitionen

### 🔑 Wichtige Parameter in der Dokumentation:

1. **TransactionCreate:**
   ```typescript
   {
     tokenizationEnabled: boolean,  // ✅ Aktiviert Tokenization
     customerId: string,            // ✅ Muss konsistent sein
     // ... andere Parameter
   }
   ```

2. **Transaction (Response):**
   ```typescript
   {
     paymentMethodToken?: string,   // ✅ Token nach erfolgreicher Zahlung
     customerId: string,             // ✅ Customer ID
     // ... andere Felder
   }
   ```

## Übersicht

Die Zahlungsmethode wird **nicht direkt in unserer Datenbank** gespeichert. Stattdessen:
1. **Wallee speichert die Zahlungsdaten** (PCI-DSS konform)
2. **Wir speichern nur einen Token** (Referenz auf die gespeicherte Zahlungsmethode)

## Der Flow

### Schritt 1: Transaktion mit Tokenization erstellen

```typescript
// server/api/wallee/create-transaction.post.ts
transaction.tokenizationEnabled = true  // ✅ Aktiviert Tokenization
transaction.customerId = shortCustomerId // ✅ Konsistente Customer ID
```

**Was passiert:**
- Wir sagen Wallee: "Speichere die Zahlungsmethode für diesen Kunden"
- Wallee merkt sich die `customerId` für später

### Schritt 2: Kunde zahlt bei Wallee

- Kunde wird zu Wallee weitergeleitet
- Gibt dort seine Zahlungsdaten ein (Kreditkarte, etc.)
- Wallee verarbeitet die Zahlung
- **Wichtig:** Wallee speichert die Zahlungsdaten automatisch (wenn `tokenizationEnabled = true`)

### Schritt 3: Token abrufen (automatisch via Webhook)

Nach erfolgreicher Zahlung wird automatisch der Webhook aufgerufen:

```typescript
// server/api/webhooks/wallee-payment.post.ts
if (paymentStatus === 'completed') {
  // ✅ Automatisch Token speichern
  await $fetch('/api/wallee/save-payment-token', {
    transactionId: transactionId,
    userId: firstPayment.user_id,
    tenantId: firstPayment.tenant_id
  })
}
```

### Schritt 4: Token von Wallee abrufen und speichern

```typescript
// server/api/wallee/save-payment-token.post.ts

// 1. Hole Transaktions-Details von Wallee
const transaction = await transactionService.read(spaceId, transactionId)

// 2. Extrahiere Token aus der Transaktion
let paymentMethodToken = transaction.paymentMethodToken // Oder aus metadata

// 3. Speichere NUR DEN TOKEN in unserer DB (nicht die Kreditkartendaten!)
await supabase
  .from('customer_payment_methods')
  .insert({
    wallee_token: paymentMethodToken,        // ✅ Nur Token
    wallee_customer_id: transaction.customerId, // ✅ Customer ID für Wallee
    user_id: userId,                         // ✅ Unser User ID
    display_name: 'Gespeicherte Karte',     // ✅ Anzeigename
    is_active: true
  })
```

## Was wird gespeichert?

### ✅ In unserer Datenbank (`customer_payment_methods`):
- `wallee_token` - Der Token von Wallee (z.B. "tok_abc123...")
- `wallee_customer_id` - Die Customer ID bei Wallee (z.B. "dt-pascalkilchenmann-20")
- `display_name` - Anzeigename (z.B. "Visa •••• 1234")
- `payment_method_type` - Typ (z.B. "card")

### ❌ NICHT in unserer Datenbank:
- Kreditkartennummer
- CVV
- Ablaufdatum (vollständig)
- IBAN (vollständig)
- Andere sensitive Zahlungsdaten

**Alle sensiblen Daten bleiben bei Wallee (PCI-DSS compliant)!**

## Token verwenden für wiederholte Zahlungen

Bei automatischen Abbuchungen verwenden wir den gespeicherten Token:

```typescript
// server/api/cron/process-automatic-payments.post.ts

// 1. Hole gespeicherten Token
const paymentMethod = payment.customer_payment_methods
const walleeToken = paymentMethod.wallee_token

// 2. Erstelle neue Transaktion mit dem Token
const transaction = new Wallee.model.TransactionCreate()
transaction.customerId = paymentMethod.wallee_customer_id
// ✅ Wallee verwendet automatisch die gespeicherte Zahlungsmethode
//    basierend auf customerId

// 3. Wallee debitiert automatisch von der gespeicherten Methode
```

## Zusammenfassung

1. **Erste Zahlung:**
   - `tokenizationEnabled = true` → Wallee speichert Zahlungsmethode
   - Nach Zahlung: Token wird automatisch abgerufen (via Webhook)
   - Token wird in `customer_payment_methods` gespeichert

2. **Wiederholte Zahlungen:**
   - Wir verwenden den gespeicherten `wallee_token` und `wallee_customer_id`
   - Wallee debitiert automatisch von der gespeicherten Zahlungsmethode
   - Keine erneute Eingabe nötig

3. **Sicherheit:**
   - Keine sensiblen Daten in unserer DB
   - PCI-DSS konform
   - Nur Token-Referenzen

## Wichtige Punkte

- **Customer ID muss konsistent sein:** Wir verwenden `dt-{emailHash}-{length}` für jeden Kunden
- **Token wird automatisch gespeichert:** Via Webhook nach erfolgreicher Zahlung
- **Keine manuelle Eingabe nötig:** Alles läuft automatisch
