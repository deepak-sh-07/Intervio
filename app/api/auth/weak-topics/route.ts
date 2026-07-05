// app/api/auth/weak-topics/route.ts
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: user.id, status: "Completed" },
    select: { feedback: true },
  });

  // topic -> { totalScore, count }
  const topicMap: Record<string, { totalScore: number; count: number }> = {};

  for (const session of sessions) {
    if (!session.feedback) continue;
    let parsed: any[];
    try {
      parsed = JSON.parse(session.feedback);
    } catch {
      continue; // skip malformed/old data
    }
    if (!Array.isArray(parsed)) continue;

    for (const item of parsed) {
      const topic = item.topic || "General";
      const score = typeof item.score === "number" ? item.score : 0;
      if (!topicMap[topic]) topicMap[topic] = { totalScore: 0, count: 0 };
      topicMap[topic].totalScore += score;
      topicMap[topic].count += 1;
    }
  }

  const topicStats = Object.entries(topicMap).map(([topic, { totalScore, count }]) => ({
    topic,
    avgScore: Math.round(totalScore / count),
    questionsAnswered: count,
  }));

  // weakest first — lowest avg score, but only topics with enough data to be meaningful
  const weakTopics = topicStats
    .filter((t) => t.questionsAnswered >= 2) // ignore one-off flukes
    .sort((a, b) => a.avgScore - b.avgScore);

  return new Response(JSON.stringify({ topics: topicStats, weakTopics }), { status: 200 });
}