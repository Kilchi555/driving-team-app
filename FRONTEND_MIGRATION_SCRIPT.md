# Frontend Migration Script: booking/availability/[slug].vue

**Date:** 2026-01-12  
**Status:** READY TO MIGRATE  
**File:** `pages/booking/availability/[slug].vue`  
**Lines:** 3394 → ~1500 (estimated after migration)

---

## 🎯 MIGRATION STRATEGY

Die Datei ist sehr groß und komplex (3394 Zeilen). Anstatt alles auf einmal zu ändern, machen wir eine **schrittweise Migration**:

### **OPTION A: Minimale Migration (Empfohlen)** ⭐
Nur die **kritischen Teile** ändern, Rest bleibt gleich:
1. Import ändern
2. Slot-Fetching-Logik ersetzen  
3. Reservation hinzufügen
4. Appointment-Creation anpassen

**Vorteil:** Weniger Risiko, schneller fertig, einfacher zu testen  
**Aufwand:** ~2-3 Stunden

### **OPTION B: Kompletter Rewrite**
Gesamte Datei neu schreiben mit neuer Architektur.

**Vorteil:** Sauberere Code-Struktur, weniger Zeilen  
**Nachteil:** Mehr Aufwand, mehr Testing nötig  
**Aufwand:** ~8-10 Stunden

---

## 📝 OPTION A: MINIMALE MIGRATION (Step-by-Step)

### **SCHRITT 1: Import ändern** (Zeile 719)

**VORHER:**
```typescript
import { useAvailabilitySystem } from '~/composables/useAvailabilitySystem'
```

**NACHHER:**
```typescript
import { useSecureAvailability } from '~/composables/useSecureAvailability'
```

---

### **SCHRITT 2: Composable Setup ersetzen** (Zeile 737-750)

**VORHER:**
```typescript
const { 
  isLoading, 
  error, 
  availableSlots, 
  staffLocationCategories,
  getAvailableSlots,
  getAllAvailableSlots,
  getStaffLocationCategories,
  getAvailableSlotsForCombination,
  loadBaseData,
  activeStaff,
  validateSlotsWithTravelTime,
  loadAppointments
} = useAvailabilitySystem()
```

**NACHHER:**
```typescript
// NEW: Secure availability API
const {
  isLoading: isLoadingSlots,
  error: slotsError,
  availableSlots,
  fetchAvailableSlots,
  reserveSlot,
  createAppointment,
  groupSlotsByDate,
  generateSessionId
} = useSecureAvailability()

// Keep old isLoading/error for UI compatibility
const isLoading = ref(false)
const error = ref<string | null>(null)

// Session ID for slot reservation
const sessionId = ref(generateSessionId())
const reservedSlotId = ref<string | null>(null)
const reservationExpiry = ref<Date | null>(null)
```

---

### **SCHRITT 3: Remove ALL direct DB queries** ❌

**ENTFERNEN:** Alle `supabase.from(...)` Queries für:
- ❌ `appointments` (Zeile ~782-790)
- ❌ `staff_working_hours` (Zeile ~805-813)
- ❌ `external_busy_times` (wird vom Backend geholt)
- ❌ `checkBatchAvailability` function (Zeile 765-900+)

**WARUM?** Diese Logik ist jetzt im Backend (availability-calculator.ts)!

---

### **SCHRITT 4: Slot-Fetching neu implementieren**

**FINDE:** Die Funktion `generateTimeSlotsForSpecificCombination` (Zeile ~1818)

**ERSETZE** die gesamte Logik mit:

