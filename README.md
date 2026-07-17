# Intervio

An AI-powered mock interview platform that doesn't just score your answers — it remembers them. Intervio tracks your performance across sessions, figures out which topics you're actually weak in, and uses that history to generate sharper questions and more grounded feedback over time.

Built as a hands-on learning project to go from "call an LLM API" to a real retrieval-augmented system: embeddings, a vector database, semantic clustering, and RAG-grounded scoring, all wired into a normal full-stack app.

---

## What it does

- **Runs mock interviews** tailored to a role, company, experience level, skills, and topics you choose — question count scales with session duration.
- **Scores answers with AI feedback** (via Groq) after each session, strict and specific rather than effort-based.
- **Remembers every question you've answered** by embedding it and storing it in both Postgres and a local vector database (ChromaDB).
- **Finds similar past questions** on demand from the results page — click a question, see what else you've been asked that's semantically close, even if worded completely differently.
- **Clusters your weak topics automatically** — not by exact-string topic matching, but by embedding similarity, so "React hooks" and "state management with useReducer" correctly land in the same bucket even if the AI labeled them differently.
- **Feeds your weak topics back into question generation** — new sessions are aware of what you've historically struggled with and can lean into those areas when relevant to the role.
- **Grounds feedback in your history (RAG)** — scoring doesn't judge each answer in isolation. It retrieves your most recent similar past answers and lets the model account for patterns: repeated mistakes, or visible improvement.
- **Supports voice-to-text answers** — speak your answer during a live session instead of typing, powered by the browser's native Speech Recognition API.
- **Dashboard + dedicated weak-topics page** — see all past sessions, filter/search them, and drill into a ranked, expandable breakdown of every topic cluster and the questions behind it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth |
| LLM (questions, scoring, feedback) | Groq — `llama-3.3-70b-versatile` |
| Embeddings | Local embedding model via `lib/embeddings.ts` |
| Vector search | ChromaDB (local, CLI — not Docker), cosine similarity space |
| Speech-to-text | Browser Web Speech API (Chrome / Edge) |

---

## How the retrieval layer works

Postgres is the source of truth for everything. ChromaDB is a mirror, built purely to make "find things similar to this" fast — every write to `QuestionEmbedding` in Postgres is also mirrored into Chroma, wrapped so that a Chroma outage never fails the main request.

```
answer submitted
      │
      ▼
Groq scores it ──► score + feedback saved to Postgres
      │
      ▼
question text embedded ──► written to Postgres AND mirrored into Chroma
```

Two features read from that vector index in different ways:

- **Similar questions** — embed the current question, query Chroma for this user's closest past questions, convert cosine distance back into a similarity score, return the top matches.
- **Weak topics** — pull every embedding for the user, greedily cluster them by cosine similarity (threshold `0.85`) into topic groups, label each cluster by its most common AI-assigned topic string, and rank by average score.

Weak topics then feed forward into new question generation, and (via RAG) into scoring — closing the loop from "what have you struggled with" back into "what you get asked and how you're judged next."

---

## Local setup

### Prerequisites

- Node.js
- PostgreSQL running locally (or a connection string to one)
- Python not required — Chroma runs via its own CLI, not as a Python service

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env` file with (at minimum):

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
GROQ_API_KEY=...
```

### 3. Set up the database

```bash
npx prisma migrate dev
```

### 4. Start ChromaDB

Chroma needs to run as its own persistent process, in its own terminal, alongside the dev server — it's not started automatically by Next.js.

```bash
chroma run --path ./chroma-data
```

Verify it's up:

```bash
curl http://localhost:8000/api/v2/heartbeat
```

### 5. Start the app

In a separate terminal:

```bash
npm run dev
```

> **Note (Windows / Git Bash users):** Chroma CLI commands need to be run from Git Bash, not PowerShell — PATH is configured separately per shell.

---

## Project structure

```
app/
├── api/auth/
│   ├── [...nextauth]/route.ts
│   ├── interview/route.ts        # create / fetch / delete sessions
│   ├── questions/route.ts        # question generation
│   ├── answers/route.ts          # scoring (POST), session completion (PATCH), autosave (PUT)
│   ├── weak-topics/route.ts      # embedding-similarity clustering
│   ├── similar-questions/route.ts
│   └── signup/route.ts
├── dashboard/page.tsx            # session list, stats, weak-topics summary card
├── weak-topics/page.tsx          # full ranked + expandable topic breakdown
├── session/page.tsx              # live interview flow, voice-to-text
└── results/page.tsx              # post-interview recap + similar questions

lib/
├── prisma.ts
├── embeddings.ts                 # getEmbedding(text)
└── chroma.ts                     # getQuestionCollection(), cosine space

scripts/
└── resync-chroma.ts              # rebuilds the Chroma index from Postgres

prisma/schema.prisma               # QuestionEmbedding model, Float[] embedding column
```

---

## Roadmap

Built in phases, each one intentionally shipped and understood before moving to the next:

- [x] **Phase 1–2** — Core platform: sessions, questions, scoring
- [x] **Phase 3** — Embeddings
- [x] **Phase 4** — Vector database (ChromaDB): write path + similarity read path
- [x] **Phase 5** — Recommendations: weak-topic-aware question generation
- [ ] **Phase 6** — RAG: retrieval-grounded scoring feedback *(in progress)*
- [x] Voice input *(pulled forward from later phase — browser Speech API)*
- [ ] CV / resume-aware interviewing
- [ ] Agentic interview flows
- [ ] Production hardening

---

## Design notes worth knowing

A few deliberate calls made along the way, in case the "why" isn't obvious from the code:

- **Live-during-interview surfacing of past answers was explicitly rejected.** Showing a past score before re-answering would turn the app into a de facto cheat sheet. Similar-questions and weak-topics only surface *after* scoring, not during.
- **Chroma is never the source of truth.** Every write goes to Postgres first; Chroma is best-effort and non-blocking.
- **Weak-topic clustering uses embedding similarity, not exact string matching**, so semantically identical topics with different labels still group correctly.