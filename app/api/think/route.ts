export const maxDuration = 60

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json()

    const systemPrompt = `You are the AI co-thinker in a personal thinking engine app. 
Your goal is to challenge the user's assumptions, find hidden patterns, and help them refine their ideas. 
DO NOT act like a generic assistant. Be concise, sharp, and insightful. Treat the user as an equal. 
Respond in plain text (no markdown formatting like **bold** or bullet points, just clean paragraphs) because your response will be rendered as a note in the interface.`

    const userMessage = `Here is the user's current context (their recent thoughts and canvas items):
${context ? context : '(No recent context available)'}

User's prompt/question: ${prompt}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nousresearch/hermes-3-llama-3.1-405b:free', // Requested by user
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true,
        temperature: 0.6,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    // Pass the stream straight through but transform OpenRouter SSE format to our app's SSE format
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
            controller.close()
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine.startsWith('data: ')) continue
            
            const dataStr = trimmedLine.slice(6).trim()
            if (dataStr === '[DONE]') continue
            
            try {
              const data = JSON.parse(dataStr)
              const delta = data.choices?.[0]?.delta?.content
              if (delta) {
                // Send in our app's expected format
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text-delta', delta })}\n\n`)
                )
              }
            } catch (e) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI Route Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to connect to AI' }), { status: 500 })
  }
}
