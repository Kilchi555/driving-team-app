Payments RLS - Kritischer Bug und Lösung
====================================

## Problem erkannt

### Die fehlerhafte Policy (aktuell aktiv)
```sql
-- ❌ FALSCH: Vergleicht user_id mit auth.uid()
CREATE POLICY "payments_select" ON payments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()  -- ← PROBLEM HERE!
  );
```

### Warum das falsch ist

```
Database Schema:
├─ auth.users (Supabase Auth)
│  └─ id (UUID) = 89f9ae5d-5240-4ecc-80b3-ba10c78fcf73
│
├─ public.users (Unsere Tabelle)
│  ├─ id (UUID) = 7f3b2e1a-9c4d-4e2f-b1a6-3d8c5e9f2b7a  ← DIFFERENT!
│  ├─ auth_user_id = 89f9ae5d-5240-4ecc-80b3-ba10c78fcf73  ← Links to auth.users.id
│  └─ email = user@example.com
│
└─ public.payments
   ├─ id = 77a2ba41-dc41-4a03-b61c-d72458306b59
   ├─ user_id = 7f3b2e1a-9c4d-4e2f-b1a6-3d8c5e9f2b7a  ← References users.id
   ├─ amount = 21500 (rappen)
   └─ created_at = 2026-01-04
```

### Das Problem visualisiert

```
auth.uid() returns:
89f9ae5d-5240-4ecc-80b3-ba10c78fcf73 (from auth.users)
       │
       ├─ DOES NOT match payments.user_id ❌
       │
       └─ Comparison fails: 89f9ae5d... ≠ 7f3b2e1a...
       
Correct mapping:
auth.uid() 
  → lookup in users WHERE auth_user_id = auth.uid()
  → get users.id = 7f3b2e1a...
  → NOW: 7f3b2e1a... = payments.user_id ✓
```

---

## Die Lösung

### Korrekte Policy
```sql
-- ✅ RICHTIG: Nutzt korrektes Mapping
CREATE POLICY "payments_customer_read" ON payments
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );
```

### Wie es funktioniert

1. **`auth.uid()`** gibt die Supabase Auth User ID zurück
2. **Subquery** sucht diese Auth ID in der users Tabelle
3. **`users.id`** wird zurückgegeben
4. **Vergleich** mit `payments.user_id` funktioniert jetzt!

---

## Aktueller Status - Was lädt gerade?

### Fehlgeschlagene Queries
- **GET /appointments?id=eq.77a2ba41...** → 406 Not Acceptable
  - Grund: Appointments RLS hat auch die gleiche Probleme
  
- **POST /api/payments/process** → 500 windowMs Error
  - BEREITS GEFIXT: Rate Limiter Funktion aufgerufen mit korrekten Parametern

---

## Was muss jetzt getan werden

### 1. Payments RLS Migration anwenden
**Datei**: `/migrations/fix_payments_rls_bug.sql`

```bash
# In Supabase SQL Editor:
1. Öffne SQL Editor
2. Kopiere ganzen Inhalt aus fix_payments_rls_bug.sql
3. Führe aus (Run)
4. Verifiziere mit SELECT unten
```

### 2. Appointments RLS ebenfalls checken/fixieren
**Datei**: `/migrations/fix_appointments_rls_final.sql`

```sql
-- Verifiziere Appointments RLS
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;
```

### 3. Verifizierung

```sql
-- Payments RLS überprüfen
SELECT 
  policyname,
  CASE WHEN cmd = 'SELECT' THEN '📖 READ'
       WHEN cmd = 'INSERT' THEN '✍️  WRITE'
       WHEN cmd = 'UPDATE' THEN '✏️  UPDATE'
       WHEN cmd = 'DELETE' THEN '🗑️  DELETE'
  END as operation,
  roles
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- Result sollte sein:
-- payments_customer_delete           DELETE  {authenticated}
-- payments_customer_insert           WRITE   {authenticated}
-- payments_customer_read             READ    {authenticated}
-- payments_customer_update           UPDATE  {authenticated}
-- payments_service_role              ALL     {service_role}
-- payments_staff_delete              DELETE  {authenticated}
-- payments_staff_insert              WRITE   {authenticated}
-- payments_staff_read                READ    {authenticated}
-- payments_staff_update              UPDATE  {authenticated}
-- payments_super_admin_delete        DELETE  {authenticated}
-- payments_super_admin_read          READ    {authenticated}
-- payments_super_admin_update        UPDATE  {authenticated}
```

---

## Warum das 406 Error verursacht hat

### RLS Policy Evaluation Flow
```
1. Client macht Query: SELECT * FROM payments WHERE id = 'xyz'
2. Supabase evaluiert RLS Policy
3. Policy: user_id = auth.uid()
4. Vergleich: 7f3b2e1a... = 89f9ae5d... ← WRONG!
5. Supabase kann nicht entscheiden: allowed or denied?
6. Rückgabe: 406 Not Acceptable (Policy conflict)
```

---

## Testing nach Fix

```javascript
// Im Browser Console (als eingeloggter Customer)
const { data, error } = await supabase
  .from('payments')
  .select('*')
  .limit(1);

// Vorher: 406 error
// Nachher: Sollte deine Zahlungen zurückgeben ✓
```

---

## Andere betroffene Tabellen

Prüfe auch diese auf das gleiche Problem:
- [ ] appointments (NEEDS FIX - hat gleiche issue)
- [ ] bookings
- [ ] student_credits
- [ ] discounts

---

## Prevention für die Zukunft

### Checkliste für RLS Policies
- [ ] Immer testen: `payments.user_id` referenziert `users.id` oder `users.auth_user_id`?
- [ ] Nach neuer Policy: `SELECT * FROM payments WHERE id = '...'` testen
- [ ] Nicht `auth.uid()` direkt vergleichen, sondern immer durch users Tabelle mappen
- [ ] Bei komplexen Queries: LIMIT 1 verwenden um Recursion zu vermeiden

