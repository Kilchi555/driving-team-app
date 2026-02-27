// server/api/website/ai-optimize.post.ts
// Generate AI optimization suggestions using Claude

import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const client = new Anthropic()

// Use latest Claude Haiku model for cost efficiency
// claude-haiku-4-5 is the current latest Haiku version (replacing deprecated 3.5)
const AI_MODEL = 'claude-haiku-4-5'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { content, content_type, optimization_type } = await readBody(event)

  if (!content || content.length < 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content must be at least 5 characters long'
    })
  }

  const prompt = buildOptimizationPrompt(
    content,
    content_type,
    optimization_type
  )

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''
    const suggestions = parseAIResponse(responseText)

    // Log for analytics
    const supabase = getSupabaseAdmin()
    
    // Get user profile to get website_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfile?.id) {
      await supabase.from('website_ai_history').insert({
        tenant_id: userProfile.tenant_id,
        content_type,
        original_content: content,
        ai_suggestions: suggestions,
        tokens_used: message.usage.input_tokens + message.usage.output_tokens,
        optimization_type
      })
    }

    return {
      success: true,
      suggestions,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    }
  } catch (error: any) {
    console.error('Claude API error:', error)
    
    // Graceful fallback for API errors (no credits, rate limit, etc.)
    if (error.status === 400 || error.status === 429 || error.status === 503) {
      console.warn('⚠️ Claude API unavailable, using fallback suggestions')
      
      return {
        success: true,
        suggestions: generateFallbackSuggestions(content, optimization_type),
        tokens_used: 0,
        fallback: true,
        message: 'AI service temporarily unavailable. Showing placeholder suggestions.'
      }
    }
    
    throw createError({
      statusCode: error.status || 500,
      statusMessage: 'AI optimization failed: ' + error.message
    })
  }
})

function buildOptimizationPrompt(
  content: string,
  contentType: string,
  optimizationType: string
): string {
  const basePrompt = `You are an expert SEO copywriter and marketing specialist for driving schools and coaching services in German-speaking countries.

IMPORTANT INSTRUCTIONS:
- Write ONLY in Swiss/German High German (Schweizer Hochdeutsch)
- Use professional but friendly tone
- Always use "Sie" for formal address, not "du"
- Use Swiss terminology where appropriate (e.g., "Fahrschule" instead of "Fahrschule")
- Keep language simple and clear, no jargon
- Write as if you are communicating with potential driving students in Switzerland

Current content to optimize:
"${content}"

Content type: ${contentType}
Optimization focus: ${optimizationType}

Generate EXACTLY 3 alternative versions of this content that are optimized for ${optimizationType}.

${
  optimizationType === 'seo'
    ? `Include relevant keywords that potential students would search for (e.g., "Fahrschule", "Fahrausbildung", "Führerschein", etc.).
Focus on:
- Clear, specific language in Swiss German
- Local SEO keywords if applicable
- Proper headline structure
- Include call-to-action
- Length guidelines: titles 50-60 chars, descriptions 150-160 chars`
    : ''
}

${
  optimizationType === 'conversion'
    ? `Make it more persuasive and action-oriented:
- Include unique value proposition
- Address customer pain points
- Strong call-to-action (use Sie form)
- Trust signals (experience, qualifications, success rate)
- Emotional benefits, not just features`
    : ''
}

${
  optimizationType === 'readability'
    ? `Make it easier to understand and scan:
- Shorter sentences (15-20 words max)
- Remove jargon
- Use active voice
- Break into logical sections
- Use power words and action verbs
- Keep Swiss German terminology consistent`
    : ''
}

For each version, provide:
1. The optimized text
2. A brief explanation (1-2 sentences) why it is better
3. An SEO effectiveness score from 1-10 (for SEO optimization) or conversion potential score (for conversion) or readability score (for readability)

Format your response ONLY as valid JSON:
{
  "suggestions": [
    {
      "suggestion": "...",
      "reason": "...",
      "score": 8
    }
  ]
}`

  return basePrompt
}

function parseAIResponse(response: string): any[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response:', response)
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    return (parsed.suggestions || []).map((s: any) => ({
      suggestion: s.suggestion || '',
      reason: s.reason || '',
      score: s.score || 5
    }))
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    return []
  }
}

function generateFallbackSuggestions(content: string, optimizationType: string): any[] {
  // Generate basic suggestions when Claude API is unavailable
  const fallbackSuggestions = [
    {
      suggestion: content.length > 100 ? content.substring(0, 100) + '...' : content,
      reason: 'Original content - Claude API temporarily unavailable',
      score: 5
    }
  ]

  if (optimizationType === 'seo') {
    fallbackSuggestions.push({
      suggestion: `Professionelle ${content.substring(0, 30)}...`,
      reason: 'Add professional prefix for SEO - helps with keyword targeting',
      score: 6
    })
  } else if (optimizationType === 'conversion') {
    fallbackSuggestions.push({
      suggestion: `Jetzt ${content.substring(0, 30)}... - Kostenlos testen!`,
      reason: 'Add CTA - encourages immediate action from potential customers',
      score: 6
    })
  } else if (optimizationType === 'readability') {
    fallbackSuggestions.push({
      suggestion: content.replace(/\. /g, '.\n'),
      reason: 'Break into shorter sentences for better readability',
      score: 6
    })
  }

  return fallbackSuggestions
}
