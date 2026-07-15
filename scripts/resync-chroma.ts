// scripts/resync-chroma.ts
// Run once after recreating the Chroma collection with cosine space.
// Usage: npx tsx scripts/resync-chroma.ts
import prisma from "@/lib/prisma";
import { getQuestionCollection } from "@/lib/chroma";

async function main() {
  const rows = await prisma.questionEmbedding.findMany({
    include: { session: { select: { userId: true } } },
  });

  if (rows.length === 0) {
    console.log("No rows to sync.");
    return;
  }

  const collection = await getQuestionCollection();

  await collection.add({
    ids: rows.map((r) => r.id),
    embeddings: rows.map((r) => r.embedding),
    documents: rows.map((r) => r.question),
    metadatas: rows.map((r) => ({
      topic: r.topic,
      score: r.score,
      sessionId: r.sessionId,
      userId: r.session.userId,
      questionId: r.questionId,
    })),
  });

  console.log(`Synced ${rows.length} rows into Chroma.`);
}

main()
  .catch((err) => {
    console.error("Resync failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));