// server/utils/email-templates.ts
// Email templates for SARI enrollment confirmations

export function generateSARIEnrollmentConfirmationEmail(data: {
  participantName: string
  courseName: string
  courseDate?: string
  location?: string
  paymentAmount?: number
  tenantName?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    participantName,
    courseName,
    courseDate,
    location,
    paymentAmount,
    tenantName = 'Simy',
    primaryColor = '#667eea',
    logoUrl = null,
  } = data

  const subject = `Bestätigung: Kursanmeldung für ${courseName}`

  const logoHtml = logoUrl
    ? `<div style="text-align:center;padding:20px 30px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
    }
    .header {
      background: ${primaryColor};
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #666;
      font-weight: 600;
    }
    .info-value {
      color: #333;
      font-weight: 500;
    }
    .alert {
      background: #f3f4f6;
      border-left: 4px solid ${primaryColor};
      padding: 12px 15px;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 13px;
    }
    .cta-button {
      display: inline-block;
      background: ${primaryColor};
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 15px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    ${logoHtml}
    <div class="header">
      <h1>Kursanmeldung bestätigt</h1>
    </div>
    <div class="content">
      <p>Liebe/r <strong>${participantName}</strong>,</p>
      
      <p>vielen Dank für Ihre Anmeldung! Ihre Kursanmeldung wurde erfolgreich verarbeitet und bestätigt.</p>

      <div class="section">
        <div class="section-title">Kursdetails</div>
        <div class="info-row">
          <span class="info-label">Kurs:</span>
          <span class="info-value">${courseName}</span>
        </div>
        ${courseDate ? `
        <div class="info-row">
          <span class="info-label">Startdatum:</span>
          <span class="info-value">${courseDate}</span>
        </div>
        ` : ''}
        ${location ? `
        <div class="info-row">
          <span class="info-label">Ort:</span>
          <span class="info-value">${location}</span>
        </div>
        ` : ''}
        ${paymentAmount ? `
        <div class="info-row">
          <span class="info-label">Zahlbetrag:</span>
          <span class="info-value">CHF ${paymentAmount.toFixed(2)}</span>
        </div>
        ` : ''}
      </div>

      <div class="alert">
        <strong>Nächste Schritte:</strong><br>
        Sie erhalten in Kürze weitere Informationen zum Kurs, einschließlich Anweisungen und Details zu den einzelnen Kursterminen.
      </div>

      <p>Sollten Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>

      <p>
        Mit freundlichen Grüßen,<br>
        <strong>${tenantName}</strong>
      </p>
    </div>
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}

export function generateNonSARIEnrollmentConfirmationEmail(data: {
  participantName: string
  courseName: string
  courseDate?: string
  location?: string
  instructorName?: string
  tenantName?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    participantName,
    courseName,
    courseDate,
    location,
    instructorName,
    tenantName = 'Simy',
    primaryColor = '#667eea',
    logoUrl = null,
  } = data

  const subject = `Bestätigung: Kursanmeldung für ${courseName}`

  const logoHtml = logoUrl
    ? `<div style="text-align:center;padding:20px 30px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
    }
    .header {
      background: ${primaryColor};
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #666;
      font-weight: 600;
    }
    .info-value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    ${logoHtml}
    <div class="header">
      <h1>Kursanmeldung bestätigt</h1>
    </div>
    <div class="content">
      <p>Liebe/r <strong>${participantName}</strong>,</p>
      
      <p>vielen Dank für Ihre Anmeldung! Ihre Kursanmeldung wurde erfolgreich verarbeitet und bestätigt.</p>

      <div class="section">
        <div class="section-title">Kursdetails</div>
        <div class="info-row">
          <span class="info-label">Kurs:</span>
          <span class="info-value">${courseName}</span>
        </div>
        ${courseDate ? `
        <div class="info-row">
          <span class="info-label">Startdatum:</span>
          <span class="info-value">${courseDate}</span>
        </div>
        ` : ''}
        ${location ? `
        <div class="info-row">
          <span class="info-label">Ort:</span>
          <span class="info-value">${location}</span>
        </div>
        ` : ''}
        ${instructorName ? `
        <div class="info-row">
          <span class="info-label">Kursleiter:</span>
          <span class="info-value">${instructorName}</span>
        </div>
        ` : ''}
      </div>

      <p>Sie werden in Kürze eine weitere E-Mail mit zusätzlichen Informationen erhalten.</p>

      <p>
        Mit freundlichen Grüßen,<br>
        <strong>${tenantName}</strong>
      </p>
    </div>
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}

