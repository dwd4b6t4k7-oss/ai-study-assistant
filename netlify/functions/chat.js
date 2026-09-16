import OpenAI from 'openai'

export default async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } })
  if (!process.env.OPENAI_API_KEY) return new Response(JSON.stringify({ error: 'AI backend is not configured yet.' }), { status: 503, headers: { 'content-type': 'application/json' } })

  try {
    const { message, subject = 'General', action = 'explain', difficulty = 'Standard', history = [] } = await req.json()
    if (!message?.trim()) return new Response(JSON.stringify({ error: 'Message is required.' }), { status: 400, headers: { 'content-type': 'application/json' } })

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.responses.create({
      model: 'gpt-5.6-luna',
      instructions: `You are StudyPilot, a friendly AI tutor for high-school students. Subject: ${subject}. Study mode: ${action}. Difficulty: ${difficulty}. Explain clearly, use short sections and examples, and encourage the student to think rather than simply handing over answers. For quiz mode, ask one question at a time unless the user requests a full quiz. Never claim to have read a file unless file contents are actually provided.`,
      input: [
        ...history.slice(-10).map((m) => ({ role: m.role, content: m.text })),
        { role: 'user', content: message.trim() },
      ],
      max_output_tokens: 900,
    })

    return new Response(JSON.stringify({ text: response.output_text }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'The AI tutor could not answer right now.' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
