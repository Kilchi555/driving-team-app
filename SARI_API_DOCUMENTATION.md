# 🔗 SARI VKU/PGS API Dokumentation v1.3

**Quelle:** KYBERNA AG  
**Dokumentation:** Schnittstelle für Kursanmeldung in SARI VKU/PGS  
**Version:** 1.3

---

## 📋 Inhaltsverzeichnis

1. [Einleitung](#einleitung)
2. [Allgemeines](#allgemeines)
3. [Authentifizierung](#authentifizierung)
4. [API Endpoints](#api-endpoints)
5. [Code Beispiele](#code-beispiele)
6. [Fehlerbehandlung](#fehlerbehandlung)

---

## Einleitung

Dieses Dokument beschreibt, wie Teilnehmer zu VKU- oder PGS-Kursen im SARI über die REST Web Service Schnittstelle angemeldet werden können.

**Kurse:**
- **VKU** = Verkehrskundeunterricht (Theoriekurse)
- **PGS** = Praktische Grundschulung

---

## Allgemeines

### Umgebung

Es gibt zwei Umgebungen:

| Umgebung | URL | Protokoll |
|----------|-----|-----------|
| **Test/Abnahme** | `sari-vku-test.ky2help.com` | HTTPS |
| **Produktion** | `www.vku-pgs.asa.ch` | HTTPS |

**Hinweis:** In der Dokumentation `VKU_HOST_URL` durch den korrekten Hostnamen ersetzen.

### Rückgabewerte

Alle Responses sind JSON mit folgendem Format:

```json
{
  "result": {},
  "status": "OK"
}
```

**Status Werte:**
- `OK` - Erfolgreich
- `INTERNAL_SERVER_ERROR` - Interner Serverfehler
- Spezifische Fehlermeldungen (siehe Endpoint Dokumentation)

---

## Authentifizierung

### OAuth2 Token Anfrage

**Endpoint:**
```
GET https://VKU_HOST_URL/oauth/v2/token
```

**Query Parameter:**

| Parameter | Beschreibung | Quelle |
|-----------|-------------|--------|
| `client_id` | Client ID (von KYBERNA bereitgestellt) | `18_ldj4gwmhh1i123ws0kur3ggkorro12s122o4kiekszrbdg55hh` |
| `client_secret` | Client Secret (von KYBERNA bereitgestellt) | `qrygfdertab97kogwrrsc078hgfdw48oowg9946c1m2n3h4i7H` |
| `grant_type` | Muss `password` sein | `password` |
| `username` | Benutzername | `API_DrivingTeamZuerich` |
| `password` | Passwort | (vom Admin zurückgesetzt auf info@drivingteam.ch) |

**Response:**

```json
{
  "access_token": "ACCESS_TOKEN_STRING",
  "expires_in": 3600,
  "token_type": "bearer",
  "scope": "user",
  "refresh_token": "REFRESH_TOKEN_STRING"
}
```

**Token Nutzen:**

Für alle API-Aufrufe den Token im Authorization Header übergeben:

```
Authorization: Bearer ACCESS_TOKEN
```

**Token Gültigkeit:**
- Access Token: 3600 Sekunden (1 Stunde)
- Refresh Token: Kann verwendet werden um neuen Access Token zu erhalten

---

## API Endpoints

### 1. getVersion - Verbindungstest

**Zweck:** Testet Erreichbarkeit zwischen Client und Server

**Endpoint:**
```
GET https://VKU_HOST_URL/api/courseregistration/version/{text}
```

**Parameter:**

| Name | Typ | Beschreibung |
|------|-----|-------------|
| `text` | String | Beliebige Zeichenkette, die zurückgeliefert wird |

**Response:**

```json
{
  "result": "Hello_World",
  "status": "OK"
}
```

**Beispiel:**

```bash
curl -X GET "https://sari-vku-test.ky2help.com/api/courseregistration/version/Hello_World" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

### 2. getCustomer - Kundendaten abrufen

**Zweck:** Liefert Personen- und Kategoriedaten eines Fahrschülers

**Endpoint:**
```
GET https://VKU_HOST_URL/api/courseregistration/customer/{faberid}/{birthdate}
```

**Parameter:**

| Name | Typ | Beschreibung | Format |
|------|-----|-------------|--------|
| `faberid` | String | Ausweisnummer | `001234567` |
| `birthdate` | String | Geburtsdatum | `YYYY-MM-DD` |

**Response:**

```json
{
  "result": {
    "faberid": "001234567",
    "birthdate": "1970-01-01",
    "firstname": "Max",
    "lastname": "Mustermann",
    "address": "Musterstrasse 1",
    "zip": "9490",
    "city": "Vaduz",
    "licenses": [
      {
        "category": "A1",
        "expirationdate": "2026-12-31"
      },
      {
        "category": "B",
        "expirationdate": "2025-06-30"
      }
    ]
  },
  "status": "OK"
}
```

**Fehlermeldungen:**

| Status | Beschreibung |
|--------|-------------|
| `PERSON_NOT_FOUND` | Fahrschüler mit diesen Daten nicht gefunden |
| `INVALID_PARAMETER` | Parameter ungültig |

**Beispiel:**

```bash
curl -X GET "https://sari-vku-test.ky2help.com/api/courseregistration/customer/001234567/1970-01-01" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

### 3. getCourses - Kursliste abrufen

**Zweck:** Liefert alle zukünftigen, freigegebenen und aktivierten Kurse

**Endpoint:**
```
GET https://VKU_HOST_URL/api/courseregistration/courses/{coursetype}
```

**Parameter:**

| Name | Typ | Beschreibung | Werte |
|------|-----|-------------|-------|
| `coursetype` | String | Kurstyp | `VKU` oder `PGS` |

**Response:**

```json
{
  "result": {
    "name": "Kursgruppe Name",
    "date": "2026-05-19 00:00",
    "courses": [
      {
        "id": 61,
        "name": "VKU Teil 1",
        "date": "2026-05-23 10:00",
        "address": {
          "name": "Verkehrszentrum Vaduz",
          "address": "Fürst-Franz-Josef-Strasse 5",
          "zip": 9490,
          "city": "Vaduz"
        },
        "freeplaces": 8
      },
      {
        "id": 62,
        "name": "VKU Teil 2",
        "date": "2026-05-30 14:00",
        "address": {
          "name": "Verkehrszentrum Schaan",
          "address": "Industriestrasse 10",
          "zip": 9494,
          "city": "Schaan"
        },
        "freeplaces": 12
      }
    ]
  },
  "status": "OK"
}
```

**Fehlermeldungen:**

| Status | Beschreibung |
|--------|-------------|
| `DRIVINGSCHOOL_NOT_FOUND` | Fahrschule nicht gefunden |
| `SECTION_NOT_FOUND` | Bereich (VKU/PGS) nicht gefunden |

**Beispiel:**

```bash
curl -X GET "https://sari-vku-test.ky2help.com/api/courseregistration/courses/VKU" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

### 4. getCourseDetail - Kurs Teilnehmer

**Zweck:** Liefert alle Fahrschüler eines bestimmten Kurses

**Endpoint:**
```
GET https://VKU_HOST_URL/api/courseregistration/coursedetail/{id}
```

**Parameter:**

| Name | Typ | Beschreibung |
|------|-----|-------------|
| `id` | Integer | Kurs-ID |

**Response:**

```json
{
  "result": [
    {
      "faberid": "001234567",
      "firstname": "Max",
      "lastname": "Mustermann",
      "birthdate": "1970-01-01",
      "confirmed": "2026-04-19"
    },
    {
      "faberid": "001234568",
      "firstname": "Anna",
      "lastname": "Musterfrau",
      "birthdate": "1975-05-15",
      "confirmed": "2026-04-20"
    }
  ],
  "status": "OK"
}
```

**Fehlermeldungen:**

| Status | Beschreibung |
|--------|-------------|
| `COURSE_NOT_FOUND` | Kurs mit der ID nicht gefunden |
| `NO_PERMISSION` | Keine Berechtigung für diese Fahrschule |

**Beispiel:**

```bash
curl -X GET "https://sari-vku-test.ky2help.com/api/courseregistration/coursedetail/61" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

### 5. putPersonCourse - Teilnehmer anmelden

**Zweck:** Meldet einen Fahrschüler zu einem Kurs an

**Endpoint:**
```
PUT https://VKU_HOST_URL/api/courseregistration/personcourse
```

**Parameter (im Body):**

| Name | Typ | Beschreibung | Format |
|------|-----|-------------|--------|
| `courseid` | Integer | Kurs-ID | `61` |
| `faberid` | String | Ausweisnummer | `001234567` |
| `birthdate` | String | Geburtsdatum | `YYYY-MM-DD` |

**Response:**

```json
{
  "result": [],
  "status": "OK"
}
```

**Fehlermeldungen:**

| Status | Beschreibung |
|--------|-------------|
| `COURSE_NOT_FOUND` | Kurs nicht gefunden |
| `PERSON_NOT_FOUND` | Fahrschüler nicht gefunden |
| `PERSON_ALREADY_ADDED` | Fahrschüler bereits in Kurs angemeldet |
| `COURSE_NOT_ALLOWED_OR_ENABLED` | Kurs nicht freigegeben oder aktiviert |
| `NO_PERMISSION` | Keine Berechtigung für diese Fahrschule |
| `LICENSE_EXPIRED` | Führerschein für diese Kategorie abgelaufen |
| `INVALID_PARAMETER` | Parameter ungültig |

**Beispiel:**

```bash
curl -X PUT "https://sari-vku-test.ky2help.com/api/courseregistration/personcourse" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "courseid=61&faberid=001234567&birthdate=1970-01-01"
```

---

### 6. deletePersonCourse - Teilnehmer abmelden

**Zweck:** Entfernt einen Fahrschüler aus einem Kurs (nur wenn nicht bestätigt)

**Endpoint:**
```
DELETE https://VKU_HOST_URL/api/courseregistration/personcourse
```

**Parameter (im Body):**

| Name | Typ | Beschreibung | Format |
|------|-----|-------------|--------|
| `courseid` | Integer | Kurs-ID | `61` |
| `faberid` | String | Ausweisnummer | `001234567` |

**Response:**

```json
{
  "result": [],
  "status": "OK"
}
```

**Fehlermeldungen:**

| Status | Beschreibung |
|--------|-------------|
| `PERSON_NOT_FOUND` | Fahrschüler nicht gefunden |
| `COURSE_NOT_FOUND` | Kurs nicht gefunden |
| `COURSE_NOT_ALLOWED_OR_ENABLED` | Kurs nicht freigegeben oder aktiviert |
| `NO_PERMISSION` | Keine Berechtigung für diese Fahrschule |
| `COURSEMEMBER_NOT_FOUND` | Fahrschüler nicht in diesem Kurs eingeschrieben |
| `COURSEMEMBER_ALREADY_CONFIRMED` | Fahrschüler bereits bestätigt (Abmeldung nicht möglich) |

**Beispiel:**

```bash
curl -X DELETE "https://sari-vku-test.ky2help.com/api/courseregistration/personcourse" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "courseid=61&faberid=001234567"
```

---

## Code Beispiele

### Node.js/TypeScript Implementation

```typescript
// server/utils/sari-client.ts

interface SARIConfig {
  apiUrl: string
  clientId: string
  clientSecret: string
  username: string
  password: string
  environment: 'test' | 'production'
}

interface SARIToken {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  refresh_token: string
}

class SARIClient {
  private config: SARIConfig
  private token: SARIToken | null = null
  private tokenExpiry: Date | null = null

  constructor(config: SARIConfig) {
    this.config = config
  }

  /**
   * Authentifizierung - OAuth2 Token abrufen
   */
  async getToken(): Promise<string> {
    // Wenn Token noch gültig, verwenden
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token.access_token
    }

    const url = `${this.config.apiUrl}/oauth/v2/token`
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'password',
      username: this.config.username,
      password: this.config.password
    })

    const response = await fetch(`${url}?${params}`, { method: 'GET' })
    this.token = await response.json()

    // Token Gültigkeit berechnen (expires_in - 60 Sekunden Puffer)
    this.tokenExpiry = new Date(Date.now() + (this.token.expires_in - 60) * 1000)

    return this.token.access_token
  }

  /**
   * GET Request mit Authentication
   */
  private async get<T>(endpoint: string): Promise<T> {
    const token = await this.getToken()
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    return response.json()
  }

  /**
   * PUT Request mit Authentication
   */
  private async put<T>(endpoint: string, data: Record<string, any>): Promise<T> {
    const token = await this.getToken()
    const body = new URLSearchParams(data)

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    return response.json()
  }

  /**
   * DELETE Request mit Authentication
   */
  private async delete<T>(endpoint: string, data: Record<string, any>): Promise<T> {
    const token = await this.getToken()
    const body = new URLSearchParams(data)

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    return response.json()
  }

  /**
   * Test Verbindung
   */
  async getVersion(text: string): Promise<{ result: string; status: string }> {
    return this.get(`/api/courseregistration/version/${text}`)
  }

  /**
   * Kundendaten abrufen
   */
  async getCustomer(faberid: string, birthdate: string) {
    return this.get(`/api/courseregistration/customer/${faberid}/${birthdate}`)
  }

  /**
   * Kurse abrufen
   */
  async getCourses(coursetype: 'VKU' | 'PGS') {
    return this.get(`/api/courseregistration/courses/${coursetype}`)
  }

  /**
   * Kurs Details (Teilnehmer)
   */
  async getCourseDetail(courseId: number) {
    return this.get(`/api/courseregistration/coursedetail/${courseId}`)
  }

  /**
   * Teilnehmer anmelden
   */
  async registerPersonForCourse(courseId: number, faberid: string, birthdate: string) {
    return this.put('/api/courseregistration/personcourse', {
      courseid: courseId,
      faberid,
      birthdate
    })
  }

  /**
   * Teilnehmer abmelden
   */
  async unregisterPersonFromCourse(courseId: number, faberid: string) {
    return this.delete('/api/courseregistration/personcourse', {
      courseid: courseId,
      faberid
    })
  }
}

export default SARIClient
```

### Nuxt API Endpoint

```typescript
// server/api/sari/sync-courses.post.ts

import SARIClient from '~/server/utils/sari-client'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const sariClient = new SARIClient({
      apiUrl: process.env.SARI_API_URL || 'https://sari-vku-test.ky2help.com',
      clientId: process.env.SARI_CLIENT_ID || '',
      clientSecret: process.env.SARI_CLIENT_SECRET || '',
      username: process.env.SARI_USERNAME || 'API_DrivingTeamZuerich',
      password: process.env.SARI_PASSWORD || '',
      environment: (process.env.SARI_ENV as 'test' | 'production') || 'test'
    })

    // Test Verbindung
    const versionTest = await sariClient.getVersion('DrivingTeam')
    logger.debug('✅ SARI Connection Test:', versionTest)

    // VKU Kurse abrufen
    const vkuCourses = await sariClient.getCourses('VKU')
    logger.debug('📚 VKU Courses loaded:', vkuCourses.result?.courses?.length)

    // PGS Kurse abrufen
    const pgsCourses = await sariClient.getCourses('PGS')
    logger.debug('📚 PGS Courses loaded:', pgsCourses.result?.courses?.length)

    return {
      success: true,
      vkuCourses: vkuCourses.result,
      pgsCourses: pgsCourses.result
    }
  } catch (error: any) {
    logger.error('❌ SARI Sync Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
```

---

## Fehlerbehandlung

### Allgemeine Fehler

| Status | Bedeutung | Lösung |
|--------|----------|--------|
| `OK` | Erfolgreich | - |
| `INTERNAL_SERVER_ERROR` | Serverfehler | Später versuchen oder KYBERNA kontaktieren |
| `INVALID_PARAMETER` | Parameter ungültig | Parameter überprüfen |
| `NO_PERMISSION` | Keine Berechtigung | API-User hat keine Rechte für diese Fahrschule |

### Best Practices

1. **Token Caching:**
   - Token speichern und wiederverwenden
   - Vor Ablauf erneuern (expires_in - 60 Sekunden)

2. **Retry Logic:**
   - Bei INTERNAL_SERVER_ERROR: 3x Retry mit Exponential Backoff
   - Max 1 Minute warten

3. **Error Logging:**
   - Alle Fehler mit Details loggen
   - API-Response vollständig speichern

4. **Rate Limiting:**
   - Fair-Usage Prinzip beachten
   - Max ~10 Requests pro Minute pro Fahrschule

---

## Notizen

- **Test-Umgebung:** älterer Stand als Production, gut zum Testen
- **Webhooks:** Sind geplant für die Zukunft, derzeit nicht verfügbar
- **Rate Limits:** Keine festen Limits, aber im Rahmen halten
- **Dokumentation:** Wird aktualisiert, aktuelle Version ist 1.3

---

**Kontakt:** KYBERNA AG - info@kyberna.com

