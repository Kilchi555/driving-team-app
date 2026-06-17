# ASA SARI – SOAP Schnittstelle CoursesV3

> Dokumentiert aus: Schnittstelle-SOAP-CoursesV3_Version032021.pdf  
> Kyberna AG, Fürst-Franz-Josef-Strasse 5, 9490 Vaduz, Liechtenstein  
> Version: 3.4 | Letzte Änderung: 08.03.2021 | Autor: Urs Kobald  
> Status: Final

---

## 1. Einleitung

Diese Schnittstelle erlaubt **Kursveranstaltern** (CZV, Fahrlehrer, 2-Phase, ADR/SDR) Kursdaten in das ASA SARI-System zu importieren und Daten abzufragen.

**Wichtige Hinweise:**
- Datumswerte kleiner als Jahr 1900 sind als `NULL` zu interpretieren (ungültige Werte erscheinen als `00.00.0000`)
- PHP-Klassen für diese Schnittstelle müssen bei Kyberna AG angefragt werden
- WSDL-Endpunkt: `https://www.sari.asa.ch/interface/soap/coursesV2.wsdl`
- SOAP-Endpunkt (Production): `https://www.sari.asa.ch/interface/soap/coursesServerV2.php`

---

## 2. Authentifizierung

Alle Methoden erfordern OAuth 2 Authentifizierung.

### 2.1 Access-Token anfordern

```
[GET|POST] https://<SARI_HOST_URL>/oauth/v2/token
```

| Parameter       | Optional | Beschreibung                   |
|-----------------|----------|-------------------------------|
| `client_id`     | nein     | Siehe Zugangsdaten             |
| `client_secret` | nein     | Siehe Zugangsdaten             |
| `grant_type`    | nein     | Muss immer `"password"` sein   |
| `username`      | nein     | Siehe Zugangsdaten             |
| `password`      | nein     | Siehe Zugangsdaten             |

**Response:**
```json
{
  "access_token": "AaBbCcDdEeFfGgHhIiJjKkLlMmNn",
  "expires_in": 360000,
  "token_type": "bearer",
  "scope": "user",
  "refresh_token": "AaBbCcDdEeFfGgHhIiJjKkLlMmNn"
}
```

| Feld            | Beschreibung                               |
|-----------------|--------------------------------------------|
| `access_token`  | Der Access-Token für weitere Aufrufe        |
| `expires_in`    | Ablaufzeit in Sekunden (360000 = 100h)     |
| `token_type`    | `"bearer"`                                 |
| `scope`         | `"user"` (keine Verwendung)                |
| `refresh_token` | Für neuen Token (laut Docs: keine Verwendung) |

### 2.2 Request mit Access-Token

Jeder Request muss folgenden HTTP-Header enthalten:

```
Authorization: Bearer ACCESS_TOKEN
```

---

## 3. Schnittstellenbeschreibung

### 3.1 Unterstützte Kurstypen (Type-Parameter)

| Type     | Bedeutung                         |
|----------|-----------------------------------|
| `2PHASE` | 2-Phasen Kursveranstalter          |
| `MOD`    | Moderatoren Kursveranstalter       |
| `CZV`    | Chauffeuren Kursveranstalter       |
| `FL`     | Fahrlehrer Kursveranstalter        |
| `ADR`    | ADR/SDR Kursveranstalter           |

### 3.2 RegistrationId

**Jeder Kursveranstalter erhält von der Kyberna AG eine eindeutige `RegistrationId`.** Diese ID wird bei jedem SARI-relevanten Aufruf benötigt und identifiziert den Kursveranstalter.

---

## 4. Methoden

### 4.1 `getVersion` – Verbindungstest

Echo-Funktion zur Überprüfung der Kommunikation. Gibt Versionsnummer, Server-Timestamp und übergebenen String zurück.

**Beispielausgabe:** `0.1 - 20100707134544: test`

