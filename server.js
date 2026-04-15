const path = require("path");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "tree.html"));
});

app.get("/tree.css", (req, res) => {
  res.sendFile(path.join(__dirname, "tree.css"));
});

app.get("/tree.js", (req, res) => {
  res.sendFile(path.join(__dirname, "tree.js"));
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.HF_TOKEN),
  });
});

app.post("/api/ai", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const HF_TOKEN = process.env.HF_TOKEN;

    if (!HF_TOKEN) {
      return res.json({
        generated_text: getMockResponse(),
        source: "mock",
        warning: "HF_TOKEN is not configured. Add it in Vercel environment variables to enable AI.",
      });
    }

    const model = process.env.HF_MODEL || "openai/gpt-oss-20b:fastest";
    const conversation = buildConversation(message, history);
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: conversation,
        max_tokens: 420,
        temperature: 0.55,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const generatedText = cleanGeneratedText(data.choices?.[0]?.message?.content || "");

    res.json({
      generated_text: generatedText || getMockResponse(),
      source: generatedText ? "huggingface" : "mock",
    });
  } catch (error) {
    console.error("AI API Error:", error);
    res.json({
      generated_text: getMockResponse(),
      source: "mock",
      warning: `AI provider failed, so a fallback reply was used. ${error.message}`,
    });
  }
});

function cleanGeneratedText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\bsansserif\b/gi, "sans serif")
    .replace(/\buserinterface\b/gi, "user interface")
    .replace(/\bmessagebubble(s)?\b/gi, "message bubble$1")
    .replace(/\blineheight\b/gi, "line height")
    .replace(/\bletterspacing\b/gi, "letter spacing")
    .replace(/\bfontsize\b/gi, "font size")
    .replace(/\bfontweight\b/gi, "font weight")
    .replace(/\bchatgpt\b/gi, "ChatGPT")
    .replace(
      /\b(minimal|clean|familiar|consistent|subtle|clear|simple|readable|harmonious)(design|interface|layout|fonts|colors|spacing|message|bubble|controls|typography)\b/gi,
      "$1 $2",
    )
    .trim();
}

function buildConversation(message, history = []) {
  const cleanedHistory = Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").slice(0, 1800),
        }))
        .filter((item) => item.content.trim())
        .slice(-12)
    : [];

  return [
    {
      role: "system",
      content:
        "You are Branch Chat, a thoughtful assistant inside a ChatGPT-style app. Be useful, direct, and conversational. Use the conversation context when it helps. Write with clean spacing and readable paragraphs. Use short bullets only when helpful. If the user asks for code, be precise. If they ask an open question, give a clear answer with a little reasoning. Do not say you are a mock or fallback assistant.",
    },
    ...cleanedHistory,
    {
      role: "user",
      content: String(message).slice(0, 4000),
    },
  ];
}

function getMockResponse() {
  const responses = [
    "That's an interesting point. Can you elaborate?",
    "I see what you mean. What are your thoughts on this?",
    "Great question. Let me think about that.",
    "I understand. What direction should this branch take?",
    "That's a good observation. What comes next?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