export function generateWaitlistConfirmationEmail(data: {
  firstName: string
  lastName: string
  courseName: string
  courseDescription?: string
  position: number
  tenantName?: string
  tenantEmail?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    firstName,
    lastName,
    courseName,
    courseDescription,
    position,
    tenantName = 'Simy',
    tenantEmail,
    primaryColor = '#1d4ed8',
    logoUrl = null,
  } = data

  const subject = `Warteliste bestätigt: ${courseName}`

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoHtml}
          <tr>
            <td style="background-color:${primaryColor};padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Warteliste bestätigt</h1>
              <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px;">${tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hallo ${firstName} ${lastName}</p>
              <p style="font-size:15px;color:#374151;margin:0 0 24px;">
                Sie sind erfolgreich auf der Warteliste für den folgenden Kurs eingetragen:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:2px solid ${primaryColor};border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:14px;color:${primaryColor};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Kurs</p>
                    <p style="margin:0 0 12px;font-size:18px;color:#111827;font-weight:700;">${courseName}</p>
                    ${courseDescription ? `<p style="margin:0 0 12px;font-size:14px;color:#374151;">${courseDescription}</p>` : ''}
                    <p style="margin:0;font-size:14px;color:#374151;">
                      Ihre Position auf der Warteliste: <strong>#${position}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-left:4px solid #f59e0b;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#374151;">
                      <strong>Was passiert als nächstes?</strong><br><br>
                      Sobald genügend Interessenten auf der Warteliste sind, wird ein Kurstermin festgelegt.
                      Sie werden per E-Mail benachrichtigt, sobald ein Datum bekannt ist und können dann offiziell buchen.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#6b7280;margin:0 0 8px;">Bei Fragen wenden Sie sich an:</p>
              <p style="font-size:14px;color:${primaryColor};margin:0;">${tenantEmail || tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${tenantName} · Automatisch generierte E-Mail</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return { subject, html }
}

