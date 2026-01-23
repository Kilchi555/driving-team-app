# course_participants vs course_registrations - Erklärung

**TL;DR**: `course_participants` = Person/Daten. `course_registrations` = Anmeldung zu einem spezifischen Kurs.

---

## Die beiden Tabellen

### 1. course_participants (Person-Daten)
```sql
CREATE TABLE course_participants (
  id UUID,
  tenant_id UUID,
  user_id UUID,           -- Optional! NULL wenn nicht registriert
  faberid VARCHAR(20),    -- SARI ID
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  birthdate DATE,
  street VARCHAR(255),
  zip VARCHAR(10),
  city VARCHAR(100),
  sari_synced BOOLEAN,
  sari_synced_at TIMESTAMPTZ,
  ...
)
```

**Zweck**: Speichert Personendaten einmalig pro Tenant + FABERID

**Beziehung zu users**: OPTIONAL (user_id kann NULL sein!)
- Hat `user_id` → Person hat sich registriert (Login)
- `user_id IS NULL` → Person hat sich NIE registriert (nur externe Anmeldung)

---

### 2. course_registrations (Kurs-Anmeldung)
```sql
CREATE TABLE course_registrations (
  id UUID,
  course_id UUID,           -- WELCHER Kurs
  participant_id UUID,      -- WER (→ course_participants)
  user_id UUID,             -- Optional user (kann auch NULL sein!)
  tenant_id UUID,
  status VARCHAR,           -- pending, confirmed, cancelled
  payment_status VARCHAR,   -- pending, paid
  first_name VARCHAR(100),  -- KOPIE von course_participants.first_name
  last_name VARCHAR(100),   -- KOPIE von course_participants.last_name
  email VARCHAR(255),       -- KOPIE
  phone VARCHAR(50),        -- KOPIE
  sari_faberid VARCHAR(20), -- KOPIE
  street VARCHAR(255),      -- KOPIE
  zip VARCHAR(10),          -- KOPIE
  city VARCHAR(100),        -- KOPIE
  ...
)
```

**Zweck**: Speichert Anmeldungen zu Kursen

**Beziehung zu course_participants**: REQUIRED (participant_id FK)

---

## Warum ZWEI Tabellen? 🤔

### Szenario: Anna meldet sich für Verkehrskunde an

#### 1️⃣ SARI System kennt Anna (via Wallee Payment Flow):

```
SARI → course_participants
├─ id: abc123
├─ faberid: 1.234.567
├─ first_name: Anna
├─ last_name: Müller
├─ email: anna@example.com
├─ user_id: NULL  ⚠️ Sie hat KEIN Login!
└─ sari_synced: true
```

**Frage**: Warum nicht direkt in course_registrations?  
**Grund**: Eine Person kann sich zu MEHREREN Kursen anmelden!

---

#### 2️⃣ Anna meldet sich zu "Verkehrskunde Lachen" an:

```
course_registrations #1
├─ id: reg001
├─ course_id: "Verkehrskunde Lachen"
├─ participant_id: abc123  ← FK zu course_participants
├─ first_name: Anna  ⚠️ KOPIE!
├─ last_name: Müller  ⚠️ KOPIE!
├─ email: anna@example.com  ⚠️ KOPIE!
├─ status: confirmed
└─ payment_status: paid
```

---

#### 3️⃣ Anna meldet sich AUCH zu "PGS Zürich" an:

```
course_registrations #2
├─ id: reg002
├─ course_id: "PGS Zürich"
├─ participant_id: abc123  ← GLEICHE Person!
├─ first_name: Anna  ⚠️ KOPIE!
├─ last_name: Müller  ⚠️ KOPIE!
├─ email: anna@example.com  ⚠️ KOPIE!
├─ status: pending
└─ payment_status: pending
```

---

#### 4️⃣ Anna registriert sich später (Login):

```
USERS
├─ id: user_anna_123
├─ auth_user_id: "oauth_token_..."
├─ email: anna@example.com
├─ ...
```

```
course_participants (UPDATE)
├─ id: abc123
├─ user_id: user_anna_123  ← JETZT verlinkt!
├─ ...
```

**Die course_registrations bleiben UNVERÄNDERT!**

---

## Problem mit der aktuellen Struktur 🚨

### Das Redundanz-Problem:

Personal data wird in **BEIDEN** Tabellen gespeichert:

```
course_participants:
├─ first_name: "Anna"
├─ last_name: "Müller"
├─ email: "anna@example.com"
└─ phone: "+41791234567"

course_registrations:
├─ first_name: "Anna"      ⚠️ KOPIE!
├─ last_name: "Müller"     ⚠️ KOPIE!
├─ email: "anna@example.com" ⚠️ KOPIE!
└─ phone: "+41791234567"   ⚠️ KOPIE!
```

**Warum ist das schlecht?**
1. Data Synchronisation Problem - Wenn sich Name ändert: Wo updaten?
2. Speicher Verschwendung - Jede Anmeldung dupliziert die Daten
3. Inkonsistenz Risk - Daten können auseinander gehen

---

## Die Lösung - Optionen 💡

### Option A: Nur course_participants verwenden (EMPFOHLEN)
```
course_registrations
├─ id: UUID
├─ course_id: UUID
├─ participant_id: UUID FK  ← Link zur Person
├─ status: confirmed
├─ payment_status: paid
├─ registered_at: TIMESTAMPTZ
└─ ... (KEINE personal data kopieren)

-- Bei Queries: JOIN mit course_participants
SELECT cr.*, cp.first_name, cp.email
FROM course_registrations cr
JOIN course_participants cp ON cr.participant_id = cp.id
```

