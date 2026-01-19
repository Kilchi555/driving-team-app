# CSP Preview Testing Guide

## 🎯 Ziel

Testen des **Content-Security-Policy Headers** im Vercel Preview Environment (HTTPS) bevor zur Production deployed wird.

---

## 📋 Warum Preview statt Local?

| Aspekt | Local | Preview | Production |
|--------|-------|---------|------------|
| HTTPS | ❌ No | ✅ Yes | ✅ Yes |
| CSP Durchsetzung | ⚠️ Minimal | ✅ Streng | ✅ Streng |
| Google Maps | ⚠️ Begrenzt | ✅ Voll | ✅ Voll |
| hCaptcha | ⚠️ Begrenzt | ✅ Voll | ✅ Voll |
| Wallee Payment | ⚠️ Begrenzt | ✅ Voll | ✅ Voll |
| Cookie Security | ⚠️ Unsecure flag | ✅ Secure flag | ✅ Secure flag |

**→ Preview = echte Production Umgebung**

---

## 🚀 Deployment zu Preview

### **1. Feature Branch erstellen**

```bash
git checkout -b feature/csp-security-headers
git add nuxt.config.ts
git commit -m "feat: Add Content-Security-Policy headers for XSS protection

- Restrict script sources to self + maps.googleapis.com + js.hcaptcha.com
- Restrict style sources to self + unsafe-inline + fonts.googleapis.com
- Restrict connect/fetch sources to self + Supabase + hCaptcha + Resend
- Block inline objects, require form submissions to same origin
- All framing restricted to hCaptcha only

This enables defense-in-depth XSS protection alongside backend input sanitization."
```

### **2. Push zu GitHub**

```bash
git push origin feature/csp-security-headers
```

Vercel erstellt automatisch einen Preview Link!

### **3. Preview Link finden**

```
Öffne: https://github.com/YOUR_REPO/pulls
→ Suche nach deinem PR
→ Scroll down zu "Deployments"
→ Klick auf "Visit Preview"
```

**Beispiel Preview URL:**
```
https://driving-team-app-feat-csp.vercel.app
```

---

## 🧪 Testing Checklist (HTTPS Preview)

### **Phase 1: Grundfunktionalität**

- [ ] **App lädt ohne Fehler**
  ```
  DevTools → Console
  Keine CSP Violations ("Refused to load...")
  ```

- [ ] **Keine 403 Errors**
  ```
  DevTools → Network
  Filter: Status Code = 403
  Sollte LEER sein!
  ```

### **Phase 2: Externe Resources**

#### hCaptcha (Registrierung/Login)
```bash
1. Gehe zu: https://driving-team-app-feat-csp.vercel.app/register/driving-team
2. Warte bis hCaptcha lädt
3. DevTools → Console
   ✅ Keine "js.hcaptcha.com blocked" Fehler
4. Versuche Captcha zu lösen
   ✅ Captcha funktioniert
```

#### Google Maps (Booking)
```bash
1. Gehe zu: https://driving-team-app-feat-csp.vercel.app/booking/availability/driving-team
2. Warte bis Karte lädt
3. DevTools → Console
   ✅ Keine "maps.googleapis.com blocked" Fehler
4. Versuche Pickup Adresse einzugeben
   ✅ Autocomplete funktioniert
```

#### Supabase (API Calls)
```bash
1. Gehe zu: https://driving-team-app-feat-csp.vercel.app/customer/courses/driving-team
2. DevTools → Network → Filter: XHR
3. Klick auf Supabase Requests
   ✅ Status: 200 OK (nicht 403)
```

#### Wallee (Payment)
```bash
1. Gehe zu: https://driving-team-app-feat-csp.vercel.app/customer/payments
2. Versuche Payment zu starten
3. DevTools → Console
   ✅ Keine Wallee-bezogenen CSP Fehler
```

### **Phase 3: CSP Violations checken**

```bash
DevTools → Console
Suche nach: "Refused to"
```

**❌ BAD (CSP blockiert etwas):**
```
Refused to load the script 'https://maps.googleapis.com/...'
Reason: Content-Security-Policy: default-src 'self'
```

**✅ GOOD (Alles erlaubt):**
```
(keine CSP Fehler in Console)
```

### **Phase 4: Network Analysis**

