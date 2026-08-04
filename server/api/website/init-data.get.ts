// server/api/website/init-data.get.ts
// Get comprehensive initial data from tenant for website builder
// Loads: tenant info, staff, categories, pricing, testimonials, FAQ, stats

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getTerminologyDefaults } from '~/composables/useTerminology'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabase = getSupabaseAdmin()

    // Get user profile to get tenant_id
    const { data: user } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!user?.tenant_id) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User or tenant not found'
      })
    }

    const tenant_id = user.tenant_id

    // ============ 1. GET TENANT INFO (ALL FIELDS) ============
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenant_id)
      .single()

    const { data: website } = await supabase
      .from('website_tenants')
      .select('id, subdomain, logo_url, hero_image_url, is_published')
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    // ============ 2. GET STAFF MEMBERS (for testimonials/team info) ============
    const { data: staffMembers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role')
      .eq('tenant_id', tenant_id)
      .eq('role', 'staff')
      .limit(5)

    // ============ 3. GET ALL CATEGORIES ============
    const { data: categories } = await supabase
      .from('categories')
      .select('id, code, name, parent_category_code')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('name')

    // ============ 4. GET PRICING RULES (services) ============
    const { data: pricing } = await supabase
      .from('pricing')
      .select('id, duration_minutes, price, category, tenant_id')
      .eq('tenant_id', tenant_id)
      .order('category')

    // ============ 5. GET TESTIMONIALS (5-star ratings) ============
    const { data: testimonials } = await supabase
      .from('appointments')
      .select(`
        id,
        rating,
        rating_text,
        customer_first_name,
        customer_last_name,
        customer_email,
        created_at,
        staff:users!staff_id(first_name, last_name)
      `)
      .eq('tenant_id', tenant_id)
      .eq('rating', 5)
      .not('rating_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // ============ 6. GET FAQ FROM APPOINTMENTS/NOTES ============
    // NOTE: notes table has no 'content' column – FAQ data not stored there
    const faqData: any[] = []

    // ============ 7. GET APPOINTMENT STATISTICS ============
    const { data: allAppointments, count: appointmentCount } = await supabase
      .from('appointments')
      .select('id, rating', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null)

    const avgRating = allAppointments?.length
      ? (allAppointments.reduce((sum: number, a: any) => sum + (a.rating || 0), 0) / allAppointments.length).toFixed(1)
      : 0

    const ratingDistribution = {
      five_star: allAppointments?.filter((a: any) => a.rating === 5).length || 0,
      four_star: allAppointments?.filter((a: any) => a.rating === 4).length || 0,
      three_star: allAppointments?.filter((a: any) => a.rating === 3).length || 0,
      total: allAppointments?.length || 0
    }

    // ============ 8. PREPARE SUGGESTED BIO (industry-aware) ============
    const terms = getTerminologyDefaults(tenant?.business_type)
    const city = tenant?.city ? ` in ${tenant.city}` : ''
    const suggestedBio =
      tenant?.description ||
      `${tenant?.name || terms.businessNoun}${city}: Online-Terminbuchung für ${terms.appointmentsPlural}, klare Preise und persönlicher Service.`

    const catName = new Map((categories || []).map((c: any) => [c.code, c.name]))

    // ============ 9. BUILD RESPONSE ============
    const logoUrl =
      website?.logo_url || tenant?.logo_url || tenant?.logo_square_url || null
    const heroImageUrl = website?.hero_image_url || null

    let googleReviewPlaces: Array<{ name?: string; place_id?: string }> = []
    try {
      const raw = (tenant as any)?.google_review_places
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) googleReviewPlaces = parsed
    } catch {
      googleReviewPlaces = []
    }

    return {
      success: true,
      data: {
        tenant: tenant || {},
        website: website || null,
        branding: {
          logo_url: logoUrl,
          hero_image_url: heroImageUrl,
        },
        google_reviews: {
          enabled: googleReviewPlaces.some((p) => p?.place_id),
          places: googleReviewPlaces,
        },
        terminology: terms,
        staff: (staffMembers || []).map((s: any) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          email: s.email,
          phone: s.phone
        })),
        categories: (categories || []).map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          parent: c.parent_category_code
        })),
        services: (pricing || []).map((p: any) => ({
          id: p.id,
          name: catName.get(p.category) || p.category || 'Angebot',
          duration_minutes: p.duration_minutes,
          price: p.price,
          category: p.category
        })),
        testimonials: (testimonials || []).map((t: any) => ({
          id: t.id,
          author: t.customer_first_name && t.customer_last_name
            ? `${t.customer_first_name} ${t.customer_last_name}`
            : terms.client,
          rating: t.rating,
          text: t.rating_text,
          instructor: t.staff?.first_name ? `${t.staff.first_name} ${t.staff.last_name}` : '',
          created_at: t.created_at
        })),
        faq: (faqData || []).map((f: any) => ({
          id: f.id,
          content: f.content
        })),
        stats: {
          avg_rating: parseFloat(avgRating as any),
          total_appointments: appointmentCount || 0,
          total_testimonials: (testimonials || []).length,
          rating_distribution: ratingDistribution
        },
        suggestions: {
          bio: suggestedBio,
          headline: `Online-Terminbuchung für ${terms.appointmentsPlural}`,
          cta_text: terms.bookAction,
          seo_title: `Online-Terminbuchung ${tenant?.name || ''}${city}`.trim().slice(0, 60),
          seo_description: `${tenant?.name || terms.businessNoun}: ${terms.bookAction} online${city}. Erinnerungen, klare Preise, Schweizer Service.`.slice(0, 160),
          seo_keywords: `online terminbuchung, ${terms.bookAction.toLowerCase()}, ${terms.businessNoun.toLowerCase()}, buchungssystem schweiz`
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Website init-data error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to load website data'
    })
  }
})
