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
  tenantName?: string
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string
}

/**
 * Generiert Gutschein-PDF-Inhalt (Weltklasse-Design, A4)
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
  const primary = branding.primaryColor || '#1a56db'
  const logo = branding.logoUrl
  const tenantName = branding.tenantName || 'Fahrschule'

  // Derive a slightly darker shade for gradients
  const validDate = new Date(voucher.valid_until).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 210mm; height: 297mm; background: #f1f5f9; }
  body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; display: flex; align-items: center; justify-content: center; padding: 20mm 15mm; }

  .page { width: 100%; }

  /* ── Top card ── */
  .card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.08);
    position: relative;
  }

  /* Hero strip */
  .hero {
    background: linear-gradient(135deg, ${primary} 0%, ${primary}cc 60%, ${primary}88 100%);
    padding: 32px 36px 28px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 220px; height: 220px;
    background: rgba(255,255,255,0.07);
    border-radius: 50%;
  }
  .hero::after {
    content: '';
    position: absolute;
    bottom: -60px; left: 30%;
    width: 300px; height: 300px;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
  }
  .hero-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; position: relative; z-index: 1; }
  .hero-logo { height: 36px; width: auto; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.95; }
  .hero-label {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 20px;
  }
  .hero-amount {
    color: white;
    font-size: 64px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -2px;
    position: relative;
    z-index: 1;
  }
  .hero-amount span { font-size: 28px; font-weight: 600; vertical-align: top; margin-top: 12px; display: inline-block; opacity: 0.85; }
  .hero-name {
    color: rgba(255,255,255,0.85);
    font-size: 15px;
    font-weight: 500;
    margin-top: 6px;
    position: relative;
    z-index: 1;
  }

  /* Decorative tear line */
  .tear {
    height: 24px;
    background: #f1f5f9;
    position: relative;
    overflow: hidden;
  }
  .tear::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 12px;
    background: white;
    border-radius: 0 0 12px 12px;
  }
  .tear::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 12px;
    background: white;
    border-radius: 12px 12px 0 0;
  }
  /* Punch holes */
  .punches {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    z-index: 1;
  }
  .punch {
    width: 20px; height: 20px;
    background: #f1f5f9;
    border-radius: 50%;
  }
  .dots-line {
    flex: 1;
    height: 2px;
    background: repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 8px, transparent 8px, transparent 16px);
    margin: 0 8px;
  }

  /* Body */
  .body { background: white; padding: 28px 36px 32px; }

  /* Code block */
  .code-section { margin-bottom: 24px; }
  .code-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
  .code-box {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 2px solid ${primary}33;
    border-radius: 12px;
    padding: 12px 20px;
  }
  .code-icon { font-size: 18px; }
  .code-value {
    font-family: 'Courier New', monospace;
    font-size: 22px;
    font-weight: 800;
    color: ${primary};
    letter-spacing: 3px;
  }

  /* Info grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-cell { }
  .info-cell-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  .info-cell-value { font-size: 14px; font-weight: 600; color: #1e293b; }

  /* How to use */
  .how {
    background: linear-gradient(135deg, ${primary}0d, ${primary}06);
    border: 1px solid ${primary}22;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .how-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${primary}; margin-bottom: 12px; }
  .how-steps { display: flex; gap: 16px; }
  .how-step { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .how-step-num {
    width: 28px; height: 28px;
    background: ${primary};
    color: white;
    font-size: 12px;
    font-weight: 800;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px;
    flex-shrink: 0;
  }
  .how-step-text { font-size: 11px; color: #64748b; line-height: 1.4; }

  /* Footer */
  .footer {
    border-top: 1px solid #f1f5f9;
    padding-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .footer-brand { font-size: 12px; font-weight: 700; color: ${primary}; }
  .footer-terms { font-size: 10px; color: #94a3b8; text-align: right; line-height: 1.5; }
</style>
</head>
<body>
<div class="page">
  <div class="card">

    <!-- Hero -->
    <div class="hero">
      <div class="hero-top">
        ${logo ? `<img class="hero-logo" src="${logo}" alt="${tenantName}" />` : `<div style="color:white;font-size:18px;font-weight:800;letter-spacing:-0.5px;">${tenantName}</div>`}
        <div class="hero-label">Geschenkgutschein</div>
      </div>
      <div class="hero-amount"><span>CHF&nbsp;</span>${voucher.amount_chf.toFixed(2)}</div>
      <div class="hero-name">${voucher.name}</div>
    </div>

    <!-- Tear line -->
    <div class="tear">
      <div class="punches">
        <div class="punch"></div>
        <div class="dots-line"></div>
        <div class="punch"></div>
      </div>
    </div>

    <!-- Body -->
    <div class="body">

      <!-- Code -->
      <div class="code-section">
        <div class="code-label">Ihr persönlicher Gutscheincode</div>
        <div class="code-box">
          <span class="code-icon">🎟</span>
          <span class="code-value">${voucher.code}</span>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-cell">
          <div class="info-cell-label">Empfänger</div>
          <div class="info-cell-value">${voucher.recipient_name || 'Inhaber/in'}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Gültig bis</div>
          <div class="info-cell-value">${validDate}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Wert</div>
          <div class="info-cell-value" style="color:${primary}; font-size:16px; font-weight:800;">CHF ${voucher.amount_chf.toFixed(2)}</div>
        </div>
      </div>

      ${voucher.description ? `
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#92400e;margin-bottom:4px;">Hinweis</div>
        <div style="font-size:13px;color:#78350f;">${voucher.description}</div>
      </div>` : ''}

      <!-- How to use -->
      <div class="how">
        <div class="how-title">So einfach einlösen</div>
        <div class="how-steps">
          <div class="how-step">
            <div class="how-step-num">1</div>
            <div class="how-step-text">Online Termin buchen oder Fahrschule kontaktieren</div>
          </div>
          <div class="how-step">
            <div class="how-step-num">2</div>
            <div class="how-step-text">Gutscheincode bei der Buchung eingeben</div>
          </div>
          <div class="how-step">
            <div class="how-step-num">3</div>
            <div class="how-step-text">Betrag wird automatisch abgezogen</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-brand">${tenantName}</div>
        <div class="footer-terms">
          Einmalig einlösbar · Nicht übertragbar · Keine Barauszahlung<br>
          Gültig bis ${validDate}
        </div>
      </div>

    </div>
  </div>
</div>
</body>
</html>`
}

/**
 * Generiert Gutschein-E-Mail-Inhalt (weltklasse Design)
 */
export const generateVoucherEmailContent = (
  voucher: {
    code: string
    name: string
    amount_chf: number
    recipient_name?: string
    recipient_email?: string
    valid_until: string
    downloadUrl?: string
  },
  branding: VoucherBranding = {}
) => {
  const primary = branding.primaryColor || '#1a56db'
  const tenantName = branding.tenantName || 'Ihre Fahrschule'
  const logo = branding.logoUrl
  const validDate = new Date(voucher.valid_until).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
  const greeting = voucher.recipient_name ? `Hallo ${voucher.recipient_name}` : 'Hallo'

  return {
    subject: `🎁 Ihr Gutschein über CHF ${voucher.amount_chf.toFixed(2)} – ${tenantName}`,
    html: `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Gutschein – ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Logo / Header -->
  <tr>
    <td align="center" style="padding-bottom:20px;">
      ${logo ? `<img src="${logo}" alt="${tenantName}" style="height:40px;width:auto;object-fit:contain;" />` : `<div style="font-size:20px;font-weight:800;color:${primary};">${tenantName}</div>`}
    </td>
  </tr>

  <!-- Hero card -->
  <tr>
    <td style="background:linear-gradient(135deg,${primary} 0%,${primary}cc 100%);border-radius:20px 20px 0 0;padding:40px 40px 32px;text-align:center;position:relative;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:white;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:20px;">GESCHENKGUTSCHEIN</div>
      <div style="color:white;font-size:60px;font-weight:900;line-height:1;letter-spacing:-2px;margin-bottom:8px;">
        <span style="font-size:26px;font-weight:600;vertical-align:top;margin-top:12px;display:inline-block;opacity:0.85;">CHF </span>${voucher.amount_chf.toFixed(2)}
      </div>
      <div style="color:rgba(255,255,255,0.8);font-size:15px;font-weight:500;">${voucher.name}</div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:white;border-radius:0 0 20px 20px;padding:32px 40px 36px;box-shadow:0 20px 40px rgba(0,0,0,0.08);">

      <!-- Greeting -->
      <p style="font-size:17px;font-weight:600;color:#1e293b;margin:0 0 6px;">${greeting}!</p>
      <p style="font-size:15px;color:#64748b;margin:0 0 28px;line-height:1.6;">Vielen Dank für deinen Kauf. Dein Gutschein ist sofort einsatzbereit – wir freuen uns auf dich!</p>

      <!-- Code box -->
      <div style="background:#f8fafc;border:2px solid ${primary}33;border-radius:14px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">Dein Gutscheincode</div>
        <div style="display:inline-block;background:${primary};color:white;font-family:'Courier New',monospace;font-size:24px;font-weight:800;letter-spacing:4px;padding:12px 24px;border-radius:10px;">${voucher.code}</div>
        <div style="margin-top:12px;font-size:13px;color:#64748b;">Gültig bis <strong style="color:#1e293b;">${validDate}</strong></div>
      </div>

      <!-- Steps -->
      <div style="background:linear-gradient(135deg,${primary}0d,${primary}06);border:1px solid ${primary}22;border-radius:14px;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${primary};margin-bottom:14px;">So löst du deinen Gutschein ein</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="text-align:center;vertical-align:top;padding:0 8px;">
              <div style="width:30px;height:30px;background:${primary};color:white;font-size:13px;font-weight:800;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;">1</div>
              <div style="font-size:12px;color:#64748b;line-height:1.5;">Termin online buchen oder Fahrschule kontaktieren</div>
            </td>
            <td width="33%" style="text-align:center;vertical-align:top;padding:0 8px;">
              <div style="width:30px;height:30px;background:${primary};color:white;font-size:13px;font-weight:800;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;">2</div>
              <div style="font-size:12px;color:#64748b;line-height:1.5;">Gutscheincode bei der Buchung eingeben</div>
            </td>
            <td width="33%" style="text-align:center;vertical-align:top;padding:0 8px;">
              <div style="width:30px;height:30px;background:${primary};color:white;font-size:13px;font-weight:800;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;">3</div>
              <div style="font-size:12px;color:#64748b;line-height:1.5;">Betrag wird automatisch abgezogen</div>
            </td>
          </tr>
        </table>
      </div>

      ${voucher.downloadUrl ? `
      <!-- Download button -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${voucher.downloadUrl}" style="display:inline-block;background:${primary};color:white;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">📄 Gutschein als PDF herunterladen</a>
        <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Das PDF ist als Anhang in dieser E-Mail enthalten</div>
      </div>` : ''}

      <!-- Terms -->
      <div style="border-top:1px solid #f1f5f9;padding-top:20px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.8;">
        Einmalig einlösbar · Nicht übertragbar · Keine Barauszahlung<br/>
        ${tenantName} · Bei Fragen einfach melden 🚗
      </div>

    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`,
    text: `Gutschein von ${tenantName}

${greeting}!

Dein Gutscheincode: ${voucher.code}
Betrag: CHF ${voucher.amount_chf.toFixed(2)}
Gültig bis: ${validDate}

So einlösen:
1. Termin buchen oder Fahrschule kontaktieren
2. Code bei der Buchung eingeben
3. Betrag wird automatisch abgezogen

${voucher.downloadUrl ? `PDF herunterladen: ${voucher.downloadUrl}\n` : ''}
${tenantName}`
  }
}
