# Medical Certificate System - Implementierungs-Guide

## Übersicht

Dieses 3-Stufen-System ermöglicht es Kunden, Arztzeugnisse hochzuladen, damit Admins diese prüfen und Kosten erstatten können.

## Stufen

### Stufe 1: Kunde sagt ab
- Wählt Absage-Grund (z.B. "Krank")
- System prüft: `requires_proof = true`?
- Zeigt Hinweis: "Mit Arztzeugnis kostenlos - bitte innerhalb 7 Tagen einreichen"
- Erstmal 100% charge (wird bei Genehmigung auf 0% gesetzt)

### Stufe 2: Kunde lädt Arztzeugnis hoch
- Neuer Bereich in Customer Dashboard: "Abgesagte Termine"
- Upload-Funktion für PDF/Bilder
- Status ändert zu "uploaded"
- Admin erhält Benachrichtigung

### Stufe 3: Admin prüft & genehmigt
- Admin-Seite: `/admin/medical-certificate-reviews`
- Sieht hochgeladenes Zeugnis
- Buttons: "Genehmigen" | "Ablehnen"
- Bei Genehmigung:
  - `cancellation_charge_percentage` → 0%
  - Payment wird storniert/erstattet
  - Guthaben wird erstellt (optional)
  - Kunde erhält E-Mail

---

## 1. DB Migration ausführen

```bash
# In Supabase SQL Editor
# Datei: medical_certificate_system_migration.sql
```

**Was wird erstellt:**
- Neue Spalten in `cancellation_reasons` (requires_proof, proof_description, etc.)
- Neue Spalten in `appointments` (medical_certificate_status, medical_certificate_url, etc.)
- View `medical_certificate_reviews` für Admin-Dashboard
- Konfiguration für alle existierenden Absage-Gründe

---

## 2. Code-Änderungen

### A. EventModal.vue - Hinweis bei Absage

**Datei:** `components/EventModal.vue`

```typescript
// Nach Absage-Grund-Auswahl
const confirmCancellationWithReason = async () => {
  const selectedReason = cancellationReasons.value.find(
    r => r.id === selectedCancellationReasonId.value
  )
  
  // ✅ NEU: Prüfe ob Arztzeugnis erforderlich
  if (selectedReason?.requires_proof) {
    // Zeige Hinweis Modal
    showProofRequirementModal.value = true
    proofInstructions.value = selectedReason.proof_instructions
    proofDeadlineDays.value = selectedReason.proof_deadline_days
    
    // Setze Status für späteren Upload
    await supabase
      .from('appointments')
      .update({
        medical_certificate_status: 'pending',
        original_charge_percentage: cancellationPolicyResult.value.chargePercentage
      })
      .eq('id', props.eventData.id)
  }
  
  // Normale Absage fortsetzen...
}
```

### B. Customer Dashboard - Upload-Bereich

**Neue Komponente:** `components/customer/MedicalCertificateUpload.vue`

```vue
<template>
  <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-yellow-400">...</svg>
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-yellow-800">
          Arztzeugnis erforderlich
        </h3>
        <div class="mt-2 text-sm text-yellow-700">
          <p>{{ proofInstructions }}</p>
          <p class="mt-1 text-xs">
            Deadline: {{ deadline }} (noch {{ daysRemaining }} Tage)
          </p>
        </div>
        
        <!-- Upload Area -->
        <div class="mt-4">
          <input 
            type="file" 
            @change="handleFileUpload"
            accept=".pdf,.jpg,.jpeg,.png"
            ref="fileInput"
            class="hidden"
          />
          
          <button 
            v-if="!uploadedFile"
            @click="$refs.fileInput.click()"
            class="bg-yellow-600 text-white px-4 py-2 rounded-lg"
          >
            Arztzeugnis hochladen
          </button>
          
          <div v-else class="text-green-600">
            ✅ Hochgeladen - Wird geprüft
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  // Upload zu Cloudflare Images oder Supabase Storage
  const formData = new FormData()
  formData.append('file', file)
  formData.append('appointmentId', props.appointmentId)
  
  const response = await $fetch('/api/medical-certificate/upload', {
    method: 'POST',
    body: formData
  })
  
  uploadedFile.value = response.url
  emit('uploaded')
}
</script>
```

### C. Admin Review Page

**Neue Seite:** `pages/admin/medical-certificate-reviews.vue`

