"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";

export default function SessionPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [qPrompt, setQPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [questions, setQuestions] = useState<{ id: number, question: string, topic?: string }[]>([]);
  const [answers, setAnswers] = useState<{ id: number, answer: string }[]>([]);
  const [currIndex, setCurrIndex] = useState(0)
  const [currQuestion, setCurrQuestion] = useState("");
  const [ans, setAns] = useState("")
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Voice-to-text state ─────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const getQuestionCount = (duration: string) => {
    const mins = parseInt(duration.slice(0, 2), 10);

    if (mins <= 15) return 3;
    if (mins <= 30) return 6;
    if (mins <= 45) return 9;
    return 12; // 60 min
  }
  async function getWeakTopicsContext(): Promise<string> {
  try {
    const res = await fetch("/api/auth/weak-topics");
    if (!res.ok) return "";
    const data = await res.json();
    const weak = (data.weakTopics || []) as { topic: string; avgScore: number }[];
    if (weak.length === 0) return "";

    const lines = weak
      .slice(0, 5) // don't overload the prompt with the whole history
      .map((t) => `- ${t.topic} (avg score: ${t.avgScore}%)`)
      .join("\n");

    return `
The candidate has historically struggled with these topics, based on past interview performance:
${lines}

If any of these topics are relevant to the role/skills/topics listed above, prioritize including 1-2 questions on them. If none are relevant to this specific session, ignore this section entirely — do not force unrelated topics in.
`;
  } catch (err) {
    console.error("Failed to load weak topics for prompt:", err);
    return ""; // never let this block question generation if it fails
  }
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
    const finalPrompt = prompt || qPrompt;
    if (!finalPrompt) return;
    const res = await fetch("/api/auth/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPrompt }),
    });
    const data = await res.json();
    setQuestions(data);
    saveQuestionsToDB(data);
    return data; // ⬅️ add this
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    async function fetchAndPrepare() {
      if (status !== "authenticated") return;

      const storedId = localStorage.getItem("CurrId");
      if (!storedId) return;

      const res = await fetch(`/api/auth/interview?id=${storedId}`); // fetch the interview session data from the database
      const data = await res.json();
      setSessionData(data);
      const count = getQuestionCount(data.duration);
      setQuestionCount(count);

      let loadedQuestions = data.questions;

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        const weakTopicsContext = await getWeakTopicsContext();
        console.log("Weak topics context:", weakTopicsContext);
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
${weakTopicsContext}

Rules:
- Questions should match the difficulty level
- Mix theory and practical questions
- Keep questions concise and clear
- Each question must be tagged with exactly one specific topic it tests (e.g. "React Hooks", "SQL Joins", "Big-O Complexity") — be precise, not generic like "Programming"

Respond ONLY with a JSON array, no markdown, no extra text:
[
  { "id": 1, "question": "...", "topic": "..." },
  { "id": 2, "question": "...", "topic": "..." }
]
`;
        setQPrompt(prompt);
        await getQuestion(prompt); // awaited so we can use the result below
      }

      // restore progress if this session has saved, incomplete answers
      if (data.answers && data.status !== "Completed") {
        try {
          const savedAnswers = JSON.parse(data.answers);
          if (Array.isArray(savedAnswers) && savedAnswers.length > 0 && savedAnswers.length < count) {
            setAnswers(savedAnswers);
            const resumeIndex = savedAnswers.length;
            setCurrIndex(resumeIndex);
            const qs = loadedQuestions?.length ? loadedQuestions : questions;
            if (qs && qs[resumeIndex]) {
              setCurrQuestion(qs[resumeIndex].question);
            }
          }
        } catch (e) {
          console.error("Failed to parse saved answers:", e);
        }
      }
    }

    fetchAndPrepare();
  }, [status]);

  // ── Set up SpeechRecognition once on mount ──────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false); // Firefox / unsupported browser
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;      // keep listening across pauses, don't stop after one sentence
    recognition.interimResults = false; // only commit finished phrases, avoids garbled partial text
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setAns((prev) => (prev ? prev.trim() + " " + transcript.trim() : transcript.trim()));
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false); // browser can stop on its own after a silence timeout
    };

    recognitionRef.current = recognition;
  }, []);

  // Inject the pulse keyframes once (inline styles can't declare @keyframes directly)
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }

  if (status === "loading") return <p>Loading…</p>;
  if (!session) return null;

  const startInterview = () => {
    setCurrIndex(0);
    setCurrQuestion(questions[0].question);
  }

  const submitAnswer = () => {
    const trimmed = ans.trim();
    if (trimmed.length < 15) {  // reject too-short/placeholder answers
      alert("Please provide a more complete answer before continuing.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const updatedAnswers = [...answers, { id: currIndex + 1, answer: ans }];
    setAnswers(updatedAnswers);
    setAns("");

    // save progress to DB so refresh doesn't lose it
    const storedId = localStorage.getItem("CurrId");
    if (storedId) {
      fetch("/api/auth/answers", { // to save single answer to the database so that if the user refreshes the page, the progress is not lost
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: storedId, answers: updatedAnswers }),
      }).catch((err) => console.error("Failed to save progress:", err));
    }

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
${answers.map((a, i) => `Q${i + 1} [Topic: ${questions[i].topic || "General"}]: ${questions[i].question}\nA${i + 1}: ${a.answer}`).join("\n\n")}

Respond ONLY with a JSON array, no markdown, no extra text:
[
  { "id": 1, "topic": "...", "score": 85, "feedback": "Good explanation but missed X..." },
  { "id": 2, "topic": "...", "score": 70, "feedback": "..." }
]
`;

    console.log("Scoring Prompt:", scoringPrompt);
    const res = await fetch("/api/auth/answers", { // to evaluate the answers and get the scores and feedback from the Groq API
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

    const result = await fetch("/api/auth/answers", { // to update the interview session with the final score and feedback after the interview is completed
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your answer</span>
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={!currQuestion}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "5px 12px", borderRadius: "20px", fontSize: "12px",
                  border: `0.5px solid ${isListening ? "#dc2626" : "#333"}`,
                  background: isListening ? "#dc262622" : "transparent",
                  color: isListening ? "#f87171" : "#666",
                  cursor: currQuestion ? "pointer" : "not-allowed",
                  opacity: currQuestion ? 1 : 0.4,
                }}
              >
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: isListening ? "#dc2626" : "#666",
                  animation: isListening ? "pulse 1.2s infinite" : "none",
                }} />
                {isListening ? "Listening…" : "Speak answer"}
              </button>
            )}
          </div>
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