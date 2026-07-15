import Groq from "groq-sdk";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEmbedding } from "@/lib/embeddings";
import { getQuestionCollection } from "@/lib/chroma";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) { // to score the interview answers using Groq
  const { prompt } = await req.json();
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.choices[0].message.content;
  if (!text) {
    return new Response(JSON.stringify({ error: "Empty response from Groq" }), { status: 500 });
  }

  try {
    const scores = JSON.parse(text);
    console.log("Scores from Groq:", scores);
    return new Response(JSON.stringify(scores), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to parse", raw: text }), { status: 500 });
  }
}

export async function PATCH(req: Request) { // to update the interview session with the final score and feedback after the interview is completed
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id, scores, overallScore, answers } = await req.json();
  if (!id || !scores || overallScore === undefined) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }
  if (!Array.isArray(scores)) {
    return new Response(JSON.stringify({ error: "scores must be an array" }), { status: 400 });
  }

  const target = await prisma.interviewSession.findUnique({ where: { id } });
  if (!target) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
  if (!user || target.userId !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const result = await prisma.interviewSession.update({
    where: { id },
    data: {
      score: overallScore,
      status: "Completed",
      feedback: JSON.stringify(scores),
      answers: JSON.stringify(answers),
    },
  });

  // Generate + store an embedding for each question's TEXT, so similar-questions
  // can later find semantically similar past questions by meaning, not keywords.
  // Postgres remains the source of truth (QuestionEmbedding table); Chroma is
  // written alongside it as a fast similarity-search index over the same data.
  // This runs sequentially (not Promise.all) because the local embedding model
  // processes one input at a time efficiently — parallel calls don't speed it up
  // and can spike memory.
  const storedQuestions = Array.isArray(target.questions) ? (target.questions as any[]) : [];
  const chromaCollection = await getQuestionCollection();

  for (const s of scores) {
    const matchedQuestion = storedQuestions[s.id - 1]?.question ?? "";
    const embedding = await getEmbedding(matchedQuestion);

    const saved = await prisma.questionEmbedding.create({
      data: {
        sessionId: id,
        questionId: s.id,
        question: matchedQuestion,
        topic: s.topic,
        embedding: embedding,
        score: s.score ?? null,
      },
    });

    // Mirror the same row into Chroma, keyed by the Postgres row's own id so
    // the two stores stay linkable (e.g. to delete both sides together later).
    try {
      await chromaCollection.add({
        ids: [saved.id],
        embeddings: [embedding],
        documents: [matchedQuestion],
        metadatas: [{
          topic: s.topic,
          score: s.score ?? null,
          sessionId: id,
          userId: user.id,
          questionId: s.id,
        }],
      });
    } catch (err) {
      // Don't fail the whole request if Chroma is down — Postgres already has
      // the data, so this is a degraded (but recoverable) state, not data loss.
      console.error("Failed to write embedding to Chroma:", err);
    }
  }

  return new Response(JSON.stringify(result), { status: 200 });
}

// Incremental save — called after every answer during the interview,
// so progress isn't lost on refresh. Does NOT touch score/status/feedback.
export async function PUT(req: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id, answers } = await req.json();
  if (!id || !answers) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  const target = await prisma.interviewSession.findUnique({ where: { id } });
  if (!target) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
  if (!user || target.userId !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const result = await prisma.interviewSession.update({
    where: { id },
    data: { answers: JSON.stringify(answers) },
  });

  return new Response(JSON.stringify(result), { status: 200 });
}