# Debugging Guide: Course Status Change

## Überblick
Der Status-Change-Flow wurde mit **ausführlichem Debugging** versehen. Diese Dokumentation hilft dir, die Probleme zu identifizieren.

## Debug-Flow

### 1. **Event Handling** (`handleStatusChange`)
Wenn du das Dropdown änderst, wird folgendes geloggt:
```
═══════════════════════════════════════════
🔄 handleStatusChange STARTED
═══════════════════════════════════════════
📥 Event details: { eventType, targetTagName, targetValue, hasTarget }
📊 Course details: { courseId, courseName, currentStatus }
🔄 Status change triggered: { oldStatus, newStatus, isSameStatus }
✅ Dropdown reset to: [old status]
📋 Calling updateCourseStatus...
═══════════════════════════════════════════
```

**Was to check:**
- Wird `eventType: 'change'` geloggt?
- Ist `targetTagName: 'SELECT'`?
- Ist `hasTarget: true`?
- Ist `newStatus` unterschiedlich von `oldStatus`?

### 2. **Modal Opening** (`updateCourseStatus`)
Wenn die Modal geöffnet wird:
```
═══════════════════════════════════════════
📋 updateCourseStatus STARTED
═══════════════════════════════════════════
✅ Validation passed, setting up modal...
📦 Modal state (before modal open): { statusChangeCourse, oldStatus, newStatus }
🎨 Setting showStatusChangeModal to true...
✅ Modal state set: { showStatusChangeModal, oldStatus, newStatus, courseName, courseId }
═══════════════════════════════════════════
```

**Was to check:**
- Wird die Validation bestanden?
- Sind `oldStatus` und `newStatus` unterschiedlich?
- Wird `showStatusChangeModal` auf `true` gesetzt?

### 3. **Modal Display**
Im Modal siehst du einen DEBUG-Info-Block:
```
DEBUG: Modal=true, Old=draft, New=active, Course=e256a7e8
```

**Was to check:**
- Wird die Modal angezeigt?
- Stimmen die Werte mit dem Dropdown überein?

### 4. **Confirmation** (`confirmStatusChange`)
Wenn du "Status ändern" klickst:
```
═══════════════════════════════════════════
🔘 confirmStatusChange STARTED
═══════════════════════════════════════════
📋 Current state before update: { statusChangeCourse, oldStatus, newStatus, showStatusChangeModal }
📊 Update Details: { courseId, tenantId, currentUser, userRole, userTenantId }
📝 Preparing update: { courseId, updateData }

🔍 Step 1: Testing read access...
📖 Read test result: { success, courseId, currentStatus, courseName }

✏️ Step 2: Executing update...
📤 Update response: { success, courseId, newStatus }

🔄 Step 3: Updating local course object...
🔎 Found course at index: X
✅ Local course updated: { courseIndex, oldStatus, newStatus, name }

🎨 Step 4: Updating UI state...
✅ Final state: { successMessage, modalVisible, statusChangeCourse }

🔄 Step 5: Reloading courses in background...
═══════════════════════════════════════════
```

## Typical Issues and Solutions

### Issue 1: Modal wird nicht angezeigt
**Mögliche Ursachen:**
1. `showStatusChangeModal` wird nicht auf `true` gesetzt
2. `v-if="showStatusChangeModal"` wird nicht evaluiert

**Debug-Steps:**
1. Öffne die Browser Console (F12)
2. Schau die Logs von `updateCourseStatus` an
3. Check: Wird `🎨 Setting showStatusChangeModal to true...` geloggt?
4. Wenn ja: Check die Vue DevTools → Reactive State
   - Ist `showStatusChangeModal` wirklich `true`?

### Issue 2: Modal wird angezeigt, aber "Status ändern"-Button funktioniert nicht
**Mögliche Ursachen:**
1. `newStatus.value` ist leer oder `null`
2. `statusChangeCourse.value` ist `null`
3. RLS-Policy blockiert das Update

**Debug-Steps:**
1. Klick den "Status ändern"-Button
2. Schau den Log `📊 Update Details:`
   - Ist `oldStatus` und `newStatus` gefüllt?
   - Ist die `courseId` vorhanden?
3. Schau den Log `📖 Read test result:`
   - Ist `success: true`?
   - Wenn `false`: RLS-Problem!
4. Schau den Log `📤 Update response:`
   - Ist `success: true`?
   - Wenn `false`: Schau den `error`-Object!

### Issue 3: Update ist erfolgreich, aber UI wird nicht aktualisiert
**Mögliche Ursachen:**
1. Lokales `courses.value`-Array wird nicht aktualisiert
2. `courses.value` ist nicht reactive
3. Modal wird nicht geschlossen

**Debug-Steps:**
1. Schau den Log `🔄 Step 3: Updating local course object...`
   - Ist `courseIndex` !== -1?
   - Wird das `newStatus` korrekt aktualisiert?
2. Schau den Log `🎨 Step 4: Updating UI state...`
   - Ist `modalVisible: false`?
   - Ist `statusChangeCourse: null`?

## Browser Console Commands

Du kannst auch direkt in der Browser Console debuggen:

```javascript
// Reactive State anschauen
console.log(this.$data.showStatusChangeModal)
console.log(this.$data.oldStatus)
console.log(this.$data.newStatus)
console.log(this.$data.courses)

// Event manuell auslösen
const event = new Event('change')
const select = document.querySelector('select[value="draft"]')
select?.dispatchEvent(event)
```

## Network Debugging

Wenn die DB-Queries fehlschlagen:

1. Öffne DevTools → Network Tab
2. Filtere nach API-Calls
3. Schau nach `PATCH`-Requests an `/rest/v1/courses`
4. Check den Response:
   - Status Code 200 = OK
   - Status Code 4xx = Client Error
   - Status Code 5xx = Server Error
5. Schau den Request Body:
   - Stimmen die Werte?
   - Sind alle required Fields vorhanden?

## Quick Checklist

- [ ] Event wird registriert (`handleStatusChange`)
- [ ] Modal wird geöffnet (`updateCourseStatus`)
- [ ] Modal zeigt korrekte Werte
- [ ] Bestätigung wird verarbeitet (`confirmStatusChange`)
- [ ] DB-Read ist erfolgreich (Step 1)
- [ ] DB-Update ist erfolgreich (Step 2)
- [ ] Lokales Array wird aktualisiert (Step 3)
- [ ] UI State wird aktualisiert (Step 4)
- [ ] Modal wird geschlossen
- [ ] UI zeigt neue Status

## Reporting Issues

Wenn das Debug-Logging nicht hilft, bitte folgende Infos bereitstellen:

1. **Kompletter Console Output** (mit allen Debug-Logs)
2. **Network Tab** (Request/Response von der Patch-Operation)
3. **Vue DevTools** (Reactive State nach dem Fehler)
4. **Browser Version** und **OS**
5. **Exakte Schritte** zum Reproduzieren des Problems

