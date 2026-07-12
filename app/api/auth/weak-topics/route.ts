// app/api/auth/weak-topics/route.ts
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SIMILARITY_THRESHOLD = 0.85; // how close two questions' meanings must be to count as "the same weak spot"

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

interface EmbeddingRow {
  question: string;
  topic: string;
  score: number | null;
  embedding: number[];
}

interface Cluster {
  centroid: number[];
  members: EmbeddingRow[];
}

// Greedy single-pass clustering: assign each item to the most similar existing
// cluster if it clears the threshold, else start a new cluster. Centroid is the
// running average of member vectors, so it drifts to represent the group as it grows.
function clusterBySimilarity(rows: EmbeddingRow[]): Cluster[] {
  const clusters: Cluster[] = [];

  for (const row of rows) {
    let bestCluster: Cluster | null = null;
    let bestSimilarity = -1;

    for (const cluster of clusters) {
      const sim = cosineSimilarity(row.embedding, cluster.centroid);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestSimilarity >= SIMILARITY_THRESHOLD) {
      const n = bestCluster.members.length;
      bestCluster.centroid = bestCluster.centroid.map(
        (v, i) => (v * n + row.embedding[i]) / (n + 1)
      );
      bestCluster.members.push(row);
    } else {
      clusters.push({ centroid: [...row.embedding], members: [row] });
    }
  }

  return clusters;
}

// Label a cluster using its most frequent topic string, since exact wording of
// "topic" is still a decent human-readable name even though we no longer rely
// on it for the grouping logic itself.
function labelCluster(members: EmbeddingRow[]): string {
  const counts: Record<string, number> = {};
  for (const m of members) {
    const t = m.topic || "General";
    counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export async function GET(req: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  const embeddingRows = await prisma.questionEmbedding.findMany({
    where: { session: { userId: user.id } },
    select: { question: true, topic: true, score: true, embedding: true },
  });

  const clusters = clusterBySimilarity(embeddingRows);

  const topicStats = clusters.map((cluster) => {
    const scored = cluster.members.filter((m) => typeof m.score === "number");
    const totalScore = scored.reduce((sum, m) => sum + (m.score as number), 0);
    return {
      topic: labelCluster(cluster.members),
      avgScore: scored.length ? Math.round(totalScore / scored.length) : 0,
      questionsAnswered: cluster.members.length,
    };
  });

  // weakest first — lowest avg score, but only clusters with enough data to be meaningful
  const weakTopics = topicStats
    .filter((t) => t.questionsAnswered >= 2) // ignore one-off flukes
    .sort((a, b) => a.avgScore - b.avgScore);

  return new Response(JSON.stringify({ topics: topicStats, weakTopics }), { status: 200 });
}