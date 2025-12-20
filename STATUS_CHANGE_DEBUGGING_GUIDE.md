# Status Change - Interaktive Debugging Anleitung

## Schritt-für-Schritt Fehlersuche

### Vorbereitung

1. Öffne http://localhost:3000/admin/courses in deinem Browser
2. Öffne die Browser-Konsole: **F12** → **Console** Tab
3. Gehe zur Seite zurück: **Ctrl+Shift+K** oder **Cmd+Shift+K** (um Logs zu löschen)
4. Jetzt sind die Logs leer und du siehst nur die neuen Logs

### Phase 1: Dropdown Click

**Was tun:**
1. Finde einen Kurs in der Tabelle
2. Klick auf das Status-Dropdown (z.B. von "Entwurf" zu "Aktiv")
3. Schau sofort in der Konsole nach Logs

**Erwartete Logs:**
```
═══════════════════════════════════════════
🔄 handleStatusChange STARTED
═══════════════════════════════════════════
📥 Event details: { 
  eventType: 'change', 
  targetTagName: 'SELECT', 
  targetValue: 'active',    // ← Neuer Status
  hasTarget: true 
}
📊 Course details: { 
  courseId: 'e256a7e8-...', 
  courseName: 'VKU Lachen - 16.12.2025',
  currentStatus: 'draft'     // ← Alter Status
}
🔄 Status change triggered: { 
  oldStatus: 'draft', 
  newStatus: 'active',
  isSameStatus: false        // ← Muss false sein!
}
✅ Dropdown reset to: draft
📋 Calling updateCourseStatus...
═══════════════════════════════════════════
```

**Wenn logs fehlen:**
- [ ] Nicht im richtigen Browser Tab?
- [ ] Konsole nicht geöffnet?
- [ ] Falscher Element geklickt?
- [ ] Zu schnell weitergescrollt?

**Wenn `isSameStatus: true`:**
- ❌ Funktioniert nicht! Du hast den gleichen Status ausgewählt
- ✅ Wähle einen anderen Status

### Phase 2: Modal Öffnung

**Was tun:**
Nach den Logs aus Phase 1 sollte sofort die Modal sichtbar sein. Schau in die Konsole:

**Erwartete Logs:**
```
═══════════════════════════════════════════
📋 updateCourseStatus STARTED
═══════════════════════════════════════════
✅ Validation passed, setting up modal...
📦 Modal state (before modal open): { 
  statusChangeCourse: 'e256a7e8-...', 
  oldStatus: 'draft', 
  newStatus: 'active' 
}
🎨 Setting showStatusChangeModal to true...
✅ Modal state set: { 
  showStatusChangeModal: true, 
  oldStatus: 'draft', 
  newStatus: 'active', 
  courseName: 'VKU Lachen - 16.12.2025', 
  courseId: 'e256a7e8-...' 
}
═══════════════════════════════════════════
```

**Wenn diese Logs NICHT erscheinen:**
- ❌ `handleStatusChange` wurde nicht aufgerufen!
- ✅ Prüf Phase 1

**Wenn diese Logs ERSCHEINEN, aber Modal nicht sichtbar ist:**
- ❌ React State ist nicht reactive oder Modal wird von anderen Elementen verdeckt
- ✅ Schau in Browser Console:
  ```javascript
  // Gib folgendes ein:
  document.querySelectorAll('[class*="fixed"]')
  // Schau nach Modal-ähnlichen Elementen mit z-index < 100
  ```

**Im Modal solltest du sehen:**
```
DEBUG: Modal=true, Old=draft, New=active, Course=e256a7e8
```
Dies ist dein Indikator, dass die Modal Component mit korrekten Props rendered.

### Phase 3: Bestätigung (Button Click)

**Was tun:**
1. Modal ist sichtbar
2. Klick auf "Status ändern" Button
3. Schau sofort in die Konsole

**Erwartete Logs:**
```
🎯 Status ändern Button clicked

═══════════════════════════════════════════
🔘 confirmStatusChange STARTED
═══════════════════════════════════════════
📋 Current state before update: { 
  statusChangeCourse: 'e256a7e8-...', 
  oldStatus: 'draft', 
  newStatus: 'active', 
  showStatusChangeModal: true 
}
📊 Update Details: { 
  courseId: 'e256a7e8-...', 
  tenantId: '64259d68-...', 
  oldStatusForLogging: 'draft', 
  newStatusForLogging: 'active', 
  currentUser: '466c3c5a-...', 
  userRole: 'admin', 
  userTenantId: '64259d68-...' 
}
```

**Wenn dieser Log NICHT erscheint:**
- ❌ Button wurde nicht geklickt oder funktioniert nicht
- ✅ Prüf:
  - Ist der Button aktiv (nicht `disabled`)?
  - Ist JavaScript aktiv?
  - Gibt es Browser-Fehler?

### Phase 4: Datenbank Read-Test

Direkt nach Phase 3 sollte ein Read-Test erfolgen:

**Erwartete Logs:**
```
🔍 Step 1: Testing read access...
📖 Read test result: { 
  success: true, 
  courseId: 'e256a7e8-...', 
  currentStatus: 'draft', 
  courseName: 'VKU Lachen - 16.12.2025', 
  readError: null 
}
```

**Wenn `success: false`:**
```javascript
// readError: { code: 'PGRST116', message: '...' }
```
❌ **RLS-Policy blockiert!**

- Mögliche Ursachen:
  1. User hat keine Berechtigung
  2. `tenant_id` stimmt nicht überein
  3. RLS-Policy ist falsch konfiguriert

- Lösung:
  1. Überprüfe: Bin ich als Admin mit Tenant-Zugang eingeloggt?
  2. Führe das SQL aus: `SELECT * FROM pg_policies WHERE tablename = 'courses';`
  3. Prüf die Policy `courses_tenant_update`

