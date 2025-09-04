# 🏦 Accounto Integration Guide

## 🚨 **Problem: Rechnung erscheint nicht im Accounto Dashboard**

Das Problem lag daran, dass die Rechnungserstellung zwar erfolgreich erscheint (Mock-Fallback), aber die echte Accounto API-Integration fehlschlägt.

## 🔧 **Lösungsschritte:**

### **1. Environment Variables setzen**

Erstellen Sie eine `.env` Datei im Projektverzeichnis:

```bash
# Accounto API Configuration
ACCOUNTO_API_KEY=ihr_echter_api_key_hier
ACCOUNTO_BASE_URL=https://api.accounto.ch
```

**Wichtig:** Der API-Key muss von Ihrem Accounto-Account stammen.

### **2. Accounto API Key erhalten**

1. **Gehen Sie zu:** [Accounto Dashboard](https://app.accounto.ch/)
2. **Navigieren Sie zu:** `Settings` → `API` → `API Keys`
3. **Erstellen Sie einen neuen API Key:**
   - Name: `Driving Team Integration`
   - Berechtigungen: `Read`, `Write` für Customers und Invoices
4. **Kopieren Sie den API Key**

### **3. API-Integration testen**

Gehen Sie zu: `http://localhost:3000/accounto-test`

1. **Environment Check:** Prüfen Sie, ob der API-Key gesetzt ist
2. **Verbindung testen:** Klicken Sie auf "Verbindung testen"
3. **Test-Rechnung erstellen:** Klicken Sie auf "Test-Rechnung erstellen"

### **4. Häufige Fehler und Lösungen**

#### **A. "ACCOUNTO_API_KEY nicht konfiguriert"**
```bash
# Lösung: Environment Variable setzen
export ACCOUNTO_API_KEY=ihr_api_key
# Oder in .env Datei
ACCOUNTO_API_KEY=ihr_api_key
```

#### **B. "Unauthorized - API Key ungültig oder abgelaufen"**
- API Key überprüfen
- Neuen API Key erstellen
- Berechtigungen prüfen

#### **C. "Endpoint nicht gefunden"**
- `ACCOUNTO_BASE_URL` überprüfen
- Standard: `https://api.accounto.ch`

#### **D. "Forbidden - Keine Berechtigung"**
- API Key Berechtigungen prüfen
- Mindestens: `Customers: Read/Write`, `Invoices: Read/Write`

## 🧪 **Debug-Tests:**

### **1. Verbindungstest**
```bash
curl http://localhost:3000/api/accounto/test-connection
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Verbindung zu Accounto erfolgreich",
  "details": {
    "apiUrl": "https://api.accounto.ch/api/me",
    "status": "CONNECTED"
  }
}
```

### **2. Test-Rechnung erstellen**
```bash
curl -X POST http://localhost:3000/api/accounto/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "appointments": [{
      "id": "test-1",
      "title": "Test Fahrstunde",
      "start_time": "2024-01-15T10:00:00Z",
      "duration_minutes": 45,
      "amount": 95
    }],
    "customerData": {
      "firstName": "Test",
      "lastName": "Kunde",
      "email": "test@example.com"
    },
    "emailData": {
      "email": "test@example.com",
      "subject": "Test-Rechnung"
    },
    "totalAmount": 95
  }'
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "invoiceId": "inv_123456",
  "invoiceNumber": "DT-123456",
  "customerId": "cust_123456",
  "message": "Rechnung erfolgreich in Accounto erstellt und per E-Mail versendet"
}
```

## 📋 **Accounto API Endpunkte (basierend auf docs.accounto.ch):**

### **Verbindung testen:**
```
GET /api/me
```

### **Kunde erstellen:**
```
POST /api/customers
```

### **Rechnung erstellen:**
```
POST /api/invoices
```

### **E-Mail versenden:**
```
POST /api/invoices/{id}/send
```

## 🔍 **Debug-Logs aktivieren:**

Die Integration protokolliert alle API-Aufrufe detailliert:

```bash
# Server-Logs zeigen:
🏦 Accounto Invoice Creation...
🔧 Accounto Config: { baseUrl: "https://api.accounto.ch", apiKeyPreview: "eyJhbGciOiJIUzI1NiJ9...", apiKeyLength: 123 }
🔄 Step 1: Testing Accounto API connection...
✅ Accounto API connection test successful: { ... }
🔄 Step 2: Creating customer in Accounto...
✅ Customer created/updated in Accounto: { ... }
🔄 Step 3: Creating invoice in Accounto...
✅ Invoice created in Accounto: { ... }
🔄 Step 4: Sending email via Accounto...
✅ Email sent via Accounto: { ... }
✅ Real Accounto integration successful: { ... }
```

## ❌ **Fehlerbehandlung:**

### **401 Unauthorized:**
- API Key ungültig oder abgelaufen
- Neuen API Key erstellen

### **403 Forbidden:**
- API Key hat keine ausreichenden Berechtigungen
- Berechtigungen in Accounto Dashboard prüfen

### **404 Not Found:**
- API Endpunkt falsch
- `ACCOUNTO_BASE_URL` überprüfen

### **500+ Server Error:**
- Accounto Server-Problem
- Später erneut versuchen

## 🎯 **Nächste Schritte:**

1. **Environment Variables setzen** mit echtem API Key
2. **Verbindungstest ausführen** auf `/accounto-test`
3. **Test-Rechnung erstellen** um API-Integration zu prüfen
4. **Fehler analysieren** falls Tests fehlschlagen
5. **Accounto Support kontaktieren** falls API Key korrekt ist

## ✅ **Erwartetes Ergebnis:**

Nach der korrekten Konfiguration sollten Rechnungen:
- ✅ In Accounto erstellt werden
- ✅ Im Accounto Dashboard erscheinen
- ✅ Per E-Mail versendet werden
- ✅ Korrekte Rechnungsnummern erhalten

## 🔗 **Links:**

- **Test-Seite:** `http://localhost:3000/accounto-test`
- **Accounto Dashboard:** `https://app.accounto.ch/`
- **API Dokumentation:** `https://docs.accounto.ch`

---

**Status:** 🔧 Integration korrigiert basierend auf Accounto-Dokumentation, wartet auf echte API-Credentials
