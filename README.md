# Branch Chat 🌳

A tree-structured conversational AI system where you can create branching conversations and explore multiple dialogue paths.

## Features

✨ **Conversation Branching** - Create alternative dialogue paths with a single click
📝 **Edit & Delete** - Modify or remove any message and its branches
💾 **Auto-Save** - All conversations auto-save to local storage
📤 **Export** - Download conversations as JSON or Markdown
🤖 **AI Responses** - Get instant AI-generated responses (mock or real)
🎨 **Beautiful UI** - Dark mode with animated conversations

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm

### Installation

1. Navigate to the project folder:
```bash
cd treechat
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open in browser:
```
http://localhost:3000
```

## Usage

1. **Send a message** - Type and press Enter
2. **Create a branch** - Click "Branch" on any message to explore alternatives
3. **Expand/Collapse** - Click "Collapse" to organize branches
4. **Edit** - Click "Edit" to modify a message
5. **Delete** - Click "Delete" to remove a message and its branches
6. **Export** - Click "Export" to download your conversation tree
7. **Enable Real AI** - Click "Settings" to enable real AI responses

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for options to deploy to:
- **Vercel** (Recommended - FREE)
- **Render** (FREE)
- **Railway** (FREE)

### Quick Vercel Deploy
```bash
npm install -g vercel
vercel
```

## How It Works

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Express.js server (handles API requests)
- **AI**: Hugging Face API (DistilGPT-2 model)
- **Storage**: Browser localStorage

## Features Explained

### Branching
Click any message's "Branch" button to create an alternative response. This creates a child message that can have its own branches, creating a tree structure.

### Mock vs Real AI
- **Mock AI** (Default): Uses pre-written responses, instant and reliable
- **Real AI**: Calls Hugging Face API for genuine AI responses (requires token)

### Export Options
- **JSON**: Full tree structure for data processing
- **Markdown**: Human-readable format with indentation showing hierarchy

## Environment Variables

```
PORT=3000                  # Server port
HF_TOKEN=your_token_here   # Hugging Face API token (optional)
```

## File Structure

```
treechat/
├── tree.html              # Main HTML file
├── tree.css               # Styling
├── tree.js                # Frontend logic
├── server.js              # Backend API server
├── package.json           # Dependencies
├── vercel.json            # Vercel deployment config
└── DEPLOYMENT.md          # Deployment guide
```

## API Endpoints

### POST /api/ai
Generate AI response

**Request:**
```json
{
  "prompt": "Your message here"
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI generated response"
}
```

## Troubleshooting

**"No responses appearing"**
- Check browser console (F12) for errors
- Ensure server is running: `npm start`
- Try clearing localStorage: `localStorage.clear()`

**"API calls failing"**
- Ensure `HF_TOKEN` environment variable is set
- Check Hugging Face API quota
- Verify internet connection

**"CORS errors"**
- This is normal on localhost - backend handles it
- Deploy to production to use real API

## Future Enhancements

- 🔍 Search/filter conversations
- 🎯 Drag-and-drop reordering
- 📊 Conversation analytics
- 🌐 Multi-language support
- ☁️ Cloud sync across devices
- 🤝 Collaborative branching

## License

MIT
