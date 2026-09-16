import OpenAI from 'openai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI backend is not configured yet.' })

  try {
    const { text, action = 'summarize', subject = 'General', difficulty = 'Standard' } = req.body || {}
    if (!text?.trim()) return res.status(400).json({ error: 'Study material is required.' })

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
        return res.status(200).json(parsed)
      } catch {
        return res.status(502).json({ error: 'The AI returned an invalid study set. Please try again.' })
      }
    }

    return res.status(200).json({ text: raw })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Could not process the study material.' })
  }
}
