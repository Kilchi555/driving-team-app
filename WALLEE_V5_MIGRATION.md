# Wallee SDK Migration: v4.x → v5.x

> **Warum migrieren?** Das wallee-npm-Package v4.x hat eine HIGH-severity axios-Vulnerability
> (SSRF/DoS via `__proto__`). Fix erfordert wallee v5.x, welches ein vollständiges Rewrite auf
> die neue REST API v2 ist.
>
> **Zeitaufwand:** ca. 2–4 Stunden  
> **Betroffene Dateien:** 7 Dateien direkt, plus Webhook-Handler

---

## Was sich ändert

### 1. Authentication (Breaking)

**v4 — Config-Objekt pro Service:**
```typescript
const sdkConfig = {
  space_id: spaceId,
  user_id: userId,
  api_secret: apiSecret
}
const transactionService = new Wallee.api.TransactionService(sdkConfig)
```

**v5 — Globale Configuration mit HttpBearerAuth:**
```typescript
import { HttpBearerAuth, Configuration, DefaultConfig } from 'wallee'

const auth = new HttpBearerAuth(userId, apiSecret)
const config = new Configuration({ ...DefaultConfig, httpBearerAuth: auth })
// config wird einmal erstellt, spaceId wird bei jedem Call übergeben
const transactionsService = new TransactionsService(config)
```

---

### 2. Import-Style (Breaking)

**v4 — Namespace-Import:**
```typescript
import { Wallee } from 'wallee'
new Wallee.api.TransactionService(...)
Wallee.model.LineItemType.PRODUCT
```

**v5 — Named Imports:**
```typescript
import {
  HttpBearerAuth,
  Configuration,
  DefaultConfig,
  TransactionsService,
  RefundsService,
  TransactionCreate,
  LineItemTypeEnum,
  RefundCreate,
  RefundTypeEnum
} from 'wallee'
```

---

### 3. Service-Namen (Breaking)

| v4 | v5 |
|---|---|
| `Wallee.api.TransactionService` | `TransactionsService` |
| `Wallee.api.TransactionPaymentPageService` | ❌ entfernt → Methode ist jetzt in `TransactionsService` |
| `Wallee.api.RefundService` | `RefundsService` |

---

### 4. Methoden-Signaturen (Breaking)

**Alle Methoden** wurden von positional Args (`service.method(spaceId, id)`) auf
ein einziges Params-Objekt umgestellt.

| v4 | v5 |
|---|---|
| `transactionService.create(spaceId, body)` | `transactionsService.postPaymentTransactions({ space: spaceId, body })` |
| `transactionService.read(spaceId, id)` | `transactionsService.getPaymentTransactionsId({ space: spaceId, id })` |
| `transactionService.count(spaceId, {})` | `transactionsService.getPaymentTransactions({ space: spaceId })` |
| `paymentPageService.paymentPageUrl(spaceId, id)` | `transactionsService.getPaymentTransactionsIdPaymentPageUrl({ space: spaceId, id })` |
| `refundService.refund(spaceId, body)` | `refundsService.postPaymentRefunds({ space: spaceId, body })` |

---

### 5. Response-Format (Breaking)

**v4 — Response hat `.body`-Wrapper:**
```typescript
const response = await transactionService.create(spaceId, transaction)
const transaction = response.body   // ← .body!
const transactionId = transaction.id
```

**v5 — Response ist direkt das Objekt:**
```typescript
const transaction = await transactionsService.postPaymentTransactions({ space: spaceId, body: transaction })
const transactionId = transaction.id  // kein .body mehr
```

---

### 6. Model-Typen (Breaking)

| v4 | v5 |
|---|---|
| `Wallee.model.TransactionCreate` | `TransactionCreate` (named import) |
| `Wallee.model.LineItemType.PRODUCT` | `LineItemTypeEnum.Product` |
| `Wallee.model.RefundCreate` | `RefundCreate` (named import) |
| `Wallee.model.RefundType.MERCHANT_INITIATED_ONLINE` | `RefundTypeEnum.MerchantInitiatedOnline` |

---

## Step-by-Step Migration

### Step 1 — Dependency updaten

```bash
npm install wallee@latest
```

Danach prüfen:
```bash
npm list wallee  # sollte 5.x zeigen
```

---

### Step 2 — `server/utils/wallee-config.ts` anpassen

**Vorher:**
```typescript
export function getWalleeSDKConfig(spaceId: number, userId: number, apiSecret: string) {
  return {
    space_id: spaceId,
    user_id: userId,
    api_secret: apiSecret
  }
}
```

