/**
 * Atomically allocate the next invoice number for a tenant.
 * Relies on DB function public.allocate_invoice_number(uuid).
 */
export async function allocateInvoiceNumber(
  supabase: { rpc: Function },
  tenantId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('allocate_invoice_number', {
    p_tenant_id: tenantId,
  })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to allocate invoice number')
  }

  return String(data)
}
