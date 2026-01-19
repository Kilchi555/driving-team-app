# ✅ CSP Preview Testing - MANUAL CHECKLIST

## 🚀 Deine Tasks (in der Preview):

**Preview öffnen:** Die URL findest du im GitHub PR unter "Deployments"

---

## 📋 TEST 1: CSP Header Check (DevTools)

1. Öffne deine Preview URL
2. Drücke **F12** (DevTools)
3. Gehe zum **Console** Tab
4. Suche nach "Refused to load"

**Ergebnis:**
- ✅ **Keine Fehler** = CSP funktioniert richtig
- ❌ **Fehler wie "Refused to load..."** = CSP Problem

---

## 📋 TEST 2: hCaptcha (Registrierung)

1. Gehe zu: `[PREVIEW_URL]/register/driving-team`
2. Warte bis Seite lädt
3. DevTools → **Network** Tab
4. Suche nach Requests zu `js.hcaptcha.com`

**Ergebnis:**
- ✅ hCaptcha lädt (Status 200)
- ✅ Captcha Box ist sichtbar
- ❌ hCaptcha nicht sichtbar = CSP blockiert

---

## 📋 TEST 3: Google Maps (Booking)

1. Gehe zu: `[PREVIEW_URL]/booking/availability/driving-team`
2. Warte bis Seite lädt
3. DevTools → **Network** Tab
4. Suche nach Requests zu `maps.googleapis.com`

**Ergebnis:**
- ✅ Karte ist sichtbar
- ✅ Google Maps Requests Status 200
- ✅ Autocomplete funktioniert (Pickup-Feld)
- ❌ Karte nicht sichtbar = CSP blockiert

---

## 📋 TEST 4: Supabase API (Courses)

1. Gehe zu: `[PREVIEW_URL]/customer/courses/driving-team`
2. Warte bis Seite lädt
3. DevTools → **Network** Tab → Filter: XHR
4. Suche nach `supabase.co` Requests

**Ergebnis:**
- ✅ Courses laden (Status 200)
- ✅ Kurs-Liste sichtbar
- ❌ 403 Fehler = API Problem (nicht CSP)

---

## 📋 TEST 5: Console Clean Check

1. DevTools → **Console** Tab
2. Reload Seite (Ctrl+R)
3. Schaue nach **ROTEN** Meldungen

**Sollte NICHT sehen:**
```
❌ Refused to load the script 'https://...'
❌ Content-Security-Policy: ...
❌ Unsafe attempt to load...
```

**OK zu sehen:**
```
✅ warnings (gelb)
✅ info logs
✅ normale messages
```

---

## 🎯 FINAL CHECKLIST

- [ ] TEST 1: Keine "Refused to load" Fehler
- [ ] TEST 2: hCaptcha lädt & sichtbar
- [ ] TEST 3: Google Maps lädt & sichtbar
- [ ] TEST 4: Supabase API funktioniert
- [ ] TEST 5: Console ist clean (keine CSP Fehler)

---

## ✅ WENN ALLES OK:

1. Gehe zum PR auf GitHub
2. Klick **"Merge pull request"**
3. Production wird auto deployed!

---

## ❌ WENN FEHLER:

Schreib mir:
```
"hCaptcha lädt nicht"
oder
"Google Maps blockt"
oder
"Console zeigt: [ERROR MESSAGE]"
```

Dann fixen wir die CSP und re-testen!

---

## 🔗 Wichtige Links

- Preview URL: (Gib mir Bescheid wenn du sie hast!)
- PR: https://github.com/Kilchi555/driving-team-app/pulls
- Testing Docs: `CSP_PREVIEW_TESTING.md` in repo

