/**
 * Swiss consumer prices are gross (inkl. MWST).
 * VAT is extracted from the charged amount — never added on top.
 */

export type GrossVatSplit = {
  net: number
  vat: number
  gross: number
  rate: number
}

export function normalizeVatRate(rate: number | null | undefined): number {
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 1000) / 1000
}

/** VAT included in a gross (inkl.) amount, e.g. 18000 @ 8.1% → 1349. */
export function vatIncludedInGross(grossRappen: number, vatRatePercent: number): number {
  return splitGrossVat(grossRappen, vatRatePercent).vat
}

export function splitGrossVat(
  grossRappen: number,
  vatRatePercent: number,
): GrossVatSplit {
  const gross = Math.max(0, Math.round(Number(grossRappen) || 0))
  const rate = normalizeVatRate(vatRatePercent)
  if (gross <= 0 || rate <= 0) {
    return { net: gross, vat: 0, gross, rate }
  }
  const vat = Math.round(gross - gross / (1 + rate / 100))
  const safeVat = vat > gross ? 0 : vat
  return { net: gross - safeVat, vat: safeVat, gross, rate }
}

/** Invoice header from a charged (gross) amount. Total stays the charged price. */
export function invoiceTotalsInclusive(
  grossRappen: number,
  vatRatePercent: number,
  discountRappen = 0,
): {
  subtotal_rappen: number
  vat_amount_rappen: number
  total_amount_rappen: number
  vat_rate: number
} {
  const discount = Math.max(0, Math.round(Number(discountRappen) || 0))
  const payable = Math.max(0, Math.round(Number(grossRappen) || 0) - discount)
  const split = splitGrossVat(payable, vatRatePercent)
  return {
    subtotal_rappen: split.net,
    vat_amount_rappen: split.vat,
    total_amount_rappen: split.gross,
    vat_rate: split.rate,
  }
}
