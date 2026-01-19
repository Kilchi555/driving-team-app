# Public Courses Pages - Dokumentation

## Übersicht

Das System ermöglicht es Besuchern, sich zu öffentlichen Kursen anzumelden. Es gibt zwei Hauptseiten:

1. **`/customer/courses`** - Allgemeine Kursübersicht (optional)
2. **`/customer/courses/[slug]`** - Tenant-spezifische Kurse (z.B. `/customer/courses/driving-team`)

---

## Architektur

### Frontend-Flow

```
Besucher öffnet URL
         ↓
[slug].vue lädt Tenant-Daten
         ↓
Zeigt alle aktiven, öffentlichen Kurse
         ↓
Besucher klickt auf Kurs
         ↓
CourseEnrollmentModal öffnet
         ↓
Step 1: SARI-Lookup (FABERID + Birthdate)
         ↓
Step 2: Kontaktdaten + Zahlung
         ↓
Enrollment API aufgerufen
         ↓
Bei WALLEE → Zahlung
Bei CASH → Bestätigung
```

---

## Dateien & ihre Aufgaben

### 1. **`pages/customer/courses/[slug].vue`** (380 Zeilen)
**Zweck:** Zeigt öffentliche Kurse für einen bestimmten Tenant

**Was es macht:**
- Lädt Tenant-Daten basierend auf dem URL-Slug (z.B. "driving-team")
- Ruft alle **aktiven, öffentlichen Kurse** mit zukünftigen Sessions ab
- Gruppiert Sessions pro Tag (z.B. "Mo 20.01 18:00 - 20:00 (2 Teile)")
- Bietet Filter nach Kategorie und Standort
- Unterstützt Query-Parameter: `?category=VKU&location=Zürich`
- Öffnet `CourseEnrollmentModal` beim Klick auf einen Kurs

**Wichtige Funktionen:**
```typescript
loadTenant()           // Lädt Tenant-Info aus Slug
loadCourses()          // Ruft Kurse von DB ab
getGroupedSessions()   // Gruppiert Sessions nach Datum
formatPrice()          // Formatiert Preis in CHF
```

**Query-Anforderungen:**
```typescript
// Lädt nur:
// - is_public = true
// - status = 'active'
// - course_sessions mit start_time in der Zukunft
```

---

### 2. **`components/customer/CourseEnrollmentModal.vue`** (400+ Zeilen)
**Zweck:** Modal für Kursanmeldung mit SARI-Integration

**2-Schritt-Process:**

#### **Step 1: SARI Lookup**
```
Input: FABERID + Geburtsdatum
       ↓
API: POST /api/sari/lookup-customer
       ↓
Validiert gegen SARI-System
       ↓
Gibt Kundendaten zurück (Name, Adresse, Lizenzen)
```

#### **Step 2: Kontaktdaten & Zahlung**
```
Zeigt SARI-Daten an (verifiziert)
       ↓
Input: E-Mail + Telefon (optional vorausgefüllt)
       ↓
Wählt Zahlungsart (basierend auf Standort)
       ↓
Klick "Zur Zahlung" oder "Verbindlich anmelden"
       ↓
Ruft Enrollment API auf (enroll-wallee.post.ts oder enroll-cash.post.ts)
```

**Wichtige Funktionen:**
```typescript
lookupSARI()           // Validiert gegen SARI
submitEnrollment()     // Erstellt Enrollment + Zahlung
formatSessionDate()    // Formatiert Datum
groupedSessions        // Gruppiert Sessions nach Tag
paymentMethod          // Bestimmt Zahlungsart (WALLEE/CASH)
```

---

### 3. **`utils/courseLocationUtils.ts`** (60 Zeilen)
**Zweck:** Bestimmt Zahlungsart basierend auf Standort

