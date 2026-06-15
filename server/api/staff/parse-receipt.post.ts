import { defineEventHandler, createError, readBody } from 'h3'
import OpenAI from 'openai'
import { getAuthenticatedUser } from '~/server/utils/auth'

export interface ReceiptParseResult {
  amount_chf: number | null
  date: string | null        // ISO YYYY-MM-DD
  merchant: string | null
  confidence: 'high' | 'medium' | 'low'
}

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { receipt_url } = await readBody<{ receipt_url: string }>(event)
  if (!receipt_url) {
    throw createError({ statusCode: 400, statusMessage: 'receipt_url is required' })
  }

  const apiKey = process.env.NUXT_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'OpenAI API key not configured' })
  }

  const client = new OpenAI({ apiKey })

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract structured data from receipt/invoice images. 
Return a JSON object with exactly these fields:
- amount_chf: the total amount paid as a number (e.g. 12.50). Use null if not found.
- date: the receipt date as YYYY-MM-DD string. Use null if not found.
- merchant: the store/merchant name as a short string. Use null if not found.
- confidence: "high" if you found both amount and date clearly, "medium" if one is uncertain, "low" if little data found.
Only return the JSON, no explanation.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: receipt_url, detail: 'low' },
          },
          {
            type: 'text',
            text: 'Extract the total amount, date, and merchant from this receipt.',
          },
        ],
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  let parsed: ReceiptParseResult
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to parse OCR response' })
  }

  return {
    success: true,
    data: {
      amount_chf: typeof parsed.amount_chf === 'number' ? parsed.amount_chf : null,
      date: typeof parsed.date === 'string' ? parsed.date : null,
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      confidence: parsed.confidence ?? 'low',
    } satisfies ReceiptParseResult,
  }
})
