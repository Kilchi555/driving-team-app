# Token extrahieren - Schritt-für-Schritt Guide

## Option 1: Browser Console (Sicherster Weg)

```javascript
// Öffne Browser Console (F12 oder Cmd+Option+I)
// Gib folgendes ein:

const session = JSON.parse(localStorage.getItem('sb-unyjaetebnaexaflpyoc-auth-token'))
console.log(session.access_token)

// ODER kürzer:
JSON.parse(localStorage.getItem('sb-unyjaetebnaexaflpyoc-auth-token')).access_token
```

**Ergebnis:** Eine lange String wie:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3VueWphZXRlYm5hZXhhZmxweW9jLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwNGMxYzdlMS0yNjQ3LTQ4NDgtYTU0NC01MTcxNmVlZjM5M2YiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNjczOTA5NDk0LCJpYXQiOjE2NzM4OTI2OTQsImVtYWlsIjoicGFzY2FsX2tpbGNoZW5tYW5uQGljbG91ZC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6InBhc3N3b3JkIiwicHJvdmlkZXJzIjpbInBhc3N3b3JkIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTY3Mzg5MjY5NH1dLCJzZXNzaW9uX2lkIjoiYjFjYjc4ZjAtNDcwMC00Zjc5LTk3YTktYzA0N2E2NjY5ZjQ1In0.abc123...
```

**Kopiere diesen String!**

---

## Option 2: Network Tab (Alternative)

1. Öffne DevTools → **Network** Tab
2. Lade eine Seite neu oder mache einen API Call
3. Schaue nach einem `GET /` Request
4. Klick drauf → **Headers** Tab
5. Suche nach: `Authorization: Bearer ...`
6. Kopiere den Token nach `Bearer `

---

## Option 3: Wenn du gar nicht eingeloggt bist

Du **musst** erst eingeloggt sein um einen Token zu haben!

1. Gehe zu: http://localhost:3000/login
2. Melde dich an (als admin/super_admin wenn möglich)
3. Warte bis du auf der Dashboard-Seite bist
4. DANN: Öffne Console und kopiere den Token

---

## Option 4: Direkter Check - Alle localStorage Items

```javascript
// In Console eingeben:
for (let key in localStorage) {
  if (key.includes('auth')) {
    console.log(key + ': ' + localStorage[key])
  }
}

// Sollte zeigen:
// sb-unyjaetebnaexaflpyoc-auth-token: {...}
```

---

## Token sieht so aus:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3VueWphZXRlYm5hZXhhZmxweW9jLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwNGMxYzdlMS0yNjQ3LTQ4NDgtYTU0NC01MTcxNmVlZjM5M2YiLCJhdWQiOiJhdXRoZW50aWNhdGVkIn0.signature...
```

**3 Teile getrennt von `.`:**
- Teil 1: Header (eyJhbGc...)
- Teil 2: Payload (eyJpc3M...)
- Teil 3: Signature (signature...)

---

## Testing mit Token:

```bash
# Setze deinen Token:
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export BASE_URL="http://localhost:3000"

# Teste API:
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"
```

---

## Häufige Probleme:

| Problem | Lösung |
|---------|--------|
| Kein Token im localStorage | Du bist nicht eingeloggt → Login zuerst |
| localStorage ist leer | Private/Incognito Modus? → Normal Mode nutzen |
| Token hat falsches Format | Kopiere komplett, kein `Bearer ` davor! |
| `401 Unauthorized` bei API Call | Token abgelaufen → Neu einloggen |

---

**Schreib mir:** Kannst du den Token jetzt sehen? 🤔

