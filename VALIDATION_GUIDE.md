# Input Validation Library

Centralized backend input validation für alle API endpoints. Verhindert XSS, SQL Injection, und andere Sicherheitsprobleme.

## Verwendung

### Import

```typescript
import {
  validateAppointmentData,
  validatePaymentData,
  validateEmail,
  validateUUID,
  sanitizeString,
  throwValidationError,
  throwIfInvalid
} from '~/server/utils/validators'
```

## Validators

### String Validators

#### `sanitizeString(value, maxLength?)`
Sanitiert Strings gegen XSS.
```typescript
const title = sanitizeString(body.title, 255) // Max 255 chars
```

#### `validateEmail(email)`
Validiert Email-Format.
```typescript
if (!validateEmail(body.email)) {
  // Invalid
}
```

#### `validatePassword(password)`
Validiert Password-Stärke (min 8 chars, uppercase, lowercase, numbers).
```typescript
const validation = validatePassword(body.password)
if (!validation.valid) {
  console.log(validation.message) // "Passwort muss Großbuchstaben enthalten"
}
```

#### `validateUUID(value)`
Validiert UUID Format.
```typescript
if (!validateUUID(body.user_id)) {
  // Invalid
}
```

#### `validateRequiredString(value, fieldName, maxLength?)`
Validiert erforderliche Strings mit Längenlimit.
```typescript
const validation = validateRequiredString(body.name, 'Name', 100)
if (!validation.valid) {
  console.log(validation.error) // "Name ist erforderlich" oder "Name darf maximal 100 Zeichen..."
}
```

### Numeric Validators

#### `validatePositiveNumber(value, fieldName, allowZero?)`
Validiert positive Zahlen.
```typescript
const validation = validatePositiveNumber(body.count, 'Count')
if (!validation.valid) {
  // "Count muss größer als 0 sein"
}
```

#### `validateAmount(value, fieldName?, minRappen?, maxRappen?)`
Validiert CHF-Beträge in Rappen (ganze Zahlen).
```typescript
const validation = validateAmount(body.total_amount_rappen, 'Betrag', 0, 999999999)
// Prüft: positive, ganzzahlig, im Range
```

#### `validateDuration(value, fieldName?, minMinutes?, maxMinutes?)`
Validiert Dauer in Minuten (15-480 default).
```typescript
const validation = validateDuration(body.duration_minutes)
// Default: 15-480 min
```

### Date/Time Validators

#### `validateISODate(value, fieldName?)`
Validiert ISO 8601 Datum-Strings.
```typescript
const validation = validateISODate(body.start_time)
if (validation.valid) {
  const date = validation.date // Parsed Date object
}
```

#### `validateAppointmentTimes(startTime, endTime, allowPastAppointments?)`
Validiert Appointment-Zeitfenster.
```typescript
const validation = validateAppointmentTimes(
  body.start_time,
  body.end_time,
  false // Keine Vergangenheit
)
// Prüft: start < end, nicht in Vergangenheit
```

### Enum Validators

#### `validateDrivingCategory(value, fieldName?)`
Validiert Fahrkategorien: A, A1, A2, B, BE, B96, C, C1, CE, etc.
```typescript
const validation = validateDrivingCategory(body.type)
```

#### `validateEventType(value, fieldName?)`
Validiert Event Types: lesson, exam, practice, course, other
```typescript
const validation = validateEventType(body.event_type_code)
```

#### `validateAppointmentStatus(value, fieldName?)`
Validiert Appointment Status: pending_confirmation, confirmed, completed, cancelled, etc.
```typescript
const validation = validateAppointmentStatus(body.status)
```

#### `validatePaymentStatus(value, fieldName?)`
Validiert Payment Status: pending, completed, failed, cancelled, refunded
```typescript
const validation = validatePaymentStatus(body.payment_status)
```

#### `validatePaymentMethod(value, fieldName?)`
Validiert Payment Methods: cash, credit, wallee, bank_transfer, other
```typescript
const validation = validatePaymentMethod(body.payment_method)
```

### Complex Validators