```php
$client = new SoapClient('https://www.sari.asa.ch/interface/soap/coursesV2.wsdl');
echo 'Version: ' . print_r($client->getVersion('test'), true);
```

---

### 4.2 `getCourseTypes` – Kurstypen abrufen

Gibt alle Kurstypen zurück, die für den Kursveranstalter registriert wurden.

**Request:**
```
RegistrationId  string   Pflicht  Kursveranstalter-ID von Kyberna AG
Type            string   Pflicht  2PHASE | MOD | CZV | FL | ADR
```

**Response (`CourseTypeData[]`):**
```
Name            string   Name des Kurses
Description     object   { DE: string, FR: string, IT: string }
From            date     Gültig-Von-Datum
To              date     Gültig-Bis-Datum
MaxMembers      int      Max. Anzahl Teilnehmer
Status          object   { Number: int, Message: string, Description: string }
```

**Fehlercodes:**
| Code   | Beschreibung                                    |
|--------|-------------------------------------------------|
| `1001` | Request-Object-Typ nicht korrekt                |
| `1002` | RegistrationId ungültig (nicht von Kyberna AG)  |
| `1003` | Falscher Type übergeben                         |

---

### 4.3 `getCustomer` – Kundendaten abrufen

Gibt Informationen zu einer bestimmten Person zurück (anhand FaberId + Geburtsdatum).

**Request:**
```
RegistrationId  string   Pflicht  Kursveranstalter-ID von Kyberna AG
FaberId         string   Pflicht  9-stellige Faber ID (mit führenden Nullen)
                                  Für MOD: ggf. mit 'G' oder 'MOD0123'
Birthdate       date     Pflicht  Geburtsdatum (Format: YYYY-MM-DD)
Type            string   Pflicht  2PHASE | MOD | CZV | FL | ADR
```

**Response:**
```
FaberId         string   9-stellig, mit führenden Nullen
LicenseId       string   Führerausweisnummer, 12-stellig, mit führenden Nullen
Birthdate       date     Geburtsdatum
Name            string   Nachname
Prename         string   Vorname
Canton          string   Melde-Kanton
Sex             string   "M" (maskulin) | "W" (feminin)
Language        string   "DE" | "FR" | "IT"
Address         object   { Address: string, ZIP: string, City: string }
Licenses        array    LicenseData[] { Type, From, To }
                         CZV Type: "C" | "C1" | "D" | "D1"
                         FL Type:  "Instructor-A" | "Instructor-B" | "Instructor-C"
Courses         array    CourseData[] { Course, Date, Credit }
                         Zurzeit nur 2Phasen-Kurse zurückgegeben
Status          object   { Number, Message, Description }
```

**Fehlercodes:**
| Code   | Beschreibung                                               |
|--------|------------------------------------------------------------|
| `1001` | Request-Object-Typ nicht korrekt                           |
| `1002` | RegistrationId ungültig                                    |
| `1003` | Falscher Type übergeben                                    |
| `1004` | Kursteilnehmer nicht gefunden (2Phase)                     |
| `1005` | Kursteilnehmer nicht gefunden (MOD)                        |
| `1006` | Kursteilnehmer nicht gefunden (CZV, FL, ADR)               |
| `1008` | Kursteilnehmer seit mehr als 3 Monaten nicht mehr gültig   |

---

### 4.4 `getLecturers` – Moderatoren abrufen

Gibt alle Moderatoren des Kursveranstalters zurück.

**Request:**
```
RegistrationId  string   Pflicht  Kursveranstalter-ID von Kyberna AG
Type            string   Pflicht  2PHASE | MOD | CZV | FL | ADR
```

**Response (`LecturerData[]`):**
```
FaberId         string   Führerausweisnummer 12-stellig, mit führenden Nullen
Name            string   Nachname
Prename         string   Vorname
Birthdate       date     Geburtsdatum
SariId          string   SARI-interne ID
LecturerId      string   Weitere ID
Status          object   { Number, Message, Description }
```

