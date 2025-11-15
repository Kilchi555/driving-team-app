export default defineEventHandler(async (event) => {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    
    const now = new Date().toISOString()
    
    // Update all pendent and in_bearbeitung tasks that are past their due date
    const { error } = await supabaseAdmin
      .from('pendencies')
      .update({ 
        status: 'überfällig',
        updated_at: now
      })
      .lt('due_date', now)
      .in('status', ['pendent', 'in_bearbeitung'])
      .is('deleted_at', null)
    
    if (error) throw error
    
    return {
      success: true,
      message: 'Overdue pendencies updated successfully'
    }
  } catch (err: any) {
    console.error('❌ Error updating overdue pendencies:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update overdue pendencies',
      data: { error: err.message }
    })
  }
})

