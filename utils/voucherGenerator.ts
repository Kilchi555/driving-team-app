// utils/voucherGenerator.ts
// Gutschein-Code-Generierung und Validierung

/**
 * Generiert einen eindeutigen Gutschein-Code
 * Format: GC-ABC123-XYZ (z.B. GC-A7B2C9-XY4)
 */
export const generateVoucherCode = (): string => {
  const prefix = 'GC'
  
  // Erste Hälfte: 6 Zeichen
  const part1 = Math.random().toString(36).substring(2, 8).toUpperCase()
  
  // Zweite Hälfte: 3 Zeichen  
  const part2 = Math.random().toString(36).substring(2, 5).toUpperCase()
  
  return `${prefix}-${part1}-${part2}`
}

/**
 * Validiert einen Gutschein-Code
 */
export const validateVoucherCode = (code: string): boolean => {
  const pattern = /^GC-[A-Z0-9]{6}-[A-Z0-9]{3}$/
  return pattern.test(code)
}

/**
 * Formatiert einen Gutschein-Code für Anzeige
 */
export const formatVoucherCode = (code: string): string => {
  if (!validateVoucherCode(code)) return code
  
  // Füge Leerzeichen für bessere Lesbarkeit hinzu
  return code.replace('-', ' - ').replace('-', ' - ')
}

export interface VoucherBranding {
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string
}

/**
 * Generiert Gutschein-PDF-Inhalt
 */
export const generateVoucherPDFContent = (
  voucher: {
    code: string
    name: string
    amount_chf: number
    recipient_name?: string
    valid_until: string
    description?: string
  },
  branding: VoucherBranding = {}
) => {
  const primary = branding.primaryColor || '#2563eb'
  const secondary = branding.secondaryColor || '#6b7280'
  const logo = branding.logoUrl

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        :root { --primary: ${primary}; --secondary: ${secondary}; }
        body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; }
        .voucher { max-width: 720px; margin: 24px auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(90deg, #ffffff, #f9fafb); padding: 16px 24px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 16px; }
        .logo { height: 44px; width: auto; object-fit: contain; }
        .titlewrap { display: flex; flex-direction: column; }
        .title { font-size: 22px; font-weight: 800; color: #111827; }
        .subtitle { font-size: 13px; color: var(--secondary); }
        .content { padding: 24px; }
        .name { font-size: 18px; font-weight: 600; margin-top: 4px; }
        .amount { font-size: 30px; font-weight: 800; color: var(--primary); margin: 10px 0; }
        .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 8px; display: inline-block; border: 1px solid #e5e7eb; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .label { font-size: 12px; color: #6b7280; }
        .value { font-size: 14px; color: #111827; font-weight: 600; }
        .section { margin-top: 16px; }
        .terms { background: #f9fafb; padding: 16px; font-size: 12px; color: #374151; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="voucher">
        <div class="header">
          ${logo ? `<img class=\"logo\" src=\"${logo}\" alt=\"Logo\" />` : ''}
          <div class="titlewrap">
            <div class="title">Gutschein</div>
            <div class="subtitle">${voucher.name}</div>
          </div>
        </div>
        <div class="content">
          <div class="amount">CHF ${voucher.amount_chf.toFixed(2)}</div>
          <div class="section">
            <div class="label">Gutscheincode</div>
            <div class="code">${voucher.code}</div>
          </div>
          <div class="grid section">
            <div>
              <div class="label">Empfänger</div>
              <div class="value">${voucher.recipient_name || 'Inhaber'}</div>
            </div>
            <div>
              <div class="label">Gültig bis</div>
              <div class="value">${new Date(voucher.valid_until).toLocaleDateString('de-CH')}</div>
            </div>
          </div>
          ${voucher.description ? `
          <div class="section">
            <div class="label">Hinweis</div>
            <div class="value">${voucher.description}</div>
          </div>` : ''}
        </div>
        <div class="terms">
          <strong>Nutzungsbedingungen:</strong>
          <ul>
            <li>Gutschein ist einmalig und nicht übertragbar</li>
            <li>Keine Barauszahlung</li>
            <li>Gültig bis zum angegebenen Datum</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generiert Gutschein-E-Mail-Inhalt
 */
export const generateVoucherEmailContent = (voucher: {
  code: string
  name: string
  amount_chf: number
  recipient_name?: string
  recipient_email?: string
  valid_until: string
}) => {
  return {
    subject: `🎁 Ihr Driving Team Gutschein - ${voucher.code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎁 Ihr Gutschein ist bereit!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Driving Team Gutschein</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #E5E7EB; border-top: none;">
          <h2 style="color: #374151; margin-top: 0;">Hallo ${voucher.recipient_name || 'liebe/r Fahrschüler/in'}!</h2>
          
          <p>Ihr Gutschein wurde erfolgreich erstellt und ist sofort einsatzbereit:</p>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 10px;">
              CHF ${voucher.amount_chf.toFixed(2)}
            </div>
            <div style="background: #1E40AF; color: white; padding: 10px 20px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; display: inline-block;">
              ${voucher.code}
            </div>
          </div>
          
          <h3 style="color: #374151;">So lösen Sie Ihren Gutschein ein:</h3>
          <ol style="color: #6B7280; line-height: 1.8;">
            <li>Zeigen Sie den Code bei Ihrer nächsten Fahrstunde vor</li>
            <li>Oder geben Sie den Code im Online-Buchungssystem ein</li>
            <li>Der Betrag wird automatisch von der Rechnung abgezogen</li>
          </ol>
          
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400E;"><strong>Wichtig:</strong> Gültig bis ${new Date(voucher.valid_until).toLocaleDateString('de-CH')}</p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #E5E7EB; border-top: none;">
          <p style="margin: 0; color: #6B7280; font-size: 14px;">
            Bei Fragen wenden Sie sich gerne an Ihren Fahrlehrer oder das Driving Team.<br>
            Viel Erfolg bei Ihrer Führerscheinausbildung! 🚗
          </p>
        </div>
      </div>
    `,
    text: `
      Ihr Driving Team Gutschein ist bereit!
      
      Gutschein-Code: ${voucher.code}
      Betrag: CHF ${voucher.amount_chf.toFixed(2)}
      Gültig bis: ${new Date(voucher.valid_until).toLocaleDateString('de-CH')}
      
      So lösen Sie Ihren Gutschein ein:
      1. Zeigen Sie den Code bei Ihrer nächsten Fahrstunde vor
      2. Oder geben Sie den Code im Online-Buchungssystem ein
      3. Der Betrag wird automatisch von der Rechnung abgezogen
      
      Bei Fragen wenden Sie sich an Ihren Fahrlehrer oder das Driving Team.
    `
  }
}