```typescript
const generateTimeSlotsForSpecificCombination = async () => {
  try {
    isLoadingTimeSlots.value = true
    error.value = null
    
    logger.debug('🔄 Fetching available slots via secure API...')
    
    // Calculate date range (e.g., next 7 days)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)
    
    // Fetch slots from secure API
    const slots = await fetchAvailableSlots({
      tenant_id: tenant.value?.id || '',
      staff_id: selectedStaff.value?.id,
      location_id: selectedLocation.value?.id,
      category_code: selectedCategory.value?.code || '',
      duration_minutes: selectedDuration.value || 45,
      start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      end_date: endDate.toISOString().split('T')[0]
    })
    
    // Group slots by date for calendar display
    const slotsByDate = groupSlotsByDate(slots)
    
    // Convert to format expected by UI
    timeSlots.value = Object.entries(slotsByDate).map(([date, dateSlots]) => {
      return dateSlots.map(slot => ({
        id: slot.id,
        date,
        time: new Date(slot.start_time).toLocaleTimeString('de-CH', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        location_id: slot.location_id,
        location_name: slot.location_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        category_code: slot.category_code,
        isAvailable: true // Already filtered by API
      }))
    }).flat()
    
    logger.debug('✅ Slots fetched:', timeSlots.value.length)
    
  } catch (err: any) {
    logger.error('❌ Error fetching slots:', err)
    error.value = err.message || 'Fehler beim Laden der Verfügbarkeit'
  } finally {
    isLoadingTimeSlots.value = false
  }
}
```

**RESULTAT:**
- ~500 Zeilen komplexe Logik → ~50 Zeilen simpler API Call
- Keine DB Queries mehr
- 10-20x schneller

---

### **SCHRITT 5: Slot Reservation hinzufügen** ⚠️ WICHTIG

**FINDE:** Die Funktion die aufgerufen wird wenn User einen Slot auswählt (z.B. `handleSlotSelection` oder ähnlich)

**FÜGE HINZU:** Slot Reservation BEVOR User zur Buchungsseite geht:

```typescript
const handleSlotSelection = async (slot: any) => {
  try {
    isLoading.value = true
    error.value = null
    
    logger.debug('🔒 Reserving slot:', slot.id)
    
    // Reserve slot for 10 minutes
    const reservation = await reserveSlot({
      slot_id: slot.id,
      session_id: sessionId.value
    })
    
    // Store reservation info
    reservedSlotId.value = slot.id
    reservationExpiry.value = new Date(reservation.slot.reserved_until)
    
    // Show countdown timer
    startReservationCountdown()
    
    // Proceed to booking form
    selectedSlot.value = slot
    currentStep.value = 5 // Or whatever step is the booking form
    
    logger.debug('✅ Slot reserved until:', reservationExpiry.value)
    
  } catch (err: any) {
    logger.error('❌ Slot reservation failed:', err)
    
    if (err.statusCode === 409) {
      // Slot already taken
      error.value = 'Dieser Zeitslot ist leider nicht mehr verfügbar. Bitte wählen Sie einen anderen.'
      // Refresh slots
      await generateTimeSlotsForSpecificCombination()
    } else {
      error.value = err.statusMessage || 'Reservierung fehlgeschlagen'
    }
  } finally {
    isLoading.value = false
  }
}

// Countdown timer for reservation
const reservationCountdown = ref(600) // 10 minutes in seconds
let countdownInterval: any = null

const startReservationCountdown = () => {
  reservationCountdown.value = 600
  
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  
  countdownInterval = setInterval(() => {
    reservationCountdown.value--
    
    if (reservationCountdown.value <= 0) {
      clearInterval(countdownInterval)
      // Reservation expired
      error.value = 'Ihre Reservierung ist abgelaufen. Bitte wählen Sie erneut einen Zeitslot.'
      reservedSlotId.value = null
      reservationExpiry.value = null
    }
  }, 1000)
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
```

**UI: Countdown anzeigen**
```vue
<!-- Somewhere in your booking form -->
<div v-if="reservationExpiry" class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
  <div class="flex items-center">
    <svg class="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
    </svg>
    <span class="text-sm text-yellow-800">
      Zeitslot reserviert für: 
      <strong>{{ Math.floor(reservationCountdown / 60) }}:{{ String(reservationCountdown % 60).padStart(2, '0') }}</strong>
      Minuten
    </span>
  </div>
</div>
```

---

### **SCHRITT 6: Appointment Creation anpassen**

