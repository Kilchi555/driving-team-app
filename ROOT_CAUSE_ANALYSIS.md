# 🔴 ROOT CAUSE FOUND: "Staff and admin can update courses" Policy

## Das Problem

Du hast **zwei UPDATE Policies** auf der `courses` Tabelle:

```json
[
  {
    "policyname": "Staff and admin can update courses",
    "cmd": "UPDATE",
    "USING Clause": "(...admin/staff check...)",
    "WITH CHECK Clause": null  ← ❌ NULL! KAPUTT!
  },
  {
    "policyname": "courses_tenant_update",
    "cmd": "UPDATE",
    "USING Clause": "(...tenant_id check...)",
    "WITH CHECK Clause": "(...tenant_id check...)"  ← ✓ OK!
  }
]
```

## Warum ist das ein Problem?

**Supabase/PostgreSQL evaluiert RLS Policies in dieser Reihenfolge:**

1. Prüfe erste Policy: "Staff and admin can update courses"
   - USING Clause: ✓ Erfüllt (du bist Admin)
   - WITH CHECK Clause: ❌ NULL → **RLS blockiert UPDATE!**
   - Update wird BLOCKIERT

2. Zweite Policy wird nie erreicht (bereits blockiert)

**Resultat:** RLS blockiert deinen Update Silent! Der erste Policy-Check schlägt fehl, weil WITH CHECK Clause fehlt.

## Die Lösung

Die Policy "Staff and admin can update courses" braucht auch ein WITH CHECK Clause!

```sql
-- VORHER (❌ Kaputt):
CREATE POLICY "Staff and admin can update courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE ...)
  )
  -- WITH CHECK fehlt! ❌

-- NACHHER (✓ Korrigiert):
CREATE POLICY "Staff and admin can update courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE ...)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE ...)
  )  -- ✓ Jetzt da!
```

## Was ist WITH CHECK?

- **USING Clause:** Kontrolliert welche Zeilen du LESEN darfst
- **WITH CHECK Clause:** Kontrolliert welche Werte du SCHREIBEN darfst

Für UPDATE brauchst du BEIDE:
1. USING: "Darf ich diese Zeile überhaupt anfassen?"
2. WITH CHECK: "Darf ich diese neuen Werte schreiben?"

Wenn eine fehlt, blockiert RLS den Update!

## Wie man das fixt

Führe folgende SQL aus (in Supabase SQL Editor):

```sql
-- Lösche die alte kaputte Policy
DROP POLICY IF EXISTS "Staff and admin can update courses" ON public.courses;

-- Erstelle sie neu mit BEIDEN Clauses
CREATE POLICY "Staff and admin can update courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid() 
        AND users.tenant_id = courses.tenant_id 
        AND users.role = ANY (ARRAY['admin'::text, 'staff'::text, 'superadmin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid() 
        AND users.tenant_id = courses.tenant_id 
        AND users.role = ANY (ARRAY['admin'::text, 'staff'::text, 'superadmin'::text])
    )
  );
```

## Verifizierung

Nach dem Fix solltest du sehen:

```json
{
  "policyname": "Staff and admin can update courses",
  "cmd": "UPDATE",
  "USING Clause": "(...admin/staff check...)",
  "WITH CHECK Clause": "(...admin/staff check...)"  ← ✓ Nicht mehr null!
}
```

Jetzt sollte der Status-Change funktionieren! 🎉

## Zusammenfassung

| Policy | USING | WITH CHECK | Status |
|--------|-------|-----------|--------|
| Staff and admin can update courses | ✓ | ❌ NULL | **KAPUTT** |
| courses_tenant_update | ✓ | ✓ | OK |

Die erste Policy wurde zuerst evaluiert, hatte kein WITH CHECK, daher blockiert RLS.

**Nach dem Fix:** Beide Policies haben USING und WITH CHECK ✓

---

**Datei zum Ausführen:** `FIX_STAFF_ADMIN_UPDATE_POLICY.sql`

