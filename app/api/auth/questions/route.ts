import Groq from "groq-sdk";
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
export async function POST(req: Request) {
    const {prompt} = await req.json();
    const res = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{role: "user", content: prompt}],
    })
    const text = res.choices[0].message.content;
    if (!text) {
  return new Response(JSON.stringify({ error: "Empty response from Groq" }), { status: 500 });
}
    try {
  const questions = JSON.parse(text);
  return new Response(JSON.stringify(questions), { status: 200 });
} catch {
  return new Response(JSON.stringify({ error: "Failed to parse", raw: text }), { status: 500 });
}
}