const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Read static files once at startup
let HTML_CONTENT = "";
let CSS_CONTENT = "";
let JS_CONTENT = "";

try {
  const htmlPath = path.join(__dirname, "tree.html");
  const cssPath = path.join(__dirname, "tree.css");
  const jsPath = path.join(__dirname, "tree.js");

  if (fs.existsSync(htmlPath)) {
    HTML_CONTENT = fs.readFileSync(htmlPath, "utf-8");
  }
  if (fs.existsSync(cssPath)) {
    CSS_CONTENT = fs.readFileSync(cssPath, "utf-8");
  }
  if (fs.existsSync(jsPath)) {
    JS_CONTENT = fs.readFileSync(jsPath, "utf-8");
  }
} catch (err) {
  console.error("Error reading static files:", err.message);
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  if (HTML_CONTENT) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(HTML_CONTENT);
  } else {
    res.status(500).send("HTML file not available");
  }
});

app.get("/tree.css", (req, res) => {
  if (CSS_CONTENT) {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.send(CSS_CONTENT);
  } else {
    res.status(500).send("CSS file not available");
  }
});

app.get("/tree.js", (req, res) => {
  if (JS_CONTENT) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.send(JS_CONTENT);
  } else {
    res.status(500).send("JS file not available");
  }
});

app.get("/api/health", (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const hasHuggingFaceKey = Boolean(process.env.HF_TOKEN);

  res.json({
    ok: true,
    aiConfigured: hasGeminiKey || hasHuggingFaceKey,
    provider: hasGeminiKey ? "gemini" : hasHuggingFaceKey ? "huggingface" : "mock",
  });
});

app.post("/api/ai", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const conversation = buildConversation(message, history);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (geminiKey) {
      const generatedText = await callGemini(conversation, geminiKey);
      return res.json({
        generated_text: generatedText || getMockResponse(),
        source: generatedText ? "gemini" : "mock",
      });
    }

    const huggingFaceToken = process.env.HF_TOKEN;

    if (huggingFaceToken) {
      const generatedText = await callHuggingFace(conversation, huggingFaceToken);
      return res.json({
        generated_text: generatedText || getMockResponse(),
        source: generatedText ? "huggingface" : "mock",
      });
    }

    return res.json({
      generated_text: getMockResponse(),
      source: "mock",
      warning:
        "No AI key is configured. Add GEMINI_API_KEY in Vercel environment variables to enable AI.",
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

async function callGemini(conversation, apiKey) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const systemMessage = conversation.find((item) => item.role === "system");
  const contents = conversation
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: systemMessage
        ? {
            parts: [{ text: systemMessage.content }],
          }
        : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: 900,
        temperature: 0.55,
        topP: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const generatedText =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

  return cleanGeneratedText(generatedText);
}

async function callHuggingFace(conversation, token) {
  const model = process.env.HF_MODEL || "openai/gpt-oss-20b:fastest";
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
  return cleanGeneratedText(data.choices?.[0]?.message?.content || "");
}

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
