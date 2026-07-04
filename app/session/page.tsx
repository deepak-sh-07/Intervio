"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
export default function SessionPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [qPrompt, setQPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [questions, setQuestions] = useState<{ id: number, question: string }[]>([]);
  const [answers, setAnswers] = useState<{ id: number, answer: string }[]>([]);
  const [currIndex, setCurrIndex] = useState(0)
  const [currQuestion, setCurrQuestion] = useState("");
  const [ans, setAns] = useState("")
  const { data: session, status } = useSession();
  const router = useRouter();
  const getQuestionCount = (duration: string) => {
    const mins = parseInt(duration.slice(0, 2), 10);
    // console.log("THis")

    if (mins <= 15) return 3;
    if (mins <= 30) return 6;
    if (mins <= 45) return 9;
    return 12; // 60 min
  }

  async function saveQuestionsToDB(questions: any[]) { //save those questions to db 
    const storedId = localStorage.getItem("CurrId");
    if (!storedId) return;
    const res = await fetch("/api/auth/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: storedId, questions: questions }),
    })
  }

  async function getQuestion(prompt?: string) { // create questions 
    // console.log("Prompt to send:", prompt || qPrompt);
    const finalPrompt = prompt || qPrompt;
    if (!finalPrompt) return;
    const res = await fetch("/api/auth/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPrompt }),
    });
    const data = await res.json();
    setQuestions(data);
    // console.log("Generated Questions:", data);
    saveQuestionsToDB(data);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  

  useEffect(() => {
    async function fetchAndPrepare() {
      const storedId = localStorage.getItem("CurrId");
      if (!storedId) return;

      const res = await fetch(`/api/auth/interview?id=${storedId}`);
      const data = await res.json();
      setSessionData(data);
      // console.log(data);
      const count = getQuestionCount(data.duration);
      console.log(count);
      setQuestionCount(count);
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        return;
      }
      // console.log(data);



      const prompt = `
You are an expert technical interviewer. Generate ${count} interview questions for the following session:

Role: ${data.role}
Company: ${data.company || "Not specified"}
Experience Level: ${data.level || "Not specified"}
Interview Type: ${data.type}
Difficulty: ${data.difficulty}
Skills to assess: ${data.skills.join(", ")}
Topics to cover: ${data.topics.join(", ")}
Additional focus: ${data.focus || "None"}

Rules:
- Questions should match the difficulty level
- Mix theory and practical questions
- Keep questions concise and clear

Respond ONLY with a JSON array, no markdown, no extra text:
[
  { "id": 1, "question": "..." },
  { "id": 2, "question": "..." }
]
            `;
      //       const prompt = `
      // You are an expert technical interviewer. Generate 10 interview questions for the following session:

      // Role: Software Engineer
      // Company: Meta
      // Experience Level: Beginner
      // Interview Type: Technical
      // Difficulty: Easy
      // Skills to assess: JavaScript, React, Node.js
      // Topics to cover: basic programming concepts, web development, problem-solving
      // Additional focus:  "None"

      // Rules:
      // - Questions should match the difficulty level
      // - Mix theory and practical questions
      // - Keep questions concise and clear

      // Respond ONLY with a JSON array, no markdown, no extra text:
      // [
      //   { "id": 1, "question": "..." },
      //   { "id": 2, "question": "..." }
      // ]
      //       `;
      setQPrompt(prompt);
      getQuestion(prompt);
    }

    fetchAndPrepare();
  }, []);

  if (status === "loading") return <p>Loading…</p>;
  if (!session) return null;

  const startInterview = () => {
    setCurrIndex(0);
    setCurrQuestion(questions[0].question);
  }
  const submitAnswer = () => {
    if (!ans.trim()) return;
    const trimmed = ans.trim();
  if (trimmed.length < 15) {  // reject too-short/placeholder answers
    alert("Please provide a more complete answer before continuing.");
    return;
  }
    const updatedAnswers = [...answers, { id: currIndex + 1, answer: ans }];
    setAnswers(updatedAnswers);
    setAns("");

    const nextIndex = currIndex + 1;
    console.log("NextIndex = ", nextIndex, "questioncount = ", questionCount);

    if (nextIndex < questionCount) {
      setCurrIndex(nextIndex);
      setCurrQuestion(questions[nextIndex].question);
    } else {
      console.log("Interview complete!");
      evaluate(updatedAnswers);
    }
  }

  async function evaluate(answers: any[]) {
    if (!sessionData) return;
    const scoringPrompt = `
You are an expert interviewer. Evaluate each answer for this ${sessionData.type} interview.

Role: ${sessionData.role}
Difficulty: ${sessionData.difficulty}

Scoring rules:
- If an answer is blank, "..", a placeholder, unrelated to the question, or shows no genuine attempt to answer, score it 0 and say so in the feedback.
- Do not give credit for effort, length, or confident tone alone — score only the technical correctness and completeness of the actual content.
- Be strict and realistic, as a real technical interviewer would be.

Questions and Answers:
${answers.map((a, i) => `Q${i + 1}: ${questions[i].question}\nA${i + 1}: ${a.answer}`).join("\n\n")}

Respond ONLY with a JSON array, no markdown, no extra text:
[
  { "id": 1, "score": 85, "feedback": "Good explanation but missed X..." },
  { "id": 2, "score": 70, "feedback": "..." }
]
`;
    console.log("Scoring Prompt:", scoringPrompt);
    const res = await fetch("/api/auth/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: scoringPrompt }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("Score API error:", err);
      return;
    }
    const scores = await res.json();

    const overallScore = Math.round(scores.reduce((sum: number, s: any) => sum + s.score, 0) / scores.length);

    const result = await fetch("/api/auth/answers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: localStorage.getItem("CurrId"),
        scores,
        overallScore,
        answers,
      }),
    });
    if (!result.ok) {
      let err;
      try {
        err = await result.json();
      } catch {
        err = await result.text();
      }
      console.error("Score PATCH API error:", err);
      return;
    }
    router.push("/results");
  }
  return (
    <div style={{ background: "#000", minHeight: "100vh", padding: "0", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "0.5px solid #333" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "13px", color: "#666", textTransform: "uppercase", letterSpacing: "0.08em" }}>Interview session</span>
            <span style={{ fontSize: "22px", fontWeight: 500, color: "#fff" }}>
              {sessionData?.role}{sessionData?.company ? ` — ${sessionData.company}` : ""}
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
              {[sessionData?.type, sessionData?.difficulty, sessionData?.duration].filter(Boolean).map((chip) => (
                <span key={chip} style={{ padding: "3px 10px", borderRadius: "20px", border: "0.5px solid #2a2a2a", fontSize: "13px", color: "#666" }}>{chip}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", color: "#666", whiteSpace: "nowrap" }}>{currIndex + 1} of {questionCount}</span>
            <div style={{ width: "120px", height: "3px", background: "#222", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#fff", borderRadius: "2px", width: `${questionCount > 0 ? ((currIndex + 1) / questionCount) * 100 : 0}%`, transition: "width 0.3s ease" }} />
            </div>
          </div>
        </div>

        {/* Question card */}
        <div style={{ background: "#0a0a0a", border: "0.5px solid #222", borderRadius: "12px", padding: "2.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "12px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            Question {currIndex + 1}
          </div>
          <div style={{ fontSize: "19px", color: "#e8e8e8", lineHeight: "1.6" }}>
            {currQuestion || "Press start to begin the interview"}
          </div>
        </div>

        {/* Answer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <span style={{ fontSize: "13px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your answer</span>
          <textarea
            value={ans}
            onChange={(e) => setAns(e.target.value)}
            placeholder="Type your answer here…"
            disabled={!currQuestion}
            style={{ width: "100%", background: "#0a0a0a", border: "0.5px solid #333", borderRadius: "8px", padding: "1rem", color: "#e8e8e8", fontSize: "16px", lineHeight: "1.6", resize: "none", height: "160px", outline: "none", fontFamily: "sans-serif", opacity: currQuestion ? 1 : 0.4 }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.5rem" }}>
          <span style={{ fontSize: "13px", color: "#444" }}>
            {answers.length} of {questionCount} answered
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            {!currQuestion ? (
              <button onClick={startInterview}
                style={{ padding: "10px 28px", borderRadius: "8px", fontSize: "15px", fontWeight: 500, cursor: "pointer", border: "0.5px solid #fff", background: "#fff", color: "#000" }}>
                Start interview
              </button>
            ) : (
              <button onClick={submitAnswer}
                style={{ padding: "10px 28px", borderRadius: "8px", fontSize: "15px", fontWeight: 500, cursor: "pointer", border: "0.5px solid #fff", background: "#fff", color: "#000" }}>
                Next
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}