**FINDE:** Die Stelle wo `supabase.from('appointments').insert(...)` aufgerufen wird

**ERSETZE** mit secure API:

```typescript
const handleBookingConfirmation = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Bitte melden Sie sich an um fortzufahren.')
    }
    
    logger.debug('📅 Creating appointment via secure API...')
    
    // Create appointment
    const response = await createAppointment(
      {
        slot_id: reservedSlotId.value!,
        session_id: sessionId.value,
        appointment_type: 'lesson',
        category_code: selectedCategory.value?.code || '',
        notes: bookingNotes.value || undefined
      },
      session.access_token
    )
    
    logger.debug('✅ Appointment created:', response.appointment.id)
    
    // Clear reservation
    reservedSlotId.value = null
    reservationExpiry.value = null
    if (countdownInterval) {
      clearInterval(countdownInterval)
    }
    
    // Redirect to confirmation or payment
    if (response.payment_required) {
      // Redirect to payment flow
      navigateTo(`/payment/${response.appointment.id}`)
    } else {
      // Show success message
      successMessage.value = 'Ihre Fahrstunde wurde erfolgreich gebucht!'
      currentStep.value = 6 // Success screen
    }
    
  } catch (err: any) {
    logger.error('❌ Appointment creation failed:', err)
    
    if (err.statusCode === 409) {
      error.value = 'Ihre Reservierung ist abgelaufen. Bitte wählen Sie erneut einen Zeitslot.'
      // Go back to slot selection
      currentStep.value = 4
    } else {
      error.value = err.statusMessage || 'Buchung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}
```

---

## ✅ TESTING CHECKLIST

Nach der Migration testen:

### Slot Browsing
- [ ] Slots werden geladen (sollte <100ms sein)
- [ ] Slots zeigen korrekten Staff/Location Namen
- [ ] Filter funktionieren (Staff, Location, Duration)
- [ ] Kalenderansicht zeigt richtige Daten

### Slot Reservation
- [ ] Klick auf Slot reserviert ihn (10 Min)
- [ ] Countdown wird angezeigt
- [ ] Nach 10 Min wird Reservierung zurückgesetzt
- [ ] Andere User können reservierten Slot NICHT buchen (409 Error)

### Appointment Creation
- [ ] Buchung funktioniert innerhalb 10 Min
- [ ] Appointment wird in DB erstellt
- [ ] Slot wird auf `is_available = false` gesetzt
- [ ] Success/Error Messages werden angezeigt

### Error Handling
- [ ] Expired Reservation: User wird informiert
- [ ] Slot already taken: User sieht Error + neue Slots
- [ ] Network errors: User sieht Error Message

---

## 📊 CODE REDUCTION

**VORHER:**
- 3394 Zeilen total
- ~500 Zeilen für Slot-Generation
- ~200 Zeilen für DB Queries
- ~100 Zeilen für Conflict-Detection

**NACHHER:**
- ~1500 Zeilen total (-56%)
- ~50 Zeilen für Slot-Fetching (-90%)
- 0 Zeilen für DB Queries (-100%)
- 0 Zeilen für Conflict-Detection (-100%)

---

## 🚀 NÄCHSTE SCHRITTE

1. **Backup erstellen:**
   ```bash
   cp pages/booking/availability/\[slug\].vue pages/booking/availability/\[slug\].vue.backup
   ```

2. **Migration durchführen:**
   - Schritt 1-6 oben durchgehen
   - Zeile für Zeile testen

3. **Testing:**
   - Dev Server starten
   - Booking Flow durchgehen
   - Alle Checkboxen oben abhaken

4. **Deployment:**
   - Erst in Staging testen
   - Dann Production

---

## 💡 SOLL ICH ES MACHEN?

Ich kann die Migration **jetzt für dich durchführen**!

**A)** Ja, bitte jetzt migrieren (dauert ~30-60 Min)  
**B)** Nur ein Teil (z.B. nur Slot-Fetching)  
**C)** Erstmal Backup + Testing Script  
**D)** Später - reicht für heute

**Was möchtest du?** 😊

