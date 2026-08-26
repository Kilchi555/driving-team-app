import { normalizeVatRate, splitGrossVat } from '~/utils/vat'
import { getTenantDefaultVatRate } from '~/server/utils/invoice-vat'

export type WalleeTaxedLineItem = {
  name: string
  quantity: number
  amountIncludingTax: number
  uniqueId: string
  taxRate: number
  sku?: string
}

export type CheckoutVat = {
  vatRate: number
  vatAmountRappen: number
  netRappen: number
  grossRappen: number
}

export async function loadCheckoutVat(
  supabase: { from: (table: string) => any },
  tenantId: string,
  grossRappen: number,
): Promise<CheckoutVat> {
  const vatRate = await getTenantDefaultVatRate(supabase, tenantId)
  const split = splitGrossVat(grossRappen, vatRate)
  return {
    vatRate: split.rate,
    vatAmountRappen: split.vat,
    netRappen: split.net,
    grossRappen: split.gross,
  }
}

export function buildWalleeTaxedLineItem(opts: {
  name: string
  amountIncludingTaxChf: number
  vatRatePercent: number
  uniqueId?: string
  quantity?: number
  sku?: string
}): WalleeTaxedLineItem {
  const quantity = Math.max(1, Number(opts.quantity) || 1)
  const line: WalleeTaxedLineItem = {
    name: (opts.name || 'Position').slice(0, 150),
    quantity,
    amountIncludingTax: Number(opts.amountIncludingTaxChf) || 0,
    uniqueId: opts.uniqueId || 'item-1',
    taxRate: normalizeVatRate(opts.vatRatePercent),
  }
  if (opts.sku) line.sku = opts.sku
  return line
}

export function mergeVatIntoMetadata(
  existing: Record<string, unknown> | null | undefined,
  vat: Pick<CheckoutVat, 'vatRate' | 'vatAmountRappen'>,
): Record<string, unknown> {
  return {
    ...(existing && typeof existing === 'object' ? existing : {}),
    vat_rate: vat.vatRate,
    vat_amount_rappen: vat.vatAmountRappen,
  }
}
