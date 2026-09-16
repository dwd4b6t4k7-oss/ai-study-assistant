import { useMemo, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

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

function getNumber(key) {
  if (typeof window === 'undefined') return 0
  return Number(localStorage.getItem(key) || 0)
}

function App() {
  const [subject, setSubject] = useState('Math')
  const [selectedAction, setSelectedAction] = useState('explain')
  const [difficulty, setDifficulty] = useState('Standard')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [studyLoading, setStudyLoading] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hey! I’m StudyPilot. Tell me what you’re studying and I’ll help you understand it step by step.', time: 'Now' }])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [lastAnswer, setLastAnswer] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [cardIndex, setCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [documentText, setDocumentText] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [summary, setSummary] = useState('')
  const fileRef = useRef(null)

  const actionLabel = useMemo(() => actions.find((a) => a.id === selectedAction)?.title, [selectedAction])
  const progress = getNumber('studypilot_questions')
  const scoreTotal = getNumber('studypilot_score')
  const scoreCount = getNumber('studypilot_score_count')
  const average = scoreCount ? Math.round(scoreTotal / scoreCount) : 0

  function notify(text) {
    setNotice(text)
    setTimeout(() => setNotice(''), 2800)
  }

  async function sendMessage(text = input, forcedAction = selectedAction) {
    const clean = text.trim()
    if (!clean || loading) return
    const history = messages.slice(-10)
    setMessages((prev) => [...prev, { role: 'user', text: clean, time: 'Now' }])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: clean, subject, action: forcedAction, difficulty, history }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI request failed')
      setMessages((prev) => [...prev, { role: 'assistant', text: data.text, time: 'Now' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: demoReply(clean, subject, forcedAction, difficulty), time: 'Demo' }])
      notify('Demo mode: add OPENAI_API_KEY to enable live AI')
    } finally { setLoading(false) }
  }

  async function generateStudySet(type) {
    if (!documentText) return notify('Upload notes first so the AI has material to study.')
    setSelectedAction(type)
    setStudyLoading(true)
    try {
      const response = await fetch('/api/study', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: documentText, action: type, subject, difficulty }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Study generation failed')
      if (type === 'quiz') {
        if (!Array.isArray(data.questions) || !data.questions.length) throw new Error('No quiz returned')
        startQuiz(data.questions)
        notify('AI-generated quiz ready')
      } else if (type === 'flashcards') {
        if (!Array.isArray(data.cards) || !data.cards.length) throw new Error('No flashcards returned')
        setFlashcards(data.cards)
        setCardIndex(0)
        setShowAnswer(false)
        notify('AI-generated flashcards ready')
      } else {
        setSummary(data.text || '')
        notify('AI study sheet ready')
      }
    } catch {
      notify('Live AI is unavailable — using the built-in study demo.')
      if (type === 'quiz') startQuiz(starterQuiz)
      if (type === 'flashcards') setFlashcards([
        { front: 'What is active recall?', back: 'Retrieving information from memory instead of simply rereading it.' },
        { front: 'Why use practice questions?', back: 'They reveal what you can retrieve and where your knowledge gaps are.' },
        { front: 'What is spaced repetition?', back: 'Reviewing material at increasing intervals to improve long-term retention.' },
      ])
    } finally { setStudyLoading(false) }
  }

  function chooseAction(id) {
    setSelectedAction(id)
    if (id === 'quiz') {
      if (documentText) generateStudySet('quiz')
      else startQuiz(starterQuiz)
      return
    }
    if (id === 'flashcards') {
      if (documentText) generateStudySet('flashcards')
      else setFlashcards([
        { front: 'What is active recall?', back: 'Retrieving information from memory instead of simply rereading it.' },
        { front: 'Why use practice questions?', back: 'They reveal what you can retrieve and where your knowledge gaps are.' },
        { front: 'What is spaced repetition?', back: 'Reviewing material at increasing intervals to improve long-term retention.' },
      ])
      return
    }
    notify(`${actions.find((a) => a.id === id).title} selected`)
  }

  function startQuiz(items) {
    setQuiz(items)
    setQuizIndex(0)
    setQuizScore(0)
    setLastAnswer(null)
    setSelectedAction('quiz')
  }

  function answerQuiz(option) {
    if (!quiz || lastAnswer !== null) return
    const correct = option === quiz[quizIndex].answer
    const nextScore = quizScore + (correct ? 1 : 0)
    setLastAnswer(option)
    setTimeout(() => {
      if (quizIndex + 1 >= quiz.length) {
        const newQuestions = getNumber('studypilot_questions') + quiz.length
        const newTotal = getNumber('studypilot_score') + Math.round((nextScore / quiz.length) * 100)
        const newCount = getNumber('studypilot_score_count') + 1
        localStorage.setItem('studypilot_questions', newQuestions)
        localStorage.setItem('studypilot_score', newTotal)
        localStorage.setItem('studypilot_score_count', newCount)
        setQuiz(null)
        setQuizScore(nextScore)
        setLastAnswer(null)
        notify(`Quiz complete: ${nextScore}/${quiz.length}`)
      } else {
        setQuizScore(nextScore)
        setQuizIndex((i) => i + 1)
        setLastAnswer(null)
      }
    }, 650)
  }

  async function extractPdf(file) {
    const buffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: buffer }).promise
    let text = ''
    const pages = Math.min(pdf.numPages, 40)
    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      text += content.items.map((item) => item.str || '').join(' ') + '\n\n'
      if (text.length >= 50000) break
    }
    return text.slice(0, 50000).trim()
  }

  async function handleFile(file) {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return notify('Please use a file smaller than 8 MB.')
    setDocumentName(file.name)
    setSummary('')
    try {
      let text = ''
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.md')) {
        text = await file.text()
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        notify('Reading PDF pages…')
        text = await extractPdf(file)
      } else {
        return notify('Use a PDF, TXT, or Markdown file.')
      }
      if (!text.trim()) return notify('I could not find selectable text in that file. Scanned images need OCR.')
      setDocumentText(text.slice(0, 50000))
      notify(`Loaded ${file.name} — ready for AI study tools.`)
    } catch (error) {
      console.error(error)
      notify('Could not read that file.')
    }
  }

  function useDocument() {
    if (!documentText) return notify('Upload notes first.')
    setSelectedAction('summarize')
    sendMessage(`Analyze these study notes for ${subject}. Create a concise study sheet with key definitions, important relationships, examples, likely exam points, and a short self-test.\n\n${documentText}`, 'summarize')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">✦</div><div><strong>StudyPilot</strong><span>AI Study Assistant</span></div></div>
        <nav className="nav"><button className="nav-item active"><span>⌂</span> Dashboard</button><button className="nav-item" onClick={() => chooseAction('explain')}><span>✦</span> AI Tutor</button><button className="nav-item" onClick={() => chooseAction('quiz')}><span>?</span> Practice</button><button className="nav-item" onClick={() => chooseAction('flashcards')}><span>▣</span> Flashcards</button></nav>
        <div className="sidebar-section"><div className="section-label">MY SUBJECTS <button onClick={() => notify('Subjects are ready for customization in the next build.')}>+</button></div>{subjects.map((item) => <button key={item.name} className={`subject-row ${subject === item.name ? 'selected' : ''}`} onClick={() => setSubject(item.name)}><span className={`subject-icon ${item.color}`}>{item.icon}</span>{item.name}{subject === item.name && <span className="dot" />}</button>)}</div>
        <div className="sidebar-bottom"><div className="streak-card"><span>🔥</span><div><b>4 day streak</b><small>Keep it going!</small></div></div><button className="profile"><span className="avatar">M</span><span><b>Student</b><small>Senior year</small></span><span className="more">•••</span></button></div>
      </aside>

      <main className="main">
        <header className="topbar"><button className="menu" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button><div><span className="eyebrow">WEDNESDAY, SEPTEMBER 16</span><h1>Good evening, student <span>👋</span></h1></div><div className="top-actions"><button className="icon-button" onClick={() => document.querySelector('.composer input')?.focus()}>⌕</button><button className="icon-button" onClick={() => notify('StudyPilot uses a focused dark study theme.')}>◔</button></div></header>
        <section className="hero"><div className="hero-copy"><span className="pill"><span className="status-dot" /> AI TUTOR READY</span><h2>What are we learning<br /><em>today?</em></h2><p>Ask a question, upload your notes, or choose a study tool to get started.</p></div><div className="hero-orb"><div className="orb-core">✦</div><span className="orbit one" /><span className="orbit two" /></div></section>

        <section className="workspace">
          <div className="section-heading"><div><span className="eyebrow">QUICK START</span><h3>Study tools</h3></div><span className="current-subject">Studying: <b>{subject}</b></span></div>
          <div className="action-grid">{actions.map((action) => <button key={action.id} className={`action-card ${selectedAction === action.id ? 'chosen' : ''}`} onClick={() => chooseAction(action.id)} disabled={studyLoading && (action.id === 'quiz' || action.id === 'flashcards')}><span className="action-icon">{action.icon}</span><span><b>{action.title}</b><small>{action.text}</small></span><span className="arrow">→</span></button>)}</div>

          <div className="document-card"><div><span className="eyebrow">STUDY MATERIAL</span><h3>{documentName || 'Upload your notes'}</h3><p>{documentText ? `${documentText.length.toLocaleString()} characters loaded and ready for AI analysis.` : 'Add a PDF, TXT, or Markdown file to turn your notes into revision material.'}</p></div><div className="document-actions"><input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" hidden onChange={(e) => handleFile(e.target.files?.[0])} /><button className="ghost" onClick={() => fileRef.current?.click()}>＋ Choose file</button>{documentText && <><button className="primary-small" onClick={useDocument}>Summarize →</button><button className="secondary-small" onClick={() => generateStudySet('quiz')}>Quiz</button><button className="secondary-small" onClick={() => generateStudySet('flashcards')}>Cards</button></>}</div></div>

          {summary && <div className="summary-panel"><div className="quiz-top"><span className="eyebrow">AI STUDY SHEET</span><button className="ghost" onClick={() => setSummary('')}>Close</button></div><div className="summary-text">{summary}</div></div>}

          {quiz && <div className="quiz-panel"><div className="quiz-top"><span className="eyebrow">AI PRACTICE</span><span>{quizIndex + 1} / {quiz.length}</span></div><h3>{quiz[quizIndex].q}</h3><div className="quiz-options">{quiz[quizIndex].options.map((option, i) => <button key={option} className={lastAnswer !== null ? (i === quiz[quizIndex].answer ? 'correct' : i === lastAnswer ? 'wrong' : '') : ''} onClick={() => answerQuiz(i)} disabled={lastAnswer !== null}>{String.fromCharCode(65 + i)}. {option}</button>)}</div>{lastAnswer !== null && <div className={`answer-feedback ${lastAnswer === quiz[quizIndex].answer ? 'good' : 'bad'}`}>{lastAnswer === quiz[quizIndex].answer ? '✓ Correct' : `✗ Not quite — the correct answer is ${String.fromCharCode(65 + quiz[quizIndex].answer)}.`}</div>}</div>}

          {flashcards.length > 0 && <div className="flashcard-panel"><div className="quiz-top"><span className="eyebrow">AI FLASHCARDS</span><span>{cardIndex + 1} / {flashcards.length}</span></div><button className="flashcard" onClick={() => setShowAnswer(!showAnswer)}><span>{showAnswer ? flashcards[cardIndex].back : flashcards[cardIndex].front}</span><small>{showAnswer ? 'Click to see question' : 'Click to reveal answer'}</small></button><div className="card-controls"><button className="ghost" onClick={() => { setShowAnswer(false); setCardIndex((i) => (i - 1 + flashcards.length) % flashcards.length) }}>← Previous</button><button className="primary-small" onClick={() => { setShowAnswer(false); setCardIndex((i) => (i + 1) % flashcards.length) }}>Next →</button></div></div>}

          <div className="chat-card"><div className="chat-head"><div className="ai-avatar">✦</div><div><b>AI Tutor</b><span>{subject} · {actionLabel}</span></div><div className="online"><i /> {loading ? 'Thinking…' : 'Online'}</div></div><div className="messages">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}><div className="bubble">{message.text}</div><span>{message.time}</span></div>)}{loading && <div className="message assistant"><div className="bubble typing">StudyPilot is thinking <i>•</i><i>•</i><i>•</i></div></div>}</div><div className="composer"><button className="attach" onClick={() => fileRef.current?.click()}>＋</button><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder={`Ask anything about ${subject.toLowerCase()}...`} /><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Standard</option><option>Simple</option><option>Advanced</option></select><button className="send" onClick={() => sendMessage()} disabled={loading}>↑</button></div><div className="composer-note">StudyPilot can make mistakes. Always verify important information.</div></div>
        </section>

        <section className="bottom-grid"><div className="progress-card"><div className="section-heading"><div><span className="eyebrow">THIS WEEK</span><h3>Study progress</h3></div><button className="ghost" onClick={() => notify(`${progress} questions answered across ${scoreCount} quizzes.`)}>View details →</button></div><div className="progress-body"><div className="ring" style={{ '--score': `${average || 0}%` }}><strong>{average || 0}%</strong><span>avg. score</span></div><div className="stats"><div><b>{progress}</b><span>Questions</span></div><div><b>{scoreCount}</b><span>Quizzes</span></div><div><b>{average || 0}%</b><span>Avg. score</span></div></div></div></div><div className="tip-card"><span className="tip-icon">💡</span><span className="eyebrow">STUDY TIP</span><h3>Try active recall</h3><p>Instead of rereading, close your notes and explain the idea from memory.</p><button onClick={() => chooseAction('quiz')}>Try a quiz →</button></div></section>
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
