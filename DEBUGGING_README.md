# Debugging Ressourcen für Status-Change

## Überblick

Diese Dokumentation hilft dir, das Status-Change-Problem zu debuggen und zu verstehen.

## Dateien

### 1. **STATUS_CHANGE_FIX_SUMMARY.md** (LESEN)
- ✅ Was war das Problem?
- ✅ Warum funktioniert es jetzt?
- ✅ Wie man es testet
- ✅ Performance-Tipps

**Start here!** Diese Datei erklärt die gesamte Lösung.

### 2. **STATUS_CHANGE_DEBUGGING_GUIDE.md** (NACHSCHLAGEWERK)
- 📊 Detaillierter Step-by-Step Flow
- 🔍 Was bei jedem Schritt zu erwarten ist
- ❌ Häufige Probleme und Lösungen
- 📋 Checkliste zum Abhaken

**Verwende diese, wenn du** ein bestimmtes Problem hast.

### 3. **DEBUGGING_STATUS_CHANGE.md** (REFERENZ)
- 🔄 Debug-Flow Beschreibung
- ⚡ Typical Issues and Solutions
- 🛠️ Browser Console Commands
- 🌐 Network Debugging

**Diese Datei ist älter und wird** durch STATUS_CHANGE_DEBUGGING_GUIDE.md ersetzt.

### 4. **DIAGNOSTIC_SCRIPT.js** (TOOL)
- 🧪 Browser Console Diagnostic
- ✅ Überprüft alle DOM-Elemente
- 📊 Z-Index Hierarchie
- 🔧 Monitoring Setup

**Kopiere und paste in die Browser Console (F12)**

```javascript
// Copy the entire DIAGNOSTIC_SCRIPT.js content into browser console
// Then run: monitorStatusChange()
```

### 5. **sql_migrations/DIAGNOSTIC_RLS_POLICIES.sql** (DB-TOOL)
- 🔐 RLS Policy Überprüfung
- 🛠️ Policy Fixes
- 📋 Status Report

**Führe diese Queries in Supabase aus, wenn** Status-Updates fehlschlagen.

### 6. **debug_status.sh** (SHELL-SCRIPT)
- 📝 Einfache Checkliste
- 🎯 Erwartete Logs
- ⚡ Quick Troubleshooting

**Lese diese, bevor du beginnst.**

## Quick Start

### Szenario 1: Status ändert sich nicht
1. Lese: **STATUS_CHANGE_FIX_SUMMARY.md**
2. Führe aus: **DIAGNOSTIC_SCRIPT.js** (im Browser Console)
3. Folge: **STATUS_CHANGE_DEBUGGING_GUIDE.md** Phase 1-7
4. Wenn DB-Error: Führe **DIAGNOSTIC_RLS_POLICIES.sql** aus

### Szenario 2: Modal wird nicht angezeigt
1. Lese: **STATUS_CHANGE_DEBUGGING_GUIDE.md** Phase 2
2. Führe aus: **DIAGNOSTIC_SCRIPT.js** → Check "ALL MODALS Z-INDEX"
3. Prüfe ob Modal hidden ist
4. Kontrolliere z-index in DevTools

### Szenario 3: Button funktioniert nicht
1. Lese: **STATUS_CHANGE_DEBUGGING_GUIDE.md** Phase 3
2. Öffne DevTools → Console
3. Klick auf "Status ändern"-Button
4. Schau nach Error-Logs
5. Prüfe Network Tab → PATCH Request

### Szenario 4: UI aktualisiert sich nicht
1. Lese: **STATUS_CHANGE_DEBUGGING_GUIDE.md** Phase 6-7
2. Prüfe ob `courses.value` aktualisiert wird
3. Prüfe ob Modal geschlossen wird
4. Prüfe `loadCourses()` Logs

## Debug-Logs Verstehen

### Erfolgreicher Flow
```
🔄 handleStatusChange STARTED
📋 updateCourseStatus STARTED
🎨 Setting showStatusChangeModal to true...
✅ Modal state set: { showStatusChangeModal: true, ... }
🔘 confirmStatusChange clicked!
🔍 Step 1: Testing read access...
✏️ Step 2: Executing update...
✅ Course status updated in DB
🔄 Step 3: Updating local course object...
✅ Local course updated
🎨 Step 4: Updating UI state...
✅ Modal closed
```

### Fehlerhafter Flow (z-index Problem)
```
🔄 handleStatusChange STARTED
📋 updateCourseStatus STARTED
🎨 Setting showStatusChangeModal to true...
✅ Modal state set
[KEINE LOGS MEHR - MODAL NICHT SICHTBAR]
```

### Fehlerhafter Flow (RLS Problem)
```
...
📖 Read test result: { success: false, readError: { code: 'PGRST116' } }
❌ Cannot read course: ...
[UPDATE NICHT AUSGEFÜHRT]
```

## Weitere Tipps

### 1. Browser DevTools öffnen
- Chrome/Firefox: **F12**
- Safari: **Cmd+Option+I**
- Edge: **F12**

### 2. Vue DevTools installieren
- Chrome: [Vue DevTools Extension](https://chrome.google.com/webstore/detail/vuejs-devtools)
- Firefox: [Vue DevTools Extension](https://addons.mozilla.org/en-US/firefox/addon/vue-devtools/)

### 3. Logs filtern
In Browser Console:
```javascript
// Show only status-change logs
document.addEventListener('log', (e) => {
  if (e.message?.includes('Status')) console.log(e)
})
```

### 4. Netzwerk debuggen
- DevTools → Network Tab
- Filtere nach "courses"
- Klick auf PATCH-Request
- Schau Request Body und Response

## Kontakt / Weitere Hilfe

Wenn nach dem Debugging immer noch Probleme auftreten:

1. **Sammle folgende Infos:**
   - Kompletter Console Output
   - Network Tab (PATCH Request)
   - Vue State (Vue DevTools)
   - Browser/OS Version

2. **Berichte:**
   - Welcher Schritt funktioniert nicht?
   - Welche Error-Meldung?
   - Was hast du schon versucht?

3. **Überprüfe:**
   - Bist du als Admin eingeloggt?
   - Sind RLS Policies korrekt?
   - DB-Migration ausgeführt?

---

**Last Updated:** 2025-12-18  
**Status:** ✅ Problem gelöst - z-index und Modal-Render-Order behoben

