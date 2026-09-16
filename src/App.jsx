import { useMemo, useState } from 'react'

const subjects = [
  { name: 'Math', icon: '∑', color: 'violet' },
  { name: 'Physics', icon: 'ϕ', color: 'blue' },
  { name: 'History', icon: '◈', color: 'amber' },
  { name: 'ICT', icon: '</>', color: 'cyan' },
  { name: 'English', icon: 'Aa', color: 'rose' },
]

const actions = [
  { id: 'explain', icon: '✦', title: 'Explain a topic', text: 'Get a clear explanation at your level.' },
  { id: 'summarize', icon: '≡', title: 'Summarize notes', text: 'Turn long notes into focused revision.' },
  { id: 'quiz', icon: '?', title: 'Generate a quiz', text: 'Practice with questions and instant feedback.' },
  { id: 'flashcards', icon: '▣', title: 'Make flashcards', text: 'Create quick cards for active recall.' },
]

function App() {
  const [subject, setSubject] = useState('Math')
  const [selectedAction, setSelectedAction] = useState('explain')
  const [difficulty, setDifficulty] = useState('Standard')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hey! I’m StudyPilot. Tell me what you’re studying and I’ll help you understand it step by step.', time: 'Now' },
  ])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const actionLabel = useMemo(() => actions.find((a) => a.id === selectedAction)?.title, [selectedAction])

  async function sendMessage(text = input) {
    const clean = text.trim()
    if (!clean || loading) return
    const history = messages.slice(-10)
    setMessages((prev) => [...prev, { role: 'user', text: clean, time: 'Now' }])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean, subject, action: selectedAction, difficulty, history }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI request failed')
      setMessages((prev) => [...prev, { role: 'assistant', text: data.text, time: 'Now' }])
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: demoReply(clean, subject, selectedAction, difficulty), time: 'Demo' }])
      setNotice('Demo mode: add OPENAI_API_KEY to enable live AI')
      setTimeout(() => setNotice(''), 3500)
    } finally { setLoading(false) }
  }

  function chooseAction(id) {
    setSelectedAction(id)
    const action = actions.find((a) => a.id === id)
    setNotice(`${action.title} selected`)
    setTimeout(() => setNotice(''), 1800)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">✦</div><div><strong>StudyPilot</strong><span>AI Study Assistant</span></div></div>
        <nav className="nav">
          <button className="nav-item active"><span>⌂</span> Dashboard</button>
          <button className="nav-item" onClick={() => chooseAction('explain')}><span>✦</span> AI Tutor</button>
          <button className="nav-item" onClick={() => chooseAction('quiz')}><span>?</span> Practice</button>
          <button className="nav-item" onClick={() => chooseAction('flashcards')}><span>▣</span> Flashcards</button>
        </nav>
        <div className="sidebar-section">
          <div className="section-label">MY SUBJECTS <button>+</button></div>
          {subjects.map((item) => <button key={item.name} className={`subject-row ${subject === item.name ? 'selected' : ''}`} onClick={() => setSubject(item.name)}><span className={`subject-icon ${item.color}`}>{item.icon}</span>{item.name}{subject === item.name && <span className="dot" />}</button>)}
        </div>
        <div className="sidebar-bottom"><div className="streak-card"><span>🔥</span><div><b>4 day streak</b><small>Keep it going!</small></div></div><button className="profile"><span className="avatar">M</span><span><b>Student</b><small>Senior year</small></span><span className="more">•••</span></button></div>
      </aside>

      <main className="main">
        <header className="topbar"><button className="menu" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button><div><span className="eyebrow">WEDNESDAY, SEPTEMBER 16</span><h1>Good evening, student <span>👋</span></h1></div><div className="top-actions"><button className="icon-button">⌕</button><button className="icon-button">◔</button></div></header>
        <section className="hero"><div className="hero-copy"><span className="pill"><span className="status-dot" /> AI TUTOR READY</span><h2>What are we learning<br /><em>today?</em></h2><p>Ask a question, upload your notes, or choose a study tool to get started.</p></div><div className="hero-orb"><div className="orb-core">✦</div><span className="orbit one" /><span className="orbit two" /></div></section>

        <section className="workspace">
          <div className="section-heading"><div><span className="eyebrow">QUICK START</span><h3>Study tools</h3></div><span className="current-subject">Studying: <b>{subject}</b></span></div>
          <div className="action-grid">{actions.map((action) => <button key={action.id} className={`action-card ${selectedAction === action.id ? 'chosen' : ''}`} onClick={() => chooseAction(action.id)}><span className="action-icon">{action.icon}</span><span><b>{action.title}</b><small>{action.text}</small></span><span className="arrow">→</span></button>)}</div>
          <div className="chat-card">
            <div className="chat-head"><div className="ai-avatar">✦</div><div><b>AI Tutor</b><span>{subject} · {actionLabel}</span></div><div className="online"><i /> {loading ? 'Thinking…' : 'Online'}</div></div>
            <div className="messages">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}><div className="bubble">{message.text}</div><span>{message.time}</span></div>)}{loading && <div className="message assistant"><div className="bubble typing">StudyPilot is thinking <i>•</i><i>•</i><i>•</i></div></div>}</div>
            <div className="composer"><button className="attach" onClick={() => setNotice('Notes/PDF upload is the next feature.')}>＋</button><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder={`Ask anything about ${subject.toLowerCase()}...`} /><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Standard</option><option>Simple</option><option>Advanced</option></select><button className="send" onClick={() => sendMessage()} disabled={loading}>↑</button></div>
            <div className="composer-note">StudyPilot can make mistakes. Always verify important information.</div>
          </div>
        </section>

        <section className="bottom-grid"><div className="progress-card"><div className="section-heading"><div><span className="eyebrow">THIS WEEK</span><h3>Study progress</h3></div><button className="ghost">View details →</button></div><div className="progress-body"><div className="ring"><strong>68%</strong><span>weekly goal</span></div><div className="stats"><div><b>5h 24m</b><span>Study time</span></div><div><b>42</b><span>Questions</span></div><div><b>86%</b><span>Avg. score</span></div></div></div></div><div className="tip-card"><span className="tip-icon">💡</span><span className="eyebrow">STUDY TIP</span><h3>Try active recall</h3><p>Instead of rereading, close your notes and explain the idea from memory.</p><button onClick={() => chooseAction('quiz')}>Try a quiz →</button></div></section>
        {notice && <div className="toast">✓ {notice}</div>}
      </main>
    </div>
  )
}

function demoReply(text, subject, action, difficulty) {
  const topic = text.length > 55 ? `${text.slice(0, 55)}…` : text
  if (action === 'quiz') return `Let’s practice ${topic}. I’d start with 5 questions that move from ${difficulty.toLowerCase()} recall to application. The live AI endpoint is ready to be enabled.`
  if (action === 'summarize') return `For ${subject}, I would turn “${topic}” into the core idea, key terms, an example, and an exam checklist. The live AI endpoint will generate this automatically.`
  if (action === 'flashcards') return `Flashcard set for “${topic}”: Front = the key question; Back = the definition, formula, or example. The live AI endpoint will generate a complete deck.`
  return `Great question about ${subject}. For “${topic}”, I’d explain the core concept first, give an example, then check your understanding. The live AI endpoint is ready once the API key is configured.`
}

export default App
