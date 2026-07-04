import Groq from "groq-sdk";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { prompt } = await req.json();
  console.log("Received prompt for scoring:", prompt);
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

export async function PATCH(req: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id, scores, overallScore, answers } = await req.json();
  if (!id || !scores || overallScore === undefined) {
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
    data: {
      score: overallScore,
      status: "Completed",
      feedback: JSON.stringify(scores),
      answers: JSON.stringify(answers),
    },
  });

  return new Response(JSON.stringify(result), { status: 200 });
}