import OpenAI from 'openai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI backend is not configured yet.' })

  try {
    const { text, action = 'summarize', subject = 'General', difficulty = 'Standard' } = req.body || {}
    if (!text?.trim()) return res.status(400).json({ error: 'Study material is required.' })

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompts = {
      summarize: 'Create a concise study sheet with the main ideas, key definitions, important relationships, examples, and an exam checklist.',
      quiz: 'Create 8 multiple-choice questions from the material. Include four options per question and clearly mark the correct answer. Mix recall and application.',
      flashcards: 'Create 12 useful flashcards. Each card must have a short question on the front and a clear answer on the back.',
    }

    const response = await client.responses.create({
      model: 'gpt-5.6-luna',
      instructions: `You are StudyPilot, an AI study assistant for high-school students. Subject: ${subject}. Difficulty: ${difficulty}. ${prompts[action] || prompts.summarize} Stay faithful to the provided material and do not invent facts that are presented as coming from it.`,
      input: `Study material:\n\n${text.slice(0, 50000)}`,
      max_output_tokens: 1800,
    })

    return res.status(200).json({ text: response.output_text })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Could not process the study material.' })
  }
}
