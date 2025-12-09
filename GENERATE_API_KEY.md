# API-Key Generierung - Verschiedene Methoden

## Methode 1: Node.js Terminal-Befehl (am einfachsten)

```bash
node -e "logger.debug(require('crypto').randomBytes(32).toString('hex'))"
```

**Was passiert:**
- `require('crypto')` - Lädt Node.js Crypto-Modul
- `randomBytes(32)` - Generiert 32 zufällige Bytes (256 Bit)
- `.toString('hex')` - Konvertiert zu Hexadezimal (64 Zeichen)
- `logger.debug()` - Gibt das Ergebnis aus

**Alternative mit UUID (wie in deiner Codebase):**
```bash
node -e "logger.debug(require('crypto').randomUUID().replace(/-/g, ''))"
```

---

## Methode 2: Node.js Skript erstellen

Erstelle eine Datei `generate-key.js`:

```javascript
const crypto = require('crypto');

// Generiere 32 Bytes (256 Bit) zufällige Daten
const key = crypto.randomBytes(32).toString('hex');

logger.debug('Dein API-Key:');
logger.debug(key);
```

**Dann ausführen:**
```bash
node generate-key.js
```

---

## Methode 3: Python (falls installiert)

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Oder mit OpenSSL:
```bash
openssl rand -hex 32
```

---

## Methode 4: Online-Tools (für schnelle Tests)

- **https://randomkeygen.com/** - Wähle "CodeIgniter Encryption Keys"
- **https://www.lastpass.com/features/password-generator** - Generiere zufällige Strings
- **https://www.uuidgenerator.net/** - UUID-Generator (dann Bindestriche entfernen)

---

## Methode 5: Browser Console (jederzeit verfügbar)

Öffne die Browser-Console (F12) und führe aus:

```javascript
// Generiere zufälligen Key (32 Bytes = 64 Hex-Zeichen)
Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')
```

**Oder einfacher:**
```javascript
crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').substring(0, 32)
```

---

## Methode 6: PowerShell (Windows)

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Oder:**
```powershell
[System.Web.Security.Membership]::GeneratePassword(64, 0)
```

---

## Empfohlene Methode für dich

**Da du Node.js bereits installiert hast**, ist die einfachste Methode:

```bash
node -e "logger.debug(require('crypto').randomBytes(32).toString('hex'))"
```

**Falls du mehrere Keys auf einmal brauchst:**
```bash
node -e "for(let i=0; i<3; i++) logger.debug(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Key-Länge Erklärung

- **32 Bytes** = 256 Bit = **64 Hex-Zeichen**
- **16 Bytes** = 128 Bit = 32 Hex-Zeichen (kürzer, aber auch sicher)
- **64 Bytes** = 512 Bit = 128 Hex-Zeichen (länger, aber unnötig für API-Keys)

**Empfehlung:** 32 Bytes (64 Zeichen) ist optimal für API-Keys.

---

## Sicherheitshinweise

✅ **Gut:**
- `crypto.randomBytes()` - Kryptografisch sicher
- `crypto.randomUUID()` - Kryptografisch sicher
- `secrets.token_hex()` (Python) - Kryptografisch sicher

❌ **Schlecht (nicht verwenden):**
- `Math.random()` - Nicht kryptografisch sicher!
- Einfache String-Konkatenation - Vorhersagbar
- Timestamps - Vorhersagbar

---

## Beispiel: Mehrere Keys auf einmal generieren

Erstelle `generate-keys.sh`:

```bash
#!/bin/bash
echo "=== CRON_API_KEY ==="
node -e "logger.debug(require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "=== VERCEL_WEBHOOK_SECRET ==="
node -e "logger.debug(require('crypto').randomBytes(32).toString('hex'))"
```

**Dann ausführen:**
```bash
chmod +x generate-keys.sh
./generate-keys.sh
```