**Nachher:**
```typescript
import { HttpBearerAuth, Configuration, DefaultConfig } from 'wallee'

export function getWalleeSDKConfig(userId: number, apiSecret: string): Configuration {
  const auth = new HttpBearerAuth(userId, apiSecret)
  const config = new Configuration({ ...DefaultConfig })
  config.httpBearerAuth = auth
  return config
}
```

> ℹ️ `spaceId` wird nicht mehr in der Config gespeichert, sondern bei jedem API-Call übergeben.

---

### Step 3 — `server/payment-providers/wallee-provider.ts` anpassen

**Import ändern:**
```typescript
// Vorher
import { Wallee } from 'wallee'

// Nachher
import {
  TransactionsService,
  RefundsService,
  TransactionCreate,
  LineItemTypeEnum,
  RefundCreate,
  RefundTypeEnum
} from 'wallee'
```

**`createTransaction()` anpassen:**
```typescript
async createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
  const sdkConfig = getWalleeSDKConfig(this.userId, this.apiSecret)
  const transactionsService = new TransactionsService(sdkConfig)

  const transaction: TransactionCreate = {
    currency: request.currency,
    lineItems: request.lineItems || [{
      uniqueId: `order-${request.orderId}`,
      name: request.description || 'Zahlung',
      quantity: 1,
      amountIncludingTax: request.amount,
      type: LineItemTypeEnum.Product      // ← war: Wallee.model.LineItemType.PRODUCT
    }],
    autoConfirmationEnabled: true,
    chargeRetryEnabled: false,
    customerId: request.userId,
    merchantReference: merchantReference,
    metaData: { ... },
    successUrl: request.successUrl,
    failedUrl: request.failedUrl
  }

  // v5: kein response.body mehr, direkt das Objekt
  const createdTransaction = await transactionsService.postPaymentTransactions({
    space: this.spaceId,
    body: transaction
  })

  // Payment Page URL — jetzt in TransactionsService, kein separater Service mehr
  const paymentPageUrl = await transactionsService.getPaymentTransactionsIdPaymentPageUrl({
    space: this.spaceId,
    id: createdTransaction.id as number
  })

  return {
    success: true,
    transactionId: String(createdTransaction.id),
    paymentUrl: paymentPageUrl as unknown as string,  // v5 gibt string zurück
    ...
  }
}
```

**`processWebhook()` anpassen:**
```typescript
async processWebhook(payload: any): Promise<WebhookPayload> {
  const sdkConfig = getWalleeSDKConfig(this.userId, this.apiSecret)
  const transactionsService = new TransactionsService(sdkConfig)

  // v5: { space, id } statt (spaceId, entityId)
  const transaction = await transactionsService.getPaymentTransactionsId({
    space: this.spaceId,
    id: payload.entityId
  })
  // kein response.body mehr — transaction ist direkt das Objekt
}
```

**`createRefund()` anpassen:**
```typescript
async createRefund(request: RefundRequest): Promise<RefundResponse> {
  const sdkConfig = getWalleeSDKConfig(this.userId, this.apiSecret)
  const refundsService = new RefundsService(sdkConfig)

  const refund: RefundCreate = {
    type: RefundTypeEnum.MerchantInitiatedOnline,   // ← war: Wallee.model.RefundType.MERCHANT_INITIATED_ONLINE
    amount: request.amount,
    transaction: Number(request.transactionId),
    merchantReference: `refund-${Date.now()}`,
    externalId: `refund-${Date.now()}`
  }

  const refundResult = await refundsService.postPaymentRefunds({
    space: this.spaceId,
    body: refund
  })
  // kein response.body mehr
}
```

**`validateConfig()` anpassen:**
```typescript
async validateConfig(): Promise<boolean> {
  const sdkConfig = getWalleeSDKConfig(this.userId, this.apiSecret)
  const transactionsService = new TransactionsService(sdkConfig)

  // v5: getPaymentTransactions statt count()
  await transactionsService.getPaymentTransactions({ space: this.spaceId })
  return true
}
```

---

### Step 4 — `server/api/wallee/create-transaction.post.ts` anpassen

```typescript
// Vorher
import { Wallee } from 'wallee'
const transactionService = new Wallee.api.TransactionService(sdkConfig)
const paymentPageService = new Wallee.api.TransactionPaymentPageService(sdkConfig)

const transactionCreate: Wallee.model.TransactionCreate = { ... }
createdTransaction = await transactionService.create(spaceId, transactionCreate)
const transactionId = createdTransaction?.body?.id ?? createdTransaction?.id
const urlResponse = await paymentPageService.paymentPageUrl(spaceId, transactionId)
let paymentUrl: string = (urlResponse as any)?.body || urlResponse

// Nachher
import { TransactionsService, TransactionCreate, LineItemTypeEnum } from 'wallee'
const transactionsService = new TransactionsService(sdkConfig)

const transactionCreate: TransactionCreate = { ... }
const createdTransaction = await transactionsService.postPaymentTransactions({
  space: spaceId,
  body: transactionCreate
})
const transactionId = createdTransaction.id  // kein .body mehr
const paymentUrl = await transactionsService.getPaymentTransactionsIdPaymentPageUrl({
  space: spaceId,
  id: transactionId
})
```