```bash
DevTools → Network Tab
1. Reload Seite (Ctrl+Shift+R hard refresh)
2. Warte bis alle Resources geladen sind
3. Suche nach Status Code Problemen:
   
   ✅ OK: 200, 304
   ❌ PROBLEM: 403 (CSP blockiert), 0 (nicht geladen)
   
4. Klick jede "0" Request an:
   → Was war das?
   → Fehlt in CSP?
```

---

## 🐛 Troubleshooting

### **Problem: hCaptcha lädt nicht**

```
Console Error: 
"Refused to load the script 'https://js.hcaptcha.com/1/api.js'..."

Fix: CSP muss enthalten:
"script-src 'self' ... https://js.hcaptcha.com"
```

### **Problem: Google Maps Autocomplete funktioniert nicht**

```
Console Error:
"Refused to connect to 'https://maps.googleapis.com/...'"

Fix: CSP muss enthalten:
"connect-src 'self' ... https://maps.googleapis.com"
```

### **Problem: Wallee Payment funktioniert nicht**

```
Console Error:
"Refused to make a request to '...wallee...'"

Fix: Wallee braucht meist nur Backend access (über /api/payments/...)
Frontend sollte keine direkten Wallee Calls machen!
```

### **Problem: Styling kaputt**

```
Console Error:
"Refused to apply inline style..."

Fix: CSP hat 'unsafe-inline' für style-src
Sollte funktionieren! Prüfe ob CSS loading Error ist.
```

---

## 📊 Expected CSP Header (vom Server)

Öffne DevTools → Network Tab → Any request → Headers:

**Du solltest sehen:**
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' https://maps.googleapis.com https://js.hcaptcha.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  img-src 'self' data: https:; 
  connect-src 'self' https://unyjaetebnaexaflpyoc.supabase.co https://maps.googleapis.com https://hcaptcha.com https://api.resend.com; 
  font-src 'self' https://fonts.gstatic.com; 
  frame-src 'self' https://js.hcaptcha.com; 
  object-src 'none'; 
  base-uri 'self'; 
  form-action 'self'
```

---

## ✅ Erfolgreicher Test Checklist

- [ ] App lädt ohne CSP Violations
- [ ] hCaptcha funktioniert (Registrierung testet)
- [ ] Google Maps funktioniert (Booking testet)
- [ ] Supabase API Calls funktionieren (Courses testen)
- [ ] Payment funktioniert (Start payment Flow)
- [ ] Keine 403 Errors im Network Tab
- [ ] DevTools Console ist CLEAN (keine "Refused to..." Fehler)

---

## 🎯 Nächste Schritte

### **Wenn alles OK:**
```bash
1. Gehe auf GitHub PR
2. Klick "Approve" / "Merge to main"
3. Production wird automatisch deployed!
```

### **Wenn Probleme:**
```bash
1. Notiere den Fehler (z.B. "Google Maps blocked")
2. Updaten CSP in nuxt.config.ts
3. Commit & Push
4. Vercel re-deployed Preview automatisch
5. Re-test
```

---

## 📞 Häufige Fragen

**F: Kann ich Preview testen von meinem Handy?**
```
A: Ja! Preview URL funktioniert auf jedem Device mit Internet.
   Wichtig für mobile Testing von hCaptcha/Google Maps!
```

**F: Wie lange lädt Preview?**
```
A: Erste Deploy: 3-5 Minuten
   Re-Deploy (nach Änderungen): 1-2 Minuten
```

**F: Was wenn ich Cancel vor dem Merge?**
```
A: Preview wird automatisch gelöscht, nothing pushed to main.
```

**F: Kann ich Production direkt testen?**
```
A: Nein! Immer erst Preview testen!
   CSP Fehler in Production = App broken für alle Benutzer!
```

---

## 🚀 Summary

1. **Push Feature Branch** → Preview erstellt sich automatisch
2. **Test Preview mit HTTPS** → Siehe echte CSP Behavior
3. **Wenn OK** → Merge zu main
4. **Production deployed automatisch** → Mit CSP Protection!

**Time to test:** ~15 Minuten
**Risk wenn nicht getestet:** 🔴 Sehr hoch (App broken für alle!)
**Benefit:** ✅ XSS Protection für alle Benutzer

