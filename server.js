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
    const { message } = req.body;

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

    const response = await fetch("https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: message,
        options: {
          wait_for_model: true,
        },
        parameters: {
          max_new_tokens: 80,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    let generatedText = "";

    if (Array.isArray(data) && data.length > 0) {
      generatedText = data[0].generated_text || "";
      if (generatedText.startsWith(message)) {
        generatedText = generatedText.substring(message.length).trim();
      }
    } else if (data.generated_text) {
      generatedText = data.generated_text;
    }

    res.json({
      generated_text: generatedText || getMockResponse(),
      source: generatedText ? "huggingface" : "mock",
    });
  } catch (error) {
    console.error("AI API Error:", error);
    res.json({
      generated_text: getMockResponse(),
      source: "mock",
      warning: "AI provider failed, so a fallback reply was used.",
    });
  }
});

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
