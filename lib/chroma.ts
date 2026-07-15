import { ChromaClient } from "chromadb";

export const chroma = new ChromaClient({ host: "localhost", port: 8000 });

export async function getQuestionCollection() {
  return chroma.getOrCreateCollection({
    name: "question_embeddings",
    metadata: { "hnsw:space": "cosine" },
  });
}