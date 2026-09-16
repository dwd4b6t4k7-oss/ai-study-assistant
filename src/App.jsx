import { useMemo, useRef, useState } from 'react'

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

const starterQuiz = [
  { q: 'What is the main purpose of active recall?', options: ['Rereading notes repeatedly', 'Retrieving information from memory', 'Highlighting every sentence', 'Studying only the night before'], answer: 1 },
  { q: 'Which method usually gives stronger evidence of understanding?', options: ['Explaining an idea in your own words', 'Looking at the answer immediately', 'Copying a definition ten times', 'Skipping practice questions'], answer: 0 },
  { q: 'What should you do after getting a practice question wrong?', options: ['Ignore it', 'Memorize the letter choice', 'Review the concept and try again', 'Stop studying'], answer: 2 },
]

function App() {
  const [subject, setSubject] = useState('Math')
  const [selectedAction, setSelectedAction] = useState('explain')
  const [difficulty, setDifficulty] = useState('Standard')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hey! I’m StudyPilot. Tell me what you’re studying and I’ll help you understand it step by step.', time: 'Now' }])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [flashcards, setFlashcards] = useState([])
  const [cardIndex, setCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [documentText, setDocumentText] = useState('')
  const [documentName, setDocumentName] = useState('')
  const fileRef = useRef(null)

  const actionLabel = useMemo(() => actions.find((a) => a.id === selectedAction)?.title, [selectedAction])
  const progress = Number(localStorage.getItem('studypilot_questions') || 0)
  const scoreTotal = Number(localStorage.getItem('studypilot_score') || 0)
  const scoreCount = Number(localStorage.getItem('studypilot_score_count') || 0)
  const average = scoreCount ? Math.round(scoreTotal / scoreCount) : 0

  function notify(text) {
    setNotice(text)
    setTimeout(() => setNotice(''), 2500)
  }

  async function sendMessage(text = input) {
    const clean = text.trim()
    if (!clean || loading) return
    const history = messages.slice(-10)
    setMessages((prev) => [...prev, { role: 'user', text: clean, time: 'Now' }])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: clean, subject, action: selectedAction, difficulty, history }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI request failed')
      setMessages((prev) => [...prev, { role: 'assistant', text: data.text, time: 'Now' }])
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: demoReply(clean, subject, selectedAction, difficulty), time: 'Demo' }])
      notify('Demo mode: add OPENAI_API_KEY to enable live AI')
    } finally { setLoading(false) }
  }

  function chooseAction(id) {
    setSelectedAction(id)
    if (id !== 'quiz' && id !== 'flashcards') { notify(`${actions.find((a) => a.id === id).title} selected`); return }
    if (id === 'quiz') startQuiz(starterQuiz)
    if (id === 'flashcards') setFlashcards([{ front: `What is active recall?`, back: 'A study method where you retrieve information from memory instead of simply rereading it.' }, { front: 'Why use practice questions?', back: 'They reveal what you can retrieve and where your knowledge gaps are.' }, { front: 'What is spaced repetition?', back: 'Reviewing material at increasing intervals to improve long-term retention.' }])
  }

  function startQuiz(items) { setQuiz(items); setQuizIndex(0); setQuizScore(0); setSelectedAction('quiz'); notify('Practice quiz started') }

  function answerQuiz(option) {
    if (!quiz) return
    const correct = option === quiz[quizIndex].answer
    const nextScore = quizScore + (correct ? 1 : 0)
    if (quizIndex + 1 >= quiz.length) {
      const newQuestions = Number(localStorage.getItem('studypilot_questions') || 0) + quiz.length
      const newTotal = Number(localStorage.getItem('studypilot_score') || 0) + Math.round((nextScore / quiz.length) * 100)
      const newCount = Number(localStorage.getItem('studypilot_score_count') || 0) + 1
      localStorage.setItem('studypilot_questions', newQuestions)
      localStorage.setItem('studypilot_score', newTotal)
      localStorage.setItem('studypilot_score_count', newCount)
      setQuizScore(nextScore)
      notify(`Quiz complete: ${nextScore}/${quiz.length}`)
      setQuiz(null)
      return
    }
    setQuizScore(nextScore)
    setQuizIndex((i) => i + 1)
  }

  async function handleFile(file) {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return notify('Please use a file smaller than 8 MB.')
    setDocumentName(file.name)
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.md')) {
        const text = await file.text()
        setDocumentText(text.slice(0, 30000))
        notify('Notes loaded — choose Summarize notes to study them.')
      } else if (file.type === 'application/pdf') {
        setDocumentText(`PDF uploaded: ${file.name}. PDF text extraction will be connected in the next build step.`)
        notify('PDF uploaded — AI document processing is ready for connection.')
      } else notify('Use a PDF, TXT, or Markdown file.')
    } catch { notify('Could not read that file.') }
  }

  function useDocument() {
    if (!documentText) return notify('Upload notes first.')
    setSelectedAction('summarize')
    sendMessage(`Analyze these study notes for ${subject}. Create a concise study sheet with key definitions, important relationships, examples, likely exam points, and a short self-test.\n\n${documentText}`)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">✦</div><div><strong>StudyPilot</strong><span>AI Study Assistant</span></div></div>
        <nav className="nav"><button className="nav-item active"><span>⌂</span> Dashboard</button><button className="nav-item" onClick={() => chooseAction('explain')}><span>✦</span> AI Tutor</button><button className="nav-item" onClick={() => chooseAction('quiz')}><span>?</span> Practice</button><button className="nav-item" onClick={() => chooseAction('flashcards')}><span>▣</span> Flashcards</button></nav>
        <div className="sidebar-section"><div className="section-label">MY SUBJECTS <button>+</button></div>{subjects.map((item) => <button key={item.name} className={`subject-row ${subject === item.name ? 'selected' : ''}`} onClick={() => setSubject(item.name)}><span className={`subject-icon ${item.color}`}>{item.icon}</span>{item.name}{subject === item.name && <span className="dot" />}</button>)}</div>
        <div className="sidebar-bottom"><div className="streak-card"><span>🔥</span><div><b>4 day streak</b><small>Keep it going!</small></div></div><button className="profile"><span className="avatar">M</span><span><b>Student</b><small>Senior year</small></span><span className="more">•••</span></button></div>
      </aside>

      <main className="main">
        <header className="topbar"><button className="menu" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button><div><span className="eyebrow">WEDNESDAY, SEPTEMBER 16</span><h1>Good evening, student <span>👋</span></h1></div><div className="top-actions"><button className="icon-button">⌕</button><button className="icon-button">◔</button></div></header>
        <section className="hero"><div className="hero-copy"><span className="pill"><span className="status-dot" /> AI TUTOR READY</span><h2>What are we learning<br /><em>today?</em></h2><p>Ask a question, upload your notes, or choose a study tool to get started.</p></div><div className="hero-orb"><div className="orb-core">✦</div><span className="orbit one" /><span className="orbit two" /></div></section>

        <section className="workspace">
          <div className="section-heading"><div><span className="eyebrow">QUICK START</span><h3>Study tools</h3></div><span className="current-subject">Studying: <b>{subject}</b></span></div>
          <div className="action-grid">{actions.map((action) => <button key={action.id} className={`action-card ${selectedAction === action.id ? 'chosen' : ''}`} onClick={() => chooseAction(action.id)}><span className="action-icon">{action.icon}</span><span><b>{action.title}</b><small>{action.text}</small></span><span className="arrow">→</span></button>)}</div>

          <div className="document-card"><div><span className="eyebrow">STUDY MATERIAL</span><h3>{documentName || 'Upload your notes'}</h3><p>{documentText ? 'Your material is ready to send to the AI tutor.' : 'Add a PDF, TXT, or Markdown file to turn your notes into revision material.'}</p></div><div className="document-actions"><input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" hidden onChange={(e) => handleFile(e.target.files?.[0])} /><button className="ghost" onClick={() => fileRef.current?.click()}>＋ Choose file</button>{documentText && <button className="primary-small" onClick={useDocument}>Analyze notes →</button>}</div></div>

          {quiz && <div className="quiz-panel"><div className="quiz-top"><span className="eyebrow">PRACTICE</span><span>{quizIndex + 1} / {quiz.length}</span></div><h3>{quiz[quizIndex].q}</h3><div className="quiz-options">{quiz[quizIndex].options.map((option, i) => <button key={option} onClick={() => answerQuiz(i)}>{String.fromCharCode(65 + i)}. {option}</button>)}</div></div>}

          {flashcards.length > 0 && <div className="flashcard-panel"><div className="quiz-top"><span className="eyebrow">FLASHCARDS</span><span>{cardIndex + 1} / {flashcards.length}</span></div><button className="flashcard" onClick={() => setShowAnswer(!showAnswer)}><span>{showAnswer ? flashcards[cardIndex].back : flashcards[cardIndex].front}</span><small>{showAnswer ? 'Click to see question' : 'Click to reveal answer'}</small></button><div className="card-controls"><button className="ghost" onClick={() => { setShowAnswer(false); setCardIndex((i) => (i - 1 + flashcards.length) % flashcards.length) }}>←</button><button className="primary-small" onClick={() => { setShowAnswer(false); setCardIndex((i) => (i + 1) % flashcards.length) }}>Next →</button></div></div>}

          <div className="chat-card"><div className="chat-head"><div className="ai-avatar">✦</div><div><b>AI Tutor</b><span>{subject} · {actionLabel}</span></div><div className="online"><i /> {loading ? 'Thinking…' : 'Online'}</div></div><div className="messages">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}><div className="bubble">{message.text}</div><span>{message.time}</span></div>)}{loading && <div className="message assistant"><div className="bubble typing">StudyPilot is thinking <i>•</i><i>•</i><i>•</i></div></div>}</div><div className="composer"><button className="attach" onClick={() => fileRef.current?.click()}>＋</button><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder={`Ask anything about ${subject.toLowerCase()}...`} /><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Standard</option><option>Simple</option><option>Advanced</option></select><button className="send" onClick={() => sendMessage()} disabled={loading}>↑</button></div><div className="composer-note">StudyPilot can make mistakes. Always verify important information.</div></div>
        </section>

        <section className="bottom-grid"><div className="progress-card"><div className="section-heading"><div><span className="eyebrow">THIS WEEK</span><h3>Study progress</h3></div><button className="ghost">View details →</button></div><div className="progress-body"><div className="ring"><strong>{average || 0}%</strong><span>avg. score</span></div><div className="stats"><div><b>{progress}</b><span>Questions</span></div><div><b>{scoreCount}</b><span>Quizzes</span></div><div><b>{average || 0}%</b><span>Avg. score</span></div></div></div></div><div className="tip-card"><span className="tip-icon">💡</span><span className="eyebrow">STUDY TIP</span><h3>Try active recall</h3><p>Instead of rereading, close your notes and explain the idea from memory.</p><button onClick={() => chooseAction('quiz')}>Try a quiz →</button></div></section>
        {notice && <div className="toast">✓ {notice}</div>}
      </main>
    </div>
  )
}

function demoReply(text, subject, action, difficulty) {
  const topic = text.length > 55 ? `${text.slice(0, 55)}…` : text
  if (action === 'quiz') return `Let’s practice ${topic}. I’d start with questions that move from ${difficulty.toLowerCase()} recall to application. The live AI endpoint is ready once the API key is configured.`
  if (action === 'summarize') return `For ${subject}, I would turn “${topic}” into the core idea, key terms, an example, and an exam checklist. The live AI endpoint will generate this automatically.`
  if (action === 'flashcards') return `Flashcards for “${topic}” should use a question on the front and a concise definition, formula, or example on the back.`
  return `Great question about ${subject}. For “${topic}”, I’d explain the core concept first, give an example, then check your understanding.`
}

export default App