```vue
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Arztzeugnis-Prüfungen</h1>
    
    <!-- Tabs -->
    <div class="mb-4">
      <button 
        @click="filter = 'uploaded'"
        :class="filter === 'uploaded' ? 'bg-blue-600 text-white' : 'bg-gray-200'"
      >
        Hochgeladen ({{ uploadedCount }})
      </button>
      <button 
        @click="filter = 'pending'"
        :class="filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200'"
      >
        Ausstehend ({{ pendingCount }})
      </button>
    </div>
    
    <!-- Liste -->
    <div class="space-y-4">
      <div 
        v-for="review in filteredReviews" 
        :key="review.appointment_id"
        class="bg-white border rounded-lg p-4"
      >
        <!-- Kunde Info -->
        <div class="flex justify-between mb-3">
          <div>
            <h3 class="font-semibold">
              {{ review.customer_first_name }} {{ review.customer_last_name }}
            </h3>
            <p class="text-sm text-gray-600">{{ review.customer_email }}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold">CHF {{ (review.total_amount_rappen / 100).toFixed(2) }}</p>
            <p class="text-xs text-gray-500">{{ formatDate(review.start_time) }}</p>
          </div>
        </div>
        
        <!-- Arztzeugnis -->
        <div v-if="review.medical_certificate_url" class="mb-3">
          <a 
            :href="review.medical_certificate_url" 
            target="_blank"
            class="text-blue-600 underline"
          >
            📄 Arztzeugnis anzeigen
          </a>
          <p class="text-xs text-gray-500 mt-1">
            Hochgeladen vor {{ review.days_since_upload }} Tagen
          </p>
        </div>
        
        <!-- Notizen -->
        <textarea
          v-model="review.notes"
          placeholder="Notizen zur Prüfung..."
          class="w-full border rounded p-2 text-sm mb-3"
        />
        
        <!-- Actions -->
        <div class="flex space-x-2">
          <button
            @click="approve(review)"
            class="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            ✅ Genehmigen & Erstatten
          </button>
          <button
            @click="reject(review)"
            class="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            ❌ Ablehnen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const reviews = ref([])

const loadReviews = async () => {
  const { data } = await supabase
    .from('medical_certificate_reviews')
    .select('*')
    .eq('tenant_id', currentTenant.value.id)
  
  reviews.value = data || []
}

const approve = async (review: any) => {
  await $fetch('/api/medical-certificate/approve', {
    method: 'POST',
    body: {
      appointmentId: review.appointment_id,
      notes: review.notes
    }
  })
  
  await loadReviews()
}

const reject = async (review: any) => {
  await $fetch('/api/medical-certificate/reject', {
    method: 'POST',
    body: {
      appointmentId: review.appointment_id,
      notes: review.notes
    }
  })
  
  await loadReviews()
}

onMounted(() => loadReviews())
</script>
```

---

## 3. API Endpoints

### A. Upload Endpoint

**Datei:** `server/api/medical-certificate/upload.post.ts`

```typescript
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  
  const file = formData?.find(f => f.name === 'file')
  const appointmentId = formData?.find(f => f.name === 'appointmentId')?.data.toString()
  
  if (!file || !appointmentId) {
    throw createError({ statusCode: 400, message: 'File und appointmentId erforderlich' })
  }
  
  // Upload zu Cloudflare Images (oder Supabase Storage)
  const uploadUrl = await uploadToCloudflare(file)
  
  // Update appointment
  const supabase = getSupabase()
  const { error } = await supabase
    .from('appointments')
    .update({
      medical_certificate_status: 'uploaded',
      medical_certificate_url: uploadUrl,
      medical_certificate_uploaded_at: new Date().toISOString()
    })
    .eq('id', appointmentId)
  
  if (error) throw error
  
  // TODO: Benachrichtige Admin
  
  return { url: uploadUrl, status: 'uploaded' }
})
```

### B. Approve Endpoint

**Datei:** `server/api/medical-certificate/approve.post.ts`

```typescript
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export default defineEventHandler(async (event) => {
  const { appointmentId, notes } = await readBody(event)
  const currentUser = event.context.user
  
  const supabase = getSupabaseAdmin()
  
  // 1. Get appointment + payment
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, payments(*)')
    .eq('id', appointmentId)
    .single()
  
  if (!appointment) {
    throw createError({ statusCode: 404, message: 'Termin nicht gefunden' })
  }
  
  // 2. Update appointment
  await supabase
    .from('appointments')
    .update({
      medical_certificate_status: 'approved',
      medical_certificate_reviewed_by: currentUser.id,
      medical_certificate_reviewed_at: toLocalTimeString(new Date()),
      medical_certificate_notes: notes,
      cancellation_charge_percentage: 0,  // ✅ JETZT 0%!
      cancellation_credit_hours: true
    })
    .eq('id', appointmentId)
  
  // 3. Handle payment
  const payment = appointment.payments[0]
  
  if (payment) {
    if (payment.payment_status === 'completed' && payment.paid_at) {
      // Fall A: Bereits bezahlt → Erstatte oder Guthaben
      await createRefundOrCredit(payment, appointment.user_id)
    } else if (payment.payment_status === 'pending' || payment.payment_status === 'authorized') {
      // Fall B: Noch nicht bezahlt → Storniere
      await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled',
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', payment.id)
    }
  }
  
  // 4. Benachrichtige Kunden
  // TODO: E-Mail senden
  
  return { success: true, message: 'Arztzeugnis genehmigt' }
})

async function createRefundOrCredit(payment: any, userId: string) {
  // Option A: Guthaben erstellen (empfohlen)
  const supabase = getSupabaseAdmin()
  await supabase
    .from('user_credits')
    .insert({
      user_id: userId,
      amount_rappen: payment.total_amount_rappen,
      reason: `Arztzeugnis genehmigt - Termin vom ${payment.created_at}`,
      created_at: toLocalTimeString(new Date())
    })
  
  // Option B: Refund über Wallee (falls gewünscht)
  // await walleeRefund(payment.wallee_transaction_id, payment.total_amount_rappen)
}
```

