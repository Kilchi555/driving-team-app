# Token nicht gefunden? Hier sind Lösungen:

## Option 1: Alle localStorage Keys anzeigen
Kopiere das in die DevTools Console:

```javascript
// Zeige ALLE localStorage Items
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}:`, value?.substring(0, 50) + '...');
}
```

Das zeigt dir, unter welchem Key der Token gespeichert ist.

---

## Option 2: Suche nach Token in sessionStorage
Der Token könnte auch im `sessionStorage` sein:

```javascript
// Zeige ALLE sessionStorage Items
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  const value = sessionStorage.getItem(key);
  console.log(`${key}:`, value?.substring(0, 50) + '...');
}
```

---

## Option 3: Suche nach Supabase Auth Keys
```javascript
// Versuche verschiedene Supabase Key Varianten
const keys = [
  'sb-auth-token',
  'supabase-auth-token',
  'auth.token',
  'access_token',
  'sb-unyjaetebnaexaflpyoc-auth-token',
  'supabase.auth.token'
];

keys.forEach(key => {
  const value = localStorage.getItem(key) || sessionStorage.getItem(key);
  console.log(`${key}:`, value ? 'FOUND' : 'not found');
});
```

---

## Option 4: Zeige gesamte Supabase Auth State
```javascript
// Das komplette Supabase Auth Objekt
const supabaseKey = Object.keys(localStorage).find(k => k.includes('supabase'));
if (supabaseKey) {
  const data = JSON.parse(localStorage.getItem(supabaseKey));
  console.log('Supabase Auth State:', data);
  console.log('Token:', data?.session?.access_token);
}
```

---

## Wenn du NICHT eingeloggt bist:

1. **Logout** (falls du in der App bist)
2. **Neu laden:** `Cmd + R` oder `F5`
3. **Login** mit: `pascal_kilchenmann@icloud.com` + Passwort
4. **DevTools** öffnen und nochmal versuchen

---

## Wenn du eingeloggt bist, aber Token null:

Versuche das in der Console:

```javascript
// Rufe getToken() direkt auf (Supabase API)
// Das sollte den aktuellen Token zurückgeben
const supabase = window.__NUXT__?.$supabase;
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    console.log('Current session:', data.session);
    console.log('Access Token:', data.session?.access_token);
  });
}
```

---

## Wenn das auch nicht funktioniert:

Versuch das Netzwerk-Tab:

1. Öffne DevTools
2. Gehe zu **Network** Tab
3. Führe eine Action aus (z.B. navigiere zu `/customer/payments`)
4. Schau nach einem Request zu `http://localhost:3000/api/customer/get-payment-page-data`
5. Klick darauf
6. Gehe zu **"Headers"** Tab
7. Scrolle bis zu **"Authorization"** Header
8. Kopiere den Token (nach `Bearer `)

---

## Schnelle Lösung:

Wenn alles nicht funktioniert, **starte neu**:

```bash
# Terminal 1: Kill dev server
Ctrl + C

# Terminal 2: Starte dev server neu
npm run dev

# Browser: Hard Reload
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows/Linux)

# Login nochmal
```

Dann versuch die Console Commands nochmal.