**Funktionen:**
```typescript
extractCityFromCourseDescription()  // "Zürich" → "Zürich"
determinePaymentMethod()            // "Zürich" → "WALLEE"
getPaymentMethodLabel()             // "WALLEE" → "Online-Zahlung"
getPaymentMethodDescription()       // Weitere Infos
```

**Zahlungsart-Matrix:**
| Standort | Zahlungsart |
|----------|-------------|
| Zürich | Online (Wallee) |
| Lachen | Online (Wallee) |
| Einsiedeln | Barzahlung |
| Andere | Barzahlung |

---

### 4. **Backend APIs**

#### **`/api/sari/lookup-customer.post.ts`**
```
POST /api/sari/lookup-customer
{
  faberid: "69197806",           // Ohne Punkte!
  birthdate: "2007-03-31",
  tenantId: "64259d68-..."
}

Response:
{
  success: true,
  customer: {
    firstname: "Max",
    lastname: "Mustermann",
    address: "Musterstrasse 1",
    zip: "8000",
    city: "Zürich",
    email: "max@example.com",
    phone: "+41791234567",
    licenses: [
      { category: "B", expirationdate: "2026-12-31" }
    ]
  }
}
```

#### **`/api/courses/enroll-wallee.post.ts`**
```
POST /api/courses/enroll-wallee
{
  courseId: "uuid",
  faberid: "69197806",
  birthdate: "2007-03-31",
  tenantId: "64259d68-...",
  email: "max@example.com",
  phone: "+41791234567"
}

Response:
{
  success: true,
  paymentUrl: "https://app.wallee.com/..."  // Weiterleitungslink
}
```

#### **`/api/courses/enroll-cash.post.ts`**
```
POST /api/courses/enroll-cash
{
  courseId: "uuid",
  faberid: "69197806",
  birthdate: "2007-03-31",
  tenantId: "64259d68-...",
  email: "max@example.com",
  phone: "+41791234567"
}

Response:
{
  success: true,
  message: "Anmeldung bestätigt"
}
```

---

## Sicherheit & RLS Policies

### Public Access Required:
```sql
-- courses table
CREATE POLICY "courses_anonymous_read"
  ON courses FOR SELECT TO public
  USING (is_public = true);

-- course_sessions table
CREATE POLICY "course_sessions_public_read"
  ON course_sessions FOR SELECT TO public
  USING (true);
```

### Middleware-Config:
```typescript
// middleware/auth.ts - Diese Routen sind öffentlich:
const isPublicRoute = ...
  || to.path.startsWith('/customer/courses')
```

---

## Ablauf: Komplettes Beispiel

### 1. Besucher öffnet URL
```
http://localhost:3000/customer/courses/driving-team
```

### 2. Seite lädt
- `[slug].vue` erkennt slug: "driving-team"
- Sucht Tenant mit slug "driving-team" → findet Fahrschule Driving Team
- Lädt 30 aktive, öffentliche Kurse mit zukünftigen Sessions
- Zeigt sie mit Filtern an

### 3. Besucher klickt auf "VKU Zürich"
- `CourseEnrollmentModal` öffnet
- **Step 1**: Input "69197806" (FABERID) + "2007-03-31" (Geburtstag)
- Klick "Weiter"

### 4. Modal validiert gegen SARI
```
POST /api/sari/lookup-customer
→ SARI antwortet: "Max Mustermann, B-Lizenz gültig"
→ Modal wechselt zu Step 2
```

### 5. Besucher sieht Step 2
- Grünes Banner: "Daten verifiziert: Max Mustermann"
- E-Mail: max@sari.ch (vorausgefüllt)
- Telefon: +41791234567 (vorausgefüllt)
- Button: "Zur Zahlung" (weil Zürich = Wallee)

### 6. Besucher klickt "Zur Zahlung"
```
POST /api/courses/enroll-wallee
→ Erstellt course_registrations Eintrag (status: 'pending')
→ Erstellt Wallee Transaction
→ Gibt paymentUrl zurück
→ Browser wechselt zu Wallee-Zahlungsseite
```

