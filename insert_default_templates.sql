-- Insert default reminder templates using the correct schema
INSERT INTO reminder_templates (tenant_id, channel, stage, language, subject, body) VALUES
(NULL, 'email', 'first', 'de', 'Terminbestätigung erforderlich - {{appointment_date}}', 
'Hallo {{student_name}},

bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin hier: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team'),

(NULL, 'push', 'first', 'de', NULL, 
'Terminbestätigung erforderlich: {{appointment_date}} um {{appointment_time}} Uhr. Bitte bestätigen Sie hier: {{confirmation_link}}'),

(NULL, 'sms', 'first', 'de', NULL, 
'Hallo {{student_name}}, bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr. {{confirmation_link}}'),

(NULL, 'email', 'second', 'de', 'Erinnerung: Terminbestätigung noch ausstehend', 
'Hallo {{student_name}},

dies ist eine freundliche Erinnerung, dass Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr noch bestätigen müssen.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin hier: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team'),

(NULL, 'push', 'second', 'de', NULL, 
'Erinnerung: Termin am {{appointment_date}} um {{appointment_time}} Uhr noch nicht bestätigt. Bitte bestätigen Sie hier: {{confirmation_link}}'),

(NULL, 'sms', 'second', 'de', NULL, 
'Erinnerung: Termin am {{appointment_date}} um {{appointment_time}} Uhr noch nicht bestätigt. {{confirmation_link}}'),

(NULL, 'email', 'final', 'de', 'Letzte Warnung: Termin wird gelöscht', 
'Hallo {{student_name}},

dies ist die letzte Warnung! Ihr Termin am {{appointment_date}} um {{appointment_time}} Uhr wird in 3 Stunden automatisch gelöscht, wenn Sie ihn nicht bestätigen.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin JETZT: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team'),

(NULL, 'push', 'final', 'de', NULL, 
'LETZTE WARNUNG: Termin am {{appointment_date}} um {{appointment_time}} Uhr wird in 3h gelöscht! Bestätigen: {{confirmation_link}}'),

(NULL, 'sms', 'final', 'de', NULL, 
'LETZTE WARNUNG: Termin am {{appointment_date}} wird in 3h gelöscht! Bestätigen: {{confirmation_link}}')

ON CONFLICT (tenant_id, channel, stage, language) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  updated_at = NOW();
