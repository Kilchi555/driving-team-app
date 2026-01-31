# CLEANUP CHECKLIST: usePayments.ts
# Payment Items wurden entfernt - Folgende Funktionen sollten gelöscht werden:

## TO DELETE FROM usePayments.ts:

### 1. Import entfernen (Zeile 21):
```
const { createPaymentItem, addAppointmentItem, addProductItem, addDiscountItem } = usePaymentItems()
```
→ Löschen, da usePaymentItems nicht mehr existiert

### 2. Funktion deletePaymentItems() - komplett löschen
```
const createPaymentItems = async (paymentId: string, items: Partial<PaymentItem>[]): Promise<void> => {
  try {
    for (const item of items) {
      // ... all this code ...
    }
  } catch (error) {
    console.error('Error creating payment items:', error)
    throw error
  }
}
```
→ Löschen, da Payment Items nicht mehr verwendet werden

### 3. In processCashPayment() - folgende Zeilen löschen:
```
// Create payment items (mit gerundeten Preisen)
await createPaymentItems(payment.id, paymentItems)
```
→ Diese Zeile wird nicht mehr benötigt

### 4. Suche nach allen Aufrufen von createPaymentItems() und entfernen:
- processCashPayment()
- processWalleePayment() (wenn vorhanden)
- Alle anderen Funktionen die createPaymentItems aufrufen

### 5. Typ entfernen (wenn noch verwendet):
```typescript
import type { PaymentItem } from '~/types/payment'
```

## NACH DEM CLEANUP:

Payment creation sollte folgende Struktur haben:

```typescript
// SIMPLIFIED: Nur noch Payment Record
const createPaymentRecord = async (data: Partial<Payment>): Promise<Payment> => {
  try {
    const response = await $fetch('/api/staff/create-payment', {
      method: 'POST',
      body: data
    }) as any
    
    return response.data
  } catch (error) {
    console.error('Error creating payment record:', error)
    throw error
  }
}
```

## VERIFICATION:

Nach dem Cleanup überprüfen:
- [ ] Kein Import von usePaymentItems mehr
- [ ] Kein Aufruf von createPaymentItems
- [ ] Kein Aufruf von addAppointmentItem
- [ ] Kein Aufruf von addProductItem
- [ ] Kein Aufruf von addDiscountItem
- [ ] Alle Tests noch grün
- [ ] Payment creation funktioniert immer noch