**Fehlercodes:**
| Code   | Beschreibung                   |
|--------|-------------------------------|
| `1001` | Request-Object-Typ nicht korrekt |
| `1002` | RegistrationId ungültig        |

---

### 4.5 `genConfirmation` – Kursbestätigungen generieren

Generiert Kursbestätigungen (PDF) für Kursteilnehmer.

**Request:**
```
RegistrationId  string   Pflicht  Kursveranstalter-ID von Kyberna AG
CourseId        string   Pflicht  Externe Kurs-ID (vergeben vom Kursveranstalter)
AllIds          bool     Pflicht  true = alle gültigen Bestätigungen
IDs             array    Pflicht  Falls AllIds=false: Array von Faber IDs (9-stellig)
Type            string   Pflicht  2PHASE | MOD | CZV | FL
```

**Response:**
```
IDs             array    9-stellige Faber IDs aller Teilnehmer in der PDF
FileData        object   {
                           Extension: string  (z.B. "pdf")
                           MimeType:  string  (z.B. "application/pdf")
                           IsBinary:  bool    (true = Base64-codiert)
                           Data:      string  (Dateiinhalt)
                         }
Status          object   { Number, Message, Description }
```

**Datei dekodieren (PHP):**
```php
if ($ret->Result->FileData->IsBinary) {
    fwrite($fh, base64_decode($ret->Result->FileData->Data));
}
```

**Fehlercodes:**
| Code   | Beschreibung                                |
|--------|---------------------------------------------|
| `1001` | Request-Object-Typ nicht korrekt             |
| `1002` | RegistrationId ungültig                      |
| `1007` | Kein gültiger Type gewählt                   |
| `2001` | Falscher Kursorganisator                     |
| `2002` | Kurs existiert nicht                         |
| `2003` | Kurs hat noch nicht stattgefunden            |
| `2004` | Kein Kursmoderator vorhanden                 |
| `2005` | Kontingent erlaubt keinen Ausdruck           |
| `2006` | Keine Kursteilnehmer vorhanden               |

---

### 4.6 `startImport` – Kurs importieren (Hauptfunktion)

**Die zentrale Funktion.** Importiert Kursdaten in SARI. Auch für Updates verwendbar, sofern der Kurs über diese Schnittstelle erstellt wurde und eine externe Kurs-ID hat.

**Löschfrist:** Kurse können nur bis 4 Tage vor Kursbeginn gelöscht werden.

**Request:**
```
RegistrationId  string   Pflicht  Kursveranstalter-ID von Kyberna AG
Type            string   Pflicht  2PHASE | CZV | FL | ADR
Course          object   {
  ID            string   Pflicht  Externe Kurs-ID (eigene ID des Kursveranstalters)
  Description   string   Pflicht  Kursbeschreibung
  Date          date     Pflicht  Kursdatum (Format: YYYY-MM-DD)
  Type          string   Pflicht  Für CZV/FL/ADR: Kursdefinition (z.B. "WB01234")
                                  Für 2PHASE (bis 31.12.2019): "1M"|"1P"|"2M"|"2P"
                                  Für 2PHASE (ab 1.1.2020): Kursdefinition
  Location      string   Pflicht  Kursort
  Address       string   Pflicht  Kursadresse
  ZIP           string   Pflicht  Postleitzahl
  Comment       string   Optional Kommentar zum Kurs
  FileData      object   Optional { Extension, MimeType, IsBinary, Data }
  Members       array    Pflicht  MemberImportData[] {
    FaberId              string   12-stellige Führerausweisnummer (!)
    Birthdate            date     Geburtsdatum (YYYY-MM-DD)
    Registrationdate     date     Registrationsdatum (YYYY-MM-DD)
  }
  Instructors   array    Pflicht  InstructorImportData[] {
    ID                   string   SARI-interne ID des Moderators
    FaberId              string   12-stellige Führerausweisnummer
    IsMaster             bool     true = Kursverantwortlicher
  }
}
```

