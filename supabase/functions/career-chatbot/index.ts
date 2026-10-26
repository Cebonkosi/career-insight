// Career Compass — server-side chatbot edge function.
// Holds ANTHROPIC_API_KEY secret; the client never sees it (see src/lib/integrations.js).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MODEL = 'claude-opus-5'
const ANTHROPIC_VERSION = '2023-06-01'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are Career Compass, a friendly career guidance assistant inside Career Insight, an app for South African Grade 8–12 students.

You understand the South African education system: the National Senior Certificate (NSC), Admission Point Score (APS) calculations, the difference between universities and TVET colleges, and common subject choices (Mathematics vs Mathematical Literacy, Physical Sciences, Life Sciences, etc).

When a student asks about careers:
- Ask about their grade, favourite subjects, and interests if you don't already know them.
- Use the list_careers and get_career tools to ground your answers in real data from the app — don't invent careers, salaries, or subject requirements.
- Explain roadmaps, required subjects, qualifications, salary ranges, and demand levels in a clear, encouraging, teen-appropriate tone.
- Keep answers concise and use markdown formatting (short paragraphs, bullet lists) for readability.`

const TOOLS = [
  {
    name: 'list_careers',
    description: 'List published careers, optionally filtered by category or a keyword search on title/description.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description:
            'One of: science_technology, healthcare, business_finance, arts_creative, engineering, education, law_government, agriculture_environment, trades_services, media_communication',
        },
        search: { type: 'string', description: 'Keyword to search career titles/descriptions' },
      },
    },
  },
  {
    name: 'get_career',
    description: 'Get full details for one career by its id, including the roadmap.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { messages, studentContext } = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const contextLine = studentContext
      ? `\n\nStudent context: grade ${studentContext.grade ?? 'unknown'}, subjects: ${(studentContext.subjects ?? []).join(', ') || 'unknown'}, interests: ${(studentContext.interests ?? []).join(', ') || 'unknown'}.`
      : ''

    const anthropicMessages = messages.map((m) => ({ role: m.role, content: m.content }))

    let reply = ''
    for (let turn = 0; turn < 5; turn++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT + contextLine,
          tools: TOOLS,
          messages: anthropicMessages,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
      }

      const data = await response.json()
      const toolUseBlocks = data.content.filter((b) => b.type === 'tool_use')

      if (data.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
        reply = data.content.find((b) => b.type === 'text')?.text ?? ''
        break
      }

      anthropicMessages.push({ role: 'assistant', content: data.content })

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          try {
            const result = await runTool(supabase, block.name, block.input)
            return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) }
          } catch (error) {
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: String(error?.message ?? error),
              is_error: true,
            }
          }
        })
      )

      anthropicMessages.push({ role: 'user', content: toolResults })
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
})

async function runTool(supabase, name, input) {
  if (name === 'list_careers') {
    let query = supabase.from('careers').select('id, title, category, demand_level, description').eq('status', 'published')
    if (input.category) query = query.eq('category', input.category)
    if (input.search) query = query.ilike('title', `%${input.search}%`)
    const { data, error } = await query.limit(10)
    if (error) throw error
    return data
  }

  if (name === 'get_career') {
    const { data, error } = await supabase.from('careers').select('*').eq('id', input.id).single()
    if (error) throw error
    return data
  }

  throw new Error(`Unknown tool: ${name}`)
}