export function generateAdminEnrollmentNotificationEmail(data: {
  participantFirstName: string
  participantLastName: string
  participantEmail: string
  participantPhone?: string
  courseName: string
  courseDate?: string
  courseLocation?: string
  paymentMethod: string
  paymentAmount?: string
  tenantName?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    participantFirstName,
    participantLastName,
    participantEmail,
    participantPhone,
    courseName,
    courseDate,
    courseLocation,
    paymentMethod,
    paymentAmount,
    tenantName = 'Simy',
    primaryColor = '#1d4ed8',
    logoUrl = null,
  } = data

  const subject = `Neue Anmeldung: ${participantFirstName} ${participantLastName} → ${courseName}`

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoHtml}
          <tr>
            <td style="background-color:${primaryColor};padding:28px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Neue Kursanmeldung</h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">${tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Teilnehmer</p>
                    <p style="margin:0 0 4px;font-size:17px;color:#14532d;font-weight:700;">${participantFirstName} ${participantLastName}</p>
                    <p style="margin:0 0 2px;font-size:13px;color:#374151;">${participantEmail}</p>
                    ${participantPhone ? `<p style="margin:0;font-size:13px;color:#374151;">${participantPhone}</p>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Kurs</p>
                    <p style="margin:0 0 8px;font-size:16px;color:#1e3a8a;font-weight:700;">${courseName}</p>
                    ${courseDate ? `<p style="margin:0 0 4px;font-size:13px;color:#374151;"><strong>Datum:</strong> ${courseDate}</p>` : ''}
                    ${courseLocation ? `<p style="margin:0 0 4px;font-size:13px;color:#374151;"><strong>Ort:</strong> ${courseLocation}</p>` : ''}
                    <p style="margin:0;font-size:13px;color:#374151;"><strong>Zahlung:</strong> ${paymentMethod}${paymentAmount ? ` · CHF ${paymentAmount}` : ''}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#9ca3af;margin:0;">Diese Benachrichtigung wurde automatisch generiert.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">${tenantName} · Admin-Benachrichtigung</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return { subject, html }
}

export function generateAdminWaitlistNotificationEmail(data: {
  participantFirstName: string
  participantLastName: string
  participantEmail: string
  participantPhone?: string
  courseName: string
  position: number
  tenantName?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    participantFirstName,
    participantLastName,
    participantEmail,
    participantPhone,
    courseName,
    position,
    tenantName = 'Simy',
    primaryColor = '#7c3aed',
    logoUrl = null,
  } = data

  const subject = `Neue Wartelisten-Anmeldung: ${participantFirstName} ${participantLastName} → ${courseName}`

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoHtml}
          <tr>
            <td style="background-color:${primaryColor};padding:28px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Neuer Wartelisten-Eintrag</h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">${tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#5b21b6;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Interessent</p>
                    <p style="margin:0 0 4px;font-size:17px;color:#3b0764;font-weight:700;">${participantFirstName} ${participantLastName}</p>
                    <p style="margin:0 0 2px;font-size:13px;color:#374151;">${participantEmail}</p>
                    ${participantPhone ? `<p style="margin:0 0 2px;font-size:13px;color:#374151;">${participantPhone}</p>` : ''}
                    <p style="margin:8px 0 0;font-size:13px;color:#374151;">Wartelisten-Position: <strong>#${position}</strong></p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Kurs</p>
                    <p style="margin:0;font-size:16px;color:#1e3a8a;font-weight:700;">${courseName}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#9ca3af;margin:0;">Diese Benachrichtigung wurde automatisch generiert.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">${tenantName} · Admin-Benachrichtigung</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return { subject, html }
}

export function generateCourseRegistrationCancellationEmail(data: {
  firstName: string
  lastName: string
  courseName: string
  /** @deprecated Prefer `sessionLines` — kept as fallback for a single date */
  courseDate?: string
  /** Formatted session lines, e.g. "Teil 1 · Sa., 08.08.2026, 08:00–12:00" */
  sessionLines?: string[]
  location?: string
  tenantName?: string
  tenantEmail?: string
  reason?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    firstName,
    lastName,
    courseName,
    courseDate,
    sessionLines = [],
    location,
    tenantName = 'Simy',
    tenantEmail,
    reason,
    primaryColor = '#dc2626',
    logoUrl = null,
  } = data

  const subject = `Ihre Kursanmeldung wurde storniert: ${courseName}`

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  const sessionsHtml = sessionLines.length > 0
    ? sessionLines
        .map((line) => `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;line-height:1.45;">📅 ${line}</p>`)
        .join('')
    : (courseDate
        ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">📅 ${courseDate}</p>`
        : '')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoHtml}
          <tr>
            <td style="background:${primaryColor};padding:32px 40px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${tenantName}</p>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">Stornierungsbestätigung</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#111827;">Guten Tag ${firstName} ${lastName}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Ihre Anmeldung für den folgenden Kurs wurde storniert:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827;">${courseName}</p>
                    ${sessionsHtml}
                    ${location ? '<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">📍 ' + location + '</p>' : ''}
                  </td>
                </tr>
              </table>
              ${reason ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;"><tr><td style="padding:16px 24px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">Grund der Stornierung:</p><p style="margin:0;font-size:14px;color:#78350f;">${reason}</p></td></tr></table>` : ''}
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Falls Sie Fragen haben oder sich erneut anmelden möchten, kontaktieren Sie uns bitte direkt.</p>
              ${tenantEmail ? '<table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="background:#dc2626;border-radius:8px;padding:12px 24px;"><a href="mailto:' + tenantEmail + '" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">' + tenantEmail + '</a></td></tr></table>' : ''}
              <p style="margin:0;font-size:14px;color:#9ca3af;">${tenantName} · Automatisch generierte E-Mail</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return { subject, html }
}

export function generateWaitlistAvailableEmail(data: {
  firstName: string
  lastName: string
  courseName: string
  courseDescription?: string
  sessions?: Array<{ date: string; time: string }>
  bookingUrl: string
  tenantName?: string
  tenantEmail?: string
  primaryColor?: string
  logoUrl?: string | null
}): { subject: string; html: string } {
  const {
    firstName,
    lastName,
    courseName,
    courseDescription,
    sessions = [],
    bookingUrl,
    tenantName = 'Simy',
    tenantEmail,
    primaryColor = '#1d4ed8',
    logoUrl = null,
  } = data

  const subject = `Jetzt buchbar: ${courseName}`

  const sessionsHtml = sessions.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#15803d;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Kursdaten</p>
          ${sessions.map(s => `<p style="margin:0 0 4px;font-size:14px;color:#166534;">📅 ${s.date} · ${s.time}</p>`).join('')}
        </td></tr>
      </table>`
    : ''

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoHtml}
          <tr>
            <td style="background-color:${primaryColor};padding:32px 40px;text-align:center;">
              <p style="color:rgba(255,255,255,0.8);margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;">Gute Neuigkeit</p>
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Jetzt buchbar!</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hallo ${firstName} ${lastName}</p>
              <p style="font-size:15px;color:#374151;margin:0 0 24px;">
                Grossartige Neuigkeit! Der Kurs, für den Sie auf der Warteliste stehen, ist ab sofort buchbar:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:2px solid ${primaryColor};border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:18px;color:#111827;font-weight:700;">${courseName}</p>
                    ${courseDescription ? `<p style="margin:0;font-size:14px;color:#6b7280;">${courseDescription}</p>` : ''}
                  </td>
                </tr>
              </table>
              ${sessionsHtml}
              <p style="font-size:15px;color:#374151;margin:0 0 24px;">
                Sichern Sie sich jetzt Ihren Platz — die Plätze sind begrenzt.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:${primaryColor};border-radius:8px;padding:14px 32px;">
                    <a href="${bookingUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Jetzt anmelden →</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#6b7280;margin:0 0 4px;">Bei Fragen wenden Sie sich an:</p>
              <p style="font-size:14px;color:${primaryColor};margin:0;">${tenantEmail || tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${tenantName} · Automatisch generierte E-Mail</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return { subject, html }
}

export function generateCategoryWaitlistNotificationEmail(data: {
  firstName: string
  categoryName: string
  bookingUrl: string
  tenantName?: string
  primaryColor?: string
  logoUrl?: string | null
}): string {
  const {
    firstName,
    categoryName,
    bookingUrl,
    tenantName = 'Ihre Fahrschule',
    primaryColor = '#1d4ed8',
    logoUrl = null,
  } = data

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neuer ${categoryName} verfügbar</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoHtml}
          <tr>
            <td style="background-color:${primaryColor};padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Neuer Kurs verfügbar!</h1>
              <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px;">${tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hallo ${firstName}</p>
              <p style="font-size:15px;color:#374151;margin:0 0 24px;">
                Gute Neuigkeiten! Es ist ein neuer <strong>${categoryName}</strong> verfügbar.
                Du stehst auf der Warteliste – melde dich jetzt direkt an, bevor die Plätze ausgebucht sind.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${bookingUrl}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                      Jetzt anmelden
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">
                Oder kopiere diesen Link in deinen Browser:<br>
                <a href="${bookingUrl}" style="color:${primaryColor};word-break:break-all;">${bookingUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">
                ${tenantName} · Diese E-Mail wurde gesendet, weil du dich für die Warteliste registriert hast.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
