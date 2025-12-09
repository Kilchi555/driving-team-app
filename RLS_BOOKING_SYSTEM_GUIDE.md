# RLS Policies für Availability Booking System

## Use Case
Clients (Schüler/Kunden) können Treffpunkte vorschlagen und speichern, um diese dann bei der Buchung zu nutzen. Sie können aber nicht:
- Andere Pickups von anderen Clients sehen
- Pickups löschen
- Andere Clients' Pickups ändern

## Permissions pro Role

### 🛡️ Admin / Staff / TenantAdmin
| Operation | Permission | Scope |
|-----------|-----------|-------|
| SELECT | ✅ Erlaubt | Alle Locations vom Tenant |
| INSERT | ✅ Erlaubt | Alle Typen (standard, pickup, exam, etc.) |
| UPDATE | ✅ Erlaubt | Alle Locations |
| DELETE | ✅ Erlaubt | Alle Locations |

### 👤 Client (Schüler/Kunde)
| Operation | Permission | Scope |
|-----------|-----------|-------|
| SELECT | ✅ Erlaubt | Nur eigene Pickup-Locations + Standard-Locations vom Tenant |
| INSERT | ✅ Erlaubt | NUR Pickup-Locations für sich selbst |
| UPDATE | ✅ Erlaubt | NUR eigene Pickup-Locations |
| DELETE | ❌ NICHT erlaubt | Keine Löschberechtigung |

### 🚫 Unauthenticated (nicht angemeldet)
| Operation | Permission |
|-----------|-----------|
| SELECT | ❌ NICHT erlaubt |
| INSERT | ❌ NICHT erlaubt |
| UPDATE | ❌ NICHT erlaubt |
| DELETE | ❌ NICHT erlaubt |

## Sicherheits-Features

✅ **Tenant-Isolation:** Clients können nur Locations ihres Tenants sehen
✅ **User-Isolation:** Clients können nur ihre eigenen Pickups sehen
✅ **Immutable Pickups:** Clients können Pickups nicht löschen (verhindert Datenverlust)
✅ **No Public Access:** Nur authentifizierte Benutzer
✅ **Admin Override:** Staff kann alles verwalten

## Implementation Steps

1. Öffne Supabase SQL Editor
2. Kopiere den **GESAMTEN** Inhalt von `fix_locations_rls_final.sql`
3. Führe das Script aus
4. Verifiziere die Policies:
   ```sql
   SELECT policyname, roles FROM pg_policies WHERE tablename = 'locations';
   ```
   - Alle sollten `{authenticated}` sein
   - Reihenfolge: locations_delete, locations_insert, locations_select, locations_update

## Testing

### Test 1: Client kann eigenes Pickup erstellen
```javascript
// Als Client angemeldet
const { data, error } = await supabase
  .from('locations')
  .insert({
    location_type: 'pickup',
    user_id: currentUser.id,  // Muss die aktuelle User ID sein
    tenant_id: userTenantId,
    name: 'My Test Pickup',
    address: '8000 Zurich',
    is_active: true
  })
// Sollte erfolgreich sein ✅
```

### Test 2: Client kann eigenes Pickup lesen
```javascript
const { data } = await supabase
  .from('locations')
  .select('*')
  .eq('location_type', 'pickup')
  .eq('user_id', currentUser.id)
// Sollte die Pickup-Location zurückgeben ✅
```

### Test 3: Client kann andere Pickups NICHT sehen
```javascript
const { data } = await supabase
  .from('locations')
  .select('*')
  .eq('location_type', 'pickup')
  .neq('user_id', currentUser.id)
// Sollte KEINE Daten zurückgeben (RLS blockiert es) ✅
```

### Test 4: Client kann Pickup NICHT löschen
```javascript
const { error } = await supabase
  .from('locations')
  .delete()
  .eq('id', myPickupId)
// Sollte Permission Denied Fehler werfen ✅
```

### Test 5: Admin kann alles verwalten
```javascript
// Als Admin angemeldet
const { data } = await supabase
  .from('locations')
  .select('*')
// Sollte ALLE Locations des Tenants zurückgeben ✅

const { data } = await supabase
  .from('locations')
  .delete()
  .eq('id', anyLocationId)
// Sollte erfolgreich löschen ✅
```

## Production Checklist

- [ ] Script `fix_locations_rls_final.sql` ausgeführt
- [ ] Alle Policies haben `{authenticated}` Rolle
- [ ] Clients können eigene Pickups erstellen ✅
- [ ] Clients können andere Pickups NICHT sehen ✅
- [ ] Clients können Pickups NICHT löschen ✅
- [ ] Admin/Staff können alles sehen/bearbeiten ✅
- [ ] Keine `{public}` Policies vorhanden ✅

