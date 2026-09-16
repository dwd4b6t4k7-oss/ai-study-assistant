import OpenAI from 'openai'

export default async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } })
  if (!process.env.OPENAI_API_KEY) return new Response(JSON.stringify({ error: 'AI backend is not configured yet.' }), { status: 503, headers: { 'content-type': 'application/json' } })

  try {
    const { text, action = 'summarize', subject = 'General', difficulty = 'Standard' } = await req.json()
    if (!text?.trim()) return new Response(JSON.stringify({ error: 'Study material is required.' }), { status: 400, headers: { 'content-type': 'application/json' } })

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompts = {
      summarize: 'Create a concise study sheet with main ideas, key definitions, important relationships, examples, likely exam points, and a short self-test. Use clear headings and bullets.',
      quiz: 'Create exactly 8 multiple-choice questions. Return ONLY valid JSON in this exact shape: {"questions":[{"q":"question","options":["A","B","C","D"],"answer":0}]}. The answer must be the zero-based correct option index. Mix recall and application.',
      flashcards: 'Create exactly 10 useful flashcards. Return ONLY valid JSON in this exact shape: {"cards":[{"front":"question or prompt","back":"concise answer"]}.',
    }

    const response = await client.responses.create({
      model: 'gpt-5.6-luna',
      instructions: `You are StudyPilot, an AI study assistant for high-school students. Subject: ${subject}. Difficulty: ${difficulty}. ${prompts[action] || prompts.summarize} Stay faithful to the provided material and do not invent facts that are presented as coming from it.`,
      input: `Study material:\n\n${text.slice(0, 50000)}`,
      max_output_tokens: 2400,
    })

    const raw = response.output_text.trim()
    if (action === 'quiz' || action === 'flashcards') {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
      try {
        const parsed = JSON.parse(cleaned)
        if (action === 'quiz' && !Array.isArray(parsed.questions)) throw new Error('Missing questions')
        if (action === 'flashcards' && !Array.isArray(parsed.cards)) throw new Error('Missing cards')
        return new Response(JSON.stringify(parsed), { status: 200, headers: { 'content-type': 'application/json' } })
      } catch {
        return new Response(JSON.stringify({ error: 'The AI returned an invalid study set. Please try again.' }), { status: 502, headers: { 'content-type': 'application/json' } })
      }
    }

    return new Response(JSON.stringify({ text: raw }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Could not process the study material.' }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
