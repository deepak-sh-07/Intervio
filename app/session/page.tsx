"use client";
import { useState, useEffect } from 'react';

export default function SessionPage() {
  const [sessionData, setSessionData] = useState(null);
  const [qPrompt, setQPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(0);

  const getQuestionCount = (duration: string) => {
    const mins = parseInt(duration);
    if (mins <= 15) return 3;
    if (mins <= 30) return 6;
    if (mins <= 45) return 9;
    return 12; // 60 min
  }

  useEffect(() => {
    async function fetchAndPrepare() {
      const storedId = localStorage.getItem("CurrId");
      if (!storedId) return;

      const res = await fetch(`/api/auth/interview?id=${storedId}`);
      const data = await res.json();
      setSessionData(data);

      const count = getQuestionCount(data.duration);
      setQuestionCount(count);

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
      setQPrompt(prompt);
    }

    fetchAndPrepare();
  }, []);

  return (
    <div>
      <h1>Session Page</h1>
      <p>This is the session page content.</p>
    </div>
  );
}