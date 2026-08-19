/**
 * Atomically allocate the next quote number for a tenant (OF-YYYY-0001).
 */
export async function allocateQuoteNumber(
  supabase: { rpc: Function },
  tenantId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('allocate_quote_number', {
    p_tenant_id: tenantId,
  })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to allocate quote number')
  }

  return String(data)
}
