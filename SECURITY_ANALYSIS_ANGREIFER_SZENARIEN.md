# Sicherheit: Angreifer-Szenarien bei direkten Queries

## Die Realität:

Ja, um Daten zu lesen braucht ein Angreifer:
1. **ANON_KEY** (öffentlich sichtbar) ✅ Jeder kann das haben
2. **Access Token** (vom Login) ⚠️ Verschiedene Szenarien

---

## Szenario 1: Angreifer mit gültigem Login (MEDIUM Risk)

**Situation:**
- Angreifer hat legitimales Konto (z.B. gekauft für 10 CHF)
- Oder: Geleaktes Konto eines echten Users
- Or: Phishing Attack

**Was kann der Angreifer dann tun?**

```typescript
// Mit seinem eigenen gültigen Token:
const supabase = createClient(URL, ANON_KEY)
// Token ist gültig für Angreifer's Account

// Er versucht jetzt andere User zu lesen:
const { data } = await supabase
  .from('users')
  .select('preferred_payment_method')
  .eq('id', 'victim_user_id')  // Andere Person!
```

**RLS prüft:**
```sql
-- Actuelle RLS:
USING (id = auth.uid())
-- auth.uid() = angreifer_id
-- aber er fragt: id = victim_id
-- → RLS blockt (406 Not Acceptable)
```

**ABER: Wenn RLS kaputt/zu permissiv ist:**
```sql
-- ❌ UNSICHER RLS Beispiel:
USING (tenant_id = auth.jwt() ->> 'tenant_id')
-- Wenn Angreifer und Victim gleicher Tenant:
-- → Angreifer kann Victim-Daten lesen!
```

---

## Szenario 2: Angreifer ohne Login (HIGH Risk!)

**Situation:**
- Angreifer hat KEIN Konto
- Aber: Die ANON_KEY ist öffentlich zugänglich

**Das ist tatsächlich ein Problem!**

```typescript
// ANON_KEY liegt im Frontend Code:
const supabase = createClient(
  'https://project.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // ← Öffentlich!
)
```

**Angreifer kann:**
1. In Browser DevTools schauen → ANON_KEY kopieren
2. Selbst einen Client schreiben:
   ```javascript
   const supabase = createClient(
     'https://unyjaetebnaexaflpyoc.supabase.co',
     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Gestohlene KEY
   )
   
   // Versucht direkt zu querien (als anon):
   const data = await supabase
     .from('users')
     .select('*')  // Brauchts hier keinen Token!
   ```

**Frage: Darf `anon` direkt Queries machen?**

Das hängt von der RLS ab!

### Mit sauberer RLS:
```sql
CREATE POLICY "anon users blocked" ON public.users
  FOR SELECT
  TO anon
  USING (false);  -- ← Verhindert alle anon Zugriffe!
```

**Resultat:** Angreifer (ohne Login) kann nichts lesen. ✅

### Mit offener RLS (❌ Häufiger Fehler):
```sql
-- Wenn keine RLS oder zu permissiv:
CREATE POLICY "anyone can read" ON public.users
  FOR SELECT
  USING (true);  -- ← Jeder kann lesen!
```

**Resultat:** Angreifer (ohne Login) kann ALLE Daten lesen! ❌

---

## Szenario 3: Token Theft (HIGH Risk!)

**Situation:**
- Angreifer stiehlt einen gültigen Access Token
- Oder: Token wird in Local Storage gehackt (XSS Attack)

```javascript
// Angreifer hat token von User "alice"
const stolenToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Jetzt kann er als "alice" querien:
const response = await fetch(
  'https://unyjaetebnaexaflpyoc.supabase.co/rest/v1/users?select=*',
  {
    headers: {
      'Authorization': `Bearer ${stolenToken}`
    }
  }
)
// → Er hat Zugriff mit alice's Identität!
```

**Was kann er dann tun?**
- Lesen: Alice's eigene Daten
- Lesen: Alle anderen Users (wenn RLS zu permissiv)
- Schreiben: Alice's Profil ändern
- Lesen: Alice's Payments, Appointments, etc.

---

## Die ECHTE Frage: Ist DEINE App sauber?

Lass mich überprüfen, ob die kritischen Punkte gesichert sind:

### 1. **Anon-Zugriff blockiert?**
```sql
-- Müssen wir checken in deinen RLS Policies:
TO anon
USING (false);  -- ← Sollte überall sein!
```

### 2. **RLS auf kritischen Tabellen?**
- users ✅ (gerade gemacht)
- payments → Braucht RLS!
- appointments → Braucht RLS!
- discount_sales → Braucht RLS!

### 3. **Service-Role Key geschützt?**
```
.env:
SUPABASE_SERVICE_ROLE_KEY=eyJh...  // ← NIEMALS zum Client!
```

Das sollte nur auf dem Server sein!

### 4. **Token Rotation?**
- Müssen Tokens invalidiert werden wenn:
  - User logged out
  - User wurde deleted
  - Suspicious activity

---

## Was ist wirklich die Bedrohung?

### 🟡 MEDIUM: RLS zu permissiv (aber braucht Login oder ANON_KEY)
- Angreifer: Mit Konto oder als anon
- Schaden: Andere User's Daten leaken
- **Schutz**: Saubere RLS ✅

### 🔴 HIGH: Token gestohlen (XSS/Local Storage Hack)
- Angreifer: Hat gestohlenen Token
- Schaden: Kann als echtem User agieren
- **Schutz**: 
  - HttpOnly Cookies (nicht Local Storage)
  - Content Security Policy (CSP)
  - XSS Protection

### 🟢 LOW: Brute Force auf Login
- Angreifer: Versucht viele Passwörter
- Schaden: Accounts gehackt
- **Schutz**: Rate Limiting ✅ (du hast das!)

---

## MEINE EHRLICHE MEINUNG:

**Die größte Bedrohung ist NICHT die Queries selbst, sondern:**

1. **RLS ist kaputt oder zu permissiv** (das hattest du!)
2. **Tokens werden gestohlen** (XSS/Local Storage)
3. **Service-Role Key wird geleckt** (zur Compilation etc.)
4. **Keine Rate Limiting** (Brute Force)

---

## Konkret für DEIN System:

**Mit deiner aktuellen Sicherheit:**
- ✅ ANON_KEY ist öffentlich (das ist OK, ist die Absicht)
- ✅ RLS blockt Anonymous User (müssen prüfen!)
- ✅ Tokens sind zeitlich begrenzt
- ✅ Service-Role Key nur im Backend
- ✅ Rate Limiting auf Login/APIs

**Die Frage ist: Ist die RLS überall richtig?**

Wollen wir das checken? Ich kann überprüfen:
1. **Anon-Zugriff wird überall geblockt?**
2. **Cross-User Access wird geblockt?**
3. **RLS auf allen sensiblen Tables?**

Das wäre die echte Audit, nicht nur die Queries zu zählen! 🔍

Was denkst du?

