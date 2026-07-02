import Groq from "groq-sdk";
import prisma from "@/lib/prisma";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { prompt } = await req.json(); // only prompt needed
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
  const { id, scores, overallScore,answers } = await req.json();

  if (!id || !scores || overallScore === undefined) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
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