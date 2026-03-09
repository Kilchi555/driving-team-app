import { defineEventHandler, readBody } from 'h3'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface PriceCalculationRequest {
  email: string
  category: string
  lessonsCount: number
  lessonType: string
  totalCost: number
  calculationDetails: string
}

export default defineEventHandler(async (event) => {
  const body = readBody<PriceCalculationRequest>(await event)

  if (!body.email || !body.category) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email und Kategorie sind erforderlich',
    })
  }

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              max-width: 600px;
              margin: 0 auto;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 3px solid #0066cc;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #0066cc;
              margin: 0;
              font-size: 28px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h2 {
              color: #0066cc;
              font-size: 16px;
              border-bottom: 1px solid #e0e0e0;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .breakdown {
              background-color: #f9f9f9;
              padding: 15px;
              border-left: 4px solid #0066cc;
              margin-bottom: 15px;
              white-space: pre-wrap;
              font-family: 'Courier New', monospace;
              font-size: 14px;
            }
            .total-section {
              background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .total-section h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .total-amount {
              font-size: 32px;
              font-weight: bold;
              margin: 0;
            }
            .disclaimer {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 4px;
              font-size: 12px;
              color: #856404;
            }
            .cta-button {
              display: inline-block;
              background-color: #0066cc;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
              font-weight: bold;
            }
            .footer {
              border-top: 1px solid #e0e0e0;
              padding-top: 20px;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .contact-info {
              display: flex;
              gap: 20px;
              justify-content: center;
              margin-top: 15px;
              flex-wrap: wrap;
            }
            .contact-item {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>💰 Deine Kostenberechnung</h1>
              <p style="margin: 10px 0 0 0; color: #666;">Fahrschule Driving Team</p>
            </div>

            <!-- Main Content -->
            <div class="section">
              <p>Hallo,</p>
              <p>vielen Dank, dass du unseren Kostenrechner verwendet hast! Hier ist deine personalisierte Kostenberechnung:</p>
            </div>

            <!-- Breakdown -->
            <div class="section">
              <h2>📋 Kostenaufschlüsselung</h2>
              <div class="breakdown">${body.calculationDetails}</div>
            </div>

            <!-- Total -->
            <div class="total-section">
              <h3>Geschätzte Gesamtkosten</h3>
              <p class="total-amount">CHF ${body.totalCost}.–</p>
            </div>

            <!-- Disclaimer -->
            <div class="disclaimer">
              <strong>⚠️ Wichtiger Hinweis – Unverbindliche Preise:</strong><br>
              Diese Kalkulation dient nur zur Orientierung und Planungszwecken. Die tatsächlichen Kosten können je nach individuellen Umständen, Anzahl der benötigten Fahrstunden, Fahrerfahrung und anderen Faktoren variieren. Externe Kosten wie Sehtest, Lernfahrgesuch und Prüfungsgebühren des Strassenverkehrsamtes sind teilweise enthalten, aber nicht vollständig. Die Anzahl der Fahrstunden ist individuell sehr unterschiedlich.
              <br><br>
              <strong>Für ein genaues, verbindliches Angebot kontaktiere uns bitte direkt!</strong>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 10px; color: #666;">Bereit? Lass uns gemeinsam deine Fahrausbildung planen!</p>
              <a href="https://simy.ch/booking/availability/driving-team" class="cta-button">📅 Jetzt Fahrstunden buchen</a>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 15px 0;">Du hast Fragen? Kontaktiere uns:</p>
              <div class="contact-info">
                <div class="contact-item">
                  <p style="margin: 0;"><strong>📞 Telefon</strong></p>
                  <p style="margin: 5px 0 0 0;"><a href="tel:+41444310033" style="color: #0066cc; text-decoration: none;">+41 44 431 00 33</a></p>
                </div>
                <div class="contact-item">
                  <p style="margin: 0;"><strong>🌐 Website</strong></p>
                  <p style="margin: 5px 0 0 0;"><a href="https://drivingteam.ch" style="color: #0066cc; text-decoration: none;">drivingteam.ch</a></p>
                </div>
                <div class="contact-item">
                  <p style="margin: 0;"><strong>📧 Email</strong></p>
                  <p style="margin: 5px 0 0 0;"><a href="mailto:info@drivingteam.ch" style="color: #0066cc; text-decoration: none;">info@drivingteam.ch</a></p>
                </div>
              </div>
              <p style="margin-top: 20px; color: #999;">Fahrschule Driving Team | Zürich & Lachen</p>
            </div>
          </div>
        </body>
      </html>
    `

    const response = await resend.emails.send({
      from: 'noreply@drivingteam.ch',
      to: body.email,
      subject: `💰 Deine Kostenberechnung - ${body.category} - Fahrschule Driving Team`,
      html: htmlContent,
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return {
      success: true,
      message: 'Email erfolgreich versendet',
    }
  } catch (error) {
    console.error('Email send error:', error)
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error
          ? error.message
          : 'Fehler beim Versand der Email',
    })
  }
})
