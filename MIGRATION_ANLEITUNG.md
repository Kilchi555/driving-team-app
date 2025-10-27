# TENANT MIGRATION - EINFACHE ANLEITUNG

## 🎯 ZIEL
Alle wichtigen Tabellen bekommen eine `tenant_id` Spalte für Multi-Tenant Support.

## 🚀 SCHRITT-FÜR-SCHRITT (Da Mock-Daten):

### 1. Daten checken
```sql
-- Führe aus: 1_check_data.sql
-- Zeigt welche Tabellen Daten haben
```

### 2. Migration ausführen  
```sql
-- Führe aus: 2_tenant_migration.sql
-- Fügt tenant_id zu allen Tabellen hinzu
-- Erstellt Default-Tenant
-- Setzt alle bestehenden Daten zu Default-Tenant
```

### 3. RLS Policies aktivieren
```sql
-- Führe aus: 3_rls_policies.sql  
-- Erstellt Tenant-Isolation
-- Benutzer sehen nur ihre eigenen Daten
```

### 4. Testen
```sql
-- Checke dass Migration geklappt hat:
SELECT table_name, tenant_id FROM categories LIMIT 1;
SELECT table_name, tenant_id FROM invoices LIMIT 1;
```

## ✅ WAS PASSIERT:
- **27 Tabellen** bekommen `tenant_id` Spalte
- **Default-Tenant** wird erstellt (UUID: 00000000-0000-0000-0000-000000000001)
- **Alle Mock-Daten** werden diesem Default-Tenant zugewiesen
- **RLS Policies** sorgen für Tenant-Isolation

## 📁 DATEIEN:
- `1_check_data.sql` - Daten überprüfen
- `2_tenant_migration.sql` - Hauptmigration  
- `3_rls_policies.sql` - RLS Policies
- `MIGRATION_ANLEITUNG.md` - Diese Anleitung

## ⚠️ WICHTIG:
Da es nur Mock-Daten sind, ist das Risiko minimal. Die Migration ist sicher und kann mehrmals ausgeführt werden.

## 🎉 FERTIG!
Nach der Migration hast du vollständiges Multi-Tenant System!