# Branch Chat - Backend Server

## Local Setup

### Prerequisites
- Node.js 18+ installed

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will run at `http://localhost:3000`

3. Open `tree.html` in your browser

### Environment Variables
- `PORT` - Server port (default: 3000)
- `HF_TOKEN` - Hugging Face API token (optional, uses default if not set)

---

## Deployment Options

### Option 1: Deploy to Vercel (Recommended - FREE)
1. Push your code to GitHub
2. Go to https://vercel.com
3. Click "New Project" and connect your GitHub repo
4. Add environment variable: `HF_TOKEN` = your token
5. Deploy!

### Option 2: Deploy to Render (FREE)
1. Push your code to GitHub
2. Go to https://render.com
3. Click "New" > "Web Service"
4. Connect your GitHub repo
5. Set buildcommand: `npm install`
6. Set start command: `npm start`
7. Add environment variable: `HF_TOKEN` = your token
8. Deploy!

### Option 3: Deploy to Railway (FREE)
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect your repo
5. Add environment variable: `HF_TOKEN`
6. Deploy!

---

## Frontend Configuration

After deploying backend, update the frontend API calls to point to your server URL:

Replace `/api/ai` with your deployed server URL in `tree.js`:
```javascript
const response = await fetch('https://your-deployed-url.com/api/ai', {
  // ...
});
```

Or set it dynamically based on environment:
```javascript
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://your-deployed-url.com';
const response = await fetch(`${API_URL}/api/ai`, {
  // ...
});
```
