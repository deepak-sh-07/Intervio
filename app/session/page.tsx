"use client";
import { useState, useEffect } from 'react';

export default function SessionPage() {
  const [sessionData, setSessionData] = useState(null);
  const [qPrompt, setQPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [questions, setQuestions] = useState([]);
  const getQuestionCount = (duration: string) => {
    const mins = parseInt(duration);
    if (mins <= 15) return 3;
    if (mins <= 30) return 6;
    if (mins <= 45) return 9;
    return 12; // 60 min
  }
  async function getQuestion(prompt?: string) {
    // console.log("Prompt to send:", prompt || qPrompt);
    const finalPrompt = prompt || qPrompt;
    if(!finalPrompt) return;
    const res = await fetch("/api/auth/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: finalPrompt }),
    });
    const data = await res.json();
    setQuestions(data);
    console.log("Generated Questions:", data);
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

//       const prompt = `
// You are an expert technical interviewer. Generate ${count} interview questions for the following session:

// Role: ${data.role}
// Company: ${data.company || "Not specified"}
// Experience Level: ${data.level || "Not specified"}
// Interview Type: ${data.type}
// Difficulty: ${data.difficulty}
// Skills to assess: ${data.skills.join(", ")}
// Topics to cover: ${data.topics.join(", ")}
// Additional focus: ${data.focus || "None"}

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
      const prompt = `
You are an expert technical interviewer. Generate 10 interview questions for the following session:

Role: Software Engineer
Company: Meta
Experience Level: Beginner
Interview Type: Technical
Difficulty: Easy
Skills to assess: JavaScript, React, Node.js
Topics to cover: basic programming concepts, web development, problem-solving
Additional focus:  "None"

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
      getQuestion(prompt);
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