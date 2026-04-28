# 🚀 Branch Chat - Migration Quick Reference

## Project Summary
**Branch Chat** - Tree-structured conversational AI system with branching dialog support, dual storage (browser + database), and AI provider integration.

---

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Runtime** | Node.js 22.x |
| **Framework** | Express.js |
| **Database** | SQLite (default) or PostgreSQL (optional) |
| **Frontend** | Vanilla HTML/CSS/JS (no frameworks) |
| **AI Providers** | Gemini API, Hugging Face, or Mock |
| **Deployment** | Vercel, Render, Railway, or Self-hosted |
| **Files** | 13 source + 3 data files |
| **Dependencies** | 5 core + many transitive |

---

## Dependencies Checklist

```json
{
  "express": "^4.18.2",      ✓ Web framework
  "cors": "^2.8.5",          ✓ CORS middleware
  "better-sqlite3": "^12.9.0", ✓ SQLite adapter
  "pg": "^8.20.0",           ✓ PostgreSQL adapter
  "node-fetch": "^2.7.0"     ✓ HTTP client
}
```

**Node Version:** 22.x (LTS)

---

## Environment Variables Required

```env
# Pick ONE AI provider:
GEMINI_API_KEY=sk_...              # Google Gemini (recommended)
# OR
HF_TOKEN=hf_...                     # Hugging Face

# Optional:
PORT=3000                          # Server port
NODE_ENV=production
DATABASE_URL=postgresql://...      # PostgreSQL (if using)
```

---

## Critical Issues Found

| Issue | Severity | Impact | Fix |
|-------|----------|--------|-----|
| SQLite + Vercel | 🔴 High | Data lost on redeploy | Use PostgreSQL |
| CORS globally enabled | 🟡 Medium | Anyone can call API | Restrict origins |
| No API rate limiting | 🟡 Medium | Expensive API calls | Add rate limiter |
| Hardcoded AI params | 🟠 Low | Can't tune responses | Move to .env |

---

## File Structure
```
treechat/
├── server.js           (Express API server)
├── db.js              (Database abstraction)
├── tree.html          (Frontend shell)
├── tree.js            (Frontend logic)
├── tree.css           (Styling)
├── package.json       (Dependencies)
├── data/treechat.db   (SQLite database)
└── vercel.json        (Deployment config)
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Status check |
| GET | `/api/conversations` | List all |
| POST | `/api/conversations` | Save |
| DELETE | `/api/conversations/:id` | Remove |
| POST | `/api/ai` | Generate response |

---

## Setup in 5 Minutes

```bash
# 1. Install
npm install

# 2. Create .env
echo "GEMINI_API_KEY=YOUR_KEY" > .env

# 3. Start
npm start

# 4. Open
# http://localhost:3000

# 5. Test
# Send message → Verify AI responds
```

---

## Migration Checklist (Abbreviated)

- [ ] Export all conversations via UI
- [ ] Generate new API keys in new account
- [ ] Clone repo: `git clone --mirror` → `git push --mirror`
- [ ] Update `.env` with new keys
- [ ] Test locally: `npm install && npm start`
- [ ] Deploy to Vercel/Render/Railway
- [ ] Sync conversation data (if needed)
- [ ] Verify in production
- [ ] Keep old instance for 7 days as backup

---

## Git Commands for Migration

```bash
# Prepare mirror from old repo
git clone --mirror https://github.com/OLD/treechat.git treechat.git

# Push to new account
git push --mirror https://github.com/NEW/treechat.git

# Clone from new account
git clone https://github.com/NEW/treechat.git
cd treechat

# Verify
git remote -v
git log --oneline | head -5
```

---

## Database Information

**SQLite (Default):**
- File: `data/treechat.db`
- WAL mode: Enabled
- ⚠️ Ephemeral on Vercel (will lose data)

**PostgreSQL (Recommended for prod):**
- Connection: `DATABASE_URL=postgresql://...`
- JSONB support for better performance
- Can scale to multiple servers

---

## Deployment Platforms Tested

| Platform | Tier | Status |
|----------|------|--------|
| Vercel | Free | ✓ Works (use PostgreSQL) |
| Render | Free | ✓ Works |
| Railway | Free | ✓ Works |
| Self-hosted | N/A | ✓ Works |

---

## Security Notes

⚠️ **Before Production:**
1. Add rate limiting to `/api/ai`
2. Restrict CORS to your domain
3. Use PostgreSQL (not SQLite on Vercel)
4. Add input validation
5. Monitor API costs

---

## Hidden Assumptions in Code

1. **Single server instance** - SQLite not thread-safe
2. **Vercel = ephemeral storage** - Database lost on redeploy
3. **Trust all origins** - CORS allows anyone
4. **No cost controls** - Unlimited AI API calls
5. **Browser storage primary** - Database is optional sync layer

---

## Most Important Changes Needed Before Prod

```javascript
// Add rate limiting
const rateLimit = require('express-rate-limit');
app.use('/api/ai', rateLimit({ windowMs: 900000, max: 20 }));

// Restrict CORS
app.use(cors({ origin: 'https://yourdomain.com' }));

// Use PostgreSQL in production
// DATABASE_URL=postgresql://user:pass@host/db
```

---

## Files to Backup Manually

- `data/treechat.db` (all conversations)
- Export via "Export" button in UI (JSON)
- `.env` file (keep secure, don't commit)

---

## Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Port 3000 in use" | `PORT=3001 npm start` |
| "API key invalid" | Get new key, check .env format |
| "Database not found" | `mkdir data` |
| "Mock responses only" | Check `/api/health` for aiConfigured |
| "Data lost on deploy" | Switch to PostgreSQL |

---

## Key Document Locations

- **Full Handoff:** `HANDOFF_MIGRATION.md` (this document)
- **Deployment Guide:** `DEPLOYMENT.md`
- **User Guide:** `README.md`
- **Project Config:** `package.json`, `vercel.json`

---

## Next Steps

1. **Read Full Guide:** Open `HANDOFF_MIGRATION.md`
2. **Set Up Locally:** Follow "Local Setup Instructions"
3. **Review Security:** Check "Critical Issues" section
4. **Plan Migration:** Use "Pre-Migration Checklist"
5. **Execute Migration:** Follow "Git Migration Commands"

---

**Status:** ✅ Ready for Handoff to New Account/Developer

**Full documentation available in:** `HANDOFF_MIGRATION.md`
