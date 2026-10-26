// Transactional email — sends via Resend. Holds RESEND_API_KEY secret; the
// client never sees it (see src/lib/integrations.js SendEmail).
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Career Insight <onboarding@resend.dev>'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { to, subject, html, text } = await req.json()
    if (!to || !subject || (!html && !text)) {
      throw new Error('to, subject, and html or text are required')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Resend API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
})
