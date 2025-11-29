import { config } from "../config/env.js";

/**
 * Safely extract a JSON string from raw AI text.
 */
function extractJsonString(raw) {
  if (!raw) return "";

  let text = raw.trim();

  // 1) Remove ```json or ``` fences if present
  text = text.replace(/```json/gi, "```").trim();
  if (text.startsWith("```")) {
    const endFence = text.lastIndexOf("```");
    if (endFence !== -1) {
      text = text.slice(3, endFence).trim();
    }
  }

  // 2) Take substring from first '{' to last '}' (in case extra text comes)
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

/**
 * Core function that talks to Gemini to generate one study pack.
 */
async function callGeminiStudyPack(topicName, difficulty) {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }

  const systemPrompt = `
You are an expert academic content generator. Your job is to take any study topic and generate a fully structured, clean, educational breakdown.
You MUST ALWAYS return the response strictly in JSON format only. No extra text, no explanations, no markdown.
JSON structure:
{
  "title": "<topic>",
  "overview": "<100-200 word intro>",
  "modules": [
    {
      "name": "<module title>",
      "summary": "<150-250 words>",
      "keyPoints": ["point1", "point2"],
      "keyTerms": ["term1", "term2"]
    }
  ],
  "flashcards": [
    { "question": "<term or concept>", "answer": "<short definition>" }
  ],
  "mcqs": [
    {
      "question": "<MCQ question>",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "<why this answer is correct>"
    }
  ],
  "subjectiveQuestions": [
    {
      "question": "<long-form question>",
      "hintKeywords": ["keyword1", "keyword2"]
    }
  ],
  "revisionPlan": [
    {
      "dayIndex": 1,
      "tasks": ["Read module 1", "Review flashcards"]
    }
  ]
}
Rules:
- Generate 4–8 modules.
- Generate at least 10 flashcards.
- Generate 8–12 MCQs.
- Generate 5–10 subjective questions.
- Make revisionPlan at least 7 days long.
- Use clear, exam-friendly language.
`;

  const userPrompt = `Generate a complete study pack for the topic: "${topicName}" with difficulty: "${difficulty}". Target learner: college student preparing for exams. Only output JSON.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;

  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    // Force Gemini to respond as JSON
    generationConfig: {
      response_mime_type: "application/json"
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Gemini API error:", text);
    throw new Error("AI provider error");
  }

  const data = await resp.json();

  // Gemini v1beta style: candidates[0].content.parts[*].text
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const combinedText = parts.map((p) => p.text || "").join("\n").trim();

  const jsonString = extractJsonString(combinedText);

  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (err) {
    console.error("Failed to parse AI JSON:", err.message);
    console.error("Raw combinedText (first 400 chars):", combinedText.slice(0, 400));
    console.error("Extracted jsonString (first 400 chars):", jsonString.slice(0, 400));
    throw new Error("AI returned invalid JSON");
  }
}

/**
 * Provider-agnostic wrapper. Later you can add OpenAI, etc.
 */
export async function generateStudyPack(topicName, difficulty = "Medium") {
  const provider = (config.aiProvider || "gemini").toLowerCase();

  if (provider === "gemini") {
    return await callGeminiStudyPack(topicName, difficulty);
  }

  // Fallback: still use Gemini for now
  return await callGeminiStudyPack(topicName, difficulty);
}
