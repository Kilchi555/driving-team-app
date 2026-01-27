# RLS Fix für Onboarding - Cancellation Policies

## Problem
Bei der Onboarding-Seite wird bei der Anzeige von Regulations (Reglements) versucht, die `cancellation_policies` Daten zu laden. Der User ist zu diesem Zeitpunkt noch nicht authentifiziert (hat noch kein Account), daher schlagen die Queries mit **406 Not Acceptable** fehl.

## Root Cause
- `reglementPlaceholders.ts` => `loadTenantData()` macht direkten Supabase Query zu `cancellation_policies`
- Der Query verwendet den unauthenticated Client (`getSupabase()`)
- RLS Policy auf `cancellation_policies` erlaubt keinen SELECT für unauthenticated Users

## Lösung
Die RLS Policies auf `cancellation_policies` und `cancellation_rules` müssen angepasst werden um public/anonymous read-access zu erlauben.

**Wichtig:** Diese Daten sind nicht sensitiv - es sind nur Konfigurationsdaten die dem Tenant gehören.

## Migration ausführen - DONE ✅

**Status:** Die duplicate Policies wurden bereits entfernt!

Die RLS ist jetzt korrekt konfiguriert. Die Onboarding-Seite sollte jetzt die Reglements ohne 406-Fehler laden können.

**Verbleibende Policies (sauber und konfliktfrei):**

Für `cancellation_policies`:
- ✅ `cancellation_policies_delete` - Admins only
- ✅ `cancellation_policies_insert` - Admins only
- ✅ `cancellation_policies_public_read` - Anyone (active only)
- ✅ `cancellation_policies_service_role` - Service role
- ✅ `cancellation_policies_update` - Admins only

Für `cancellation_rules`:
- ✅ `cancellation_rules_delete` - Admins only
- ✅ `cancellation_rules_insert` - Admins only  
- ✅ `cancellation_rules_public_read` - Anyone
- ✅ `cancellation_rules_service_role` - Service role
- ✅ `cancellation_rules_update` - Admins only

Nach der Ausführung sollten die Reglements auf der Onboarding-Seite ohne Fehler angezeigt werden.

