// server/utils/email-templates.ts
// Email templates for SARI enrollment confirmations

export function generateSARIEnrollmentConfirmationEmail(data: {
  participantName: string
  courseName: string
  courseDate?: string
  location?: string
  paymentAmount?: number
  tenantName?: string
}): { subject: string; html: string } {
  const {
    participantName,
    courseName,
    courseDate,
    location,
    paymentAmount,
    tenantName = 'Driving Team'
  } = data

  const subject = `Bestätigung: Kursanmeldung für ${courseName}`

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      color: #667eea;
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
      border-left: 4px solid #667eea;
      padding: 12px 15px;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 13px;
    }
    .cta-button {
      display: inline-block;
      background: #667eea;
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
}): { subject: string; html: string } {
  const {
    participantName,
    courseName,
    courseDate,
    location,
    instructorName,
    tenantName = 'Driving Team'
  } = data

  const subject = `Bestätigung: Kursanmeldung für ${courseName}`

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      color: #667eea;
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
  position: number
  tenantName?: string
  tenantEmail?: string
}): { subject: string; html: string } {
  const { firstName, lastName, courseName, position, tenantName = 'Driving Team', tenantEmail } = data

  const subject = `Warteliste bestätigt: ${courseName}`

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
          <tr>
            <td style="background-color:#1d4ed8;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Warteliste bestätigt</h1>
              <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">${tenantName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hallo ${firstName} ${lastName}</p>
              <p style="font-size:15px;color:#374151;margin:0 0 24px;">
                Sie sind erfolgreich auf der Warteliste für den folgenden Kurs eingetragen:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:14px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Kurs</p>
                    <p style="margin:0 0 12px;font-size:18px;color:#1e3a8a;font-weight:700;">${courseName}</p>
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
              <p style="font-size:14px;color:#1d4ed8;margin:0;">${tenantEmail || tenantName}</p>
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