> ⚠️ **Wichtig:** Bei `Members.FaberId` ist die **12-stellige Führerausweisnummer** zu verwenden (nicht die 9-stellige FaberId bei `getCustomer`)!

**Response:**
```
IDs             array    9-stellige Faber IDs der importierten Teilnehmer
Warnings        array    Message[] { Number, Description }
Errors          array    Message[] { Number, Description }
Status          object   { Number, Message, Description }
```

**Fehlercodes (Status-Ebene):**
| Code    | Beschreibung                                    |
|---------|-------------------------------------------------|
| `1001`  | Request-Object-Typ nicht korrekt                |
| `1002`  | RegistrationId ungültig                         |
| `3001`  | Import abgebrochen – Errors auswerten           |
| `>3100` | Import abgebrochen – Errors auswerten           |

**Fehlercodes (Errors/Warnings-Ebene):**
| Code  | Beschreibung                                                              |
|-------|---------------------------------------------------------------------------|
| `101` | Kursdaten fehlen                                                           |
| `103` | Kursdatum fehlt                                                            |
| `104` | Kurstyp fehlt                                                              |
| `105` | Keine Kursteilnehmer vorhanden                                             |
| `106` | Kursdatum nicht korrekt (Unterkategorien 1–7)                             |
|       | 1: Kursdatum nach Ablaufdatum / 2: Kein definitiver Kurs                  |
|       | 3: Kursdatum vor Gültig-von-Datum / 4: 6-Wochen-Regel (Erst-Import)      |
|       | 5: Kurs nicht mehr veränderbar (>90 Tage) / 6: 6-Wochen-Regel (Update)  |
|       | 7: Kein gültiger Kursdefinitionsstatus                                    |
| `107` | Zu viele Kursteilnehmer                                                    |
| `108` | Kein Kursort definiert                                                     |
| `109` | Keine Kursadresse definiert                                                |
| `110` | Keine Kurs-PLZ definiert                                                   |
| `111` | Kursdatum/Kursort geändert (Unterkategorien 1–10)                         |
| `112` | Kurstype existiert nicht                                                   |
| `120` | Adresse nicht valid                                                        |
| `201` | FaberId des Kursteilnehmers nicht korrekt → Teilnehmer nicht importiert   |
| `202` | Kein Geburtsdatum → Teilnehmer nicht importiert                           |
| `203` | Kein Registrationsdatum → Teilnehmer nicht importiert                     |
| `204` | Kursteilnehmer existiert nicht in SARI → nicht importiert                 |
| `205` | Ungültiges Geburtsdatum → nicht importiert                                |
| `206` | Kursteilnehmer hat diesen Kurs bereits absolviert → nicht importiert      |
| `207` | Kursteilnehmer hat diesen Kurs bereits absolviert → nicht importiert      |
| `208` | Kursteilnehmer bereits bei anderem Kurs am gleichen Tag                   |
| `209` | Kurs enthält Teilnehmer mit Bestätigungsdatum → zu viele Teilnehmer       |
| `301` | Moderator-ID nicht korrekt → Moderator nicht importiert                   |
| `302` | Keine SARI-interne ID für Moderator → nicht importiert                    |
| `305` | Kein Kursverantwortlicher angegeben                                        |
| `306` | Zu viele Kursverantwortliche (erster wird Kursverantwortlicher)           |
| `307` | Moderator überschreitet Limit → nicht importiert                          |
| `308` | Moderator nicht korrekt → nicht importiert                                |

---

### 4.7 `deleteCourse` – Kurs löschen

Löscht Kurse, die über die Import-Schnittstelle erstellt wurden.

> ⚠️ **Achtung:** Löschen ist nur bis **4 Tage vor Kursbeginn** möglich!

