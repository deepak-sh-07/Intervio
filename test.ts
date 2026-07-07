
import { getEmbedding, cosineSimilarity } from "./lib/embeddings";

async function test() {
  const a = await getEmbedding("Hash Maps");
  const b = await getEmbedding("Hashing");
  const c = await getEmbedding("Dynamic Programming");

  console.log("Hash Maps vs Hashing:", cosineSimilarity(a, b));       // expect high, ~0.7-0.9
  console.log("Hash Maps vs DP:", cosineSimilarity(a, c));            // expect low, ~0.1-0.3
}

test();