#### `validateAppointmentData(data)`
Validiert kompletten Appointment mit allen Feldern.
```typescript
const validation = validateAppointmentData({
  user_id: body.user_id,
  staff_id: body.staff_id,
  start_time: body.start_time,
  end_time: body.end_time,
  duration_minutes: body.duration_minutes,
  type: body.type,
  event_type_code: body.event_type_code,
  status: body.status,
  tenant_id: body.tenant_id,
  title: body.title,
  description: body.description,
  location_id: body.location_id,
  custom_location_name: body.custom_location_name,
  custom_location_address: body.custom_location_address
})

if (!validation.valid) {
  console.log(validation.errors) // { user_id: "...", staff_id: "..." }
}
```

#### `validatePaymentData(data)`
Validiert kompletten Payment mit allen Feldern.
```typescript
const validation = validatePaymentData({
  user_id: body.user_id,
  appointment_id: body.appointment_id,
  total_amount_rappen: body.total_amount_rappen,
  payment_status: body.payment_status,
  payment_method: body.payment_method,
  currency: body.currency
})

if (!validation.valid) {
  console.log(validation.errors)
}
```

## Helper Functions

#### `throwValidationError(errors, fieldName?)`
Wirft einen HTTP 400 Error mit Validierungsfehlern.
```typescript
const errors = {
  user_id: 'Ungültige Benutzer-ID',
  email: 'Ungültige E-Mail-Adresse'
}
throwValidationError(errors)
// => HTTP 400: "Validierungsfehler: user_id: Ungültige Benutzer-ID; email: Ungültige E-Mail-Adresse"
```

#### `throwIfInvalid(validation)`
Wirft Fehler nur wenn Validierung fehlgeschlagen ist.
```typescript
const validation = validateAppointmentData(body)
throwIfInvalid(validation) // Wirft nur wenn invalid
```

## Beispiele

### Appointment erstellen (create-appointment.post.ts)

```typescript
import {
  validateAppointmentData,
  sanitizeString,
  throwIfInvalid
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // 1. Validiere alle Daten
  const validation = validateAppointmentData({
    user_id: body.user_id,
    staff_id: body.staff_id,
    start_time: body.start_time,
    end_time: body.end_time,
    duration_minutes: body.duration_minutes,
    type: body.type,
    tenant_id: body.tenant_id
  })
  
  // 2. Wirfe Fehler wenn ungültig
  throwIfInvalid(validation)
  
  // 3. Sanitize Strings
  const title = sanitizeString(body.title, 255)
  const description = sanitizeString(body.description, 1000)
  
  // 4. Verwende validierte Daten
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...body, title, description })
    .select()
    .single()
})
```

### Payment erstellen (payments/create.post.ts)

```typescript
import {
  validatePaymentData,
  validateEmail,
  validateUUID,
  throwValidationError
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // 1. Validiere Payment
  const paymentValidation = validatePaymentData(body)
  throwIfInvalid(paymentValidation)
  
  // 2. Zusätzliche Checks
  const errors: Record<string, string> = {}
  
  if (!validateEmail(body.customerEmail)) {
    errors.customerEmail = 'Ungültige E-Mail-Adresse'
  }
  
  if (body.appointmentId && !validateUUID(body.appointmentId)) {
    errors.appointmentId = 'Ungültiges Format'
  }
  
  if (Object.keys(errors).length > 0) {
    throwValidationError(errors)
  }
  
  // 3. Verwende validierte Daten
  // ...
})
```

## Sicherheitsfeatures

✅ **XSS Prevention**: `sanitizeString()` entfernt HTML/JavaScript
✅ **UUID Validation**: Prüft UUID Format
✅ **Email Validation**: RFC-konform
✅ **Amount Validation**: Nur ganze Zahlen, positive, im Range
✅ **Duration Validation**: Min/Max Minuten
✅ **Enum Validation**: Nur erlaubte Werte
✅ **Date Validation**: ISO 8601 Format, nicht in Vergangenheit
✅ **Type Safety**: TypeScript Interfaces

## Best Practices

1. **Immer validieren**: Jeder Input sollte validiert werden
2. **Komplexe Validatoren nutzen**: `validateAppointmentData()` statt einzelne Checks
3. **Früh wirfen**: Validierungsfehler am Anfang der Function werfen
4. **Sanitize vor DB**: Strings vor Insert/Update sanitizen
5. **Aussagekräftige Errors**: Welches Feld? Welcher Grund?

## Roadmap

- [ ] Rate Limiting per User
- [ ] Tenant-Isolation Checks
- [ ] Custom Validator Plugins
- [ ] Async Validators (DB Checks)
- [ ] Localization (DE, EN, FR, IT)



