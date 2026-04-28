# 🌳 Branch Chat - Complete Handoff & Migration Package

**Project:** Branch Chat  
**Version:** 1.0.0  
**Generated:** April 28, 2026  
**Status:** Ready for Migration

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Complete Project Structure](#complete-project-structure)
3. [Tech Stack & Architecture](#tech-stack--architecture)
4. [Dependencies & Versions](#dependencies--versions)
5. [Environment Variables & Secrets](#environment-variables--secrets)
6. [API Integrations & Endpoints](#api-integrations--endpoints)
7. [Database Configuration](#database-configuration)
8. [Deployment Configuration](#deployment-configuration)
9. [Critical Findings & Hidden Assumptions](#critical-findings--hidden-assumptions)
10. [Local Setup Instructions](#local-setup-instructions)
11. [Pre-Migration Checklist](#pre-migration-checklist)
12. [Files to Back Up Manually](#files-to-back-up-manually)
13. [Git Migration Commands](#git-migration-commands)

---

## Project Overview

**Branch Chat** is a tree-structured conversational AI system that allows users to create branching conversations and explore multiple dialogue paths. It features real-time branching, conversation persistence, and integration with AI providers (Gemini, Hugging Face).

**Key Features:**
- 🌳 Tree-structured conversations with branching support
- 💾 Auto-save with dual storage (browser localStorage + optional database backend)
- 🤖 AI integration (Gemini API or Hugging Face) with mock fallback
- 📤 Export conversations as JSON or Markdown
- 🎨 Dark mode UI with animations
- 📱 Responsive design
- 🔄 Multi-account sync support via database backend

---

## Complete Project Structure

```
treechat/
├── .git/                          # Git repository (don't migrate)
├── .gitignore                     # Git ignore rules
├── .vercel/                       # Vercel deployment cache (don't migrate)
├── node_modules/                  # Dependencies (don't migrate - use npm install)
├── data/                          # Database files (SQLite local storage)
│   ├── treechat.db               # Main SQLite database
│   ├── treechat.db-shm           # SQLite shared memory file
│   └── treechat.db-wal           # SQLite write-ahead log
├── package.json                   # Project manifest & dependencies
├── package-lock.json              # Locked dependency versions
├── server.js                      # Express backend server (Node.js)
├── db.js                          # Database abstraction layer (SQLite/PostgreSQL)
├── tree.html                      # Frontend HTML shell
├── tree.css                       # Frontend styles
├── tree.js                        # Frontend logic (vanilla JS)
├── vercel.json                    # Vercel deployment configuration
├── DEPLOYMENT.md                  # Deployment guide
├── README.md                      # User-facing documentation
└── HANDOFF_MIGRATION.md           # This file

**Total Files:** 13 source files + 3 data files + .git
**Total Directories:** 5 main folders
```

---

## Tech Stack & Architecture

### Frontend
- **HTML5** - Semantic markup with accessibility attributes
- **CSS3** - Modern styling with animations and dark mode
- **Vanilla JavaScript (ES2020)** - No framework dependencies
- **Storage:** Browser localStorage + Backend database sync

### Backend
- **Node.js** - Runtime (version 22.x required)
- **Express.js** - Web framework for API server
- **CORS** - Cross-origin resource sharing middleware

### Database Options
1. **SQLite (Default)** - Local file-based database
   - Location: `data/treechat.db`
   - Uses WAL (Write-Ahead Logging) for performance
2. **PostgreSQL (Optional)** - Remote managed database
   - Via `DATABASE_URL` environment variable
   - Supports Supabase, Heroku Postgres, AWS RDS, etc.

### AI Integration
- **Gemini API** - Google's generative AI (primary)
- **Hugging Face Inference API** - Open-source models (fallback)
- **Mock AI** - Built-in fallback responses (no API key needed)

### Deployment Targets
- Vercel (recommended, free tier available)
- Render
- Railway
- Any Node.js hosting platform

---

## Dependencies & Versions

### Runtime Requirement
```
Node.js: 22.x
npm: Latest (included with Node.js)
```

### Production Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `express` | ^4.18.2 | Web framework & routing | MIT |
| `cors` | ^2.8.5 | Cross-origin resource sharing | MIT |
| `better-sqlite3` | ^12.9.0 | SQLite database (optional) | MIT |
| `pg` | ^8.20.0 | PostgreSQL client (optional) | MIT |
| `node-fetch` | ^2.7.0 | HTTP client for API calls | MIT |

**Note:** `better-sqlite3` and `pg` are both optional - use one depending on your database choice.

### Install Commands
```bash
# Install all dependencies
npm install

# Install specific database adapter only
npm install --save pg                # PostgreSQL only
npm install --save better-sqlite3    # SQLite only
```

### Version Lock
All versions are locked in `package-lock.json`. Use `npm ci` instead of `npm install` in CI/CD environments to ensure exact versions.

---

## Environment Variables & Secrets

### Required Variables (for AI features)
At least ONE of these must be set for real AI responses:

```env
# Google Gemini API (Recommended)
GEMINI_API_KEY=sk_abc123...
GOOGLE_API_KEY=AIzaSy...                    # Alternative key name
GEMINI_MODEL=gemini-2.5-flash               # Optional (default: gemini-2.5-flash)

# Hugging Face API (Alternative)
HF_TOKEN=hf_abcDefGhIjKlMnOpQrStUvWxYz123...
HF_MODEL=openai/gpt-oss-20b:fastest         # Optional

# Server Configuration
PORT=3000                                    # Optional (default: 3000)
NODE_ENV=production                          # Optional

# PostgreSQL (if using PostgreSQL instead of SQLite)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Optional Variables
```env
SQLITE_DB_PATH=/path/to/custom/treechat.db  # Custom SQLite location
```

### .env File Template
Create `.env` in project root:
```
# AI Configuration - Choose ONE provider
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
# OR
HF_TOKEN=YOUR_HUGGINGFACE_TOKEN_HERE

# Server
PORT=3000
NODE_ENV=development

# Database (leave blank for SQLite)
# DATABASE_URL=postgresql://...
```

### ⚠️ CRITICAL: Secrets Management
- **NEVER commit `.env` file to Git** - add to `.gitignore`
- **Rotate all API keys** when migrating to new account
- **Use managed secrets** in deployment platform:
  - Vercel: Environment Variables in project settings
  - Render: Environment variables in service settings
  - Railway: Variables in project dashboard
- **Mask secrets** when sharing logs or screenshots
- **Keep `.env.example`** in repo with dummy values as reference

---

## API Integrations & Endpoints

### Backend API Endpoints

#### Health & Status
```
GET /api/health
Response: {
  ok: true,
  aiConfigured: boolean,
  provider: "gemini" | "huggingface" | "mock",
  database: {
    provider: "sqlite" | "postgres",
    configured: true,
    path: "/path/to/db"
  }
}
```

#### Conversations (CRUD)
```
GET /api/conversations
Response: { conversations: [...] }

GET /api/conversations/:id
Response: { conversation: {...} }

POST /api/conversations
Body: { conversation: {...} }
Response: { conversation: {...} }

POST /api/conversations/bulk-sync
Body: { conversations: [...] }
Response: { conversations: [...] }

DELETE /api/conversations/:id
Response: { deleted: boolean }
```

#### AI Processing
```
POST /api/ai
Body: { 
  message: "User message",
  history: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ]
}
Response: {
  generated_text: "AI response text",
  source: "gemini" | "huggingface" | "mock",
  warning?: "Optional warning message"
}
```

### Static Assets
```
GET /                 → tree.html
GET /tree.css         → CSS stylesheet
GET /tree.js          → Frontend JavaScript
```

### External API Services

#### Google Gemini API
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Model:** `gemini-2.5-flash` (default, configurable)
- **Max Output Tokens:** 900
- **Temperature:** 0.55
- **Requires:** `GEMINI_API_KEY` environment variable
- **Docs:** https://ai.google.dev/

#### Hugging Face Inference API
- **Endpoint:** `https://router.huggingface.co/v1/chat/completions`
- **Model:** `openai/gpt-oss-20b:fastest` (default, configurable)
- **Max Tokens:** 420
- **Temperature:** 0.55
- **Requires:** `HF_TOKEN` environment variable
- **Docs:** https://huggingface.co/inference-api

### Client-Side Storage APIs
```javascript
// Browser localStorage for conversation persistence
localStorage.getItem("treechat-conversations:v1")
localStorage.getItem("treechat-active-conversation:v1")
localStorage.getItem("treechat-tree:v3")  // Legacy format
```

---

## Database Configuration

### Database Schema

Both SQLite and PostgreSQL use the same schema:

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tree_json TEXT NOT NULL,              -- JSON | JSONB (postgres)
  created_at TEXT NOT NULL,             -- ISO 8601 timestamp
  updated_at TEXT NOT NULL              -- ISO 8601 timestamp
);
```

### SQLite Configuration (Default)
```
Location: data/treechat.db
WAL Mode: Enabled (pragma journal_mode = WAL)
Features:
  - treechat.db        → Main database file
  - treechat.db-shm   → Shared memory file (for WAL mode)
  - treechat.db-wal   → Write-ahead log file
```

**Advantages:**
- Zero setup required
- No external dependencies
- Perfect for single-server deployment
- Files fit in Git (if needed)

**Limitations:**
- Single-writer only (fine for this app size)
- Not suitable for multi-server clusters
- Server must have write access to `data/` directory

### PostgreSQL Configuration (Optional)
```
Connection String Format:
postgresql://username:password@host:port/database

Environment Variable: DATABASE_URL
Auto-detection: If DATABASE_URL is set, PostgreSQL is used instead of SQLite

Example (Supabase):
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

Example (Heroku):
postgresql://user:password@ec2-xxx.compute-1.amazonaws.com:5432/dbname
```

**Advantages:**
- Scales to multiple servers
- Better for large conversation volumes
- Managed hosting options available
- JSONB support for better indexing

**Limitations:**
- Requires external service setup
- Additional cost (unless free tier)
- Network latency considerations

### Schema Initialization
Both databases auto-create the `conversations` table on first run. No manual schema migration needed.

### Data Type Notes
- **SQLite:** `tree_json` stored as TEXT (JSON string)
- **PostgreSQL:** `tree_json` stored as JSONB (binary JSON, better performance)
- **Timestamps:** ISO 8601 format (e.g., `2026-04-28T15:30:00.000Z`)

### Conversation Object Structure
```javascript
{
  id: "chat-1234567890-abc123def456",
  title: "First message preview...",
  createdAt: "2026-04-28T15:30:00.000Z",
  updatedAt: "2026-04-28T15:35:00.000Z",
  tree: {
    id: "root",
    text: "",
    role: "root",
    expanded: true,
    children: [
      {
        id: "msg-1234567890-abc",
        text: "User message text",
        role: "user",
        expanded: true,
        children: [
          {
            id: "msg-1234567890-def",
            text: "AI response",
            role: "assistant",
            expanded: true,
            children: []
          }
        ]
      }
    ]
  }
}
```

---

## Deployment Configuration

### Vercel Configuration (Current)
File: `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

**Key Settings:**
- Runtime: Node.js via `@vercel/node`
- Single build source: `server.js`
- All routes → `server.js` (Express handles routing)

**Vercel Free Tier Limits:**
- Function execution: 10 seconds
- Storage: Ephemeral (no persistent file storage between deployments)
- ⚠️ **IMPORTANT:** SQLite database will be lost on redeploy! Use PostgreSQL for production.

### Build & Runtime Commands

#### Local Development
```bash
npm install
npm start        # Starts on http://localhost:3000
npm run dev      # Same as start
```

#### Vercel Deployment
```bash
npm install -g vercel
vercel                              # Interactive deployment
vercel --prod                       # Deploy to production
vercel env add GEMINI_API_KEY ...  # Add environment variables
```

#### Docker Setup (if needed)
```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Alternative Deployment Platforms

#### Render (https://render.com)
1. Connect GitHub repo
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Add environment variables in dashboard
5. Uses free tier with basic features

#### Railway (https://railway.app)
1. Connect GitHub repo
2. Auto-detects `package.json`
3. Auto-deploys on commits
4. Environment variables in Variables tab
5. More generous free tier than Vercel

#### Self-Hosted (VPS/Cloud)
```bash
# SSH into server
ssh user@hostname

# Clone repo
git clone https://github.com/user/treechat.git
cd treechat

# Setup
node_modules
npm install
echo "GEMINI_API_KEY=..." > .env

# Run with process manager
npm install -g pm2
pm2 start server.js --name "treechat"
pm2 startup
pm2 save
```

---

## Critical Findings & Hidden Assumptions

### ⚠️ Database-Breaking Issues

#### 1. **SQLite + Vercel Incompatibility**
- **Problem:** SQLite stores data in `data/treechat.db` on disk
- **Issue:** Vercel's ephemeral filesystem deletes this on every redeploy
- **Impact:** All conversations lost after each deployment
- **Solution:** Switch to PostgreSQL for production

#### 2. **Single Instance Assumption**
- **Assumption:** Code assumes single server instance
- **Issue:** SQLite can't handle concurrent multi-server writes
- **Fix:** Use PostgreSQL or add request queuing if scaling

#### 3. **API Rate Limiting Not Implemented**
- **Risk:** No rate limiting on `/api/ai` or `/api/conversations`
- **Exposure:** Expensive API calls (Gemini/Hugging Face) unprotected
- **Recommendation:** Add rate limiting middleware before production

### 🔒 Security Issues

#### 1. **API Keys in Environment**
- **Current:** Keys passed via environment variables
- **Risk:** Could be logged if errors occur
- **Mitigation:** Keys logged as `[REDACTED]` in production

#### 2. **CORS Enabled Globally**
```javascript
app.use(cors());  // Accepts requests from ANY origin
```
- **Risk:** Anyone can call your `/api/ai` endpoint
- **Fix:** Restrict to specific origins:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true
}));
```

#### 3. **No Input Validation on Message Length**
- **Current:** Messages capped at 4000 chars, history at 12 messages
- **Risk:** Attackers could send edge cases
- **Status:** Acceptable for this app size

#### 4. **AI Content Not Filtered**
- **Issue:** No content moderation on user inputs or AI outputs
- **Recommendation:** Add filtering for production use case

### 🐛 Hardcoded Values to Review

#### In `server.js`:
```javascript
const PORT = process.env.PORT || 3000;                    // OK - has default
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";  // OK
const model = process.env.HF_MODEL || "openai/gpt-oss-20b:fastest";  // OK
maxOutputTokens: 900;                                      // Hardcoded
temperature: 0.55;                                         // Hardcoded
topP: 0.9;                                                 // Hardcoded
max_tokens: 420;                                          // Hardcoded
```

#### In `tree.js`:
```javascript
const STORE_KEY = "treechat-conversations:v1";            // OK - storage key
const ACTIVE_KEY = "treechat-active-conversation:v1";     // OK
const LEGACY_TREE_KEY = "treechat-tree:v3";              // OK - backward compat
```

#### In `db.js`:
```javascript
if (process.env.VERCEL) {
  return path.join(os.tmpdir(), "treechat.db");          // SQLite on Vercel!
}
return path.join(__dirname, "data", "treechat.db");       // Default: local
```
**⚠️ This will lose data on Vercel!**

### 📊 Performance Considerations

1. **Message History Limit:** Last 12 messages sent to AI (prevents token overflow)
2. **Frontend Rendering:** Tree can handle ~1000 nodes before slowdown
3. **Database Query:** No pagination on `/api/conversations` (OK for <1000 items)
4. **AI Response Cache:** None implemented (each request calls API)

### 🔄 Browser Compatibility

- **Tested:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Requires:** ES2020 JavaScript support
- **Storage:** Browser localStorage (5-10MB limit, varies by browser)
- **Fallback:** Auto-loads from database if localStorage fails

### 📱 Mobile Behavior

- Responsive design supports mobile
- Touch-friendly button sizes
- Auto-resizing textarea for mobile keyboards
- Conversation export via JSON download

---

## Local Setup Instructions

### Prerequisites
- **Node.js** 22.x (LTS) - Download from https://nodejs.org/
- **npm** Latest (comes with Node.js)
- **Git** (for cloning repo)
- **Text Editor** (VS Code recommended)

### Step 1: Clone/Prepare Repository
```bash
# If migrating from existing repo
git clone https://github.com/OLD_ACCOUNT/treechat.git
cd treechat
git remote rename origin old-origin

# Or if setting up fresh copy
mkdir treechat
cd treechat
git init
```

### Step 2: Install Dependencies
```bash
npm install
```
**Expected output:**
```
added 123 packages in 45s
```

Verify installation:
```bash
node --version    # Should be v22.x.x
npm --version     # Should be 9.x.x or higher
```

### Step 3: Configure Environment
Create `.env` file in project root:
```bash
cat > .env << 'EOF'
# Server
PORT=3000
NODE_ENV=development

# AI Configuration (pick ONE)
# Option A: Google Gemini (recommended for free tier)
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY

# Option B: Hugging Face (alternative)
# HF_TOKEN=YOUR_ACTUAL_HUGGINGFACE_TOKEN

# Database (leave empty for SQLite)
# DATABASE_URL=postgresql://user:pass@host:5432/db
EOF
```

### Step 4: Get API Keys

#### Option A: Google Gemini API (Recommended)
1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Create new project in Google Cloud Console
4. Generate API key
5. Copy to `.env` as `GEMINI_API_KEY=...`

#### Option B: Hugging Face
1. Go to https://huggingface.co/settings/tokens
2. Create new token with "Inference API" scope
3. Copy to `.env` as `HF_TOKEN=...`

#### Testing API Configuration
```bash
curl http://localhost:3000/api/health
# Should return: { "ok": true, "aiConfigured": true, ... }
```

### Step 5: Start Development Server
```bash
npm start
```

**Expected output:**
```
Server running on http://localhost:3000
```

### Step 6: Access Application
- Open browser to http://localhost:3000
- Start typing to create first conversation
- Click "Branch" to create alternative paths
- Click "Export" to download conversations

### Step 7: Test Core Features

**Test Conversation:**
1. Send message: "Hello, how are you?"
2. Verify AI response appears
3. Click "Branch" on assistant message
4. Send alternative follow-up: "What's your favorite food?"
5. Verify both branches exist

**Test Database Persistence:**
1. Reload page (F5)
2. Verify conversations still appear
3. Check browser DevTools → Application → Local Storage → treechat-conversations:v1

**Test Export:**
1. Click "Export" button
2. Verify JSON file downloads
3. Open in text editor to verify structure

### Troubleshooting

#### "Port 3000 already in use"
```bash
# Use different port
PORT=3001 npm start

# Or kill existing process
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

#### "GEMINI_API_KEY is invalid"
```
- Check .env file has correct key
- Verify no extra spaces: GEMINI_API_KEY=abc123 (not abc123 )
- Test key at https://ai.google.dev/
```

#### "Database file not found"
```bash
# Create data directory
mkdir data

# Or skip SQLite and use database URL
echo "DATABASE_URL=postgresql://..." >> .env
npm start
```

#### "AI returning mock responses"
```
Check /api/health endpoint:
curl http://localhost:3000/api/health

If aiConfigured: false, you need valid API key in .env
```

---

## Pre-Migration Checklist

Complete these steps before switching to new account:

### Phase 1: Preparation (Day Before)
- [ ] Export all conversations via "Export" button in UI
- [ ] Save all exported JSON files to secure location
- [ ] Document current API keys (mask sensitive parts)
- [ ] Note any custom configuration in `server.js` or `tree.js`
- [ ] Check `.gitignore` includes `.env` and `data/`
- [ ] Verify Git history is clean (`git status`)

### Phase 2: New Account Setup
- [ ] Create new GitHub account
- [ ] Create new repository for treechat
- [ ] Create new Vercel/Render/Railway account
- [ ] Generate NEW API keys (Gemini and/or Hugging Face)
- [ ] Store new credentials in password manager

### Phase 3: Repository Migration
- [ ] Clone old repo as mirror: `git clone --bare`
- [ ] Push to new repo: `git push --mirror`
- [ ] Verify all branches pushed: `git branch -a`
- [ ] Check commit history: `git log --oneline`

### Phase 4: Code Review
- [ ] Scan `server.js` for hardcoded values
- [ ] Check `tree.js` for any custom API URLs
- [ ] Review `.env` is in `.gitignore`
- [ ] Verify `data/treechat.db` is in `.gitignore`
- [ ] Ensure no credentials in any source files

### Phase 5: Deployment Setup
- [ ] Set up database (SQLite for dev, PostgreSQL for prod)
- [ ] Add environment variables to platform:
  - [ ] `GEMINI_API_KEY=NEW_KEY`
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL=postgres://...` (if using PostgreSQL)
- [ ] Configure custom domain (if applicable)
- [ ] Enable automatic deployments from GitHub

### Phase 6: Testing
- [ ] Test locally: `npm install && npm start`
- [ ] Verify API health: `curl https://localhost:3000/api/health`
- [ ] Create test conversation
- [ ] Export and verify export format
- [ ] Test on mobile device
- [ ] Test with both AI providers (if both are set up)

### Phase 7: Data Migration
- [ ] Export all conversations from old instance
- [ ] Import conversation data:
  - [ ] If using same database: migrate PostgreSQL
  - [ ] If new database: use bulk-sync API:
```bash
curl -X POST https://new-instance/api/conversations/bulk-sync \
  -H "Content-Type: application/json" \
  -d '{"conversations": [...]}'
```

### Phase 8: Final Verification
- [ ] Old instance still accessible (as backup)
- [ ] New instance fully functional
- [ ] All conversations available in new instance
- [ ] Export format unchanged
- [ ] No browser console errors
- [ ] Performance acceptable
- [ ] Rate limiting considered

### Phase 9: Cutover
- [ ] Update DNS / domain settings (if applicable)
- [ ] Announce new URL to users
- [ ] Monitor error logs for 24 hours
- [ ] Keep old instance running as fallback for 7 days
- [ ] Archive old instance after 30 days

### Phase 10: Post-Migration
- [ ] Delete old API keys
- [ ] Delete old databases
- [ ] Document new instance details
- [ ] Update README with new deployment info
- [ ] Remove old account secrets from password manager

---

## Files to Back Up Manually

### Critical Data Files
```
data/treechat.db        # SQLite database (contains all conversations)
data/treechat.db-shm    # SQLite memory file
data/treechat.db-wal    # SQLite write-ahead log
```

**Action:** Export conversations via "Export" button BEFORE any migration.

### Configuration Files
```
.env                    # Local environment variables (DO NOT COMMIT)
vercel.json            # Deployment configuration
package-lock.json      # Locked dependency versions
```

**Action:** Keep `.env` secure locally. Don't store in Git.

### Source Code
```
server.js              # Backend
db.js                  # Database layer
tree.html              # Frontend HTML
tree.js                # Frontend JavaScript
tree.css               # Frontend styles
```

**Action:** All in Git. Clone repo during migration.

### Optional Exports
```
treechat-export.json   # Conversation backup (from "Export" button)
Markdown exports       # Human-readable conversation backups
```

**Action:** Keep local copies in secure location.

### DO NOT BACK UP
```
node_modules/          # Reinstall with npm install
.git/                  # Clone fresh from GitHub
.vercel/               # Regenerate on new deployment
```

---

## Git Migration Commands

### Complete Safe Migration to New Account

#### Step 1: Create Mirror of Old Repository
```bash
# From your local machine
cd ~
git clone --mirror https://github.com/OLD_ACCOUNT/treechat.git treechat.git
cd treechat.git

# Verify mirror contents
git branch -a          # Should show all branches
git log --oneline | head -5  # Should show commits
```

#### Step 2: Create New Repository on GitHub (New Account)
1. Log in to NEW account on github.com
2. Create new empty repository: `treechat`
3. DO NOT initialize with README

#### Step 3: Push Mirror to New Account
```bash
# From the mirror directory
cd ~/treechat.git

git push --mirror https://github.com/NEW_ACCOUNT/treechat.git
# You'll be prompted for credentials (use personal access token if needed)
```

#### Step 4: Clone New Repository
```bash
cd ~
rm -rf treechat.git         # Remove mirror
git clone https://github.com/NEW_ACCOUNT/treechat.git
cd treechat
```

#### Step 5: Verify Migration
```bash
# Check branches
git branch -a
# Expected: master/main, and any other branches

# Check commit history
git log --oneline | head -10

# Check remotes
git remote -v
# Expected: origin → NEW_ACCOUNT/treechat.git

# Check for any uncommitted changes
git status
# Expected: "nothing to commit, working tree clean"
```

#### Step 6: Update Environment Variables
```bash
# Create new .env with NEW API keys
echo "GEMINI_API_KEY=YOUR_NEW_KEY" > .env
echo "NODE_ENV=development" >> .env

# Verify .env is in .gitignore
cat .gitignore
# Expected: .env should be listed
```

#### Step 7: Test Locally
```bash
npm install
npm start

# In browser: http://localhost:3000
# Verify conversation creation works
```

#### Step 8: Deploy to Production
```bash
# For Vercel
npm install -g vercel
vercel --prod

# During deployment, add environment variable when prompted:
# GEMINI_API_KEY = YOUR_NEW_KEY

# Or use GitHub integration:
# 1. Log into new Vercel account
# 2. Import project from GitHub
# 3. Select NEW_ACCOUNT/treechat
# 4. Add environment variables in Vercel dashboard
# 5. Deploy
```

#### Step 9: Update Remote References (Optional)
```bash
# If you want to keep old account remote for reference
git remote add old-origin https://github.com/OLD_ACCOUNT/treechat.git

# Don't push to old account (prevents confusion)
git remote set-url --push old-origin no_push

# Pull updates only from new account
git remote set-url origin https://github.com/NEW_ACCOUNT/treechat.git
```

#### Step 10: Sync Conversation Data (If Needed)

**Option A: Using API Bulk Sync**
```bash
# Export conversations from old instance
curl https://old-treechat.vercel.app/api/conversations > conversations.json

# Import into new instance
curl -X POST https://new-treechat.vercel.app/api/conversations/bulk-sync \
  -H "Content-Type: application/json" \
  -d @conversations.json
```

**Option B: Manual Export/Import**
1. Open old instance in browser
2. Click "Export" on each conversation
3. Save JSON files locally
4. Open new instance
5. Manually recreate conversations or use browser DevTools to restore localStorage

### Git Migration Troubleshooting

#### "fatal: repository not found"
```bash
# Verify credentials and account
git config user.name
git config user.email

# Update if needed
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# For HTTPS auth, use personal access token:
# https://github.com/settings/tokens (create classic token with repo scope)
```

#### "Updates were rejected"
```bash
# If old repo has commits after mirror
cd ~/treechat.git
git remote set-url origin https://github.com/NEW_ACCOUNT/treechat.git
git push --force --all
git push --force --tags
```

#### "Can't push to old account"
```bash
# Expected! We set it to no_push
# Only push to new account (origin)
git push origin main

# To prevent accidents:
git remote set-url --push old-origin no_push
```

### Continuous Integration Setup

#### For GitHub Actions (auto-deploy on push)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: BetaHuhn/deploy-to-vercel-action@v1
        with:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
```

Get secrets from Vercel project settings.

---

## Additional Recommendations

### Security Hardening (Before Production)
```javascript
// Add rate limiting to server.js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
app.use('/api/ai', rateLimit({ max: 20 })); // Stricter for AI
```

### Monitoring
- Set up error logging (Sentry, LogRocket)
- Monitor API response times
- Track conversation count growth
- Set up uptime monitoring (Pingdom, UptimeRobot)

### Performance Optimization
- Add conversation pagination
- Implement response caching for similar queries
- Consider CDN for static assets
- Add request compression

### Features to Consider Adding
- User authentication (if multi-user needed)
- Conversation sharing/collaboration
- Analytics dashboard
- Mobile app versions
- Dark mode improvements

---

## Support & Documentation Links

- **Node.js Docs:** https://nodejs.org/docs/
- **Express.js:** https://expressjs.com/
- **Google Gemini:** https://ai.google.dev/
- **Hugging Face:** https://huggingface.co/
- **Vercel Docs:** https://vercel.com/docs
- **SQLite:** https://www.sqlite.org/
- **PostgreSQL:** https://www.postgresql.org/docs/

---

## Migration Sign-Off

**Prepared By:** GitHub Copilot  
**Date:** April 28, 2026  
**Status:** Ready for Handoff  

**Before migrating, confirm:**
- [ ] All files accounted for
- [ ] Dependencies documented
- [ ] Environment variables identified
- [ ] API keys generated
- [ ] Local setup tested
- [ ] Git migration plan verified
- [ ] Database backup created
- [ ] Deployment platform ready

---

**End of Handoff Document**
