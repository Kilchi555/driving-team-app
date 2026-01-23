## COURSE ENROLLMENT PROCESS - AKTUELLER STAND & FEHLENDE TEILE

### AKTUELLE ARCHITEKTUR:

#### **1. ENROLLMENT-FLOW (3 Wege)**

**A) WALLEE/ONLINE PAYMENT (enroll-wallee.post.ts)**
✅ IMPLEMENTIERT:
- Validiert SARI-Daten (FABERID, Geburtstag)
- Lizenz-Validierung (A1, A35kW, A, B)
- Erstellt `course_registrations` mit status="pending"
- Erstellt Payment in Wallee
- Gibt Wallee Payment URL zurück

❌ FEHLT:
- Guest User werden NICHT erstellt (user_id wird NULL wenn kein auth user)
- Keine Payment in der `payments` Tabelle erstellt (Payment passiert nur in Wallee!)
- Keine Verknüpfung zwischen course_registration.payment_id und payments.id
- Email/Phone nicht in course_registrations gespeichert

**B) CASH PAYMENT (enroll-cash.post.ts)**
✅ IMPLEMENTIERT:
- Validiert SARI-Daten
- Erstellt course_registrations mit status="confirmed" (keine Zahlung)
- Ruft sofort SARI-Enrollment auf
- Versendet Bestätigungsmail

❌ FEHLT:
- Guest User werden NICHT erstellt
- Keine Payment in payments Tabelle (kein Tracking!)

**C) MANAGED UPLOAD**
❌ NICHT IMPLEMENTIERT:
- CSV/Batch-Upload für Admin
- Guest User Creation für Batch

---

#### **2. PAYMENT-FLOW**

**Wallee Payment Integration (process-public.post.ts)**
✅ IMPLEMENTIERT:
- Erstellt Payment in Wallee
- Gibt Payment URL zurück
- Speichert wallee_transaction_id in payments

❌ FEHLT:
- Verknüpfung zu course_registrations.payment_id fehlt!
- Payment wird in `payments` Tabelle mit:
  - user_id: ✅ Hat
  - appointment_id: NULL ✅ Korrekt
  - **course_registration_id: ❌ FEHLT** ← Kritisch!

**Wallee Webhook (webhook.post.ts)**
✅ IMPLEMENTIERT:
- Empfängt Payment-Updates von Wallee
- Aktualisiert Payment Status
- Sendet Enrollment Confirmation Emails
- Calls SARI Enrollment via enroll-complete.post.ts

❌ FEHLT:
- Keine course_registrations Status Update auf "confirmed"!
- Webhook sucht Payment by wallee_transaction_id aber weiß nicht, welche course_registration betroffen ist

**Enrollment Completion (enroll-complete.post.ts)**
✅ IMPLEMENTIERT:
- SARI Enrollment API Call
- Erstellt course_participants
- Erstellt course_registrations (aber: nutzt participant_id statt user_id!)

❌ FEHLT:
- Aktualisiert NOT course_registrations.status = "confirmed"
- Nutzt `participant_id` (alt) statt `user_id` (neu Schema)

---

#### **3. DATENBANK-SCHEMA PROBLEME**

**payments Tabelle:**
```sql
id, user_id, appointment_id, wallee_transaction_id, ...
```
❌ FEHLT: `course_registration_id` ← Kritisch für Verknüpfung!
❌ FEHLT: `created_by` (wer hat Payment erstellt?)

**course_registrations Tabelle:**
```sql
id, course_id, user_id, email, phone, payment_id, status, ...
```
⚠️ PROBLEM: 
- `user_id` ist OPTIONAL (allows NULL für Gäste)
- Aber kein echtes Guest User System!
- `payment_id` zeigt auf `payments` Tabelle, aber kein FK Constraint!
- email/phone gespeichert, aber auch in `users` Tabelle falls user_id existiert

---

#### **4. USER-MANAGEMENT PROBLEME**

**Current State:**
- Gäste können sich anmelden OHNE Guest User zu erstellen
- Wenn Guest registriert, dann:
  - course_registrations.user_id = NULL
  - Aber payments.user_id braucht WERT!
  - ❌ Verwaiste Payments entstehen!

