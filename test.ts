import "dotenv/config";
import prisma from "./lib/prisma";
import { cosineSimilarity } from "./lib/embeddings";

async function test() {
  const rows = await prisma.questionEmbedding.findMany({
    select: { topic: true, embedding: true },
  });

  console.log(`Found ${rows.length} embeddings\n`);

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const sim = cosineSimilarity(rows[i].embedding, rows[j].embedding);
      console.log(
        `"${rows[i].topic}" vs "${rows[j].topic}": ${sim.toFixed(3)}`
      );
    }
  }
}

test().finally(() => prisma.$disconnect());