**Request:**
```
RegistrationId  string   Pflicht  Kursveranstalter-ID von Kyberna AG
CourseId        string   Pflicht  Externe Kurs-ID (vom Kursveranstalter vergeben)
Type            string   Pflicht  2PHASE | CZV | FL | ADR
```

**Response:**
```
Result          bool     true = erfolgreich gelöscht
Status          object   { Number, Message, Description }
```

**Fehlercodes:**
| Code   | Beschreibung                                          |
|--------|-------------------------------------------------------|
| `1001` | Request-Object-Typ nicht korrekt                      |
| `1002` | RegistrationId ungültig                               |
| `1003` | Falscher Type übergeben                               |
| `4001` | Kurs nicht gefunden                                   |
| `4002` | Kurs enthält noch Kursteilnehmer → nicht löschbar     |
| `4003` | Kurs enthält noch Moderatoren → nicht löschbar        |
| `4004` | Kurs ist nur bis 4 Tage vor Kursbeginn löschbar       |

---

## 5. Wichtige Unterschiede zur VKU/PGS REST API

| Aspekt              | VKU/PGS REST API (bestehend)         | SOAP CoursesV3 (neu)                        |
|---------------------|--------------------------------------|---------------------------------------------|
| **Protokoll**       | REST / JSON                          | SOAP / XML                                  |
| **Richtung**        | PULL: Kurse von SARI lesen            | PUSH: Kurse nach SARI schreiben             |
| **Base URL**        | `https://www.vku-pgs.asa.ch`         | `https://www.sari.asa.ch`                   |
| **Kurstypen**       | VKU, PGS                            | CZV, FL, 2PHASE, MOD, ADR                  |
| **RegistrationId**  | Nicht vorhanden                      | Pflichtfeld bei jedem Aufruf                |
| **FaberId Länge**   | 9-stellig                            | 9-stellig (getCustomer) / 12-stellig (startImport Members) |
| **Enrollment**      | `PUT /personcourse` (direkt)         | Teil von `startImport` (Batch)              |
| **Kurs löschen**    | Nicht vorhanden                      | `deleteCourse` (nur bis 4 Tage vorher)      |
| **Bestätigungen**   | Nicht vorhanden                      | `genConfirmation` (PDF)                     |
| **Moderatoren**     | Nicht vorhanden                      | `getLecturers`                              |

---

## 6. Endpunkte (WSDL)

| Umgebung    | URL                                                          |
|-------------|--------------------------------------------------------------|
| Production  | `https://www.sari.asa.ch/interface/soap/coursesServerV2.php` |
| WSDL        | `https://www.sari.asa.ch/interface/soap/coursesV2.wsdl`      |
| OAuth Token | `https://www.sari.asa.ch/oauth/v2/token` (angenommen)        |

---

## 7. Datenfluss für CZV/FL-Kurse

```
Driving Team App (Kurs anlegen)
         │
         │  POST startImport
         ▼
   ASA SARI System
         │
         │  getCustomer (Validierung Teilnehmer)
         │  getLecturers (verfügbare Moderatoren)
         │
         │  genConfirmation (nach Kurs)
         ▼
   PDF-Bestätigung → Teilnehmer
```

---

## 8. Notizen zur Implementierung

1. **SOAP-Client nötig:** Node.js `soap` Package oder äquivalent
2. **RegistrationId** muss von Kyberna AG beantragt werden (pro Kurstyp/Veranstalter)
3. **Neue Credentials** nötig – VKU/PGS Credentials sind nicht wiederverwendbar
4. **6-Wochen-Regel:** Kurse müssen mindestens 6 Wochen vor Kursbeginn gemeldet werden
5. **90-Tage-Regel:** Kurs nicht mehr veränderbar nach 90 Tagen nach Kursdatum
6. **FaberId-Achtung:** `startImport.Members.FaberId` = 12-stellige Führerausweisnummer (nicht 9-stellige FaberId)