**Issue im code (enroll-wallee.post.ts, Zeile 177):**
```typescript
// Course registrations erstellt OHNE user_id!
const { data: enrollment, error: enrollmentError } = await supabase
  .from('course_registrations')
  .insert({
    course_id: courseId,
    tenant_id: tenantId,
    email: finalEmail,
    phone: finalPhone,
    // ❌ user_id wird NICHT gesetzt!
    status: 'pending',
    payment_status: 'pending'
  })
```

---

### FEHLENDE IMPLEMENTIERUNGEN:

#### **1. GUEST USER CREATION** (PRIORITÄT: HOCH)
```typescript
// Sollte bei jedem Enrollment ohne auth user passieren:
const guestUser = await supabase.from('users').insert({
  first_name: customerData.firstname,
  last_name: customerData.lastname,
  email: finalEmail,
  auth_user_id: null,  // Kein Login
  is_guest: true,
  tenant_id: tenantId
})

// Dann:
course_registrations.user_id = guestUser.id
```

#### **2. DATABASE SCHEMA UPDATES** (PRIORITÄT: HOCH)
```sql
-- Add course_registration_id to payments
ALTER TABLE payments ADD COLUMN course_registration_id UUID REFERENCES course_registrations(id);

-- Add FK Constraint zu course_registrations
ALTER TABLE course_registrations ADD CONSTRAINT fk_payment_id
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Make user_id REQUIRED (nach Guest User Implementation)
ALTER TABLE course_registrations ALTER COLUMN user_id SET NOT NULL;
```

#### **3. WALLEE WEBHOOK ENHANCEMENT** (PRIORITÄT: HOCH)
```typescript
// Nach Payment Status Update, auch course_registration aktualisieren:
if (paymentStatus === 'completed') {
  const courseRegistrations = await supabase
    .from('course_registrations')
    .update({
      status: 'confirmed',
      payment_status: 'paid'
    })
    .eq('payment_id', payment.id)
}
```

#### **4. PAYMENT TRACKING** (PRIORITÄT: MITTEL)
```typescript
// Verbesserungen beim Payment erstellen:
const payment = await createPaymentInSupabase({
  user_id: guestUser.id,  // Jetzt vorhanden!
  course_registration_id: enrollment.id,  // Neu
  appointment_id: null,
  payment_method: 'wallee',
  wallee_transaction_id: transactionId,
  total_amount_rappen: course.price_per_participant_rappen,
  description: `Course: ${course.name}`
})
```

#### **5. EMAIL/PHONE HANDLING** (PRIORITÄT: MITTEL)
- Email/Phone in course_registrations speichern ✅
- Email/Phone auch in users speichern (falls user_id != null)
- Nicht duplizieren

#### **6. MANAGED UPLOAD FEATURE** (PRIORITÄT: NIEDRIG)
```
POST /api/courses/admin/bulk-enroll
- CSV Upload
- Erstellt Guest Users
- Erstellt course_registrations
- Erstellt Payments (cash only oder pre-authorized)
```

---

### ZUSAMMENFASSUNG - WAS FUNKTIONIERT:

✅ SARI Validierung
✅ Wallee Payment Integration
✅ Payment Status Tracking via Webhook
✅ SARI Enrollment nach Payment
✅ Email Notifications

---

### ZUSAMMENFASSUNG - WAS NICHT FUNKTIONIERT:

❌ Guest User Creation
❌ Payment ↔ course_registration Verknüpfung
❌ Verwaiste Payments (user_id=NULL)
❌ Payment Status in course_registrations wird nicht aktualisiert
❌ Batch/CSV Upload für Admin

---

### EMPFOHLENE REPARATUR-REIHENFOLGE:

1. **Sofort (KRITISCH):** Guest User Creation in enroll-wallee.post.ts
2. **Sofort (KRITISCH):** Webhook aktualisiert course_registrations.status
3. **Heute:** Database Schema Updates (course_registration_id, FK)
4. **Diese Woche:** Payment ID Verknüpfung in enroll-wallee.post.ts
5. **Später:** Managed Upload Feature

---

### TESTING-PLAN:

1. Create Course
2. Enroll ohne Login → Guest User sollte entstehen
3. Zahle mit Wallee
4. Webhook wird getriggert
5. Prüfe: course_registrations.status = "confirmed"
6. Prüfe: payments.course_registration_id ist gesetzt
7. Prüfe: SARI Enrollment passiert