### C. Reject Endpoint

**Datei:** `server/api/medical-certificate/reject.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const { appointmentId, notes } = await readBody(event)
  const currentUser = event.context.user
  
  const supabase = getSupabaseAdmin()
  
  await supabase
    .from('appointments')
    .update({
      medical_certificate_status: 'rejected',
      medical_certificate_reviewed_by: currentUser.id,
      medical_certificate_reviewed_at: toLocalTimeString(new Date()),
      medical_certificate_notes: notes
    })
    .eq('id', appointmentId)
  
  // Benachrichtige Kunden
  // TODO: E-Mail senden
  
  return { success: true, message: 'Arztzeugnis abgelehnt' }
})
```

---

## 4. Utils: Policy Calculation anpassen

**Datei:** `utils/policyCalculations.ts`

```typescript
export const calculateCancellationCharges = (
  policy: PolicyWithRules,
  appointmentData: AppointmentData,
  cancellationDate: Date = new Date(),
  selectedReason?: CancellationReason  // ✅ NEU
): CancellationResult => {
  
  // ✅ NEU: Prüfe ob Grund Zeit-Regeln ignoriert
  if (selectedReason?.ignore_time_rules) {
    return {
      chargePercentage: selectedReason.force_charge_percentage || 0,
      shouldCreditHours: selectedReason.force_credit_hours || false,
      applicableRule: null,
      invoiceDescription: `${selectedReason.name_de} - Kulanzregelung`
    }
  }
  
  // Normale zeitbasierte Berechnung...
  const appointmentDate = new Date(appointmentData.start_time)
  const hoursBeforeAppointment = Math.floor(
    (appointmentDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60)
  )
  
  const applicableRule = policy.rules.find(rule => {
    const comparisonType = rule.comparison_type || 'more_than'
    if (comparisonType === 'more_than') {
      return hoursBeforeAppointment >= rule.hours_before_appointment
    } else {
      return hoursBeforeAppointment <= rule.hours_before_appointment
    }
  }) || policy.rules[policy.rules.length - 1]
  
  return {
    chargePercentage: applicableRule.charge_percentage,
    shouldCreditHours: applicableRule.credit_hours_to_instructor,
    applicableRule,
    invoiceDescription: applicableRule.description
  }
}
```

---

## 5. Testing Checklist

### Schritt 1: DB Migration
- [ ] Migration in Supabase SQL Editor ausführen
- [ ] Prüfen: `SELECT * FROM cancellation_reasons WHERE requires_proof = true`
- [ ] Prüfen: `SELECT * FROM medical_certificate_reviews LIMIT 1`

### Schritt 2: Absage testen
- [ ] Termin als Kunde absagen (Grund: "Krank")
- [ ] Prüfen: Hinweis "Arztzeugnis erforderlich" wird angezeigt
- [ ] Prüfen: `medical_certificate_status = 'pending'` in DB

### Schritt 3: Upload testen
- [ ] Customer Dashboard öffnen
- [ ] Abgesagten Termin finden
- [ ] PDF/Bild hochladen
- [ ] Prüfen: Status ändert zu 'uploaded'

### Schritt 4: Admin Review testen
- [ ] `/admin/medical-certificate-reviews` öffnen
- [ ] Hochgeladenes Zeugnis sehen
- [ ] "Genehmigen" klicken
- [ ] Prüfen: `cancellation_charge_percentage = 0` in DB
- [ ] Prüfen: Payment storniert oder Guthaben erstellt

---

## 6. Nächste Schritte

1. **Migration ausführen** (`medical_certificate_system_migration.sql`)
2. **API Endpoints erstellen** (upload, approve, reject)
3. **EventModal anpassen** (Hinweis bei Absage)
4. **Customer Upload UI** (neue Komponente)
5. **Admin Review Page** (neue Seite)
6. **E-Mail Benachrichtigungen** (optional)

---

## Fragen?

- Wo sollen Dateien gespeichert werden? (Cloudflare Images oder Supabase Storage?)
- Guthaben oder Refund? (Empfehlung: Guthaben)
- E-Mail-Benachrichtigungen gewünscht?

