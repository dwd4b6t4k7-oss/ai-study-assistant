# StudyPilot — AI Study Assistant

StudyPilot is a student-focused AI study assistant built as a 12th-grade ICT science-fair project. It helps students understand topics, summarize study material, generate practice questions, review with flashcards, and track quiz progress.

## Current features

- Responsive dark study dashboard
- AI tutor chat with subject and difficulty controls
- Explain-a-topic workflow
- PDF, TXT, and Markdown study-material upload
- PDF text extraction in the browser
- AI-generated study sheets from uploaded material
- AI-generated 8-question practice quizzes
- Interactive quiz scoring with correct/incorrect feedback
- AI-generated flashcards
- Local progress persistence with quiz score tracking
- Demo fallback content when the AI backend is unavailable
- Server-side API routes for AI requests

## Tech stack

- React 19 + Vite
- JavaScript + CSS
- PDF.js (`pdfjs-dist`) for PDF text extraction
- OpenAI API through server-side functions
- GitHub Actions for build checks
- Netlify deployment configuration

## Run locally

```bash
npm install
npm run dev
```

Create a local `.env` file based on `.env.example` and add your OpenAI API key. The application uses its configured model server-side.

Never put an OpenAI API key in frontend code or commit it to GitHub. The key must remain a server-side environment variable.

## Build

```bash
npm run build
```

GitHub Actions automatically runs the production build on pushes to `main` and pull requests targeting `main`.

## Deploy with Netlify

1. Connect this GitHub repository to Netlify.
2. Use `npm run build` as the build command and `dist` as the publish directory.
3. Add `OPENAI_API_KEY` as a Netlify environment variable for the production environment.
4. Deploy.

The frontend can run without an API key, but AI chat and AI study-set generation will show a backend configuration message until the server environment is configured.

## PDF limitation

StudyPilot currently extracts selectable text from PDFs. Scanned/image-only PDFs may not contain usable text and will need OCR in a future version.

## Science-fair architecture

```text
Student
   ↓
React StudyPilot Dashboard
   ↓
Browser document extraction / local progress
   ↓
Netlify serverless functions
   ↓
OpenAI model
   ↓
Tutor response / study sheet / quiz / flashcards
   ↓
Interactive learning + progress tracking
```

## Project direction

Future versions can add OCR for scanned PDFs, stronger structured AI outputs, persistent accounts, cloud-saved study sessions, richer analytics, and a public production deployment.
