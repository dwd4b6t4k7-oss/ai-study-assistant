import OpenAI from 'openai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI backend is not configured yet.' })

  try {
    const { message, subject = 'General', action = 'explain', difficulty = 'Standard', history = [] } = req.body || {}
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' })

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

    return res.status(200).json({ text: response.output_text })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'The AI tutor could not answer right now.' })
  }
}
