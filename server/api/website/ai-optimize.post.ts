// server/api/website/ai-optimize.post.ts
// Generate AI optimization suggestions using Claude

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
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
      model: 'claude-3-5-sonnet-20241022',
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
    await supabase.from('website_ai_history').insert({
      website_id: user.website_id,
      content_type,
      original_content: content,
      ai_suggestions: suggestions,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      optimization_type
    })

    return {
      success: true,
      suggestions,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens
    }
  } catch (error: any) {
    console.error('Claude API error:', error)
    throw createError({
      statusCode: 500,
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

Current content to optimize:
"${content}"

Content type: ${contentType}
Optimization focus: ${optimizationType}

Generate 3-4 alternative versions of this content that are optimized for ${optimizationType}.

${
  optimizationType === 'seo'
    ? `Include relevant keywords that potential students would search for (e.g., "Fahrschule", "Fahrausbildung", "Führerschein", etc.).
Focus on:
- Clear, specific language
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
- Strong call-to-action
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
- Use power words and action verbs`
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
