# Plan: API Migration für häufig genutzte Queries

## Strategie

1. **Heute/Langfristig**: Alle 1,207 Queries analysieren & Audit machen
2. **Morgen früh**: Die TOP häufig genutzten Queries umbauen (wenn Low-Traffic)

---

## Vorbereitung für Morgen

### Was wir brauchen:

1. **Identifying Top Queries**
   - Welche Queries werden am häufigsten verwendet?
   - Aus welchen Komponenten/Pages?
   
2. **Impact Analysis**
   - Welche Queries sind Critical Path?
   - Welche können während Low-Traffic Stunden umgebaut werden?

3. **API Priority List**
   - Ranking: Critical → High → Medium
   - Effort schätzen: 30min pro API
   - Dependency Order: Welche APIs brauchen andere zuerst?

---

## Hypothesis: Top Häufig Genutzte Queries

Basierend auf der App-Logik, wahrscheinlich:

### 🔴 CRITICAL (Jeden Tag, Many Times/Second)
1. **appointments** - Calendar lädt, Staff sieht Termine
2. **users** (self-profile) - Jeder Login, User-Info
3. **categories** - Pricing berechnet sich ständig
4. **locations** - Event Modal öffnet
5. **event_types** - Event Modal öffnet

### 🟠 HIGH (Mehrmals pro Tag)
6. **payments** - Dashboard, Payment Prozess
7. **discount_sales** - Event Modal, Pricing
8. **course_registrations** - Admin Dashboard
9. **billing_addresses** - PriceDisplay

### 🟡 MEDIUM (Täglich/Wöchentlich)
10. **invoices** - Admin Reports
11. **product_sales** - Admin Dashboard
12. **reservations** - Staff Bookings

---

## Morgen-Plan

**Zeit: 6:00 - 10:00 (vor Normal-Traffic)**

### Phase 1: Measurement (30min)
- Query Logs analysieren (falls Supabase Logs vorhanden)
- Oder: Educated Guess basierend auf Component Usage

### Phase 2: Top 3 APIs wrappen (90min)
Fokus auf:
1. **`/api/appointments/get-list`** - Replaces direct appointments queries
2. **`/api/user/get-profile`** - Replaces users table reads  
3. **`/api/references/get-options`** - Combines categories, locations, event_types

### Phase 3: Testing & Deployment (60min)
- Test mit den Komponenten die das nutzen
- Deploy zu Vercel
- Monitor ob alles läuft

### Phase 4: Cleanup (30min)
- Entferne alte direct queries aus Components
- Commit & Push

---

## Vorbereitung HEUTE noch:

✅ Done:
- [x] Alle 1,207 Queries gezählt
- [x] Kritische Tables identifiziert (users, payments, appointments, etc.)
- [x] RLS Audit (zu überprüfen)
- [x] Security Analysis dokumentiert

TODO (optional heute noch):
- [ ] Query Logs analysieren (falls möglich)
- [ ] Dependency Graph zeichnen (welche APIs brauchen welche)
- [ ] API Response Schema entwerfen
- [ ] Rate Limits definieren pro API

---

## Morgen Execution Plan

```
06:00 - 06:30: Kaffee + Measurement
├─ Welche 3-5 Queries sind am häufigsten?
├─ Welche haben am meisten Impact?
└─ Dependency Reihenfolge festlegen

06:30 - 08:00: API #1 (appointments)
├─ `/api/appointments/get-list` erstellen
├─ Rate Limiting
├─ Authorization prüfen
└─ Tests

08:00 - 09:15: API #2 (user profile) + #3 (references)
├─ `/api/user/get-profile`
├─ `/api/references/get-options`
└─ Tests

09:15 - 10:00: Integration + Cleanup
├─ Components umbauen auf neue APIs
├─ Alte queries löschen
├─ Commit & Push

10:00+: Normal Traffic beginnt
- App sollte gleich funktionieren, aber sauberer
- Alle neuen APIs sind live
```

---

## Langfristig (Later):

**Weeks 2-4**: Remaining 1,200+ queries
- Phase 2: HIGH risk (payments, discounts)
- Phase 3: MEDIUM risk (business logic)
- Phase 4: LOW risk (reference data wrap for audit)

Ziel: Vollständige API-ification der ganzen App für:
- ✅ Audit Logging
- ✅ Rate Limiting
- ✅ Authorization
- ✅ Input Validation
- ✅ Security Monitoring

---

## Files zu checken Morgen:

1. **Most Common Query Sources:**
   - CalendarComponent.vue (appointments)
   - CustomerDashboard.vue (user data)
   - EventModal.vue (categories, locations)
   - PriceDisplay.vue (pricing data)

2. **Most Critical Paths:**
   - Login → User-Profile
   - Calendar → Appointments
   - Event Modal → Categories + Locations
   - Payment Flow → Payments + Discounts

---

## Erfolgs-Kriterien Morgen:

✅ 3-5 Top-APIs erstellt
✅ 10-20 Komponenten umgebaut
✅ Keine neuen 406 Fehler
✅ App läuft schneller oder gleich
✅ 30-50% der häufigsten Queries wrapped

**Expected Result:**
- Saubere API-gestützte Architektur für den Core-Path
- Audit Logging für alle kritischen Operationen
- Ready für weiteren API-Aufbau

