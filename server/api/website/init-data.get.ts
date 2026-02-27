// server/api/website/init-data.get.ts
// Get initial data from tenant (services, testimonials, etc.)

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = getSupabaseAdmin()

  // Get services
  const { data: services } = await supabase
    .from('pricing')
    .select('id, duration_minutes, price, category')
    .eq('tenant_id', user.tenant_id)
    .order('duration_minutes', { ascending: true })
    .limit(10)

  // Get top testimonials
  const { data: testimonials } = await supabase
    .from('appointments')
    .select('id, rating, rating_text, student_name, created_at')
    .eq('staff_id', user.tenant_id)
    .eq('rating', 5)
    .order('created_at', { ascending: false })
    .limit(8)

  // Get stats
  const { data: stats } = await supabase
    .from('appointments')
    .select('rating', { count: 'exact' })
    .eq('staff_id', user.tenant_id)

  const avgRating = stats?.length
    ? (stats.reduce((sum: number, s: any) => sum + (s.rating || 0), 0) / stats.length).toFixed(1)
    : 0

  return {
    success: true,
    services: (services || []).map((s: any) => ({
      id: s.id,
      name: `Fahrstunde ${s.duration_minutes} Min`,
      duration_minutes: s.duration_minutes,
      price: s.price,
      category: s.category
    })),
    testimonials: testimonials || [],
    stats: {
      avg_rating: avgRating,
      total_reviews: stats?.length || 0
    }
  }
})