**Vorteile**:
- Single Source of Truth (Name etc. NUR in course_participants)
- Keine Datenduplication
- Einfacher zu maintainen

**Nachteile**:
- Jede Query braucht JOIN
- Historische Daten: Wenn Name sich ändert, sieht man es überall (no history)

---

### Option B: Historische Snapshot (HYBRID - BETTER!)
```
course_registrations
├─ id: UUID
├─ course_id: UUID
├─ participant_id: UUID FK  ← Link zur aktuellen Person
├─ status: confirmed
├─ payment_status: paid
├─ 
├─ -- SNAPSHOT der Daten ZUM ZEITPUNKT DER ANMELDUNG
├─ snapshot_data: JSON  ← {"first_name": "Anna", "email": "...", ...}
├─ registered_at: TIMESTAMPTZ
└─ ...
```

**Vorteile**:
- Single source of truth für aktuellen Status (participant_id)
- Historische Daten erhalten (snapshot_data)
- Nur eine Kopie (zum Zeitpunkt der Anmeldung)
- Audit trail

**Beispiel**:
```json
{
  "id": "reg001",
  "participant_id": "abc123",
  "course_id": "course_vku_lachen",
  "status": "confirmed",
  "snapshot_data": {
    "first_name": "Anna",
    "last_name": "Müller",
    "email": "anna@example.com",
    "phone": "+41791234567",
    "street": "Musterstr 123",
    "zip": "8853",
    "city": "Lachen"
  },
  "registered_at": "2026-01-15T10:30:00Z"
}
```

Wenn Anna ihren Namen ändert zu "Anna Schmidt":
```
course_participants:
└─ first_name: "Anna Schmidt"  ✅ Aktuell

course_registrations #1 snapshot_data:
└─ first_name: "Anna Müller"   ✅ Historisch (zum Zeitpunkt der Anmeldung)
```

---

## Aktuelle Implementierung Probleme 🔴

### Problem 1: Zu viele Kopien
```
course_registrations speichert:
- first_name (KOPIE)
- last_name (KOPIE)
- email (KOPIE)
- phone (KOPIE)
- sari_faberid (KOPIE)
- street (KOPIE)
- zip (KOPIE)
- city (KOPIE)
```

**Unser TIER 1 SARI Sync machte es noch SCHLIMMER** 😅
- Jetzt synced wir auch zu course_registrations
- Wenn Daten ändern, haben wir 2x die falschen Werte!

---

### Problem 2: Keine historische Daten
```
Scenario: Anna meldet sich 15. Jan an mit Name "Anna Müller"
         Am 20. Jan ändert sie zu "Anna Schmidt"
         
Admin schaut am 25. Jan auf Registrierung:
├─ course_registrations.first_name: "Anna Schmidt"  ← Aktuell, nicht original!
└─ course_participants.first_name: "Anna Schmidt"   ← Auch aktuell
```

**Wir wissen nicht mehr**: Unter welchem Namen war sie registriert?

---

## Empfehlung 🎯

### Kurzfristig (jetzt): 
✅ **STOPP mit Redundanz!**
- Daten NUR in course_participants ändern
- course_registrations nur als "JOIN Table" verwenden
- Bei den Feldern die jetzt in CR sind → Nur für Abwärts-Kompatibilität behalten

### Mittelfristig (nächste Woche):
🔧 **Auf Option B migrieren (Snapshot)**
```sql
ALTER TABLE course_registrations
ADD COLUMN snapshot_data JSONB;

-- Migration: Existing registrations
UPDATE course_registrations cr
SET snapshot_data = jsonb_build_object(
  'first_name', cr.first_name,
  'last_name', cr.last_name,
  'email', cr.email,
  'phone', cr.phone,
  'street', cr.street,
  'zip', cr.zip,
  'city', cr.city
);

-- Dann: Entfernen der einzelnen Spalten (optional)
```

### Langfristig (später):
📋 **Cleanup: Entfernen der Redundanten Spalten**
- Alles in snapshot_data
- Nur participant_id für aktuelle Daten

---

## TL;DR - Warum beide Tabellen:

| Tabelle | Zweck | Cardinalität |
|---------|-------|--------------|
| **course_participants** | Speichert Person einmal | 1 Person = 1 Eintrag (per FABERID) |
| **course_registrations** | Speichert Anmeldungen | 1 Person → VIELE Kurse |

```
Anna (1 Person)
├─ course_participants: 1 Eintrag (Anna Müller)
└─ course_registrations: 3 Einträge (Verkehrskunde, PGS, Spezialtraining)
```

**Aber**: Die Redundanten Felder (first_name, email, etc.) sind ein Design-Problem!  
**Lösung**: Nur in course_participants halten, nicht in course_registrations duplizieren.

---

## Summary

| Aspekt | Status |
|--------|--------|
| Zwei Tabellen sinnvoll? | ✅ Ja (1:N Beziehung) |
| Redundante Felder sinnvoll? | ❌ Nein (Design-Fehler) |
| Unser TIER 1 Sync gemacht Problem schlechter? | ⚠️ Ja (mehr Duplizierung) |
| Sollten wir refactoren? | 🔄 Ja, aber später |
| Ist es jetzt broken? | ❌ Nein, nur suboptimal |

**Kurz**: Die Struktur ist **konzeptionell sinnvoll** (1:N Relationship), aber **implementiert redundant** (Felder sollten nicht dupliziert sein).

