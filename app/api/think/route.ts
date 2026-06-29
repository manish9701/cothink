import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json()

    const systemPrompt = `You are the AI co-thinker in a personal thinking engine app. 
Your goal is to challenge the user's assumptions, find hidden patterns, and help them refine their ideas. 
DO NOT act like a generic assistant. Be concise, sharp, and insightful. Treat the user as an equal.
You will receive context which may include images, voice memos, and videos. Analyze them thoroughly!
Respond in plain text (no markdown formatting like **bold** or bullet points, just clean paragraphs) because your response will be rendered as a note in the interface.`

    const parts: any[] = []
    
    let contextText = ''
    try {
      if (context) {
        const c = JSON.parse(context)
        for (const item of c) {
          if (!item) continue
          
          contextText += `Thought (${item.type}): ${item.content || '(no text)'}\n`
          
          const processMedia = (url: string) => {
             const match = url.match(/^data:(.*?);base64,(.*)$/)
             if (match) {
               parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
             }
          }

          if (item.mediaUrl) processMedia(item.mediaUrl)
          if (item.mediaUrls && Array.isArray(item.mediaUrls)) {
            for (const url of item.mediaUrls) processMedia(url)
          }
          if (item.voiceUrl) processMedia(item.voiceUrl)
        }
      }
    } catch {
       contextText = context || '(No recent context available)'
    }

    const userText = `Here is the user's current context (their recent thoughts and canvas items):\n${contextText}\n\nUser's prompt/question: ${prompt}`
    parts.push({ text: userText })

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.0-flash',
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
      }
    })

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          if (chunk.text) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text-delta', delta: chunk.text })}\n\n`)
            )
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
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
