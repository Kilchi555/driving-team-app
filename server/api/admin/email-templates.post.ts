// server/api/admin/email-templates.post.ts
// Configure email templates in Supabase

import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { templateType, templateContent } = body
    
    console.log('📧 Configuring email template:', templateType)
    
    // Email templates for Supabase
    const templates = {
      'invite_user': {
        subject: 'Einladung zu {{ .User.UserMetadata.tenant_name }}',
        body: `
<h2>Sie wurden eingeladen, {{ .User.UserMetadata.first_name }}!</h2>

<p>Sie wurden von {{ .User.UserMetadata.tenant_name }} eingeladen, sich zu registrieren.</p>

<p>Klicken Sie auf folgenden Link, um Ihre Einladung anzunehmen:</p>
<p><a href="{{ .ConfirmationURL }}">Einladung annehmen</a></p>

<p>Beste Grüsse</p>
<p>Ihr {{ .User.UserMetadata.tenant_name }} Team</p>
        `.trim()
      },
      'confirm_signup': {
        subject: 'Willkommen bei {{ .User.UserMetadata.tenant_name }}!',
        body: `
<h2>Vielen Dank für die Anmeldung, {{ .User.UserMetadata.first_name }}!</h2>

<p>Willkommen bei {{ .User.UserMetadata.tenant_name }}!</p>

<p>Klicken Sie auf folgenden Link, um Ihre E-Mail zu bestätigen:</p>
<p><a href="{{ .ConfirmationURL }}">Jetzt Anmeldung bestätigen</a></p>

<p>Beste Grüsse</p>
<p>Ihr {{ .User.UserMetadata.tenant_name }} Team</p>
        `.trim()
      },
      'reset_password': {
        subject: 'Passwort zurücksetzen - {{ .User.UserMetadata.tenant_name }}',
        body: `
<h2>Passwort zurücksetzen</h2>

<p>Hallo {{ .User.UserMetadata.first_name }},</p>

<p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>

<p>Klicken Sie auf folgenden Link, um Ihr Passwort zurückzusetzen:</p>
<p><a href="{{ .ConfirmationURL }}">Passwort zurücksetzen</a></p>

<p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>

<p>Beste Grüsse</p>
<p>Ihr {{ .User.UserMetadata.tenant_name }} Team</p>
        `.trim()
      }
    }
    
    if (templateType && templateContent) {
      // Custom template provided
      return {
        success: true,
        message: 'Custom template configuration',
        templateType,
        templateContent,
        instructions: [
          'Copy the template content above',
          'Go to Supabase Dashboard → Authentication → Email Templates',
          `Select "${templateType}" template`,
          'Replace the content with the provided template',
          'Save the changes'
        ]
      }
    }
    
    // Return all templates
    return {
      success: true,
      message: 'Email templates configuration',
      templates,
      instructions: [
        'Go to Supabase Dashboard → Authentication → Email Templates',
        'For each template type, replace the content with the provided template',
        'Save the changes after each template',
        'Test the templates with the test endpoints'
      ],
      availableTemplates: Object.keys(templates)
    }
    
  } catch (error: any) {
    console.error('Error configuring email templates:', error)
    return {
      success: false,
      error: error.message
    }
  }
})