### 7. Zahlungs-Webhook
```
POST /api/wallee/webhook
→ Zahlung bestätigt
→ course_registrations.status = 'confirmed'
→ Ruft SARI auf: enrollStudent()
→ Sendet Bestätigungs-Email
```

---

## Query-Parameter (URL-Filter)

### Beispiele:
```
/customer/courses/driving-team                    # Alle Kurse
/customer/courses/driving-team?category=VKU       # Nur VKU
/customer/courses/driving-team?location=Zürich    # Nur Zürich
?category=VKU&location=Zürich                     # Beide
```

### In der Komponente:
```typescript
// watch() überwacht route.query
// Beim Ändern wird loadCourses() neu aufgerufen
```

---

## Häufige Fehler & Fixes

### ❌ "No match found for location with path /customer/courses/driving-team"
**Ursache:** Route existiert nicht oder Middleware blockiert
**Fix:** 
- Prüfe `middleware/auth.ts` → `/customer/courses` als public?
- Prüfe `pages/customer/courses/[slug].vue` existiert?

### ❌ "Failed to resolve import CourseEnrollmentModal"
**Ursache:** Komponente existiert nicht
**Fix:** Datei muss unter `components/customer/` sein

### ❌ "SARI Lookup 400 Error"
**Ursache:** FABERID mit Punkten? → "69.197.806"
**Fix:** Modal entfernt automatisch Punkte: `faberid.replace(/\./g, '')`

### ❌ "Courses werden nicht angezeigt"
**Ursache:** RLS policy fehlt
**Fix:**
```sql
CREATE POLICY "courses_anonymous_read"
  ON courses FOR SELECT TO public
  USING (is_public = true);
```

### ❌ "Keine Sessions sichtbar"
**Ursache:** course_sessions RLS policy zu restriktiv
**Fix:**
```sql
CREATE POLICY "course_sessions_public_read"
  ON course_sessions FOR SELECT TO public
  USING (true);
```

---

## Testing-Checklist

- [ ] URL öffnet sich: `http://localhost:3000/customer/courses/driving-team`
- [ ] Tenant "Driving Team" wird geladen (Header zeigt Logo)
- [ ] Kurse werden angezeigt (mind. 1 Kurs mit Sessionen)
- [ ] Filter funktionieren (Kategorie/Standort)
- [ ] Query-Parameter funktionieren: `?category=VKU`
- [ ] Kurs-Karte zeigt: Name, Standort, Sessions, Preis, freie Plätze
- [ ] Modal öffnet beim Klick
- [ ] SARI-Lookup validiert FABERID
- [ ] Step 2 zeigt verifizierte Daten
- [ ] E-Mail/Telefon können editiert werden
- [ ] Zahlungs-Button aktiviert sich nur mit gültiger E-Mail/Telefon
- [ ] Bei Wallee: Benutzer wird zur Zahlungsseite weitergeleitet
- [ ] Bei Cash: Bestätigungs-Message erscheint

---

## Wichtige Dateien (Schnell-Referenz)

```
pages/customer/courses/[slug].vue          ← Haupt-Seite
pages/customer/courses/index.vue           ← Optional (Allgemein)
components/customer/CourseEnrollmentModal.vue  ← Anmeldeformular
utils/courseLocationUtils.ts               ← Standort → Zahlungsart
middleware/auth.ts                         ← Public-Routes Whitelist
server/api/sari/lookup-customer.post.ts    ← SARI-Validierung
server/api/courses/enroll-wallee.post.ts   ← Online-Anmeldung
server/api/courses/enroll-cash.post.ts     ← Cash-Anmeldung
```

---

## Nächste Schritte

1. Server neustarten: `npm run dev`
2. URL testen: `http://localhost:3000/customer/courses/driving-team`
3. Test-Anmeldung durchführen (mit Test-FABERID)
4. Webhook testen (Zahlung bestätigen)
5. Email-Bestätigung prüfen

