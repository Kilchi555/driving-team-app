-- Einfache Kopie der evaluation_scale für Tenant 64259d68-195a-4c68-8875-f1b44d962830
-- Führe diesen Teil zuerst aus

-- Schritt 1: Prüfe vorhandene Daten
SELECT 'Vorher - Globale Skalen:' as info, COUNT(*) as count
FROM evaluation_scale WHERE tenant_id IS NULL;

SELECT 'Vorher - Tenant Skalen:' as info, COUNT(*) as count  
FROM evaluation_scale WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';
