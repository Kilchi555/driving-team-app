// server/api/website/init-data.get.ts
// Get comprehensive initial data from tenant for website builder
// Loads: tenant info, staff, categories, pricing, testimonials, FAQ, stats

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { filterLeafCategories } from '~/server/utils/category-groups'
import { loadWebsiteServices } from '~/server/utils/website-services'
import { hasUsableGoogleReviews, usableGoogleReviewPlaces } from '~/utils/website-google-reviews'
import { loadWebsitePublicLocations } from '~/server/utils/website-public-tenant'

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
      .select('id, subdomain, logo_url, hero_image_url, is_published, wizard_draft')
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    let formalAddress: 'sie' | 'du' = 'sie'
    let existingSeo: { title?: string; description?: string; keywords?: string } | null = null
    let landingServiceDescriptions: Record<string, string> = {}
    let landingTestimonials: Array<{ id: string; author: string; text: string; rating: number }> = []
    let landingExtraServices: any[] = []
    let landingExtraProducts: any[] = []
    let landingUsps: string[] = []
    let landingTeam: any[] = []
    let landingMeetingPoints: any[] = []
    let contactChannels: { phone: boolean; email: boolean; whatsapp: boolean; form: boolean } | null =
      null
    if (website?.id) {
      const { data: homePage } = await supabase
        .from('website_pages')
        .select('blocks, seo_title, seo_description, seo_keywords')
        .eq('website_id', website.id)
        .eq('is_home', true)
        .maybeSingle()
      const landing = homePage?.blocks as any
      if (landing?.brand?.formal_address === 'du') formalAddress = 'du'
      if (landing?.seo || homePage?.seo_title) {
        existingSeo = {
          title: landing?.seo?.title || homePage?.seo_title || undefined,
          description: landing?.seo?.description || homePage?.seo_description || undefined,
          keywords: landing?.seo?.keywords || homePage?.seo_keywords || undefined,
        }
      }
      const servicesBlock = Array.isArray(landing?.blocks)
        ? landing.blocks.find((b: any) => b?.type === 'services')
        : null
      const listed = servicesBlock?.content?.services
      if (Array.isArray(listed)) {
        for (const s of listed) {
          if (s?.id && typeof s.description === 'string' && s.description.trim()) {
            landingServiceDescriptions[String(s.id)] = s.description
          }
          if (s?.id && String(s.id).startsWith('extra-')) {
            const cents = Number(s.price_cents)
            landingExtraServices.push({
              id: String(s.id),
              name: String(s.name || ''),
              duration_minutes: s.duration_minutes ?? null,
              price_chf: Number.isFinite(cents) ? Math.round(cents / 100) : null,
              description: String(s.description || ''),
              image_url: s.image_url || null,
            })
          }
        }
      }
      const productsBlock = Array.isArray(landing?.blocks)
        ? landing.blocks.find((b: any) => b?.type === 'products')
        : null
      const listedProducts = productsBlock?.content?.products
      if (Array.isArray(listedProducts)) {
        for (const p of listedProducts) {
          const custom =
            p?.source === 'custom' ||
            String(p?.id || '').startsWith('product-') ||
            String(p?.id || '').startsWith('wiz-product-')
          if (!custom) continue
          const cents = Number(p.price_cents)
          landingExtraProducts.push({
            id: String(p.id),
            name: String(p.name || ''),
            price_chf: Number.isFinite(cents) ? Math.round(cents / 100) : null,
            description: String(p.description || ''),
            image_url: p.image_url || null,
          })
        }
      }
      if (Array.isArray(landing?.brand?.usps)) {
        landingUsps = landing.brand.usps.map((u: any) => String(u || '').trim()).filter(Boolean)
      }
      if (Array.isArray(landing?.brand?.website_team)) {
        landingTeam = landing.brand.website_team
      } else {
        const teamBlock = Array.isArray(landing?.blocks)
          ? landing.blocks.find((b: any) => b?.type === 'team')
          : null
        if (Array.isArray(teamBlock?.content?.members)) landingTeam = teamBlock.content.members
      }
      const testimonialsBlock = Array.isArray(landing?.blocks)
        ? landing.blocks.find((b: any) => b?.type === 'testimonials')
        : null
      const baked = testimonialsBlock?.content?.testimonials
      if (Array.isArray(baked)) {
        landingTestimonials = baked
          .filter((t: any) => t?.text)
          .map((t: any, i: number) => ({
            id: String(t.id || `landing-${i}`),
            author: String(t.author || 'Kunde'),
            text: String(t.text),
            rating: Number(t.rating) || 5,
          }))
      }
      const contactBlock = Array.isArray(landing?.blocks)
        ? landing.blocks.find((b: any) => b?.type === 'contact')
        : null
      const ch = contactBlock?.content?.channels
      if (ch && typeof ch === 'object') {
        contactChannels = {
          phone: ch.phone !== false,
          email: ch.email !== false,
          whatsapp: ch.whatsapp !== false,
          form: ch.form !== false && contactBlock?.content?.form_enabled !== false,
        }
      } else if (contactBlock?.content) {
        contactChannels = {
          phone: !!contactBlock.content.phone,
          email: !!contactBlock.content.email,
          whatsapp: !!contactBlock.content.whatsapp_url,
          form: contactBlock.content.form_enabled !== false,
        }
      }
      if (Array.isArray(contactBlock?.content?.meeting_points)) {
        landingMeetingPoints = contactBlock.content.meeting_points
      }
    }

    // ============ 2. GET STAFF MEMBERS (for testimonials/team info) ============
    const { data: staffMembers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, is_active')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .in('role', ['staff', 'admin'])
      .limit(12)

    let publicLocations: Awaited<ReturnType<typeof loadWebsitePublicLocations>> = []
    try {
      publicLocations = await loadWebsitePublicLocations(supabase, tenant_id)
    } catch {
      publicLocations = []
    }

    // ============ 3. GET ALL CATEGORIES ============
    const { data: categories } = await supabase
      .from('categories')
      .select('id, code, name, parent_category_id')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('name')

    // ============ 4. GET PRICING RULES (services) ============
    const services = await loadWebsiteServices(supabase, tenant_id)

    let catalogProducts: Array<{
      id: string
      name: string
      description: string
      price_chf: number | null
      category: string | null
    }> = []
    try {
      const { loadWebsiteCatalogProducts } = await import('~/server/utils/website-products')
      catalogProducts = (await loadWebsiteCatalogProducts(supabase, tenant_id)).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price_chf: p.price_cents != null ? Math.round(p.price_cents / 100) : null,
        category: p.category,
      }))
    } catch {
      catalogProducts = []
    }

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

    const allCategories = categories || []
    // Same leaf rule as booking/staff pickers: hide mains that already have subs
    const leafCategories = filterLeafCategories(allCategories)

    // ============ 8. PREPARE SUGGESTED BIO (industry-aware local SEO) ============
    const terms = getTerminologyDefaults(tenant?.business_type)
    const { buildLocalSeoDefaults, resolveWebsiteCity } = await import('~/server/utils/website-local-seo')
    const leafNames = leafCategories.map((c: any) => c.name).filter(Boolean)
    const localSeo = buildLocalSeoDefaults({
      name: tenant?.name || '',
      business_type: tenant?.business_type,
      city: resolveWebsiteCity(tenant) || null,
      address: tenant?.address || null,
      categories: leafNames,
      formal_address: formalAddress,
    })
    const suggestedBio = tenant?.description || localSeo.bio

    // ============ 9. BUILD RESPONSE ============
    const logoUrl =
      website?.logo_url || tenant?.logo_url || tenant?.logo_square_url || null
    const heroImageUrl = website?.hero_image_url || null

    const googleReviewPlaces = usableGoogleReviewPlaces((tenant as any)?.google_review_places, {
      subdomain: website?.subdomain || tenant?.slug,
      name: tenant?.name,
    })

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
          enabled: hasUsableGoogleReviews((tenant as any)?.google_review_places, {
            subdomain: website?.subdomain || tenant?.slug,
            name: tenant?.name,
          }),
          places: googleReviewPlaces,
        },
        terminology: terms,
        staff: (staffMembers || []).map((s: any) => ({
          id: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          email: s.email,
          phone: s.phone,
          role: s.role,
        })),
        locations: publicLocations.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address || '',
          city: l.city || '',
        })),
        extra_services: landingExtraServices,
        extra_products: landingExtraProducts,
        products: catalogProducts,
        usps: landingUsps,
        landing_team: landingTeam,
        meeting_points: landingMeetingPoints,
        categories: leafCategories.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          parent: c.parent_category_id
        })),
        services,
        service_descriptions: landingServiceDescriptions,
        landing_testimonials: landingTestimonials,
        contact_channels: contactChannels,
        wizard_draft: (website as any)?.wizard_draft || {},
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
          headline: localSeo.headline,
          cta_text: terms.bookAction,
          seo_title: (existingSeo?.title || localSeo.title).slice(0, 60),
          seo_description: (existingSeo?.description || localSeo.description).slice(0, 160),
          seo_keywords: existingSeo?.keywords || localSeo.keywords,
          formal_address: formalAddress,
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
