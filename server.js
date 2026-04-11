import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.get('/', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'tree.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(404).send('File not found');
  }
});

app.get('/tree.css', (req, res) => {
  try {
    const css = readFileSync(join(__dirname, 'tree.css'), 'utf8');
    res.setHeader('Content-Type', 'text/css');
    res.send(css);
  } catch (error) {
    res.status(404).send('CSS file not found');
  }
});

app.get('/tree.js', (req, res) => {
  try {
    const js = readFileSync(join(__dirname, 'tree.js'), 'utf8');
    res.setHeader('Content-Type', 'application/javascript');
    res.send(js);
  } catch (error) {
    res.status(404).send('JS file not found');
  }
});

// Hugging Face API endpoint
app.post('/api/ai', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get token from environment variable
        const HF_TOKEN = process.env.HF_TOKEN;

        if (!HF_TOKEN) {
            console.warn('HF_TOKEN not set, using mock response');
            return res.json({
                generated_text: getMockResponse(message)
            });
        }

        const response = await fetch(
            'https://api-inference.huggingface.co/models/distilgpt2',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: message,
                    parameters: {
                        max_length: 100,
                        temperature: 0.7,
                        do_sample: true,
                        pad_token_id: 50256
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract the generated text
        let generatedText = '';
        if (Array.isArray(data) && data.length > 0) {
            generatedText = data[0].generated_text || '';
            // Remove the input message from the response if it's included
            if (generatedText.startsWith(message)) {
                generatedText = generatedText.substring(message.length).trim();
            }
        } else if (data.generated_text) {
            generatedText = data.generated_text;
        }

        if (!generatedText) {
            generatedText = getMockResponse(message);
        }

        res.json({ generated_text: generatedText });

    } catch (error) {
        console.error('AI API Error:', error);
        res.json({
            generated_text: getMockResponse(message)
        });
    }
});

function getMockResponse(message) {
    const responses = [
        "That's an interesting point. Can you elaborate?",
        "I see what you mean. What are your thoughts on this?",
        "Great question! Let me think about that.",
        "I understand. How does that make you feel?",
        "That's a good observation. What comes next?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Export for Vercel serverless functions
export default app;

// Start server (only for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}