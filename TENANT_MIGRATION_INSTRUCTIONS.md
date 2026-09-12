# UMFASSENDE TENANT_ID MIGRATION - ANWEISUNGEN

## WICHTIGE SICHERHEITSHINWEISE ⚠️

**BEVOR SIE DIESE MIGRATION AUSFÜHREN:**
1. **VOLLSTÄNDIGES DATABASE BACKUP ERSTELLEN**
2. **In Supabase: Backup über Dashboard erstellen**
3. **Diese Migration in einer TEST-UMGEBUNG zuerst testen**

## ABLAUF DER MIGRATION

### Schritt 1: Daten überprüfen
```sql
-- Datei ausführen: check_existing_data_before_migration.sql
-- Dies zeigt welche Tabellen bereits Daten enthalten
```

### Schritt 2: Hauptmigration ausführen
```sql
-- Datei ausführen: comprehensive_tenant_id_migration.sql
-- Dies fügt allen Tabellen tenant_id hinzu und setzt Default-Werte
```

### Schritt 3: RLS Policies aktivieren
```sql
-- Datei ausführen: tenant_rls_policies_comprehensive.sql  
-- Dies erstellt die Tenant-Isolation-Policies
```

### Schritt 4: Überprüfung
```sql
-- Alle Tabellen ohne tenant_id checken (sollte fast leer sein außer tenants, payment_methods)
SELECT 
    t.table_name,
    t.table_type
FROM 
    information_schema.tables t
LEFT JOIN 
    information_schema.columns c ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema 
    AND c.column_name = 'tenant_id'
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IS NULL
ORDER BY 
    t.table_name;
```

## WAS DIESE MIGRATION MACHT

### Tabellen die tenant_id bekommen:
- **Cancellation:** `cancellation_policies`, `cancellation_reasons`, `cancellation_rules`
- **Cash:** `cash_balances`, `cash_confirmations`, `cash_movements`, `cash_transactions`
- **Grunddaten:** `categories`, `event_types`, `locations`, `examiners`
- **Discounts:** `discount_codes`, `discount_sales`
- **Sales:** `product_sales`  
- **Exams:** `exam_results`
- **Customers:** `invited_customers`, `company_billing_addresses`
- **Invoicing:** `invoices`, `invoice_items`, `invoice_payments`
- **Misc:** `notes`, `sms_logs`, `payment_items`, `payment_logs`
- **Pricing:** `pricing_rules`
- **Credits:** `student_credits`, `credit_transactions`

### Tabellen die KEINE tenant_id bekommen:
- **`tenants`** - Die Mandanten-Tabelle selbst
- **`payment_methods`** - Könnten global sein (kann später hinzugefügt werden)

## DEFAULT TENANT
- Wird mit UUID `00000000-0000-0000-0000-000000000001` erstellt
- Name: "Default Tenant"  
- Alle bestehenden Daten werden diesem Tenant zugewiesen

## RLS POLICIES
- Alle Tabellen bekommen Tenant-Isolation
- Benutzer sehen nur Daten ihres eigenen Tenants
- Policy Name: `tenant_isolation_policy`
- Basiert auf `user_profiles.tenant_id`

## ROLLBACK IM NOTFALL
Falls etwas schief geht:
```sql
-- RLS deaktivieren
ALTER TABLE [tablename] DISABLE ROW LEVEL SECURITY;

-- tenant_id Spalte entfernen
ALTER TABLE [tablename] DROP COLUMN tenant_id;
```

## NACH DER MIGRATION
1. **Funktionalität testen** - Alle kritischen Flows
2. **Performance überprüfen** - Queries mit tenant_id sollten Indizes haben  
3. **Neue Tenants erstellen** - Über Admin-Interface
4. **Benutzer zu Tenants zuweisen** - In user_profiles

## POTENTIAL ISSUES
- **Foreign Key Constraints:** Könnten Probleme machen wenn Referenced Tables noch keine tenant_id haben
- **Query Performance:** Neue WHERE tenant_id Clauses - eventuell Indizes hinzufügen
- **Application Code:** Muss tenant_id in alle Queries einbauen

## MONITORING
Nach Migration überwachen:
- Langsame Queries durch fehlende Indizes
- 406 Not Acceptable Fehler durch zu restriktive RLS
- Daten die nicht sichtbar sind wegen falscher tenant_id

## SUPPORT
Bei Problemen:
1. Database Backup wiederherstellen
2. Migration Schritt für Schritt wiederholen
3. Logs in Supabase Dashboard checken