// server/api/website/wizard-save.post.ts
// Save website setup from wizard

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)
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

  // Get or create website
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!website) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Website not found'
    })
  }

  // Update website settings
  const { error: updateError } = await supabase
    .from('website_tenants')
    .update({
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      seo_keywords: body.seo_keywords
    })
    .eq('id', website.id)

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: updateError.message
    })
  }

  // Get home page and update blocks
  const { data: pages } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .single()

  if (pages) {
    // Create hero block
    await supabase.from('website_content_blocks').insert({
      page_id: pages.id,
      block_type: 'hero',
      block_order: 0,
      content: {
        headline: body.name + ' - Fahrschule & Fahrunterricht',
        subheadline: body.bio,
        cta_primary_text: 'Jetzt buchen',
        cta_primary_url: '/book'
      }
    })

    // Create services block
    if (body.serviceDescriptions && Object.keys(body.serviceDescriptions).length > 0) {
      await supabase.from('website_content_blocks').insert({
        page_id: pages.id,
        block_type: 'services',
        block_order: 1,
        content: {
          title: 'Meine Fahrstunden',
          description: 'Hochwertige Fahrausbildung mit modernen Fahrzeugen',
          services: []
        }
      })
    }

    // Create testimonials block if selected
    if (body.selectedTestimonials?.length > 0) {
      await supabase.from('website_content_blocks').insert({
        page_id: pages.id,
        block_type: 'testimonials',
        block_order: 2,
        content: {
          title: 'Das sagen meine Schüler',
          description: 'Echte Bewertungen von Fahrschülern',
          testimonials: []
        }
      })
    }

    // Create CTA block
    await supabase.from('website_content_blocks').insert({
      page_id: pages.id,
      block_type: 'cta',
      block_order: 3,
      content: {
        headline: 'Bereit für deine Fahrprüfung?',
        subheadline: 'Vereinbare einen Termin und starte deine Ausbildung',
        cta_text: 'Jetzt Fahrstunde buchen',
        cta_url: '/book'
      }
    })
  }

  return {
    success: true,
    message: 'Website setup completed',
    website_id: website.id
  }
})