### Phase 5: Update Execution

Sollte der Read erfolgreich sein:

**Erwartete Logs:**
```
✏️ Step 2: Executing update...

📤 Update response: { 
  success: true, 
  courseId: 'e256a7e8-...', 
  newStatus: 'active',          // ← Neuer Status in DB!
  timestamp: '2025-12-18T...',
  error: null 
}

✅ Course status updated in DB: { 
  id: 'e256a7e8-...', 
  oldStatus: 'draft', 
  newStatus: 'active', 
  timestamp: '2025-12-18T...' 
}
```

**Wenn `success: false`:**
```javascript
// error: { code: '42501', message: 'insufficient_privilege', ... }
```
❌ **RLS-Policy UPDATE fehlt oder ist falsch!**

- Lösung:
  1. Führe die Migration aus: `sql_migrations/20250218_fix_courses_update_rls.sql`
  2. Oder manually:
     ```sql
     DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;
     
     CREATE POLICY "courses_tenant_update" ON public.courses
       FOR UPDATE TO authenticated
       USING (tenant_id IN (
         SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
       ))
       WITH CHECK (tenant_id IN (
         SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
       ));
     ```

### Phase 6: Local State Update

Nach erfolgreichem DB-Update:

**Erwartete Logs:**
```
🔄 Step 3: Updating local course object...
🔎 Found course at index: 0

✅ Local course updated: { 
  courseIndex: 0, 
  oldStatus: 'draft', 
  newStatus: 'active', 
  name: 'VKU Lachen - 16.12.2025' 
}
```

**Wenn `courseIndex: -1`:**
❌ Der Kurs wurde nicht im lokalen Array gefunden!

- Mögliche Ursachen:
  1. Kurs-ID stimmt nicht überein
  2. `courses.value` wurde geleert
  3. Kurs wurde nach dem Laden gelöscht

- Debugging:
  ```javascript
  // In Console:
  this.courses.find(c => c.id === 'e256a7e8-...')
  // Sollte das Objekt zurückgeben, nicht undefined
  ```

### Phase 7: UI State Update

**Erwartete Logs:**
```
🎨 Step 4: Updating UI state...

✅ Final state: { 
  successMessage: 'Kurs-Status auf "Aktiv" geändert!', 
  modalVisible: false,           // ← Modal wird geschlossen!
  statusChangeCourse: null
}
```

**Wenn `modalVisible: true`:**
❌ Modal wurde nicht geschlossen!

- Prüf: Erscheint noch die Modal?
- Wenn ja: Wahrscheinlich `showStatusChangeModal.value = false` funktioniert nicht

### Phase 8: Finales Ergebnis

**Was sollte jetzt passiert sein:**
1. [ ] Modal ist verschwunden
2. [ ] Success-Message ist kurz sichtbar (oben/unten)
3. [ ] In der Tabelle zeigt der Kurs neuen Status
4. [ ] In der DB ist der neue Status gespeichert

**Wenn die UI nicht updated:**
```
// Letzte Log-Line:
✅ confirmStatusChange completed
```

Danach sollte folgende Log-Zeile erscheinen:
```
🔄 Step 5: Reloading courses in background...
```

Dies lädt die Kurse neu. Wenn auch das nicht hilft:

1. Öffne DevTools → Network Tab
2. Filtere nach `supabase.co`
3. Refresh die Seite (F5)
4. Prüfe: Gibt es einen POST/GET Request zu `/rest/v1/courses?`
5. Response sollte die aktualisierten Kurse mit neuem Status enthalten

---

## Checkliste für Fehlersuche

Kopier diese Checkliste und arbeite sie durch:

```
[ ] Phase 1: Dropdown Click
    [ ] Logs erscheinen
    [ ] eventType = 'change'
    [ ] newStatus ≠ oldStatus
    
[ ] Phase 2: Modal Opening
    [ ] Logs erscheinen
    [ ] Modal ist sichtbar
    [ ] Status-Info in Modal ist korrekt
    
[ ] Phase 3: Confirmation Click
    [ ] Button-Log erscheint
    [ ] confirmStatusChange Log erscheint
    [ ] Keine JavaScript-Errors
    
[ ] Phase 4: Read Test
    [ ] success: true
    [ ] currentStatus = oldStatus
    [ ] readError: null
    
[ ] Phase 5: Update Execution
    [ ] success: true
    [ ] newStatus in Response stimmt
    [ ] error: null
    
[ ] Phase 6: Local Update
    [ ] courseIndex ≥ 0 (gefunden!)
    [ ] newStatus wurde aktualisiert
    [ ] Keine Errors
    
[ ] Phase 7: UI State
    [ ] Modal wird geschlossen
    [ ] Success-Message ist sichtbar
    [ ] showStatusChangeModal = false
    
[ ] Phase 8: Final Result
    [ ] Status in Tabelle ist neu
    [ ] Modal ist weg
    [ ] Keine Fehler-Meldung
```

---

## Wenn nichts funktioniert

Bitte folgende Infos sammeln:

```bash
# 1. Kompletter Console Output (Copy-Paste)
# (F12 → Console → Select All → Copy)

# 2. Network Request/Response
# (F12 → Network → Suche "courses" → Click PATCH Request)
# (Screenshot vom Request Body und Response)

# 3. Vue DevTools State
# (F12 → Vue DevTools → State Inspector)
# (Schau nach: showStatusChangeModal, oldStatus, newStatus, courses array)

# 4. Browser Version
# (Chrome/Firefox/Safari + Version)

# 5. Supabase RLS Policies
# (SELECT * FROM pg_policies WHERE tablename = 'courses';)
```

Dann poste diese Infos und ich kann dir gezielt helfen! 🔍

