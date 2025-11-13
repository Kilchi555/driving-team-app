# Payment Details Update - Produkte & Rabatte anzeigen

## Zusammenfassung

Die Terminbestätigungsseite zeigt jetzt eine detaillierte Aufschlüsselung aller Produkte und Rabatte an.

## Was wurde geändert?

### `/confirm/[token].vue` - Terminbestätigungsseite

**Neu hinzugefügt:**

1. **Payment Items Laden**
   - Lädt `payment_items` aus der Datenbank (Produkte, Rabatte, Services)
   - Wird zusammen mit dem Payment geladen

2. **Detaillierte Anzeige**
   - Neue Sektion "Leistungen & Produkte" 
   - Zeigt jeden Posten einzeln an:
     - Name des Items
     - Menge (falls > 1)
     - Beschreibung (optional)
     - Preis (rot für Rabatte)
   - Total-Zeile am Ende

### Beispiel-Anzeige:

```
┌─────────────────────────────────────────┐
│ Leistungen & Produkte                   │
├─────────────────────────────────────────┤
│ Fahrlektion (90 Min)      CHF 95.00     │
│ Theoriebuch               CHF 45.00     │
│ Neukunden-Rabatt         -CHF 10.00     │
├─────────────────────────────────────────┤
│ Total                     CHF 130.00    │
└─────────────────────────────────────────┘
```

## Code-Änderungen

### 1. Template
```vue
<!-- Payment Details (Products & Discounts) -->
<div v-if="paymentItems && paymentItems.length > 0" 
     class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
  <h3 class="text-md font-semibold text-gray-900 mb-3">
    Leistungen & Produkte
  </h3>
  <div class="space-y-2">
    <div v-for="item in paymentItems" :key="item.id"
         class="flex justify-between items-center text-sm">
      <!-- Item Name & Details -->
      <div class="flex-1">
        <span class="text-gray-900">{{ item.item_name }}</span>
        <span v-if="item.quantity > 1" class="text-gray-500 ml-1">
          ({{ item.quantity }}x)
        </span>
        <span v-if="item.description" 
              class="block text-xs text-gray-500">
          {{ item.description }}
        </span>
      </div>
      
      <!-- Price (red for discounts) -->
      <span class="text-gray-900 font-medium"
            :class="{ 'text-red-600': item.item_type === 'discount' }">
        {{ item.item_type === 'discount' ? '-' : '' }}CHF 
        {{ formatPrice(Math.abs(item.total_price_rappen)) }}
      </span>
    </div>
  </div>
  
  <!-- Total -->
  <div class="border-t border-gray-200 mt-3 pt-3 
              flex justify-between items-center">
    <span class="font-semibold text-gray-900">Total</span>
    <span class="text-lg font-bold text-gray-900">
      CHF {{ formatPrice(appointment.total_amount_rappen) }}
    </span>
  </div>
</div>
```

### 2. Script
```typescript
// Neue Variable
const paymentItems = ref<any[]>([])

// In loadAppointment():
if (paymentData?.total_amount_rappen) {
  totalAmountRappen = paymentData.total_amount_rappen
  
  // ✅ Lade Payment Items (Produkte, Rabatte, etc.)
  const { data: items } = await supabase
    .from('payment_items')
    .select('*')
    .eq('payment_id', paymentData.id)
    .order('created_at', { ascending: true })
  
  if (items) {
    paymentItems.value = items
  }
}
```

## Features

✅ **Automatische Anzeige:** Produkte und Rabatte werden automatisch angezeigt, wenn vorhanden  
✅ **Mengen-Anzeige:** Zeigt "(2x)" wenn Menge > 1  
✅ **Rabatte hervorgehoben:** Rabatte werden rot dargestellt mit "-" Prefix  
✅ **Beschreibungen:** Zeigt optionale Beschreibungen in kleiner Schrift  
✅ **Total-Zeile:** Klare Trennung und Hervorhebung des Totals  

## Wo sichtbar?

1. **Terminbestätigungsseite** (`/confirm/[token]`)
   - Wird per E-Mail/Link verschickt
   - Zeigt alle Details vor der Bestätigung

2. **Customer Dashboard** (`/customer-dashboard`)
   - Klick auf "Jetzt bestätigen" → leitet zu Bestätigungsseite weiter
   - Dort werden alle Details angezeigt

## Datenbank-Struktur

Die Anzeige nutzt die `payment_items` Tabelle:
```sql
SELECT * FROM payment_items WHERE payment_id = '<payment-id>';

-- Beispiel-Daten:
-- id | payment_id | item_type | item_name         | quantity | total_price_rappen
-- ---|------------|-----------|-------------------|----------|-------------------
-- 1  | xxx        | service   | Fahrlektion       | 1        | 9500
-- 2  | xxx        | product   | Theoriebuch       | 1        | 4500
-- 3  | xxx        | discount  | Neukunden-Rabatt  | 1        | -1000
```

## Item Types

- `appointment` / `service`: Fahrlektion, Dienstleistung
- `product`: Physische oder digitale Produkte
- `discount`: Rabatte (werden rot dargestellt)

## Testen

1. Erstelle einen Termin mit Produkten und Rabatten
2. Öffne den Bestätigungslink
3. Überprüfe die Anzeige der Produkte und Rabatte
4. Total sollte korrekt berechnet sein

---

**Status:** ✅ Implementiert  
**Datum:** 2025-11-12  
**Dateien geändert:** 1 (`pages/confirm/[token].vue`)

