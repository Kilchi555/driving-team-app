export type AppointmentEmailCtaType =
  | 'appointment_confirmation'
  | 'pending_payment'
  | 'cancelled'
  | 'rescheduled'
  | 'staff_new_booking'

export interface AppointmentEmailCta {
  href: string
  label: string
  leadIn: string
}

function bookingUrl(slug?: string | null): string | null {
  const trimmed = (slug || '').trim()
  if (!trimmed) return null
  return `https://app.simy.ch/booking/availability/${encodeURIComponent(trimmed)}`
}

function accountUrl(slug?: string | null, customerDashboard?: string | null): string {
  if (customerDashboard) return customerDashboard
  if (slug) return `https://app.simy.ch/${slug}`
  return 'https://app.simy.ch/login'
}

/**
 * CTA for customer appointment emails.
 * Account tenants keep login / pay buttons. Tenants without customer login
 * get a public booking button instead of a dead login link.
 */
export function resolveAppointmentEmailCta(opts: {
  type: AppointmentEmailCtaType
  omitAccountCta?: boolean
  tenantSlug?: string | null
  customerDashboard?: string | null
  showPrice?: boolean
  isLessonType?: boolean
  appointmentNoun?: string
}): AppointmentEmailCta | null {
  const noun = (opts.appointmentNoun || 'Termin').trim() || 'Termin'

  if (!opts.omitAccountCta) {
    const href = accountUrl(opts.tenantSlug, opts.customerDashboard)
    if (opts.type === 'appointment_confirmation') {
      if (opts.showPrice !== false) {
        return {
          href,
          label: 'Jetzt bezahlen',
          leadIn: 'Überprüfe die Zahlungsdetails in deinem Kundenkonto.',
        }
      }
      if (opts.isLessonType === false) return null
      return { href, label: 'Zum Kundenkonto', leadIn: '' }
    }
    if (opts.type === 'pending_payment') {
      return {
        href,
        label: 'Zum Kundenkonto',
        leadIn: 'Bitte bezahle die offene Zahlung in deinem Kundenkonto.',
      }
    }
    if (opts.type === 'cancelled') {
      return {
        href,
        label: 'Zum Kundenkonto',
        leadIn: `Falls du Fragen hast oder einen neuen ${noun} buchen möchtest, besuche einfach dein Kundenkonto.`,
      }
    }
    if (opts.type === 'rescheduled') {
      return {
        href,
        label: 'Zum Kundenkonto',
        leadIn: `Bitte merke dir den neuen ${noun}. Du findest ihn auch in deinem Kundenkonto.`,
      }
    }
    return null
  }

  const href = bookingUrl(opts.tenantSlug)
  if (!href) return null

  if (opts.type === 'cancelled') {
    return {
      href,
      label: `Neuen ${noun} buchen`,
      leadIn: `Falls du einen neuen ${noun} möchtest, kannst du direkt online buchen.`,
    }
  }

  if (opts.type === 'rescheduled') {
    return {
      href,
      label: `Weiteren ${noun} buchen`,
      leadIn: `Bitte merke dir den neuen ${noun}. Weitere Termine kannst du online buchen.`,
    }
  }

  if (opts.type === 'appointment_confirmation' || opts.type === 'pending_payment') {
    return {
      href,
      label: `Weiteren ${noun} buchen`,
      leadIn: `Weitere ${noun === 'Termin' ? 'Termine' : noun} kannst du online buchen.`,
    }
  }

  return null
}

export function appointmentEmailCtaHtml(
  cta: AppointmentEmailCta | null,
  primaryColor: string
): string {
  if (!cta) return ''
  const lead = cta.leadIn
    ? `<p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">${cta.leadIn}</p>`
    : ''
  return `${lead}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${cta.href}" style="background-color: ${primaryColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">${cta.label}</a>
              </div>`
}
