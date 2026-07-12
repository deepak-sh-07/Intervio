"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
interface ScoreItem {
  id: number;
  score: number;
  feedback: string;
}

interface AnswerItem {
  id: number;
  answer: string;
}

interface QuestionItem {
  id: number;
  question: string;
}

interface SessionData {
  role: string;
  company: string;
  difficulty: string;
  score: number;
  questions: QuestionItem[];
  answers: string;
  feedback: string;
}

interface SimilarQuestion {
  id: string;
  question: string;
  topic: string;
  score: number | null;
  sessionId: string;
  similarity: number;
}

export default function ResultsPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  // Per-question similar-questions state, keyed by question id.
  // null = not fetched yet, [] = fetched but no matches, array = results.
  const [similarMap, setSimilarMap] = useState<Record<number, SimilarQuestion[] | null>>({});
  const [similarLoading, setSimilarLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function fetchResults() {


      const idFromUrl = searchParams.get("id");
      const id = idFromUrl || localStorage.getItem("CurrId"); // params when u touch view from dashboard and localstorage when u are going to results after giving interview answers

      if (!id) return;

      const res = await fetch(`/api/auth/interview?id=${id}`);
      const data = await res.json();

      setSession(data);
      setQuestions(data.questions || []);
      setScores(JSON.parse(data.feedback || "[]"));
      setAnswers(JSON.parse(data.answers || "[]"));
      setLoading(false);
    }

    fetchResults();
  }, []);

  async function loadSimilar(q: QuestionItem) {
    // Note: this question's own embedding is already in the DB (stored right
    // after this interview was scored), so it will come back as a near-1.0
    // match against itself. We filter that exact-text match out at render time
    // rather than here, since "same question text" is a simpler and more
    // reliable check than trying to exclude by session/question id.
    setSimilarLoading((prev) => ({ ...prev, [q.id]: true }));
    try {
      const res = await fetch("/api/auth/similar-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q.question }),
      });
      if (!res.ok) {
        setSimilarMap((prev) => ({ ...prev, [q.id]: [] }));
        return;
      }
      const data = await res.json();
      setSimilarMap((prev) => ({ ...prev, [q.id]: data.similarQuestions || [] }));
    } catch (err) {
      console.error("Failed to load similar questions:", err);
      setSimilarMap((prev) => ({ ...prev, [q.id]: [] }));
    } finally {
      setSimilarLoading((prev) => ({ ...prev, [q.id]: false }));
    }
  }

  function scoreColor(score: number) {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  }

  if (loading) {
    return (
      <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#666", fontSize: "14px" }}>Loading results...</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "3rem 2.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "0.5px solid #333" }}>
          <span style={{ fontSize: "13px", color: "#666", textTransform: "uppercase", letterSpacing: "0.08em" }}>Interview results</span>
          <h1 style={{ fontSize: "26px", fontWeight: 500, color: "#fff", margin: "6px 0 8px" }}>
            {session?.role}{session?.company ? ` — ${session.company}` : ""}
          </h1>
          <div style={{ display: "flex", gap: "8px" }}>
            {[session?.difficulty].filter(Boolean).map((chip) => (
              <span key={chip} style={{ padding: "4px 12px", borderRadius: "20px", border: "0.5px solid #2a2a2a", fontSize: "13px", color: "#666" }}>{chip}</span>
            ))}
          </div>
        </div>

        {/* Overall score */}
        <div style={{ background: "#0a0a0a", border: "0.5px solid #222", borderRadius: "14px", padding: "2.5rem", marginBottom: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Overall score</span>
          <span style={{ fontSize: "80px", fontWeight: 600, color: scoreColor(session?.score || 0), lineHeight: 1 }}>
            {session?.score}
          </span>
          <span style={{ fontSize: "20px", color: "#444", marginTop: "4px" }}>/ 100</span>
          <p style={{ fontSize: "14px", color: "#555", marginTop: "1.25rem" }}>
            {(session?.score || 0) >= 80 ? "Excellent performance!" : (session?.score || 0) >= 60 ? "Good effort, room to improve." : "Keep practicing!"}
          </p>
        </div>

        {/* Per question breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <span style={{ fontSize: "13px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Question breakdown</span>

          {questions.map((q, i) => {
            const score = scores.find((s) => s.id === q.id);
            const answer = answers.find((a) => a.id === q.id);
            const similar = similarMap[q.id];
            const isLoadingSimilar = similarLoading[q.id];

            return (
              <div key={q.id} style={{ background: "#0a0a0a", border: "0.5px solid #222", borderRadius: "12px", padding: "1.75rem" }}>

                {/* Question header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Question {i + 1}</span>
                  {score && (
                    <span style={{ fontSize: "15px", fontWeight: 600, color: scoreColor(score.score) }}>
                      {score.score}/100
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p style={{ fontSize: "16px", color: "#e8e8e8", lineHeight: "1.6", marginBottom: "1.25rem" }}>
                  {q.question}
                </p>

                {/* Your answer */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Your answer</span>
                  <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.6", background: "#111", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                    {answer?.answer || "No answer provided"}
                  </p>
                </div>

                {/* AI feedback */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>AI feedback</span>
                  <p style={{ fontSize: "14px", color: "#aaa", lineHeight: "1.6", borderLeft: "2px solid #333", paddingLeft: "0.75rem" }}>
                    {score?.feedback || "No feedback available"}
                  </p>
                </div>

                {/* Similar past questions */}
                <div>
                  {similar === undefined && (
                    <button
                      onClick={() => loadSimilar(q)}
                      disabled={isLoadingSimilar}
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        background: "transparent",
                        border: "0.5px solid #2a2a2a",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        cursor: isLoadingSimilar ? "default" : "pointer",
                      }}
                    >
                      {isLoadingSimilar ? "Searching..." : "Find similar past questions"}
                    </button>
                  )}

                  {similar && similar.length === 0 && (
                    <p style={{ fontSize: "13px", color: "#555" }}>No similar past questions found yet.</p>
                  )}

                  {similar && similar.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                        Similar past questions
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {similar
                          .filter((s) => s.question !== q.question)
                          .slice(0, 3)
                          .map((s) => (
                            <div
                              key={s.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: "12px",
                                background: "#111",
                                borderRadius: "8px",
                                padding: "0.65rem 0.9rem",
                              }}
                            >
                              <span style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.5" }}>{s.question}</span>
                              {s.score !== null && (
                                <span style={{ fontSize: "12px", fontWeight: 600, color: scoreColor(s.score), whiteSpace: "nowrap" }}>
                                  {s.score}/100
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
          <button
            onClick={() => window.location.href = "/dashboard"}
            style={{ padding: "10px 28px", borderRadius: "8px", fontSize: "15px", fontWeight: 500, cursor: "pointer", border: "0.5px solid #fff", background: "#fff", color: "#000" }}>
            Back to dashboard
          </button>
        </div>

      </div>
    </div>
  );
}