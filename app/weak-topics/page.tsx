"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface TopicStat {
  topic: string;
  avgScore: number;
  questionsAnswered: number;
  questions: { question: string; score: number | null }[];
}

function scoreColor(s: number) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}

export default function WeakTopicsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [topics, setTopics] = useState<TopicStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  useEffect(() => {
    async function load() {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/auth/weak-topics");
        if (!res.ok) return;
        const data = await res.json();
        // full list, weakest first — includes low-data clusters the dashboard card hides
        const sorted = (data.topics || []).sort(
          (a: TopicStat, b: TopicStat) => a.avgScore - b.avgScore
        );
        setTopics(sorted);
      } catch (err) {
        console.error("Failed to load weak topics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status]);

  if (status === "loading" || loading) {
    return <p className="p-6 text-gray-400 text-sm">Loading…</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">Weak topics</h1>
        <p className="text-sm text-gray-400 mb-6">
          Ranked by average score across similar past questions, weakest first.
        </p>

        {topics.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
            No topic data yet — complete a few interview sessions to see this.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {topics.map((t) => (
  <div key={t.topic}>
    <button
      onClick={() => setExpandedTopic(expandedTopic === t.topic ? null : t.topic)}
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-gray-800">{t.topic}</p>
        <p className="text-xs text-gray-400 mt-0.5">
                      {t.questionsAnswered} question{t.questionsAnswered === 1 ? "" : "s"}
                      {" Touch to expand for details."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-semibold px-2.5 py-1 rounded-full"
          style={{
            color: scoreColor(t.avgScore),
            backgroundColor: `${scoreColor(t.avgScore)}1a`,
          }}
        >
          {t.avgScore}%
        </span>
        <span className="text-gray-300 text-xs">
          {expandedTopic === t.topic ? "▲" : "▼"}
        </span>
      </div>
    </button>

    {expandedTopic === t.topic && (
      <div className="px-5 pb-4 pt-1 bg-gray-50/60">
        {t.questions.map((q, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-2 border-t border-gray-100 first:border-t-0">
            <p className="text-sm text-gray-600">{q.question}</p>
            {q.score !== null && (
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: scoreColor(q.score) }}
              >
                {q.score}%
              </span>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
))}
          </div>
        )}
      </div>
    </div>
  );
}