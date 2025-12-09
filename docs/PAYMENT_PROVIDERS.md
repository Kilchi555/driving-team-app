# Payment Provider Abstraction Layer

## Überblick

Diese Architektur ermöglicht einen **schnellen Wechsel** zwischen verschiedenen Zahlungsanbietern (aktuell: Wallee & Stripe) ohne große Code-Änderungen.

## Architektur

```
┌─────────────────────────────────────────────────┐
│  Frontend (usePayments, useWallee, etc.)        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Universal API Endpoints                        │
│  - /api/payment-gateway/create-transaction      │
│  - /api/payment-gateway/webhook                 │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Payment Provider Factory                       │
│  - Lädt Tenant-spezifische Config aus DB       │
│  - Erstellt den richtigen Provider             │
└─────────────────────┬───────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ WalleeProvider   │      │ StripeProvider   │
│ (IPaymentProvider)│      │ (IPaymentProvider)│
└──────────────────┘      └──────────────────┘
```

## Installation

### 1. Stripe NPM Package installieren

```bash
npm install stripe
```

### 2. Migration ausführen

```sql
-- In Supabase SQL Editor
\i migrations/add_payment_provider_support.sql
```

### 3. Stripe Credentials konfigurieren (in Supabase)

```sql
-- Beispiel: Tenant auf Stripe umstellen
UPDATE tenant_settings
SET 
  payment_provider = 'stripe',
  stripe_api_key = 'sk_live_...',
  stripe_webhook_secret = 'whsec_...'
WHERE tenant_id = 'YOUR_TENANT_ID';
```

## Verwendung

### Zahlungsanbieter wechseln

**OHNE Code-Änderung** - nur DB-Update:

```sql
-- Von Wallee zu Stripe wechseln
UPDATE tenant_settings
SET payment_provider = 'stripe'
WHERE tenant_id = 'YOUR_TENANT_ID';

-- Von Stripe zu Wallee wechseln
UPDATE tenant_settings
SET payment_provider = 'wallee'
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### Webhook URLs konfigurieren

#### Wallee Webhook URL:
```
https://www.simy.ch/api/payment-gateway/webhook?provider=wallee
```

#### Stripe Webhook URL:
```
https://www.simy.ch/api/payment-gateway/webhook?provider=stripe
```

### Frontend-Integration (keine Änderung nötig)

Die bestehenden Composables funktionieren weiterhin:

```typescript
// Funktioniert mit beiden Providern
const { createTransaction } = usePayments()

await createTransaction({
  orderId: '123',
  amount: 95.00,
  currency: 'CHF',
  customerEmail: 'kunde@example.com',
  userId: 'user-uuid',
  tenantId: 'tenant-uuid'
})
```

## Provider-spezifische Features

### Wallee
- ✅ Multi-Tenant Support
- ✅ Merchant Reference
- ✅ Custom Line Items
- ✅ Tokenization
- ✅ TWINT, PostFinance, Kreditkarten

### Stripe
- ✅ Checkout Sessions
- ✅ Payment Intents
- ✅ Webhooks mit Signatur-Validierung
- ✅ TWINT, PayPal, Kreditkarten
- ✅ Subscriptions (zukünftig)
- ✅ Apple Pay / Google Pay

## Testen

### 1. Stripe Test Credentials verwenden

```sql
UPDATE tenant_settings
SET 
  payment_provider = 'stripe',
  stripe_api_key = 'sk_test_...',  -- Test Key
  stripe_webhook_secret = 'whsec_...'
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### 2. Zahlung erstellen

```bash
curl -X POST https://www.simy.ch/api/payment-gateway/create-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "amount": 10.00,
    "currency": "CHF",
    "customerEmail": "test@example.com",
    "userId": "user-uuid",
    "tenantId": "tenant-uuid",
    "successUrl": "https://www.simy.ch/payment/success",
    "failedUrl": "https://www.simy.ch/payment/failed"
  }'
```

### 3. Webhook testen

**Stripe CLI** für lokales Testen:

```bash
stripe listen --forward-to https://www.simy.ch/api/payment-gateway/webhook?provider=stripe
```

## Fallback-Strategie

Bei Ausfall eines Providers:

1. **Automatischer Fallback** (optional):
   ```typescript
   // In factory.ts erweitern
   try {
     const provider = await getPaymentProviderForTenant(tenantId)
     await provider.validateConfig()
     return provider
   } catch (error) {
     // Fallback zu anderem Provider
     console.warn('Primary provider failed, using fallback')
     return createFallbackProvider(tenantId)
   }
   ```

2. **Manueller Wechsel** (empfohlen):
   - Admin-Benachrichtigung bei Provider-Fehler
   - Manuelle Umstellung in DB
   - Monitoring & Alerts

## Erweiterung um weitere Provider

1. Neue Provider-Klasse erstellen (z.B. `paypal-provider.ts`)
2. `IPaymentProvider` Interface implementieren
3. In `factory.ts` registrieren
4. Migration für neue Credentials ausführen

## Monitoring

Alle Provider-Calls werden geloggt:

```typescript
logger.debug('🔄 [Wallee] Creating transaction...')
logger.debug('✅ [Stripe] Transaction created')
console.error('❌ [Provider] Error:', error)
```

## Best Practices

✅ **Immer Tenant-spezifische Config aus DB laden**  
✅ **Keine Provider-spezifische Logik im Frontend**  
✅ **Webhook-Signaturen validieren**  
✅ **Fehlerbehandlung mit Fallback**  
✅ **Provider-Wechsel ohne Deployment möglich**  
✅ **Test-Mode für beide Provider nutzen**  

## Support

- Wallee Docs: https://app-wallee.com/doc/api/web-service
- Stripe Docs: https://stripe.com/docs/api

