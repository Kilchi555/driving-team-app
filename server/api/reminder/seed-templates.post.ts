import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    // Insert default templates
    const templates = [
      {
        tenant_id: null,
        channel: 'email',
        stage: 'first',
        language: 'de',
        subject: 'Terminbestätigung erforderlich - {{appointment_date}}',
        body: `Hallo {{student_name}},

bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin hier: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team`
      },
      {
        tenant_id: null,
        channel: 'push',
        stage: 'first',
        language: 'de',
        subject: null,
        body: 'Terminbestätigung erforderlich: {{appointment_date}} um {{appointment_time}} Uhr. Bitte bestätigen Sie hier: {{confirmation_link}}'
      },
      {
        tenant_id: null,
        channel: 'sms',
        stage: 'first',
        language: 'de',
        subject: null,
        body: 'Hallo {{student_name}}, bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr. {{confirmation_link}}'
      },
      {
        tenant_id: null,
        channel: 'email',
        stage: 'second',
        language: 'de',
        subject: 'Erinnerung: Terminbestätigung noch ausstehend',
        body: `Hallo {{student_name}},

dies ist eine freundliche Erinnerung, dass Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr noch bestätigen müssen.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin hier: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team`
      },
      {
        tenant_id: null,
        channel: 'push',
        stage: 'second',
        language: 'de',
        subject: null,
        body: 'Erinnerung: Termin am {{appointment_date}} um {{appointment_time}} Uhr noch nicht bestätigt. Bitte bestätigen Sie hier: {{confirmation_link}}'
      },
      {
        tenant_id: null,
        channel: 'sms',
        stage: 'second',
        language: 'de',
        subject: null,
        body: 'Erinnerung: Termin am {{appointment_date}} um {{appointment_time}} Uhr noch nicht bestätigt. {{confirmation_link}}'
      },
      {
        tenant_id: null,
        channel: 'email',
        stage: 'final',
        language: 'de',
        subject: 'Letzte Warnung: Termin wird gelöscht',
        body: `Hallo {{student_name}},

dies ist die letzte Warnung! Ihr Termin am {{appointment_date}} um {{appointment_time}} Uhr wird in 3 Stunden automatisch gelöscht, wenn Sie ihn nicht bestätigen.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin JETZT: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team`
      },
      {
        tenant_id: null,
        channel: 'push',
        stage: 'final',
        language: 'de',
        subject: null,
        body: 'LETZTE WARNUNG: Termin am {{appointment_date}} um {{appointment_time}} Uhr wird in 3h gelöscht! Bestätigen: {{confirmation_link}}'
      },
      {
        tenant_id: null,
        channel: 'sms',
        stage: 'final',
        language: 'de',
        subject: null,
        body: 'LETZTE WARNUNG: Termin am {{appointment_date}} wird in 3h gelöscht! Bestätigen: {{confirmation_link}}'
      }
    ]

    // Insert templates with conflict resolution
    for (const template of templates) {
      await supabase
        .from('reminder_templates')
        .upsert(template, {
          onConflict: 'tenant_id,channel,stage,language'
        })
    }

    return {
      success: true,
      message: 'Default templates inserted successfully',
      count: templates.length
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to seed templates: ${error.message}`
    })
  }
})
