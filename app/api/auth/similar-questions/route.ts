import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getEmbedding } from "@/lib/embeddings";
import { getQuestionCollection } from "@/lib/chroma";

export async function POST(req: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return new Response(JSON.stringify({ error: "Missing question text" }), { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const queryEmbedding = await getEmbedding(text);
  const collection = await getQuestionCollection();

  // Chroma does the similarity search + the userId filter in one call, instead
  // of pulling every row into JS and looping (which is what this route used to
  // do against Postgres). nResults asks for a few extra since we'll drop the
  // exact-text self-match after the fact, same as the results-page dedup logic.
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 6,
    where: { userId: user.id },
  });

  const ids = results.ids?.[0] ?? [];
  const documents = results.documents?.[0] ?? [];
  const metadatas = results.metadatas?.[0] ?? [];
  const distances = results.distances?.[0] ?? [];

  const similarQuestions = ids
    .map((id, i) => {
      const meta = (metadatas[i] ?? {}) as Record<string, any>;
      return {
        id,
        question: documents[i] ?? "",
        topic: meta.topic ?? "",
        score: meta.score ?? null,
        sessionId: meta.sessionId ?? "",
        // Chroma's default space here is l2 (squared euclidean distance), not
        // cosine — smaller distance = more similar, the opposite direction from
        // the cosine "1 = identical" scale the old route used. Converting to a
        // 0-1-ish similarity score keeps the response shape familiar for the
        // frontend, which just sorts/displays it rather than doing math on it.
        similarity: 1 / (1 + distances[i]),
      };
    })
    .filter((r) => r.question !== text) // drop the exact-text self-match
    .slice(0, 5);

  return new Response(JSON.stringify({ similarQuestions }), { status: 200 });
}