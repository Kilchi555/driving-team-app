-- Duplicate reminder data to all existing tenants
-- This script copies standard reminder templates, settings, and providers to all existing tenants

-- 1. First, let's see what tenants we have
SELECT 'Existing tenants:' as info, COUNT(*) as count FROM tenants WHERE is_active = true;

-- 2. Create or replace the copy function
CREATE OR REPLACE FUNCTION copy_reminder_data_to_tenant(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  provider_record RECORD;
  settings_record RECORD;
  template_record RECORD;
  new_provider_id UUID;
  new_settings_id UUID;
BEGIN
  -- Copy reminder_providers (global defaults)
  FOR provider_record IN 
    SELECT * FROM reminder_providers WHERE tenant_id IS NULL
  LOOP
    INSERT INTO reminder_providers (
      tenant_id, smtp_enabled, smtp_host, smtp_port, smtp_username, smtp_password,
      smtp_from_name, smtp_from_email, smtp_use_tls, sms_enabled, sms_provider,
      sms_account_sid, sms_auth_token, sms_from, sms_quiet_hours_start, sms_quiet_hours_end,
      push_enabled, vapid_public_key, vapid_private_key, vapid_subject, updated_by
    ) VALUES (
      target_tenant_id, provider_record.smtp_enabled, provider_record.smtp_host, 
      provider_record.smtp_port, provider_record.smtp_username, provider_record.smtp_password,
      provider_record.smtp_from_name, provider_record.smtp_from_email, provider_record.smtp_use_tls,
      provider_record.sms_enabled, provider_record.sms_provider, provider_record.sms_account_sid,
      provider_record.sms_auth_token, provider_record.sms_from, provider_record.sms_quiet_hours_start,
      provider_record.sms_quiet_hours_end, provider_record.push_enabled, provider_record.vapid_public_key,
      provider_record.vapid_private_key, provider_record.vapid_subject, provider_record.updated_by
    ) ON CONFLICT (tenant_id) DO NOTHING
    RETURNING id INTO new_provider_id;
  END LOOP;
  
  -- Copy reminder_settings (global defaults)
  FOR settings_record IN 
    SELECT * FROM reminder_settings WHERE tenant_id IS NULL
  LOOP
    INSERT INTO reminder_settings (
      tenant_id, is_enabled, first_after_hours, second_after_hours, final_after_hours,
      first_email, first_push, first_sms, second_email, second_push, second_sms,
      final_email, final_push, final_sms, auto_delete, auto_delete_after_hours, updated_by
    ) VALUES (
      target_tenant_id, settings_record.is_enabled, settings_record.first_after_hours,
      settings_record.second_after_hours, settings_record.final_after_hours,
      settings_record.first_email, settings_record.first_push, settings_record.first_sms,
      settings_record.second_email, settings_record.second_push, settings_record.second_sms,
      settings_record.final_email, settings_record.final_push, settings_record.final_sms,
      settings_record.auto_delete, settings_record.auto_delete_after_hours, settings_record.updated_by
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO new_settings_id;
  END LOOP;
  
  -- Copy reminder_templates (global defaults)
  FOR template_record IN 
    SELECT * FROM reminder_templates WHERE tenant_id IS NULL
  LOOP
    INSERT INTO reminder_templates (
      tenant_id, channel, stage, language, subject, body, updated_by
    ) VALUES (
      target_tenant_id, template_record.channel, template_record.stage,
      template_record.language, template_record.subject, template_record.body, template_record.updated_by
    ) ON CONFLICT (tenant_id, channel, stage, language) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Reminder data copied to tenant: %', target_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure we have standard data (global templates)
-- Insert default reminder templates if they don't exist
INSERT INTO reminder_templates (tenant_id, channel, stage, language, subject, body) VALUES
-- Email templates
(NULL, 'email', 'first', 'de', 'Erinnerung: Ihr Termin steht bevor', 'Hallo {{student_name}},\n\nIhr Fahrstunde-Termin steht bald bevor:\n\nDatum: {{appointment_date}}\nZeit: {{appointment_time}}\nOrt: {{location}}\n\nBitte seien Sie pünktlich.\n\nMit freundlichen Grüßen\n{{company_name}}'),
(NULL, 'email', 'second', 'de', 'Letzte Erinnerung: Ihr Termin', 'Hallo {{student_name}},\n\nDies ist eine letzte Erinnerung für Ihren Termin:\n\nDatum: {{appointment_date}}\nZeit: {{appointment_time}}\nOrt: {{location}}\n\nBitte bestätigen Sie Ihre Teilnahme.\n\nMit freundlichen Grüßen\n{{company_name}}'),
(NULL, 'email', 'final', 'de', 'Termin-Bestätigung erforderlich', 'Hallo {{student_name}},\n\nIhr Termin steht kurz bevor. Bitte bestätigen Sie Ihre Teilnahme:\n\nDatum: {{appointment_date}}\nZeit: {{appointment_time}}\nOrt: {{location}}\n\nMit freundlichen Grüßen\n{{company_name}}'),

-- SMS templates
(NULL, 'sms', 'first', 'de', NULL, 'Erinnerung: Ihr Fahrstunde-Termin steht bevor am {{appointment_date}} um {{appointment_time}}. Bitte seien Sie pünktlich. {{company_name}}'),
(NULL, 'sms', 'second', 'de', NULL, 'Letzte Erinnerung: Ihr Termin am {{appointment_date}} um {{appointment_time}}. Bitte bestätigen Sie Ihre Teilnahme. {{company_name}}'),
(NULL, 'sms', 'final', 'de', NULL, 'Termin-Bestätigung erforderlich für {{appointment_date}} um {{appointment_time}}. Bitte antworten Sie. {{company_name}}'),

-- Push templates
(NULL, 'push', 'first', 'de', 'Termin-Erinnerung', 'Ihr Fahrstunde-Termin steht bald bevor: {{appointment_date}} um {{appointment_time}}'),
(NULL, 'push', 'second', 'de', 'Letzte Erinnerung', 'Letzte Erinnerung für Ihren Termin: {{appointment_date}} um {{appointment_time}}'),
(NULL, 'push', 'final', 'de', 'Bestätigung erforderlich', 'Bitte bestätigen Sie Ihren Termin: {{appointment_date}} um {{appointment_time}}')
ON CONFLICT (tenant_id, channel, stage, language) DO NOTHING;

-- Insert default reminder settings if they don't exist
INSERT INTO reminder_settings (tenant_id, is_enabled, first_after_hours, second_after_hours, final_after_hours) VALUES
(NULL, true, 24, 48, 72)
ON CONFLICT DO NOTHING;

-- Insert default reminder provider if it doesn't exist
INSERT INTO reminder_providers (tenant_id, smtp_enabled, sms_enabled, push_enabled) VALUES
(NULL, true, false, true)
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Copy data to all existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- Loop through all active tenants
  FOR tenant_record IN 
    SELECT id, name FROM tenants WHERE is_active = true
  LOOP
    RAISE NOTICE 'Copying reminder data to tenant: % (%)', tenant_record.name, tenant_record.id;
    
    -- Copy reminder data to this tenant
    PERFORM copy_reminder_data_to_tenant(tenant_record.id);
  END LOOP;
  
  RAISE NOTICE 'Reminder data duplication completed for all tenants';
END $$;

-- 5. Verify the results
SELECT 'Duplication Results:' as info;
SELECT 'Tenants with providers:' as info, COUNT(DISTINCT tenant_id) as count FROM reminder_providers WHERE tenant_id IS NOT NULL;
SELECT 'Tenants with settings:' as info, COUNT(DISTINCT tenant_id) as count FROM reminder_settings WHERE tenant_id IS NOT NULL;
SELECT 'Tenants with templates:' as info, COUNT(DISTINCT tenant_id) as count FROM reminder_templates WHERE tenant_id IS NOT NULL;

-- 6. Show detailed results
SELECT 
  t.name as tenant_name,
  t.id as tenant_id,
  COALESCE(COUNT(DISTINCT rp.id), 0) as providers_count,
  COALESCE(COUNT(DISTINCT rs.id), 0) as settings_count,
  COALESCE(COUNT(DISTINCT rt.id), 0) as templates_count
FROM tenants t
LEFT JOIN reminder_providers rp ON rp.tenant_id = t.id
LEFT JOIN reminder_settings rs ON rs.tenant_id = t.id
LEFT JOIN reminder_templates rt ON rt.tenant_id = t.id
WHERE t.is_active = true
GROUP BY t.id, t.name
ORDER BY t.name;
