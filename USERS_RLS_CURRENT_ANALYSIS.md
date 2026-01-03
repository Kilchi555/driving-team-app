# Analyse: Current users RLS Policies

## Status: ⚠️ PROBLEMATIC - Duplicate & Conflicting Policies!

Du hast **11 Policies** auf der `users` Tabelle, und viele sind DUPLIKATE!

---

## 🔴 CRITICAL ISSUES:

### 1. **DUPLICATE Policies (redundant & confusing)**

```
DUPLIKATE:
- "User self read" (Zeile 1)
- "user_read_own_profile" (Zeile 9)
- "Users can read their own profile" (Zeile 7)
→ Alle 3 machen das GLEICHE: (auth_user_id = auth.uid())

- "User self update" (Zeile 2)
- "user_update_own_profile" (Zeile 10)
→ Beide: (auth_user_id = auth.uid())
```

**Problem:** 
- Redundant & verwirrend
- Wenn du eine ändern willst, musst du 3 Stellen updaten
- Höheres Risiko von Inkonsistenzen

### 2. **Duplicate Service-Role Policies**

```
"Service role read"   → SELECT allowed
"Service role insert" → INSERT allowed
"Service role delete" → DELETE allowed
"Service role update" → UPDATE allowed
"service_role_bypass" → ALL allowed (true)

Problem: "service_role_bypass" macht alle 4 anderen redundant!
Mit (true) als Condition kann service_role ALLES tun.
```

### 3. **Role Assignment ist ODD**

```json
"roles": "{public}"  ← Warum "public"?
```

Sollte sein:
- `{authenticated}` für authenticated users
- `{service_role}` für backend APIs
- `{anon}` nur wenn anonyme Zugriffe OK (hier NICHT!)

**Mit `{public}` sind diese Policies für ALLE (anon + authenticated)!**

---

## 🔍 SECURITY ANALYSIS:

### ✅ What's Good:

1. **Service Role Bypass funktioniert**
   ```sql
   "service_role_bypass": true  -- Backend kann alles
   ```

2. **Self-Access ist safe**
   ```sql
   (auth_user_id = auth.uid())  -- User kann sein Profil lesen
   ```

3. **insert_users hat Ownership Check**
   ```sql
   -- User kann nur mit eigenem auth_user_id registrieren
   OR admin/staff aus gleichem tenant
   ```

### ❌ What's Bad:

1. **Duplicate Policies**
   - Macht das System hard to maintain
   - Aber funktioniert (PostgreSQL nutzt alle)

2. **Role Assignment**
   ```sql
   "roles": "{public}"  -- ← Das sollte spezifischer sein!
   ```
   - Diese Policies sind auf `public` Role (jeder!)
   - Aber mit Conditions die einschränken
   - Ist funktional OK, aber nicht best practice

3. **Policies mit roles={public} sind verwirrend**
   - Besser: Explizit `{authenticated}` oder `{service_role}`
   - `{public}` ist zu generic

4. **Missing: Restrictive Policy for anon**
   ```
   Sollte sein:
   CREATE POLICY "anon blocked" ON users
     FOR ALL
     TO anon
     USING (false);  -- ← Block everything for anon
   ```

---

## 📊 WHAT'S ACTUALLY HAPPENING:

### For `anon` users:
- Versuchen zu lesen: Alle Policies checken
- "Service role read" (roles={public}, condition=service_role) → Does NOT apply (not service_role)
- "User self read" (roles={public}, condition=auth_user_id=auth.uid()) → **Applies? NO!** weil anon hat keine auth_user_id
- Result: ✅ **Anon BLOCKED** (keine Policy matched)

### For `authenticated` users (normal login):
- Versuchen ihr Profil zu lesen:
- "User self read" ODER "user_read_own_profile" ODER "Users can read their own profile" matches
- Result: ✅ **Can read own profile**

### For `service_role` (backend):
- "service_role_bypass": true
- Result: ✅ **Can do EVERYTHING**

---

## 🧹 CLEANUP EMPFEHLUNG:

### Option 1: Minimal Fix (heute nicht nötig)
Behalte:
1. `user_read_own_profile` (authenticated self-read)
2. `user_update_own_profile` (authenticated self-update)
3. `service_role_bypass` (backend bypass)
4. `insert_users` (registration + admin create)

Lösche:
- `User self read` (Duplikat)
- `User self update` (Duplikat)
- `Users can read their own profile` (Duplikat)
- `Service role read/insert/delete/update` (redundant mit bypass)

### Option 2: Complete Refactor (später)
```sql
-- Ultra-clean version:
CREATE POLICY "authenticated self read" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "authenticated self update" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "service role bypass" ON users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "registration and admin operations" ON users
  FOR INSERT TO public
  WITH CHECK (
    (auth.uid()::text = auth_user_id::text) 
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = ANY(ARRAY['admin', 'staff'])
      AND u.is_active = true
      AND u.tenant_id = users.tenant_id
    )
  );
```

---

## 🎯 BOTTOM LINE:

**Ist es sicher?** ✅ JA!
- Anon kann nicht zugreifen
- Authenticated können nur ihr Profil lesen
- Service-role hat Bypass für Backend APIs

**Ist es sauber?** ❌ NEIN!
- 11 Policies mit vielen Duplikaten
- Verwirrend zum Maintainen
- Role assignment ist nicht best-practice

**Aktion nötig?** 
- 🟢 Funktional: NEIN (läuft sauber)
- 🟡 Für Wartbarkeit: JA (später aufräumen)
- 🔴 Für morgen: NICHT PRIORITÄT (fokus auf API Migration)

---

## Recommendation für MORGEN:

**Status quo:** Lass die RLS wie sie ist!
- Es funktioniert
- Es ist sicher
- Wir müssen nicht alles perfekt machen

**Fokus stattdessen:**
1. Top 3 APIs wrappen (appointments, user-profile, references)
2. Komponenten updaten
3. Testen

**RLS Cleanup:** Später in Phase 2 oder 3, wenn wir
Zeit für Refactoring haben.

Okay? 🚀

