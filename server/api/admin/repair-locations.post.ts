export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id, dry_run } = body || {}

    if (!tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
    }

    const supabase = getSupabase()

    // Find affected rows: staff_id != created_for_staff_id but created_for_staff_id is set
    const { data: affected, error: selErr } = await supabase
      .from('locations')
      .select('id, staff_id, created_for_staff_id')
      .eq('tenant_id', tenant_id)
      .eq('location_type', 'standard')
      .not('created_for_staff_id', 'is', null)
      .neq('staff_id', 'created_for_staff_id')

    if (selErr) {
      throw createError({ statusCode: 500, statusMessage: `Select failed: ${selErr.message}` })
    }

    if (dry_run || !affected || affected.length === 0) {
      return { success: true, repaired: 0, affected: affected?.length || 0, dry_run: !!dry_run }
    }

    // Update in batches
    let repaired = 0
    for (const row of affected) {
      const { error: updErr } = await supabase
        .from('locations')
        .update({ staff_id: row.created_for_staff_id })
        .eq('id', row.id)
        .eq('tenant_id', tenant_id)
        .eq('location_type', 'standard')

      if (updErr) {
        throw createError({ statusCode: 500, statusMessage: `Update failed for ${row.id}: ${updErr.message}` })
      }
      repaired += 1
    }

    return { success: true, repaired, affected: affected.length }
  } catch (error: any) {
    console.error('repair-locations error:', error)
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Internal server error' })
  }
})