---

### Step 5 — `server/api/cron/recover-pending-wallee-payments.post.ts` anpassen

```typescript
// Vorher
import { Wallee } from 'wallee'
const transactionService = new Wallee.api.TransactionService(sdkConfig)
const response = await transactionService.read(spaceId, Number(walleeId))
const txData = response.body

// Nachher
import { TransactionsService } from 'wallee'
const transactionsService = new TransactionsService(sdkConfig)
const txData = await transactionsService.getPaymentTransactionsId({
  space: spaceId,
  id: Number(walleeId)
})
// kein .body
```

---

### Step 6 — Alle anderen Dateien prüfen

Die übrigen 4 Dateien mit `import { Wallee } from 'wallee'` nach demselben Pattern anpassen:

```bash
# Zeigt alle betroffenen Stellen
grep -rn "Wallee\." server/ --include="*.ts"
```

Suche nach:
- `response.body` → entfernen (direkt auf Objekt zugreifen)
- `new Wallee.api.*` → durch named imports ersetzen
- `Wallee.model.*` → durch named imports ersetzen
- `sdkConfig` Parameter in `getWalleeSDKConfig()` → spaceId entfernen

---

### Step 7 — Testen

```bash
# Lokaler Test: Transaktion erstellen
curl -X POST http://localhost:3000/api/wallee/create-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "<echte-payment-uuid>",
    "amount": 10.00,
    "currency": "CHF",
    "customerEmail": "test@test.com",
    "customerName": "Test User",
    "description": "Test"
  }'

# Webhook testen (siehe WALLEE_WEBHOOK_TESTING.md)
```

---

### Step 8 — `wallee-config.ts` Signatur aufräumen

Nach der Migration ist `getWalleeSDKConfig` nicht mehr nötig, da `getWalleeConfigForTenant` direkt
die v5 Configuration zurückgeben kann:

```typescript
export function getWalleeConfigForTenant(tenantId?: string): {
  spaceId: number
  config: Configuration
} {
  // ... env loading wie bisher ...
  const auth = new HttpBearerAuth(parsedUserId, apiSecret)
  const sdkConfig = new Configuration({ ...DefaultConfig })
  sdkConfig.httpBearerAuth = auth

  return { spaceId: parsedSpaceId, config: sdkConfig }
}
```

---

## Checkliste

- [ ] `wallee` auf v5.x aktualisiert (`npm install wallee@latest`)
- [ ] `server/utils/wallee-config.ts` — `getWalleeSDKConfig` auf v5 Authentication umgestellt
- [ ] `server/payment-providers/wallee-provider.ts` — Imports + alle 4 Methoden angepasst
- [ ] `server/api/wallee/create-transaction.post.ts` — TransactionsService + kein `.body`
- [ ] `server/api/cron/recover-pending-wallee-payments.post.ts` — TransactionsService + kein `.body`
- [ ] `server/api/wallee/save-payment-token.post.ts` — prüfen & anpassen
- [ ] `server/api/payments/process.post.ts` — prüfen & anpassen
- [ ] `server/api/payments/process-public.post.ts` — prüfen & anpassen
- [ ] `server/api/customer/create-topup-session.post.ts` — prüfen & anpassen
- [ ] Alle `response.body` durch direkten Zugriff ersetzt
- [ ] `Wallee.model.LineItemType.PRODUCT` → `LineItemTypeEnum.Product`
- [ ] `Wallee.model.RefundType.MERCHANT_INITIATED_ONLINE` → `RefundTypeEnum.MerchantInitiatedOnline`
- [ ] Lokalen Test gemacht (Transaktion erstellen)
- [ ] Webhook-Test gemacht
- [ ] Deployment auf Preview-Branch getestet

---

## Referenzen

- [Wallee API v2 Dokumentation](https://app-wallee.com/en-us/doc/api/web-service)
- [Wallee TypeScript SDK GitHub](https://github.com/wallee-payment/typescript-sdk)
- [Authentication Guide v2](https://app-wallee.com/en-us/doc/api/web-service#_authentication)
- [SDK Release Notes v5.0](https://github.com/wallee-payment/typescript-sdk/releases)
