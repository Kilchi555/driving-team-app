/**
 * Atomically allocate the next correspondence reference (BR-YYYY-NNNN) for a tenant.
 * Relies on DB function public.allocate_correspondence_number(uuid).
 */
export async function allocateCorrespondenceNumber(
  supabase: { rpc: Function },
  tenantId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('allocate_correspondence_number', {
    p_tenant_id: tenantId,
  })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to allocate correspondence number')
  }

  return String(data)
}
